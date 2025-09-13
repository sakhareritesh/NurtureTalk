'use client';

import { HandHeart, LoaderCircle, User } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

export type Message = {
  role: 'user' | 'bot';
  content: string;
};

type ChatMessagesProps = {
  messages: Message[];
  isLoading: boolean;
};

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center pt-16 text-center text-muted-foreground animate-in fade-in duration-500">
             <HandHeart className="mb-4 h-16 w-16 text-primary/50" />
            <h2 className="text-2xl font-semibold font-headline text-foreground">Welcome to NurtureTalk</h2>
            <p className="mt-2">Your AI assistant for all things NGO-related.</p>
            <p>Ask me about funding, operations, or impact assessment to get started.</p>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn('flex items-start gap-3 animate-in fade-in-0 zoom-in-95 duration-300', {
              'justify-end': message.role === 'user',
            })}
          >
            {message.role === 'bot' && (
              <Avatar className="h-9 w-9 border-2 border-primary/50">
                 <AvatarFallback className="bg-primary text-primary-foreground">
                    <HandHeart className="h-5 w-5" />
                 </AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                'max-w-md rounded-2xl px-4 py-3 text-base shadow-sm',
                {
                  'bg-primary text-primary-foreground rounded-br-none': message.role === 'user',
                  'bg-card text-card-foreground rounded-bl-none': message.role === 'bot',
                }
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
             {message.role === 'user' && (
              <Avatar className="h-9 w-9">
                 <AvatarFallback className="bg-accent text-accent-foreground">
                    <User className="h-5 w-5" />
                 </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isLoading && (
           <div className="flex items-start gap-3 animate-in fade-in duration-300">
              <Avatar className="h-9 w-9 border-2 border-primary/50">
                 <AvatarFallback className="bg-primary text-primary-foreground">
                    <HandHeart className="h-5 w-5" />
                 </AvatarFallback>
              </Avatar>
              <div className="flex items-center space-x-2 rounded-2xl bg-card px-4 py-3 text-base shadow-sm rounded-bl-none">
                 <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
                 <span className="text-muted-foreground">Thinking...</span>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
