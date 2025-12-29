"use client";

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, CheckCircle, XCircle, Clock } from 'lucide-react';
import InteractionLogger from './interaction-logger';
import type { Donor, Interaction } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

type CallListTableProps = {
  donors: Donor[];
  onUpdateDonor: (donor: Donor) => void;
};

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: <Clock className="w-4 h-4 text-muted-foreground" />,
    badgeVariant: 'secondary',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle className="w-4 h-4 text-primary" />,
    badgeVariant: 'outline',
  },
  skipped: {
    label: 'Skipped',
    icon: <XCircle className="w-4 h-4 text-destructive" />,
    badgeVariant: 'destructive',
  },
};


export default function CallListTable({ donors, onUpdateDonor }: CallListTableProps) {
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);

  const handleLogRowClick = (donor: Donor) => {
    setSelectedDonor(donor);
    setIsLoggerOpen(true);
  };

  const handleLoggerClose = () => {
    setIsLoggerOpen(false);
    // Give sheet time to animate out
    setTimeout(() => setSelectedDonor(null), 300);
  };

  const handleInteractionLogged = (donor: Donor, interaction: Interaction) => {
    const updatedDonor = {
      ...donor,
      status: 'completed',
      lastInteraction: interaction,
    } as Donor;
    onUpdateDonor(updatedDonor);
    handleLoggerClose();
  };

  return (
    <>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader className="sticky top-16 bg-card z-10">
            <TableRow className="hover:bg-card">
              <TableHead className="w-[250px]">Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Last Interaction</TableHead>
              <TableHead className="text-right">Total Donated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {donors.map((donor) => {
              const status = statusConfig[donor.status];
              return (
                <TableRow key={donor.id}>
                  <TableCell className="font-medium">{donor.name}</TableCell>
                  <TableCell>
                    <Badge variant={status.badgeVariant as any} className="flex items-center gap-1.5 w-fit">
                      {status.icon}
                      <span>{status.label}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>{donor.phone}</div>
                    <div className="text-muted-foreground text-xs">{donor.email}</div>
                  </TableCell>
                  <TableCell>
                    {donor.lastInteraction ? (
                      <div className="flex flex-col">
                        <span className="font-semibold capitalize">
                          {donor.lastInteraction.outcome?.replace('-', ' ') || 'Note'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(donor.lastInteraction.loggedAt, { addSuffix: true })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${donor.totalDonations.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleLogRowClick(donor)}>
                      <Phone className="mr-2 h-4 w-4" />
                      Log Call
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {selectedDonor && (
        <InteractionLogger
          isOpen={isLoggerOpen}
          onClose={handleLoggerClose}
          donor={selectedDonor}
          onInteractionLogged={handleInteractionLogged}
        />
      )}
    </>
  );
}
