import type { Donor } from './types';

export const mockDonors: Donor[] = [
  // Household 1: Vance-Thorne
  {
    id: '101',
    name: 'Eleanor Vance',
    phone: '555-0101',
    email: 'eleanor.v@example.com',
    address: '123 Oak St, Anytown, USA',
    status: 'pending',
    lastInteraction: null,
    givingSummary: {
        totalDonations: 1500,
        lastDonationDate: new Date('2023-11-15'),
        lastDonationAmount: 250,
        averageGift: 125,
    },
    householdId: 'hh-1',
    householdName: 'Vance-Thorne Household',
  },
  {
    id: '102',
    name: 'Marcus Thorne',
    phone: '555-0101', // Same phone
    email: 'marcus.t@example.com',
    address: '123 Oak St, Anytown, USA',
    status: 'pending',
    lastInteraction: null,
    givingSummary: {
        totalDonations: 750,
        lastDonationDate: new Date('2023-10-20'),
        lastDonationAmount: 100,
        averageGift: 75,
    },
    householdId: 'hh-1',
    householdName: 'Vance-Thorne Household',
  },
  // Standalone
  {
    id: '103',
    name: 'Seraphina Moon',
    phone: '555-0103',
    email: 'seraphina.m@example.com',
    address: '456 Pine Ave, Anytown, USA',
    status: 'completed',
    lastInteraction: {
      id: 'int-001',
      outcome: 'completed',
      notes: 'Had a great conversation, she is happy to increase her monthly donation.',
      loggedAt: new Date('2024-05-10'),
      loggedBy: 'Admin',
    },
    givingSummary: {
        totalDonations: 3200,
        lastDonationDate: new Date('2024-01-05'),
        lastDonationAmount: 500,
        averageGift: 250,
    },
  },
  // Standalone
  {
    id: '104',
    name: 'Julian Hayes',
    phone: '555-0104',
    email: 'julian.h@example.com',
    address: '789 Maple Dr, Anytown, USA',
    status: 'pending',
    lastInteraction: null,
    givingSummary: {
        totalDonations: 250,
        lastDonationDate: new Date('2023-08-01'),
        lastDonationAmount: 50,
        averageGift: 50,
    },
  },
  // Household 2: Petrova-Maxwell
  {
    id: '105',
    name: 'Aria Petrova',
    phone: '555-0105',
    email: 'aria.p@example.com',
    address: '321 Birch Ln, Anytown, USA',
    status: 'skipped',
    lastInteraction: null,
    givingSummary: {
        totalDonations: 5000,
        lastDonationDate: new Date('2023-12-25'),
        lastDonationAmount: 1000,
        averageGift: 450,
    },
    householdId: 'hh-2',
    householdName: 'Petrova-Maxwell Household',
  },
  {
    id: '106',
    name: 'Leo Maxwell',
    phone: '555-0106',
    email: 'leo.m@example.com',
    address: '321 Birch Ln, Anytown, USA',
    status: 'pending',
    lastInteraction: null,
    givingSummary: {
        totalDonations: 100,
        lastDonationDate: new Date('2024-02-18'),
        lastDonationAmount: 100,
        averageGift: 100,
    },
    householdId: 'hh-2',
    householdName: 'Petrova-Maxwell Household',
  },
  // Standalone
  {
    id: '107',
    name: 'Isla Chen',
    phone: '555-0107',
    email: 'isla.c@example.com',
    address: '654 Cedar Ct, Anytown, USA',
    status: 'completed',
    lastInteraction: {
      id: 'int-002',
      outcome: 'left-vm',
      notes: 'Left a voicemail thanking her for her continued support and mentioning the new campaign.',
      loggedAt: new Date('2024-05-09'),
      loggedBy: 'Admin',
    },
    givingSummary: {
        totalDonations: 950,
        lastDonationDate: new Date('2023-09-30'),
        lastDonationAmount: 150,
        averageGift: 100,
    },
  },
];
