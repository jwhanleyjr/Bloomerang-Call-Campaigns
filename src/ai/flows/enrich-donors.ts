
'use server';

/**
 * @fileOverview Enriches a list of donors with data from the Bloomerang API.
 * 
 * - enrichDonors - A Genkit flow that takes a list of donors and enriches them.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { DonorSchema, GivingSummarySchema } from '@/lib/schemas';
import { summarizeNotes } from './summarize-notes';
import fetch from 'node-fetch';

const EnrichDonorsInputSchema = z.object({
  donors: z.array(DonorSchema),
  apiKey: z.string().describe("The Bloomerang API key."),
});

const EnrichDonorsOutputSchema = z.array(DonorSchema);


// Wrapper function that the app will call
export async function enrichDonors(input: z.infer<typeof EnrichDonorsInputSchema>): Promise<z.infer<typeof EnrichDonorsOutputSchema>> {
  return enrichDonorsFlow(input);
}


// Helper function to fetch from Bloomerang API
const bloomerangApiFetch = async (endpoint: string, apiKey: string) => {
    const url = `https://api.bloomerang.co/v2/${endpoint}`;
    
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


export const enrichDonorsFlow = ai.defineFlow(
  {
    name: 'enrichDonorsFlow',
    inputSchema: EnrichDonorsInputSchema,
    outputSchema: EnrichDonorsOutputSchema,
  },
  async ({ donors, apiKey }) => {

    if (!apiKey) {
      throw new Error("Bloomerang API key was not provided to the flow.");
    }

    const enrichedDonors = await Promise.all(donors.map(async (donor) => {
        // 1. Fetch Constituent
        const constituent = await bloomerangApiFetch(`constituent/${donor.id}`, apiKey) as any;

        // 2. Fetch Transactions
        const transactionsData = await bloomerangApiFetch(`transactions?accountId=${donor.id}`, apiKey) as any;
        const transactions = transactionsData.Results || [];

        let givingSummary: z.infer<typeof GivingSummarySchema> = {
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
                lastDonationDate: lastTransaction.Date, // Keep as string
                lastDonationAmount: lastTransaction.Amount,
                averageGift: total / transactions.length,
            };
        }

        // 3. Fetch Notes and generate AI Summary
        const notesData = await bloomerangApiFetch(`notes?accountId=${donor.id}`, apiKey) as any;
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
            email: constituent.PrimaryEmail?.Value || donor.email,
            phone: constituent.PrimaryPhone?.Number || donor.phone,
            householdId: constituent.HouseholdId,
            householdName: constituent.HouseholdName || 'Household',
            givingSummary,
            aiSummary,
        };
    }));

    return enrichedDonors;
  }
);
