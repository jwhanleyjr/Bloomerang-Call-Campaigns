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

async function buildEnrichedDonor(donor: Donor): Promise<{ donor: Donor; additionalMembers: Donor[] }> {
  try {
    const constituent = await fetchConstituent(donor.id);
    const normalizedConstituent = normalizeConstituent(constituent);

    let householdName = donor.householdName;
    let householdMemberIds: string[] = [];

    if (normalizedConstituent.householdId) {
      const household = await fetchHousehold(normalizedConstituent.householdId);
      const normalizedHousehold = normalizeHousehold(household);
      householdName = normalizedHousehold.name || householdName;
      householdMemberIds = normalizedHousehold.memberIds;
    }

    const enrichedDonor: Donor = {
      ...donor,
      name: normalizedConstituent.name || donor.name,
      phone: donor.phone || normalizedConstituent.phone || '',
      email: donor.email || normalizedConstituent.email || '',
      address: donor.address || normalizedConstituent.address,
      householdId: normalizedConstituent.householdId || donor.householdId,
      householdName,
      givingSummary: mergeGivingSummary(donor.givingSummary, normalizedConstituent.givingSummary as GivingSummary),
    };

    const additionalMembers: Donor[] = [];

    for (const memberId of householdMemberIds) {
      if (memberId === enrichedDonor.id) continue;

      const member = await fetchConstituent(memberId);
      const normalizedMember = normalizeConstituent(member);

      additionalMembers.push({
        id: normalizedMember.id,
        name: normalizedMember.name || `Constituent ${normalizedMember.id}`,
        phone: normalizedMember.phone || '',
        email: normalizedMember.email || '',
        address: normalizedMember.address,
        status: donor.status,
        lastInteraction: null,
        givingSummary: mergeGivingSummary(undefined, normalizedMember.givingSummary as GivingSummary),
        householdId: normalizedMember.householdId || normalizedConstituent.householdId,
        householdName: householdName || normalizedConstituent.householdName,
      });
    }

    return { donor: enrichedDonor, additionalMembers };
  } catch (error) {
    console.error('Failed to enrich donor', donor.id, error);
    return { donor, additionalMembers: [] };
  }
}

export const enrichDonorsFlow = ai.defineFlow(
  {
    name: 'enrichDonorsFlow',
    inputSchema: EnrichDonorsInputSchema,
    outputSchema: EnrichDonorsOutputSchema,
  },
  async ({ donors }) => {
    const donorMap = new Map<string, Donor>();

    for (const donor of donors) {
      const { donor: enrichedDonor, additionalMembers } = await buildEnrichedDonor(donor);

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
