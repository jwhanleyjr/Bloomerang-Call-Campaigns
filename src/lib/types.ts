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

export type Donor = {
  id: string; // Bloomerang Constituent ID
  name: string;
  phone: string;
  email: string;
  status: 'pending' | 'completed' | 'skipped';
  lastInteraction: Interaction | null;
  totalDonations: number;
  lastDonationDate: Date;
};
