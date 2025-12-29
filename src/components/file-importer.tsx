
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUp, FileCheck2, ArrowRight } from 'lucide-react';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { Donor, Campaign } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"


type FileImporterProps = {
  onCampaignCreated: (campaign: Campaign) => void;
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

enum ImportStep {
  SelectFile,
  NameCampaign,
}

export default function FileImporter({ onCampaignCreated }: FileImporterProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importedDonors, setImportedDonors] = useState<Donor[] | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [step, setStep] = useState<ImportStep>(ImportStep.SelectFile);
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
          const json = XLSX.utils.sheet_to_json(worksheet, {
            // If the first data row is a total, it often has different data types.
            // We can ask XLSX to guess, but we'll add our own filtering.
          }) as any[];
          
          // Skip the first row if it's a total, and filter for valid donors.
          const processedData = json.length > 1 ? json.slice(1) : json;

          const donors: Donor[] = processedData.map((row) => {
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
            if (!donor.id) donor.id = `generated-${Math.random()}`;
            return donor as Donor;
          }).filter(donor => !!donor.phone); // Only include donors with a phone number.

          setImportedDonors(donors);
          setCampaignName(file.name.replace(/\.(xlsx|xls)$/, ''));
          setStep(ImportStep.NameCampaign);
        } catch (error) {
          console.error("Error parsing Excel file:", error);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleCreateCampaign = () => {
    if (!importedDonors || !campaignName) return;
    const newCampaign: Campaign = {
      id: `camp-${Date.now()}`,
      name: campaignName,
      donors: importedDonors,
      createdAt: new Date(),
    };
    onCampaignCreated(newCampaign);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  const resetState = () => {
    setIsProcessing(false);
    setFileName(null);
    setImportedDonors(null);
    setCampaignName('');
    setStep(ImportStep.SelectFile);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  return (
    <AlertDialog open={true} onOpenChange={(isOpen) => !isOpen && resetState()}>
      <AlertDialogContent>
        {step === ImportStep.SelectFile && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline text-2xl">Create New Call Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                Select an Excel file (.xlsx, .xls) to generate a new call list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".xlsx, .xls"
                  disabled={isProcessing}
                />
                 <div className="mx-auto bg-secondary p-3 rounded-full mb-4">
                  <FileUp className="w-8 h-8 text-primary" />
                </div>
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
                 {fileName && <p className="text-muted-foreground mt-4 text-sm">{fileName}</p>}
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        )}
        {step === ImportStep.NameCampaign && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline text-2xl">Name Your Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                Give this campaign a descriptive name. This will help you identify it later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input 
                  id="campaign-name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Spring Fundraiser 2024"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Successfully imported <span className="font-bold text-primary">{importedDonors?.length}</span> donors from <span className="font-bold text-primary">{fileName}</span>.
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={resetState}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCreateCampaign} disabled={!campaignName}>
                Create Campaign <ArrowRight className="ml-2"/>
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
