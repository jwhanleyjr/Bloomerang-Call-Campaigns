
'use server';

/**
 * @fileOverview Enriches a list of donors with data from the Bloomerang API.
 * 
 * - enrichDonors - A Genkit flow that takes a list of donors and enriches them.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { DonorSchema, GivingSummarySchema } from '@/lib/schemas';

const EnrichDonorsInputSchema = z.object({
  donors: z.array(DonorSchema),
  apiKey: z.string().describe("The Bloomerang API key.").optional(),
});

const EnrichDonorsOutputSchema = z.array(DonorSchema);


// Wrapper function that the app will call
export async function enrichDonors(input: z.infer<typeof EnrichDonorsInputSchema>): Promise<z.infer<typeof EnrichDonorsOutputSchema>> {
  return enrichDonorsFlow(input);
}


export const enrichDonorsFlow = ai.defineFlow(
  {
    name: 'enrichDonorsFlow',
    inputSchema: EnrichDonorsInputSchema,
    outputSchema: EnrichDonorsOutputSchema,
  },
  async ({ donors }) => {
    // This is a placeholder. The enrichment feature has been disabled due to persistent API errors.
    // We will return the donors as-is.
    const enrichedDonors = donors.map(donor => ({
      ...donor,
      address: donor.address || 'N/A',
      email: donor.email,
      phone: donor.phone,
      householdId: donor.householdId,
      householdName: donor.householdName || 'Household',
      givingSummary: donor.givingSummary || {
        totalDonations: 0,
        lastDonationDate: null,
        lastDonationAmount: 0,
        averageGift: 0,
      },
      aiSummary: donor.aiSummary || 'AI Summary not available.',
    }));

    return enrichedDonors;
  }
);
