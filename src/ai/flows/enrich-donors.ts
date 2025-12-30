'use server';

/**
 * @fileOverview Enriches a list of donors with data from the Bloomerang API.
 *
 * - enrichDonors - A Genkit flow that takes a list of donors and enriches them.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { DonorSchema } from '@/lib/schemas';
import { fetchConstituent, fetchHousehold, normalizeConstituent, normalizeHousehold } from '@/lib/bloomerang-api';
import type { Donor, GivingSummary } from '@/lib/types';

const EnrichDonorsInputSchema = z.object({
  donors: z.array(DonorSchema),
});

const EnrichDonorsOutputSchema = z.array(DonorSchema);

const DEFAULT_GIVING_SUMMARY: GivingSummary = {
  totalDonations: 0,
  lastDonationDate: null,
  lastDonationAmount: 0,
  averageGift: 0,
};

function mergeGivingSummary(existing?: GivingSummary, incoming?: GivingSummary | null): GivingSummary {
  return {
    totalDonations: incoming?.totalDonations ?? existing?.totalDonations ?? DEFAULT_GIVING_SUMMARY.totalDonations,
    lastDonationDate: incoming?.lastDonationDate ?? existing?.lastDonationDate ?? DEFAULT_GIVING_SUMMARY.lastDonationDate,
    lastDonationAmount: incoming?.lastDonationAmount ?? existing?.lastDonationAmount ?? DEFAULT_GIVING_SUMMARY.lastDonationAmount,
    averageGift: incoming?.averageGift ?? existing?.averageGift ?? DEFAULT_GIVING_SUMMARY.averageGift,
  };
}

// Wrapper function that the app will call
export async function enrichDonors(input: z.infer<typeof EnrichDonorsInputSchema>): Promise<z.infer<typeof EnrichDonorsOutputSchema>> {
  return enrichDonorsFlow(input);
}

async function buildEnrichedDonor(
  donor: Donor,
  constituents: Map<string, ReturnType<typeof normalizeConstituent>>,
  households: Map<string, ReturnType<typeof normalizeHousehold>>
): Promise<{ donor: Donor; additionalMembers: Donor[] }> {
  const constituent = constituents.get(donor.id) ?? normalizeConstituent(await fetchConstituent(donor.id));
  constituents.set(donor.id, constituent);

  let householdName = donor.householdName;
  let householdMemberIds: string[] = [];

  if (constituent.householdId) {
    const household = households.get(constituent.householdId) ?? normalizeHousehold(await fetchHousehold(constituent.householdId));
    households.set(constituent.householdId, household);
    householdName = household.name || householdName;
    householdMemberIds = household.memberIds;
  }

  const enrichedDonor: Donor = {
    ...donor,
    name: constituent.name || donor.name,
    phone: donor.phone || constituent.phone || '',
    email: donor.email || constituent.email || '',
    address: donor.address || constituent.address,
    householdId: constituent.householdId || donor.householdId,
    householdName,
    givingSummary: mergeGivingSummary(donor.givingSummary, constituent.givingSummary as GivingSummary),
  };

  const additionalMembers: Donor[] = [];

  for (const memberId of householdMemberIds) {
    if (memberId === enrichedDonor.id) continue;

    const member = constituents.get(memberId) ?? normalizeConstituent(await fetchConstituent(memberId));
    constituents.set(memberId, member);

    additionalMembers.push({
      id: member.id,
      name: member.name || `Constituent ${member.id}`,
      phone: member.phone || '',
      email: member.email || '',
      address: member.address,
      status: donor.status,
      lastInteraction: null,
      givingSummary: mergeGivingSummary(undefined, member.givingSummary as GivingSummary),
      householdId: member.householdId || constituent.householdId,
      householdName: householdName || constituent.householdName,
    });
  }

  return { donor: enrichedDonor, additionalMembers };
}

export const enrichDonorsFlow = ai.defineFlow(
  {
    name: 'enrichDonorsFlow',
    inputSchema: EnrichDonorsInputSchema,
    outputSchema: EnrichDonorsOutputSchema,
  },
  async ({ donors }) => {
    const donorMap = new Map<string, Donor>();
    const constituentCache = new Map<string, ReturnType<typeof normalizeConstituent>>();
    const householdCache = new Map<string, ReturnType<typeof normalizeHousehold>>();

    for (const donor of donors) {
      const { donor: enrichedDonor, additionalMembers } = await buildEnrichedDonor(donor, constituentCache, householdCache);

      donorMap.set(enrichedDonor.id, enrichedDonor);
      additionalMembers.forEach((member) => {
        if (!donorMap.has(member.id)) {
          donorMap.set(member.id, member);
        }
      });
    }

    // Return donors along with any newly discovered household members.
    return Array.from(donorMap.values());
  }
);
