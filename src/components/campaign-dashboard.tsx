
"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowRight, FolderKanban } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import FileImporter from './file-importer';
import type { Campaign, Donor } from '@/lib/types';
import { format } from 'date-fns';

type CampaignDashboardProps = {
  campaigns: Campaign[];
  onNewCampaign: (campaign: Campaign) => void;
  onSelectCampaign: (campaign: Campaign) => void;
};

function calculateProgress(donors: Donor[]): number {
  if (donors.length === 0) return 0;
  const completedCount = donors.filter(d => d.status === 'completed').length;
  return (completedCount / donors.length) * 100;
}

export default function CampaignDashboard({ campaigns, onNewCampaign, onSelectCampaign }: CampaignDashboardProps) {
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  const handleCampaignCreated = (newCampaign: Campaign) => {
    onNewCampaign(newCampaign);
    setIsImporterOpen(false); // Close the importer dialog
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Campaigns</h2>
        <Button onClick={() => setIsImporterOpen(true)}>
          <PlusCircle className="mr-2" />
          New Call Campaign
        </Button>
      </div>

      {campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map(campaign => {
            const progress = calculateProgress(campaign.donors);
            return (
              <Card key={campaign.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="font-headline">{campaign.name}</CardTitle>
                  <CardDescription>
                    Created on {format(campaign.createdAt, 'PPP')}
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
                        <span>{campaign.donors.filter(d => d.status === 'completed').length} of {campaign.donors.length} called</span>
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
        <div className="text-center py-20 px-6 border-2 border-dashed rounded-lg">
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

      {isImporterOpen && <FileImporter onCampaignCreated={handleCampaignCreated} />}
    </div>
  );
}
