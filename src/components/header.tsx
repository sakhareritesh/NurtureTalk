'use client';

import { Menu } from 'lucide-react';
import { Button } from './ui/button';

type HeaderProps = {
  onToggleSidebar: () => void;
};

export function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-800 bg-background px-4 py-3 sm:px-6 z-10">
      <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="h-7 w-7 text-zinc-300">
        <Menu className="h-5 w-5" />
      </Button>
    </header>
  );
}
