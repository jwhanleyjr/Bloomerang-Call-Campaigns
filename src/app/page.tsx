
"use client";

import { useState } from 'react';
import AppHeader from '@/components/app-header';
import { Toaster } from '@/components/ui/toaster';
import type { Donor, Campaign } from '@/lib/types';
import CampaignDashboard from '@/components/campaign-dashboard';
import CallListTable from '@/components/call-list-table';
import { mockDonors } from '@/lib/data';

const initialCampaigns: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Christmas Thank You',
    donors: mockDonors.slice(0, 4),
    createdAt: new Date('2023-12-26'),
  },
  {
    id: 'camp-2',
    name: 'Spring Fundraiser 2024',
    donors: mockDonors.slice(4),
    createdAt: new Date('2024-04-15'),
  },
];


export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);

  const handleNewCampaign = (newCampaign: Campaign) => {
    setCampaigns(prev => [...prev, newCampaign]);
    setActiveCampaign(newCampaign);
  };
  
  const handleSelectCampaign = (campaign: Campaign) => {
    setActiveCampaign(campaign);
  };

  const handleBackToDashboard = () => {
    setActiveCampaign(null);
  };

  const updateDonorInCampaign = (updatedDonor: Donor) => {
    if (!activeCampaign) return;

    const updatedDonors = activeCampaign.donors.map(donor => 
      donor.id === updatedDonor.id ? updatedDonor : donor
    );
    
    const updatedCampaign = { ...activeCampaign, donors: updatedDonors };

    setActiveCampaign(updatedCampaign);
    setCampaigns(prevCampaigns => 
      prevCampaigns.map(c => c.id === updatedCampaign.id ? updatedCampaign : c)
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader onBackToDashboard={handleBackToDashboard} hasActiveCampaign={!!activeCampaign} />
      <main className="flex-grow container mx-auto px-4 py-8">
        {activeCampaign ? (
          <CallListTable 
            campaign={activeCampaign} 
            onUpdateDonor={updateDonorInCampaign} 
          />
        ) : (
          <CampaignDashboard 
            campaigns={campaigns}
            onNewCampaign={handleNewCampaign}
            onSelectCampaign={handleSelectCampaign}
          />
        )}
      </main>
      <Toaster />
    </div>
  );
}
