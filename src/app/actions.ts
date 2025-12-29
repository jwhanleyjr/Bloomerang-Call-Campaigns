'use server';

import { z } from 'zod';
import { suggestInteractionCompletion, SuggestInteractionCompletionInput } from '@/ai/flows/suggest-interaction-completion';
import type { Interaction, Donor, GivingSummary } from '@/lib/types';

export async function getAiSuggestion(input: SuggestInteractionCompletionInput) {
  // In a real app, you might add more context or safety checks here.
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

  // Simulate API call to Bloomerang with a delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate a potential API failure for queue/retry demonstration
  if (Math.random() > 0.95) { // 5% chance of failure
    throw new Error('Bloomerang API is currently unavailable.');
  }

  // Create an Interaction object for the audit trail/UI update.
  // In a real app, you would also get back an ID from Bloomerang.
  const newInteraction: Interaction = {
    id: `int-${Date.now()}`,
    outcome: validatedInput.outcome,
    notes: validatedInput.notes,
    nextStep: validatedInput.nextStep,
    followUpDate: validatedInput.followUpDate,
    loggedAt: new Date(),
    loggedBy: 'Current User', // In a real app, this would come from auth session.
  };

  // Here you would save the interaction to your database (audit trail)
  // and handle queuing/retries if the Bloomerang API call failed.

  return newInteraction;
}


// This is a new function to simulate enriching donor data from an external API
export async function enrichDonors(donors: Donor[]): Promise<Donor[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // In a real app, you would loop through donors and call the Bloomerang API
  // for each one to get their full details.
  // For this prototype, we'll just add some mock enriched data.
  
  const enrichedDonors = donors.map(donor => {
    // Simulate finding household members
    const isHousehold = Math.random() > 0.7; // 30% chance of being in a household
    const householdId = isHousehold ? `hh-${donor.id.substring(0,2)}` : undefined;
    const householdName = isHousehold ? `${donor.name.split(' ')[1]} Household` : undefined;

    // Simulate fetching giving summary
    const givingSummary: GivingSummary = {
        totalDonations: donor.givingSummary?.totalDonations || Math.floor(Math.random() * 5000),
        lastDonationDate: new Date(),
        lastDonationAmount: Math.floor(Math.random() * 500),
        averageGift: Math.floor(Math.random() * 150),
    };

    return {
      ...donor,
      address: donor.address || '123 Fake St, Anytown USA',
      householdId: donor.householdId || householdId,
      householdName: donor.householdName || householdName,
      givingSummary,
    };
  });

  return enrichedDonors;
}

export async function syncToBloomerang(campaignName: string, interactions: Interaction[]) {
  console.log(`Starting sync for campaign: ${campaignName}`);
  console.log(`Found ${interactions.length} interactions to sync.`);
  
  // Simulate a longer network delay for a "bulk" operation
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Simulate some failures
  const successes = interactions.filter(() => Math.random() > 0.1); // 90% success rate
  const failures = interactions.length - successes.length;

  console.log(`Successfully synced ${successes.length} interactions.`);
  if (failures > 0) {
    console.error(`Failed to sync ${failures} interactions.`);
    // In a real app, you would implement retry logic or flag these for manual review
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
