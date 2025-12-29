
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUp, FileCheck2, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useState, useRef, useTransition } from 'react';
import * as XLSX from 'xlsx';
import type { Donor, Campaign } from '@/lib/types';
import { enrichDonors } from '@/app/actions';
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
  // We'll get financial data from the enrichment step
  // 'Total Donated': 'totalDonations',
  // 'Last Donation Date': 'lastDonationDate',
};

enum ImportStep {
  SelectFile,
  Enriching,
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
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          const donors: Donor[] = json.map((row) => {
            const donor: Partial<Donor> = { status: 'pending', lastInteraction: null };
            for (const excelHeader in headerMapping) {
              if (row[excelHeader] !== undefined) {
                const donorKey = headerMapping[excelHeader];
                let value = row[excelHeader];
                // @ts-ignore
                donor[donorKey] = value;
              }
            }
            if (!donor.id) donor.id = `generated-${Math.random()}`;
            
            // Add a placeholder giving summary, to be filled by enrichment
            donor.givingSummary = {
              totalDonations: 0,
              lastDonationDate: null,
              lastDonationAmount: 0,
              averageGift: 0,
            };

            return donor as Donor;
          }).filter(donor => !!donor.phone); // Only include donors with a phone number.

          setStep(ImportStep.Enriching);
          const enriched = await enrichDonors(donors);
          
          setImportedDonors(enriched);
          setCampaignName(file.name.replace(/\.(xlsx|xls)$/, ''));
          setStep(ImportStep.NameCampaign);
        } catch (error) {
          console.error("Error processing file:", error);
          resetState(); // Reset on error
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
  
  const renderStepContent = () => {
    switch (step) {
      case ImportStep.SelectFile:
        return (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline text-2xl">Create New Call Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                Select an Excel file (.xlsx, .xls) with donor names and phone numbers to begin.
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
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
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
        );

      case ImportStep.Enriching:
        return (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline text-2xl">Enriching Data</AlertDialogTitle>
              <AlertDialogDescription>
                Connecting to Bloomerang to get the latest household and giving information...
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <Sparkles className="w-12 h-12 text-primary animate-pulse mb-4" />
              <p className="text-lg font-semibold">Enhancing donor profiles...</p>
              <p className="text-muted-foreground mt-1">This may take a moment.</p>
            </div>
          </>
        );

      case ImportStep.NameCampaign:
        return (
           <>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline text-2xl">Name Your Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                Your data has been enriched! Give this campaign a name to save it.
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
                Successfully imported and enriched <span className="font-bold text-primary">{importedDonors?.length}</span> donors from <span className="font-bold text-primary">{fileName}</span>.
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={resetState}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCreateCampaign} disabled={!campaignName}>
                Create Campaign <ArrowRight className="ml-2"/>
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        );
    }
  }

  return (
    <AlertDialog open={true} onOpenChange={(isOpen) => !isOpen && resetState()}>
      <AlertDialogContent>
        {renderStepContent()}
      </AlertDialogContent>
    </AlertDialog>
  );
}
