
"use client";

import { useState, useMemo, useEffect } from 'react';
import { collection, doc, getDocs } from 'firebase/firestore';
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
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

  const campaignsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'campaigns');
  }, [firestore, user]);
  
  const { data: rawCampaigns, isLoading: isLoadingCampaigns, error } = useCollection<Campaign>(campaignsCollectionRef);
  
  const [campaignsWithDonors, setCampaignsWithDonors] = useState<Campaign[]>([]);
  const [isDonorLoading, setIsDonorLoading] = useState(true);

  useEffect(() => {
    if (!rawCampaigns || !user) {
        setCampaignsWithDonors([]);
        setIsDonorLoading(!isLoadingCampaigns);
        return;
    };

    let isMounted = true;
    setIsDonorLoading(true);

    const fetchDonorsForAllCampaigns = async () => {
        const campaignsData = await Promise.all(
            rawCampaigns.map(async (campaign) => {
                const donorsCollection = collection(firestore, 'users', user.uid, 'campaigns', campaign.id, 'donors');
                const donorsSnapshot = await getDocs(donorsCollection);
                const donors = donorsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Donor));
                return { ...campaign, donors };
            })
        );
        if (isMounted) {
            setCampaignsWithDonors(campaignsData);
            setIsDonorLoading(false);
        }
    };
    
    fetchDonorsForAllCampaigns();

    return () => {
        isMounted = false;
    };
  }, [rawCampaigns, user, firestore, isLoadingCampaigns]);


  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  const activeCampaign = useMemo(() => {
    if (activeCampaignId) {
        const foundCampaign = campaignsWithDonors?.find(c => c.id === activeCampaignId);
        if (foundCampaign) {
            return foundCampaign;
        }
         // Fallback for when donors are still loading for the selected campaign
        const rawCampaign = rawCampaigns?.find(c => c.id === activeCampaignId);
        if (rawCampaign) {
            return { ...rawCampaign, donors: [] };
        }
        return { id: activeCampaignId, name: 'Loading Campaign...', createdAt: new Date(), donors: [] };
    }
    return null;
  }, [campaignsWithDonors, rawCampaigns, activeCampaignId]);


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

    // Optimistically update local state
    setCampaignsWithDonors(prev => prev.map(c => 
      c.id === activeCampaignId 
        ? { ...c, donors: c.donors?.map(d => d.id === updatedDonor.id ? updatedDonor : d) } 
        : c
    ));
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

    const interactionLogRef = collection(firestore, 'users', user.uid, 'campaigns', activeCampaignId, 'donors', donor.id, 'interactions');
    addDocumentNonBlocking(interactionLogRef, interaction);
    
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
            campaigns={campaignsWithDonors}
            onSelectCampaign={handleSelectCampaign}
            isLoading={isLoadingCampaigns || isDonorLoading}
          />
        )}
      </main>
      <Toaster />
    </div>
  );
}
