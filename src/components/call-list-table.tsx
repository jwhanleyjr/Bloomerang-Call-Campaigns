
"use client";

import React, { useState, useMemo } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, CheckCircle, XCircle, Clock, Users, User, UploadCloud, Loader2, CalendarClock, RefreshCw, KeyRound } from 'lucide-react';
import InteractionLogger from './interaction-logger';
import type { Donor, Interaction, Campaign } from '@/lib/types';
import { formatDistanceToNow, format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { syncToBloomerang, enrichDonors } from '@/app/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type CallListTableProps = {
  campaign: Campaign;
  onUpdateDonor: (donor: Donor) => void;
  onInteractionLogged: (donor: Donor, interaction: Interaction) => void;
};

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: <Clock className="w-4 h-4 text-muted-foreground" />,
    badgeVariant: 'secondary',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle className="w-4 h-4 text-primary" />,
    badgeVariant: 'outline',
  },
  skipped: {
    label: 'Skipped',
    icon: <XCircle className="w-4 h-4 text-destructive" />,
    badgeVariant: 'destructive',
  },
  'follow-up': {
    label: 'Follow-up',
    icon: <CalendarClock className="w-4 h-4 text-accent" />,
    badgeVariant: 'accent',
  }
};

function calculateProgress(donors: Donor[]): number {
  if (donors.length === 0) return 0;
  const completedCount = donors.filter(d => d.status === 'completed' || d.status === 'skipped').length;
  return (completedCount / donors.length) * 100;
}

// Group donors by household
function groupDonors(donors: Donor[]): (Donor | { isHousehold: true; householdName: string; members: Donor[] })[] {
  const households: { [key: string]: Donor[] } = {};
  const individuals: Donor[] = [];

  donors.forEach(donor => {
    if (donor.householdId) {
      if (!households[donor.householdId]) {
        households[donor.householdId] = [];
      }
      households[donor.householdId].push(donor);
    } else {
      individuals.push(donor);
    }
  });

  const groupedList: (Donor | { isHousehold: true; householdName: string; members: Donor[] })[] = [];
  
  Object.values(households).forEach(members => {
    if (members.length > 1) {
      // Sort members within the household to be consistent
      const sortedMembers = members.sort((a,b) => a.name.localeCompare(b.name));
      groupedList.push({ isHousehold: true, householdName: sortedMembers[0].householdName || 'Household', members: sortedMembers });
    } else {
      // If a household has only one member from the list, treat as individual
      individuals.push(...members);
    }
  });
  
  // Sort individuals and households to have a consistent order
  const sortedHouseholds = groupedList.sort((a, b) => (a as any).householdName.localeCompare((b as any).householdName));
  const sortedIndividuals = individuals.sort((a,b) => a.name.localeCompare(b.name));
  
  return [...sortedHouseholds, ...sortedIndividuals];
}

