
'use server';

import { z } from 'zod';
import { suggestInteractionCompletion, SuggestInteractionCompletionInput } from '@/ai/flows/suggest-interaction-completion';
import type { Interaction, Donor, GivingSummary } from '@/lib/types';
import { enrichDonors as enrichDonorsFlow } from '@/ai/flows/enrich-donors';

export type EnrichDonorsResult = { donors: Donor[]; error?: string };

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

export async function enrichDonors(donors: Donor[]): Promise<EnrichDonorsResult> {
  try {
    const enrichedDonors = await enrichDonorsFlow({ donors });
    // The flow returns dates as strings, so we need to convert them back to Date objects
    return {
      donors: enrichedDonors.map(donor => ({
        ...donor,
        givingSummary: {
          ...donor.givingSummary,
          lastDonationDate: donor.givingSummary?.lastDonationDate
            ? new Date(donor.givingSummary.lastDonationDate)
            : null,
        },
        lastInteraction: donor.lastInteraction ? {
          ...donor.lastInteraction,
          loggedAt: new Date(donor.lastInteraction.loggedAt),
          followUpDate: donor.lastInteraction.followUpDate ? new Date(donor.lastInteraction.followUpDate) : undefined,
        } : null
      })),
    };
  } catch (error) {
    console.error("Error during donor enrichment flow:", error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred during donor enrichment.';

    // Return the uploaded donors so the UI can continue without failing the render.
    return {
      donors,
      error: `Donor enhancement skipped: ${message}`,
    };
  }
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
