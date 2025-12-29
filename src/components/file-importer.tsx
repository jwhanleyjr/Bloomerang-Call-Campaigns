"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, FileCheck2 } from 'lucide-react';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { Donor } from '@/lib/types';

type FileImporterProps = {
  onImport: (donors: Donor[]) => void;
};

// Map Excel headers to Donor object keys
const headerMapping: { [key: string]: keyof Donor } = {
  'ID': 'id',
  'Name': 'name',
  'Phone': 'phone',
  'Email': 'email',
  'Total Donated': 'totalDonations',
  'Last Donation Date': 'lastDonationDate',
};


export default function FileImporter({ onImport }: FileImporterProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet) as any[];

          const importedDonors: Donor[] = json.map((row) => {
            const donor: Partial<Donor> = { status: 'pending', lastInteraction: null };
            for (const excelHeader in headerMapping) {
              if (row[excelHeader] !== undefined) {
                const donorKey = headerMapping[excelHeader];
                let value = row[excelHeader];
                if(donorKey === 'lastDonationDate') {
                  value = new Date(value);
                }
                // @ts-ignore
                donor[donorKey] = value;
              }
            }
            // Ensure required fields are there, even if empty
            if (!donor.id) donor.id = `generated-${Math.random()}`;
            return donor as Donor;
          });

          onImport(importedDonors);
        } catch (error) {
          console.error("Error parsing Excel file:", error);
          // In a real app, show a toast notification for the error
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center justify-center h-[calc(100vh-15rem)]">
      <Card className="w-full max-w-lg text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-secondary p-4 rounded-full mb-4">
            <FileUp className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">Import Donor Report</CardTitle>
          <CardDescription>
            Click to select an Excel file (.xlsx, .xls) to generate your call list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".xlsx, .xls"
              disabled={isProcessing}
            />
            {fileName && !isProcessing && <p className="text-muted-foreground mb-4">{fileName}</p>}
            <Button onClick={handleButtonClick} disabled={isProcessing} size="lg">
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <FileCheck2 className="mr-2 h-5 w-5" />
                  Select Excel File
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}