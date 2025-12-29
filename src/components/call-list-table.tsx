
"use client";

import React, { useState, useMemo } from 'react';
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
import { Phone, CheckCircle, XCircle, Clock, Users, User, UploadCloud, Loader2 } from 'lucide-react';
import InteractionLogger from './interaction-logger';
import type { Donor, Interaction, Campaign } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { syncToBloomerang } from '@/app/actions';
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
};

function calculateProgress(donors: Donor[]): number {
  if (donors.length === 0) return 0;
  const completedCount = donors.filter(d => d.status === 'completed').length;
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
      groupedList.push({ isHousehold: true, householdName: members[0].householdName || 'Household', members });
    } else {
      // If a household has only one member from the list, treat as individual
      individuals.push(...members);
    }
  });
  
  // Sort individuals to appear after households
  return [...groupedList, ...individuals.sort((a,b) => a.name.localeCompare(b.name))];
}

export default function CallListTable({ campaign, onUpdateDonor }: CallListTableProps) {
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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

  const handleInteractionLogged = (donor: Donor, interaction: Interaction) => {
    const updatedDonor = {
      ...donor,
      status: 'completed',
      lastInteraction: interaction,
    } as Donor;
    onUpdateDonor(updatedDonor);
    handleLoggerClose();
  };

  const handleSync = async () => {
    setIsSyncing(true);
    const interactionsToSync = campaign.donors
      .map(d => d.lastInteraction)
      .filter((i): i is Interaction => i !== null);

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
  
  const progress = calculateProgress(campaign.donors);
  const groupedDonors = useMemo(() => groupDonors(campaign.donors), [campaign.donors]);

  const renderDonorRow = (donor: Donor, isHouseholdMember: boolean = false) => {
    const status = statusConfig[donor.status];
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
                {formatDistanceToNow(donor.lastInteraction.loggedAt, { addSuffix: true })}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </TableCell>
        <TableCell className="text-right font-mono">
          ${(donor.givingSummary.totalDonations || 0).toLocaleString()}
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
                  {campaign.donors.length} donors to call. Log your interactions below.
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
          <CardFooter className="border-t pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button>
                  <UploadCloud className="mr-2 h-4 w-4" />
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

          </CardFooter>
        </Card>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-x-auto">
        <Table className="w-full min-w-[640px]">
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow className="hover:bg-card">
              <TableHead className="w-[250px]">Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Last Interaction</TableHead>
              <TableHead className="text-right">Total Giving</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedDonors.map((item, index) => {
              if ('isHousehold' in item) {
                return (
                  <React.Fragment key={`hh-${index}`}>
                    <TableRow className="bg-secondary/50 hover:bg-secondary/80">
                      <TableCell colSpan={6} className="font-semibold">
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
                return renderDonorRow(item);
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
          onInteractionLogged={handleInteractionLogged}
        />
      )}
    </>
  );
}