export default function CallListTable({ campaign, onUpdateDonor, onInteractionLogged }: CallListTableProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const donorsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'campaigns', campaign.id, 'donors');
  }, [firestore, user, campaign.id]);
  
  // This hook now serves as the single source of truth for donor data.
  const { data: donors, isLoading: isLoadingDonors } = useCollection<Donor>(donorsCollectionRef);

  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();

  const handleLogRowClick = (donor: Donor) => {
    setSelectedDonor(donor);
    setIsLoggerOpen(true);
  };

  const handleLoggerClose = () => {
    setIsLoggerOpen(false);
    // Give sheet time to animate out
    setTimeout(() => setSelectedDonor(null), 300);
  };

  const handleLocalInteractionLogged = (donor: Donor, interaction: Interaction) => {
    onInteractionLogged(donor, interaction);
    handleLoggerClose();
  };

  const handleRefreshData = async () => {
    if (!donors || !user || !firestore) return;
    setIsRefreshing(true);
    try {
      // This function fetches the latest data from Bloomerang
      const enriched = await enrichDonors(donors, apiKey);
      
      // Write the updated data back to Firestore
      const batch = writeBatch(firestore);
      enriched.forEach(donor => {
        const donorRef = doc(firestore, 'users', user.uid, 'campaigns', campaign.id, 'donors', donor.id);
        batch.set(donorRef, donor, { merge: true });
      });
      await batch.commit();

      // The useCollection hook will automatically detect the changes in Firestore and update the UI.
      // No manual state update is needed.

      toast({
        title: 'Data Refreshed',
        description: `Successfully updated ${enriched.length} donors with the latest data from Bloomerang.`,
      });
    } catch (error) {
      console.error("Error refreshing donor data:", error);
      toast({
        variant: 'destructive',
        title: 'Refresh Failed',
        description: error instanceof Error ? error.message : 'Could not update donor data from Bloomerang. Please try again.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };


  const handleSync = async () => {
    if (!donors) return;
    setIsSyncing(true);
    const interactionsToSync = donors
      .map(d => d.lastInteraction)
      .filter((i): i is Interaction => !!i);

    if (interactionsToSync.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Interactions to Sync',
        description: 'Log at least one call before syncing to Bloomerang.',
      });
      setIsSyncing(false);
      return;
    }

    try {
      const result = await syncToBloomerang(campaign.name, interactionsToSync);
      toast({
        title: result.success ? 'Sync Successful' : 'Sync Incomplete',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'An unexpected error occurred while syncing.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  const progress = calculateProgress(donors || []);
  const groupedDonors = useMemo(() => groupDonors(donors || []), [donors]);

  const renderDonorRow = (donor: Donor, isHouseholdMember: boolean = false) => {
    const status = statusConfig[donor.status];
    const lastDonationDate = donor.givingSummary?.lastDonationDate
      ? format(new Date(donor.givingSummary.lastDonationDate.toString()), 'PP')
      : 'N/A';

    return (
      <TableRow key={donor.id} className={isHouseholdMember ? 'bg-muted/50 hover:bg-muted' : ''}>
        <TableCell className={`font-medium ${isHouseholdMember ? 'pl-10' : ''}`}>
          <div className="flex items-center gap-2">
            {isHouseholdMember && <User className="w-4 h-4 text-muted-foreground" />}
            {donor.name}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={status.badgeVariant as any} className="flex items-center gap-1.5 w-fit">
            {status.icon}
            <span>{status.label}</span>
          </Badge>
        </TableCell>
        <TableCell>
          <div>{donor.phone}</div>
          <div className="text-muted-foreground text-xs">{donor.email}</div>
        </TableCell>
        <TableCell>
          {donor.lastInteraction ? (
            <div className="flex flex-col">
              <span className="font-semibold capitalize">
                {donor.lastInteraction.outcome?.replace('-', ' ') || 'Note'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(donor.lastInteraction.loggedAt.toString()), { addSuffix: true })}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </TableCell>
        <TableCell className="text-right">{lastDonationDate}</TableCell>
        <TableCell className="text-right font-mono">
          ${(donor.givingSummary?.lastDonationAmount || 0).toLocaleString()}
        </TableCell>
        <TableCell className="text-right font-mono">
          ${(donor.givingSummary?.totalDonations || 0).toLocaleString()}
        </TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" onClick={() => handleLogRowClick(donor)}>
            <Phone className="mr-2 h-4 w-4" />
            Log Call
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <>
      <div className="mb-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-2xl font-headline mb-1">{campaign.name}</CardTitle>
                <CardDescription>
                  {(donors || []).length} donors to call. Log your interactions below.
                </CardDescription>
              </div>
              <div className="w-full md:w-1/4">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-muted-foreground">Progress</span>
                    <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
                 </div>
                <Progress value={progress} className="w-full" />
              </div>
            </div>
          </CardHeader>
          <CardFooter className="border-t pt-4 flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isSyncing}>
                  {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  Sync to Bloomerang
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sync to Bloomerang?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send all logged interactions for this campaign as notes to their respective donors in Bloomerang. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSync} disabled={isSyncing}>
                    {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Yes, Sync Now
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isRefreshing}>
                  {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Check for Updates
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Check for Updates</AlertDialogTitle>
                  <AlertDialogDescription>
                    Enter your Bloomerang API key to refresh donor data. This will fetch the latest giving history and household information.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-2">
                  <Label htmlFor="api-key-refresh">Bloomerang API Key</Label>
                  <div className='relative'>
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="api-key-refresh"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pl-10"
                      placeholder="api_key_..."
                    />
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRefreshData} disabled={isRefreshing || !apiKey}>
                    {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Refresh Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-x-auto">
        <Table className="w-full min-w-[1024px]">
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow className="hover:bg-card">
              <TableHead className="w-[250px]">Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Last Interaction</TableHead>
              <TableHead className="text-right">Last Gift Date</TableHead>
              <TableHead className="text-right">Last Gift Amt</TableHead>
              <TableHead className="text-right">Total Giving</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingDonors && (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                </TableRow>
            )}
            {!isLoadingDonors && groupedDonors.map((item, index) => {
              if ('isHousehold' in item) {
                return (
                  <React.Fragment key={`hh-${index}`}>
                    <TableRow className="bg-secondary/50 hover:bg-secondary/80">
                      <TableCell colSpan={8} className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          {item.householdName}
                        </div>
                      </TableCell>
                    </TableRow>
                    {item.members.map(member => renderDonorRow(member, true))}
                  </React.Fragment>
                );
              } else {
                return renderDonorRow(item as Donor);
              }
            })}
          </TableBody>
        </Table>
      </div>
      {selectedDonor && (
        <InteractionLogger
          isOpen={isLoggerOpen}
          onClose={handleLoggerClose}
          donor={selectedDonor}
          onInteractionLogged={handleLocalInteractionLogged}
        />
      )}
    </>
  );
}
