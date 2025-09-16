'use client';

import { Send } from 'lucide-react';
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
    <div className="bg-background px-4 py-3 sm:px-6">
      <form onSubmit={onSubmit} className="relative flex items-center">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="How can I help you?"
          className="max-h-36 min-h-[52px] w-full resize-none rounded-2xl border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-400 pl-4 pr-16 text-base"
          rows={1}
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:bg-zinc-800 disabled:text-zinc-500"
          disabled={isLoading || value.trim() === ''}
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>
      <p className="text-xs text-center text-zinc-500 mt-2">
        Ai Chat may produce inaccurate information about people, places, or facts.
      </p>
    </div>
  );
}