import { HandCoins, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AppHeaderProps = {
  onNewImport: () => void;
  hasData: boolean;
};

export default function AppHeader({ onNewImport, hasData }: AppHeaderProps) {
  return (
    <header className="bg-card border-b sticky top-0 z-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <HandCoins className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-primary font-headline">
              Bloomerang Call Campaign
            </h1>
          </div>
          {hasData && (
            <Button onClick={onNewImport} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import New List
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
