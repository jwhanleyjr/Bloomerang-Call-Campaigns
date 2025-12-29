
import { HandCoins, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AppHeaderProps = {
  onBackToDashboard: () => void;
  hasActiveCampaign: boolean;
};

export default function AppHeader({ onBackToDashboard, hasActiveCampaign }: AppHeaderProps) {
  return (
    <header className="bg-card border-b sticky top-0 z-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <HandCoins className="w-6 h-6" />
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-primary font-headline">
              Bloomerang Calls
            </h1>
          </div>
          {hasActiveCampaign && (
            <Button onClick={onBackToDashboard} variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Campaigns</span>
              <span className="inline sm:hidden">Back</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
