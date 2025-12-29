'use server';

import { z } from 'zod';
import { suggestInteractionCompletion, SuggestInteractionCompletionInput } from '@/ai/flows/suggest-interaction-completion';
import type { Interaction } from '@/lib/types';

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
