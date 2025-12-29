"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, FileCheck2 } from 'lucide-react';
import { useState } from 'react';

type CsvImporterProps = {
  onImport: () => void;
};

export default function CsvImporter({ onImport }: CsvImporterProps) {
  const [isFakeUploading, setIsFakeUploading] = useState(false);

  const handleFakeUpload = () => {
    setIsFakeUploading(true);
    setTimeout(() => {
      onImport();
    }, 1500); // Simulate upload and parsing time
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
            Drag & drop a CSV file from Bloomerang or click to select a file to generate your call list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">.CSV files up to 10MB</p>
            <Button onClick={handleFakeUpload} disabled={isFakeUploading} size="lg">
              {isFakeUploading ? (
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
                  Select & Generate List
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
