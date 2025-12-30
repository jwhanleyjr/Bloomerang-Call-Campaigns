'use server';

/**
 * @fileOverview Summarizes a list of donor notes using AI.
 *
 * - summarizeNotes - A function that generates a summary of past interactions.
 * - SummarizeNotesInput - The input type for the summarizeNotes function.
 * - SummarizeNotesOutput - The return type for the summarizeNotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeNotesInputSchema = z.object({
  notes: z.string().describe('A collection of all past notes for a donor, separated by newlines.'),
});
export type SummarizeNotesInput = z.infer<typeof SummarizeNotesInputSchema>;

const SummarizeNotesOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise, one-paragraph summary of the key information from the provided notes.'),
});
export type SummarizeNotesOutput = z.infer<typeof SummarizeNotesOutputSchema>;

export async function summarizeNotes(
  input: SummarizeNotesInput
): Promise<SummarizeNotesOutput> {
  return summarizeNotesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeNotesPrompt',
  input: {schema: SummarizeNotesInputSchema},
  output: {schema: SummarizeNotesOutputSchema},
  prompt: `You are an AI assistant for a non-profit organization. Your task is to summarize past interaction notes about a donor to give a fundraiser quick context before they make a call.

  Please analyze the following notes and provide a brief, one-paragraph summary. Focus on key information like past commitments, interests, complaints, or major life events.

  Notes to summarize:
  ---
  {{{notes}}}
  ---

  Generate a concise summary.`,
});

const summarizeNotesFlow = ai.defineFlow(
  {
    name: 'summarizeNotesFlow',
    inputSchema: SummarizeNotesInputSchema,
    outputSchema: SummarizeNotesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
