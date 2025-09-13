'use client';

import { HandHeart, LoaderCircle, FileDown } from 'lucide-react';
import { Button } from './ui/button';

type HeaderProps = {
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
  isMessageLoading: boolean;
  hasMessages: boolean;
};

export function Header({ onGenerateReport, isGeneratingReport, isMessageLoading, hasMessages }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b bg-card px-4 py-3 sm:px-6 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        <HandHeart className="h-8 w-8 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight font-headline text-foreground">NurtureTalk</h1>
      </div>
      <Button
        onClick={onGenerateReport}
        disabled={isGeneratingReport || isMessageLoading || !hasMessages}
        variant="outline"
        className="bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground focus-visible:ring-accent"
      >
        {isGeneratingReport ? (
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-4 w-4" />
        )}
        <span className='hidden sm:inline'>Generate Report</span>
        <span className='sm:hidden'>Report</span>
      </Button>
    </header>
  );
}
