
import { Timestamp } from 'firebase/firestore';

export type CallOutcome = 'completed' | 'left-vm' | 'no-answer' | 'bad-number' | null;

export type Interaction = {
  id: string;
  outcome: CallOutcome;
  notes: string;
  nextStep?: string;
  followUpDate?: Date | Timestamp;
  loggedAt: Date | Timestamp;
  loggedBy: string; // For audit trail
};

export type GivingSummary = {
    totalDonations: number;
    lastDonationDate: Date | null | Timestamp;
    lastDonationAmount: number;
    averageGift: number;
};

export type Donor = {
  id: string; // Bloomerang Constituent ID
  name: string;
  phone: string;
  email: string;
  address?: string;
  status: 'pending' | 'completed' | 'skipped' | 'follow-up';
  lastInteraction: Interaction | null;
  givingSummary: GivingSummary;
  householdId?: string;
  householdName?: string;
  aiSummary?: string;
};

export type Campaign = {
  id: string;
  name: string;
  donors?: Donor[]; // This is not reliably populated from Firestore, it's for type convenience
  createdAt: Date | Timestamp;
};

export type Task = {
    id?: string;
    donorId: string;
    donorName: string;
    campaignId: string;
    campaignName?: string;
    subject: string;
    dueDate: Date | Timestamp;
    status: 'Active' | 'Complete';
    channel: 'Phone' | 'Email' | 'Other';
    purpose: 'FollowUp' | 'Other';
};
