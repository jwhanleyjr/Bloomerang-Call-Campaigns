
"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowRight, FolderKanban, Loader2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import FileImporter from './file-importer';
import type { Campaign, Donor } from '@/lib/types';
import { format } from 'date-fns';
import { collection, addDoc, doc, Timestamp } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

type CampaignDashboardProps = {
  campaigns: Campaign[];
  onSelectCampaign: (campaign: Campaign) => void;
  isLoading: boolean;
};

function calculateProgress(donors: Donor[] | undefined): number {
  if (!donors || donors.length === 0) return 0;
  const completedCount = donors.filter(d => d.status === 'completed').length;
  return (completedCount / donors.length) * 100;
}

// Helper to safely convert Firestore Timestamp to Date
const toDate = (date: Date | Timestamp | undefined): Date => {
    if (date instanceof Timestamp) {
      return date.toDate();
    }
    if (date instanceof Date) {
      return date;
    }
    return new Date();
};


export default function CampaignDashboard({ campaigns, onSelectCampaign, isLoading }: CampaignDashboardProps) {
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleCampaignCreated = async (campaignName: string, donors: Donor[]) => {
    if (!user) {
        toast({ title: 'Error', description: 'You must be logged in to create a campaign.', variant: 'destructive' });
        return;
    }

    try {
        const campaignsCollectionRef = collection(firestore, 'users', user.uid, 'campaigns');
        const newCampaignData = { name: campaignName, createdAt: new Date() };
        
        const campaignDocRef = await addDoc(campaignsCollectionRef, newCampaignData);
        
        const donorsCollectionRef = collection(firestore, 'users', user.uid, 'campaigns', campaignDocRef.id, 'donors');
        
        for (const donor of donors) {
            const donorDocRef = doc(donorsCollectionRef, donor.id);
            setDocumentNonBlocking(donorDocRef, donor, { merge: true });
        }
        
        setIsImporterOpen(false);
        onSelectCampaign({ id: campaignDocRef.id, ...newCampaignData, donors });

    } catch (error) {
        console.error("Error creating campaign:", error);
        toast({ title: 'Error Creating Campaign', description: 'Could not save the new campaign. Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Campaigns</h2>
        <Button onClick={() => setIsImporterOpen(true)}>
          <PlusCircle className="mr-2" />
          New Call Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 md:py-20 px-6 border-2 border-dashed rounded-lg flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <h3 className="text-xl font-semibold mb-2 font-headline">Loading Campaigns...</h3>
            <p className="text-muted-foreground">Please wait while we fetch your data.</p>
        </div>
      ) : campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map(campaign => {
            const progress = calculateProgress(campaign.donors);
            const completedCount = campaign.donors?.filter(d => d.status === 'completed').length || 0;
            const totalDonors = campaign.donors?.length || 0;

            return (
              <Card key={campaign.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="font-headline">{campaign.name}</CardTitle>
                  <CardDescription>
                    Created on {format(toDate(campaign.createdAt), 'PPP')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="space-y-2">
                     <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Progress</span>
                        <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
                     </div>
                    <Progress value={progress} />
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{completedCount} of {totalDonors} called</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => onSelectCampaign(campaign)}>
                    View Campaign <ArrowRight className="ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 md:py-20 px-6 border-2 border-dashed rounded-lg">
            <div className="mx-auto bg-secondary p-4 rounded-full w-fit mb-4">
                <FolderKanban className="w-12 h-12 text-primary" />
            </div>
          <h3 className="text-xl font-semibold mb-2 font-headline">No Campaigns Yet</h3>
          <p className="text-muted-foreground mb-4">Get started by creating your first call campaign.</p>
          <Button onClick={() => setIsImporterOpen(true)}>
            <PlusCircle className="mr-2" /> Create New Campaign
          </Button>
        </div>
      )}

      <FileImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onCampaignCreated={handleCampaignCreated}
      />
    </div>
  );
}
