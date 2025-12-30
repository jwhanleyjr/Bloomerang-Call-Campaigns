
"use client";

import { useState, useMemo } from 'react';
import { collection, doc, setDoc, addDoc } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';

import AppHeader from '@/components/app-header';
import { Toaster } from '@/components/ui/toaster';
import type { Donor, Campaign, Interaction } from '@/lib/types';
import CampaignDashboard from '@/components/campaign-dashboard';
import CallListTable from '@/components/call-list-table';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function Home() {
  const { user } = useUser();
  const firestore = useFirestore();

  const campaignsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'campaigns');
  }, [firestore, user]);
  
  const { data: campaigns, isLoading: isLoadingCampaigns } = useCollection<Campaign>(campaignsCollection);

  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  const activeCampaign = useMemo(() => {
    return campaigns?.find(c => c.id === activeCampaignId) || null;
  }, [campaigns, activeCampaignId]);

  const handleNewCampaign = async (newCampaign: Omit<Campaign, 'id' | 'donors'> & {donors: Donor[]}) => {
    if (!campaignsCollection) return;
    
    const campaignDocRef = await addDoc(campaignsCollection, {
      name: newCampaign.name,
      createdAt: newCampaign.createdAt,
    });
    
    const donorsCollectionRef = collection(firestore, 'users', user.uid, 'campaigns', campaignDocRef.id, 'donors');
    
    // Batch write donors
    for (const donor of newCampaign.donors) {
      const donorDocRef = doc(donorsCollectionRef, donor.id);
      setDocumentNonBlocking(donorDocRef, donor, { merge: true });
    }

    setActiveCampaignId(campaignDocRef.id);
  };
  
  const handleSelectCampaign = (campaign: Campaign) => {
    setActiveCampaignId(campaign.id);
  };

  const handleBackToDashboard = () => {
    setActiveCampaignId(null);
  };

  const updateDonorInCampaign = (updatedDonor: Donor) => {
    if (!activeCampaignId || !user) return;
    
    const donorDocRef = doc(firestore, 'users', user.uid, 'campaigns', activeCampaignId, 'donors', updatedDonor.id);
    setDocumentNonBlocking(donorDocRef, updatedDonor, { merge: true });
  };
  
  const handleInteractionLogged = (donor: Donor, interaction: Interaction) => {
    if (!activeCampaignId || !user) return;
    
    const newStatus = interaction.followUpDate ? 'follow-up' : 'completed';
    const updatedDonor: Donor = {
      ...donor,
      status: newStatus,
      lastInteraction: interaction,
    };
    updateDonorInCampaign(updatedDonor);

    // Save the interaction log to a subcollection
    const interactionLogRef = collection(firestore, 'users', user.uid, 'campaigns', activeCampaignId, 'donors', donor.id, 'interactions');
    addDocumentNonBlocking(interactionLogRef, interaction);
    
    // If there's a follow-up, create a task
    if (interaction.followUpDate && interaction.nextStep) {
        const tasksCollectionRef = collection(firestore, 'users', user.uid, 'tasks');
        addDocumentNonBlocking(tasksCollectionRef, {
            donorId: donor.id,
            donorName: donor.name,
            campaignId: activeCampaignId,
            campaignName: activeCampaign?.name,
            subject: interaction.nextStep,
            dueDate: interaction.followUpDate,
            status: 'Active',
            channel: 'Phone',
            purpose: 'FollowUp',
        });
    }
  };


  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader onBackToDashboard={handleBackToDashboard} hasActiveCampaign={!!activeCampaignId} />
      <main className="flex-grow container mx-auto px-4 py-8">
        {activeCampaign ? (
          <CallListTable 
            campaign={activeCampaign} 
            onUpdateDonor={updateDonorInCampaign}
            onInteractionLogged={handleInteractionLogged}
          />
        ) : (
          <CampaignDashboard 
            campaigns={campaigns || []}
            onNewCampaign={handleNewCampaign}
            onSelectCampaign={handleSelectCampaign}
            isLoading={isLoadingCampaigns}
          />
        )}
      </main>
      <Toaster />
    </div>
  );
}
