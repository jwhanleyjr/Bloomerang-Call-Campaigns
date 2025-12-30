
'use server';

import { z } from 'zod';
import fetch from 'node-fetch';
import { suggestInteractionCompletion, SuggestInteractionCompletionInput } from '@/ai/flows/suggest-interaction-completion';
import { summarizeNotes } from '@/ai/flows/summarize-notes';
import type { Interaction, Donor, GivingSummary } from '@/lib/types';

export async function getAiSuggestion(input: SuggestInteractionCompletionInput) {
  const suggestion = await suggestInteractionCompletion(input);
  return suggestion;
}

const logInteractionSchema = z.object({
  donorId: z.string(),
  outcome: z.enum(['completed', 'left-vm', 'no-answer', 'bad-number']),
  notes: z.string(),
  nextStep: z.string().optional(),
  followUpDate: z.date().optional(),
});

export async function logInteraction(input: z.infer<typeof logInteractionSchema>): Promise<Interaction> {
  const validatedInput = logInteractionSchema.parse(input);

  // In a real app, this would write to Firestore. We simulate that by returning the object.
  // The client-side code will now handle the Firestore write.
  await new Promise(resolve => setTimeout(resolve, 500));

  if (Math.random() > 0.98) { // 2% chance of failure
    throw new Error('Failed to save interaction.');
  }

  const newInteraction: Interaction = {
    id: `int-${Date.now()}`,
    outcome: validatedInput.outcome,
    notes: validatedInput.notes,
    nextStep: validatedInput.nextStep,
    followUpDate: validatedInput.followUpDate,
    loggedAt: new Date(),
    loggedBy: 'Current User', 
  };

  return newInteraction;
}

const bloomerangApiFetch = async (endpoint: string) => {
    const url = `https://api.bloomerang.co/v2/${endpoint}`;
    const apiKey = process.env.BLOOMERANG_API_KEY;

    if (!apiKey) {
        console.error("BLOOMERANG_API_KEY is not set in .env file");
        throw new Error("Bloomerang API key is not configured.");
    }
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json'
        },
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Bloomerang API Error: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`Failed to fetch from Bloomerang API: ${endpoint}`);
    }

    return response.json();
};

export async function enrichDonors(donors: Donor[]): Promise<Donor[]> {
    const enrichedDonors = await Promise.all(donors.map(async (donor) => {
        // 1. Fetch Constituent
        const constituent = await bloomerangApiFetch(`constituent/${donor.id}`) as any;

        // 2. Fetch Transactions
        const transactionsData = await bloomerangApiFetch(`transactions?accountId=${donor.id}`) as any;
        const transactions = transactionsData.Results || [];

        let givingSummary: GivingSummary = {
            totalDonations: 0,
            lastDonationDate: null,
            lastDonationAmount: 0,
            averageGift: 0,
        };

        if (transactions.length > 0) {
            const total = transactions.reduce((acc: number, t: any) => acc + t.Amount, 0);
            const sortedTransactions = [...transactions].sort((a: any, b: any) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
            const lastTransaction = sortedTransactions[0];
            
            givingSummary = {
                totalDonations: total,
                lastDonationDate: new Date(lastTransaction.Date),
                lastDonationAmount: lastTransaction.Amount,
                averageGift: total / transactions.length,
            };
        }

        // 3. Fetch Notes and generate AI Summary
        const notesData = await bloomerangApiFetch(`notes?accountId=${donor.id}`) as any;
        const pastNotes = (notesData.Results || []).map((n: any) => n.Note).join('\n');
        
        let aiSummary = 'No past notes to summarize.';
        if (pastNotes) {
            try {
                const summaryResult = await summarizeNotes({ notes: pastNotes });
                aiSummary = summaryResult.summary;
            } catch (e) {
                console.error("AI summarization failed for donor " + donor.id, e);
                aiSummary = 'Could not generate AI summary.';
            }
        }

        // 4. Return enriched donor
        return {
            ...donor,
            address: constituent.PrimaryAddress?.Street || donor.address || 'N/A',
            householdId: constituent.HouseholdId,
            householdName: constituent.HouseholdName || 'Household', // Will get from household record later if needed
            givingSummary,
            aiSummary,
        };
    }));

    return enrichedDonors;
}

export async function syncToBloomerang(campaignName: string, interactions: Interaction[]) {
  console.log(`Starting sync for campaign: ${campaignName}`);
  console.log(`Found ${interactions.length} interactions to sync.`);
  
  await new Promise(resolve => setTimeout(resolve, 2000));

  // This is where you would loop through interactions and POST to /interaction
  // For now, we continue to simulate this.
  const successes = interactions.filter(() => Math.random() > 0.1);
  const failures = interactions.length - successes.length;

  console.log(`Successfully synced ${successes.length} interactions.`);
  if (failures > 0) {
    console.error(`Failed to sync ${failures} interactions.`);
    return {
      success: false,
      message: `Synced ${successes.length} interactions, but ${failures} failed.`
    }
  }

  return {
    success: true,
    message: `Successfully synced all ${successes.length} interactions to Bloomerang.`
  };
}
