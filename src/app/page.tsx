
"use client";

import { useState, useMemo, useEffect } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase, useAuth, initiateAnonymousSignIn } from '@/firebase';

import AppHeader from '@/components/app-header';
import { Toaster } from '@/components/ui/toaster';
import type { Donor, Campaign, Interaction } from '@/lib/types';
import CampaignDashboard from '@/components/campaign-dashboard';
import CallListTable from '@/components/call-list-table';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();

  useEffect(() => {
    // If auth is loaded and there's no user, sign in anonymously.
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

  const campaignsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'campaigns');
  }, [firestore, user]);
  
  const { data: campaigns, isLoading: isLoadingCampaigns, error } = useCollection<Campaign>(campaignsCollection);

  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  const activeCampaign = useMemo(() => {
    if (activeCampaignId) {
        const foundCampaign = campaigns?.find(c => c.id === activeCampaignId);
        if (foundCampaign) {
            return foundCampaign;
        }
        return { id: activeCampaignId, name: 'Loading Campaign...', createdAt: new Date(), donors: [] };
    }
    return null;
  }, [campaigns, activeCampaignId]);


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
    if (!activeCampaignId || !user || !activeCampaign) return;
    
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
            campaignName: activeCampaign.name,
            subject: interaction.nextStep,
            dueDate: interaction.followUpDate,
            status: 'Active',
            channel: 'Phone',
            purpose: 'FollowUp',
        });
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

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
            onSelectCampaign={handleSelectCampaign}
            isLoading={isLoadingCampaigns}
          />
        )}
      </main>
      <Toaster />
    </div>
  );
}
