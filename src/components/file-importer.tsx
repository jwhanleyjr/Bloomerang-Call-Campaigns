
"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUp, FileCheck2, ArrowRight, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { Donor } from '@/lib/types';
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
import { Alert, AlertDescription } from './ui/alert';

type FileImporterProps = {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: (campaignName: string, donors: Donor[]) => void;
};

const headerMapping: { [key: string]: (keyof Donor)[] } = {
    'account number': ['id'],
    'id': ['id'],
    'constituent id': ['id'],
    'bloomerang account id': ['id'],
    'name': ['name'],
    'full name': ['name'],
    'phone': ['phone'],
    'phone number': ['phone'],
    'primary phone': ['phone'],
    'primary phone number': ['phone'],
    'email': ['email'],
    'email address': ['email'],
};


enum ImportStep {
  SelectFile,
  Enriching,
  NameCampaign,
  Error,
}

export default function FileImporter({ isOpen, onClose, onCampaignCreated }: FileImporterProps) {
  const [step, setStep] = useState<ImportStep>(ImportStep.SelectFile);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importedDonors, setImportedDonors] = useState<Donor[] | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setStep(ImportStep.SelectFile);
    setIsProcessing(false);
    setFileName(null);
    setImportedDonors(null);
    setCampaignName('');
    setErrorMessage('');
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };
  
  const handleError = (message: string) => {
    setErrorMessage(message);
    setStep(ImportStep.Error);
    setIsProcessing(false);
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

      const donors: Donor[] = json
        .map((row) => {
          const donor: Partial<Donor> & { id: string } = { id: '', status: 'pending', lastInteraction: null };
          
          for (const header in row) {
              const lowerCaseHeader = header.toLowerCase().trim();
              if (headerMapping[lowerCaseHeader]) {
                  const donorKeys = headerMapping[lowerCaseHeader];
                  for (const key of donorKeys) {
                      // @ts-ignore
                      donor[key] = String(row[header]);
                  }
              }
          }
          
          if (!donor.id) return null;
          
          donor.givingSummary = {
            totalDonations: 0,
            lastDonationDate: null,
            lastDonationAmount: 0,
            averageGift: 0,
          };

          return donor as Donor;
        })
        .filter((donor): donor is Donor => !!donor && !!donor.id && (!!donor.phone || !!donor.email));

      if (donors.length === 0) {
        handleError("No valid donors found. Please ensure the file has a column for 'Account Number' and either 'Primary Phone Number' or 'Email'.");
        return;
      }
      
      setStep(ImportStep.Enriching);
      const enriched = await enrichDonors(donors);
      
      setImportedDonors(enriched);
      setCampaignName(file.name.replace(/\.(xlsx|xls|csv)$/, ''));
      setStep(ImportStep.NameCampaign);
    } catch (error) {
      console.error("Error processing file:", error);
      handleError("There was an error processing your file. Please check that it is a valid Excel file (.xlsx, .xls, .csv) and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateCampaign = () => {
    if (!importedDonors || !campaignName) return;
    onCampaignCreated(campaignName, importedDonors);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  const renderStepContent = () => {
    switch (step) {
      case ImportStep.SelectFile:
        return (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline text-2xl">Create New Call Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                Select an Excel file (.xlsx, .xls, .csv) with donor names and phone numbers to begin.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".xlsx, .xls, .csv"
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
              <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
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
              <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCreateCampaign} disabled={!campaignName || isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2"/>}
                Create Campaign
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        );
        
      case ImportStep.Error:
        return (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline text-2xl flex items-center gap-2">
                <AlertTriangle className="text-destructive" />
                Import Failed
              </AlertDialogTitle>
              <AlertDialogDescription>
                There was a problem with your file upload.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
                <Alert variant="destructive">
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
              <AlertDialogAction onClick={resetState}>Try Again</AlertDialogAction>
            </AlertDialogFooter>
          </>
        )
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if(!open) onClose() }}>
      <AlertDialogContent onEscapeKeyDown={(e) => isProcessing && e.preventDefault()} onPointerDownOutside={(e) => isProcessing && e.preventDefault()}>
        {renderStepContent()}
      </AlertDialogContent>
    </AlertDialog>
  );
}
