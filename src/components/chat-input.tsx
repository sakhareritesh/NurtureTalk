'use client';

import { ArrowUp } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import React, { useRef, useEffect } from 'react';

type ChatInputProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
};

export function ChatInput({ value, onChange, onSubmit, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = parseInt(getComputedStyle(textareaRef.current).maxHeight, 10);
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [value]);


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
        if (submitButton) {
          submitButton.click();
        }
      }
    }
  };

  return (
    <div className="border-t bg-card px-4 py-3 sm:px-6">
      <form onSubmit={onSubmit} className="relative flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          className="max-h-36 min-h-12 w-full resize-none rounded-2xl border-input bg-background pr-14 text-base"
          rows={1}
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          className="absolute bottom-2.5 right-2.5 h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-md transition-all duration-300 hover:bg-primary/90 disabled:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || value.trim() === ''}
          aria-label="Send message"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
