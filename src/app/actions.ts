'use server';

import { z } from 'zod';
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

export async function enrichDonors(donors: Donor[]): Promise<Donor[]> {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const enrichedDonors = await Promise.all(donors.map(async (donor) => {
    const isHousehold = Math.random() > 0.7;
    const householdId = isHousehold ? `hh-${donor.id.substring(0, 2)}` : undefined;
    const householdName = isHousehold ? `${donor.name.split(' ')[1]} Household` : undefined;

    const givingSummary: GivingSummary = {
      totalDonations: donor.givingSummary?.totalDonations || Math.floor(Math.random() * 5000),
      lastDonationDate: new Date(),
      lastDonationAmount: Math.floor(Math.random() * 500),
      averageGift: Math.floor(Math.random() * 150),
    };

    // Simulate fetching past notes
    const pastNotes = [
      "Jan 15: Called to thank for EOY gift. Seemed pleased.",
      "Mar 02: Sent email about the new building fund. Expressed interest in capital projects.",
      "Apr 20: Met at the gala. Mentioned their daughter is starting college in the fall."
    ].join('\n');
    
    let aiSummary = 'No summary available.';
    try {
        const summaryResult = await summarizeNotes({ notes: pastNotes });
        aiSummary = summaryResult.summary;
    } catch (e) {
        console.error("AI summarization failed", e);
    }

    return {
      ...donor,
      address: donor.address || '123 Fake St, Anytown USA',
      householdId: donor.householdId || householdId,
      householdName: donor.householdName || householdName,
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
