

export type CallOutcome = 'completed' | 'left-vm' | 'no-answer' | 'bad-number' | null;

export type Interaction = {
  id: string;
  outcome: CallOutcome;
  notes: string;
  nextStep?: string;
  followUpDate?: Date;
  loggedAt: Date;
  loggedBy: string; // For audit trail
};

export type GivingSummary = {
    totalDonations: number;
    lastDonationDate: Date | null;
    lastDonationAmount: number;
    averageGift: number;
};

export type Donor = {
  id: string; // Bloomerang Constituent ID
  name: string;
  phone: string;
  email: string;
  address?: string;
  status: 'pending' | 'completed' | 'skipped';
  lastInteraction: Interaction | null;
  givingSummary: GivingSummary;
  householdId?: string;
  householdName?: string;
};

export type Campaign = {
  id: string;
  name: string;
  donors: Donor[];
  createdAt: Date;
};
