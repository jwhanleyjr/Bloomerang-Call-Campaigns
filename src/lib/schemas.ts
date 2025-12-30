
import { z } from 'zod';

export const InteractionSchema = z.object({
  id: z.string(),
  outcome: z.enum(['completed', 'left-vm', 'no-answer', 'bad-number']).nullable(),
  notes: z.string(),
  nextStep: z.string().optional(),
  followUpDate: z.string().optional(), // Using string for date transport
  loggedAt: z.string(), // Using string for date transport
  loggedBy: z.string(),
});

export const GivingSummarySchema = z.object({
  totalDonations: z.number(),
  lastDonationDate: z.string().nullable(), // Using string for date transport
  lastDonationAmount: z.number(),
  averageGift: z.number(),
});

export const DonorSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['pending', 'completed', 'skipped', 'follow-up']),
  lastInteraction: InteractionSchema.nullable(),
  givingSummary: GivingSummarySchema,
  householdId: z.string().optional(),
  householdName: z.string().optional(),
  aiSummary: z.string().optional(),
});

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  donors: z.array(DonorSchema).optional(),
  createdAt: z.string(), // Using string for date transport
});
