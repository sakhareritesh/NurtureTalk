'use client';

import { Menu, Folder, Download } from 'lucide-react';
import { Button } from './ui/button';

type HeaderProps = {
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
  isMessageLoading: boolean;
  hasMessages: boolean;
  onToggleSidebar: () => void;
};

export function Header({ onGenerateReport, isGeneratingReport, isMessageLoading, hasMessages, onToggleSidebar }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-800 bg-background px-4 py-3 sm:px-6 z-10">
      <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="h-7 w-7 text-zinc-300">
        <Menu className="h-5 w-5" />
      </Button>
      
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="bg-zinc-800 text-white hover:bg-zinc-700">
          <Folder className="mr-2 h-4 w-4" />
          Documentation
        </Button>
        <Button
          onClick={onGenerateReport}
          disabled={isGeneratingReport || isMessageLoading || !hasMessages}
          variant="ghost"
          className="text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          {isGeneratingReport ? (
            <Download className="mr-2 h-4 w-4 animate-pulse" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download
        </Button>
      </div>
    </header>
  );
}
