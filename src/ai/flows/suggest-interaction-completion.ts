'use server';

/**
 * @fileOverview Provides suggested copy for completing an interaction log.
 *
 * - suggestInteractionCompletion - A function that generates suggested copy for interaction logs.
 * - SuggestInteractionCompletionInput - The input type for the suggestInteractionCompletion function.
 * - SuggestInteractionCompletionOutput - The return type for the suggestInteractionCompletion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestInteractionCompletionInputSchema = z.object({
  callOutcome: z.string().describe('The outcome of the call (e.g., Left VM, No Answer, Completed).'),
  notes: z.string().describe('Any notes taken during the call.'),
  previousInteractions: z.string().describe('Summary of previous interactions with the donor.'),
});
export type SuggestInteractionCompletionInput = z.infer<
  typeof SuggestInteractionCompletionInputSchema
>;

const SuggestInteractionCompletionOutputSchema = z.object({
  suggestedCopy: z
    .string()
    .describe('AI-generated suggested copy for completing the interaction log.'),
});
export type SuggestInteractionCompletionOutput = z.infer<
  typeof SuggestInteractionCompletionOutputSchema
>;

export async function suggestInteractionCompletion(
  input: SuggestInteractionCompletionInput
): Promise<SuggestInteractionCompletionOutput> {
  return suggestInteractionCompletionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestInteractionCompletionPrompt',
  input: {schema: SuggestInteractionCompletionInputSchema},
  output: {schema: SuggestInteractionCompletionOutputSchema},
  prompt: `You are an AI assistant designed to help users quickly complete interaction logs after a call with a donor.

  Based on the call outcome, any notes taken, and a summary of previous interactions, suggest concise and helpful copy for completing the interaction log.

  Call Outcome: {{{callOutcome}}}
  Notes: {{{notes}}}
  Previous Interactions: {{{previousInteractions}}}

  Suggested Copy:`,
});

const suggestInteractionCompletionFlow = ai.defineFlow(
  {
    name: 'suggestInteractionCompletionFlow',
    inputSchema: SuggestInteractionCompletionInputSchema,
    outputSchema: SuggestInteractionCompletionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
