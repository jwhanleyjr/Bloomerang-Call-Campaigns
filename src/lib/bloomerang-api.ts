import { z } from 'zod';

const DEFAULT_GIVING_SUMMARY = {
  totalDonations: 0,
  lastDonationDate: null,
  lastDonationAmount: 0,
  averageGift: 0,
};

const ConstituentApiSchema = z
  .object({
    Id: z.number(),
    AccountNumber: z.number().optional(),
    FullName: z.string().optional(),
    PrimaryPhone: z
      .object({
        Number: z.string().optional(),
      })
      .partial()
      .optional(),
    PrimaryEmail: z
      .object({
        Value: z.string().optional(),
      })
      .partial()
      .optional(),
    PrimaryAddress: z
      .object({
        Street: z.string().optional(),
        City: z.string().optional(),
        State: z.string().optional(),
        PostalCode: z.string().optional(),
      })
      .partial()
      .optional(),
    HouseholdId: z.number().nullable().optional(),
    Type: z.string().optional(),
  })
  .strip();

const HouseholdApiSchema = z
  .object({
    Id: z.number(),
    AccountNumber: z.number().optional(),
    FullName: z.string().optional(),
    RecognitionName: z.string().optional(),
    MemberIds: z.array(z.number()).default([]),
  })
  .strip();

export type ConstituentApi = z.infer<typeof ConstituentApiSchema>;
export type HouseholdApi = z.infer<typeof HouseholdApiSchema>;

function formatAddress(address?: ConstituentApi['PrimaryAddress']): string | undefined {
  if (!address) return undefined;

  const parts = [address.Street, address.City, address.State, address.PostalCode].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

function getApiKey() {
  const apiKey = process.env.BLOOMERANG_API_KEY;
  if (!apiKey) {
    throw new Error('Bloomerang API key is missing. Set BLOOMERANG_API_KEY in your environment.');
  }
  return apiKey;
}

const BASE_URL = process.env.BLOOMERANG_API_BASE ?? 'https://api.bloomerang.co';

export async function fetchConstituent(constituentId: string): Promise<ConstituentApi> {
  const key = getApiKey();

  const response = await fetch(`${BASE_URL}/v2/constituent/${constituentId}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await safeReadError(response);
    throw new Error(`Constituent lookup failed for ${constituentId}: ${message}`);
  }

  const data = await response.json();
  const parsed = ConstituentApiSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Unexpected constituent response for ${constituentId}: ${parsed.error.message}`);
  }

  return parsed.data;
}

export async function fetchHousehold(householdId: string): Promise<HouseholdApi> {
  const key = getApiKey();

  const response = await fetch(`${BASE_URL}/v2/household/${householdId}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await safeReadError(response);
    throw new Error(`Household lookup failed for ${householdId}: ${message}`);
  }

  const data = await response.json();
  const parsed = HouseholdApiSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Unexpected household response for ${householdId}: ${parsed.error.message}`);
  }

  return parsed.data;
}

export function normalizeConstituent(constituent: ConstituentApi) {
  return {
    id: String(constituent.Id),
    name: constituent.FullName,
    phone: constituent.PrimaryPhone?.Number,
    email: constituent.PrimaryEmail?.Value,
    address: formatAddress(constituent.PrimaryAddress),
    householdId: constituent.HouseholdId ? String(constituent.HouseholdId) : undefined,
    householdName: undefined as string | undefined,
    givingSummary: { ...DEFAULT_GIVING_SUMMARY },
  };
}

export function normalizeHousehold(household: HouseholdApi) {
  return {
    id: String(household.Id),
    accountNumber: household.AccountNumber ? String(household.AccountNumber) : undefined,
    name: household.FullName || household.RecognitionName,
    memberIds: household.MemberIds.map(String),
  };
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text || response.statusText;
  } catch (error) {
    return response.statusText;
  }
}
