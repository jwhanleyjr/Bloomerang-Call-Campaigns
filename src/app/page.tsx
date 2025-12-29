"use client";

import { useState } from 'react';
import AppHeader from '@/components/app-header';
import CsvImporter from '@/components/csv-importer';
import CallListTable from '@/components/call-list-table';
import { Toaster } from '@/components/ui/toaster';
import type { Donor } from '@/lib/types';
import { mockDonors } from '@/lib/data';

export default function Home() {
  const [donors, setDonors] = useState<Donor[] | null>(null);

  const handleImport = () => {
    // In a real app, this would parse a CSV file.
    // For now, we just load the mock data.
    setDonors(mockDonors);
  };

  const handleNewImport = () => {
    setDonors(null);
  };

  const updateDonor = (updatedDonor: Donor) => {
    setDonors(prevDonors => {
      if (!prevDonors) return null;
      return prevDonors.map(donor => donor.id === updatedDonor.id ? updatedDonor : donor);
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader onNewImport={handleNewImport} hasData={!!donors} />
      <main className="flex-grow container mx-auto px-4 py-8">
        {donors ? (
          <CallListTable donors={donors} onUpdateDonor={updateDonor} />
        ) : (
          <CsvImporter onImport={handleImport} />
        )}
      </main>
      <Toaster />
    </div>
  );
}
