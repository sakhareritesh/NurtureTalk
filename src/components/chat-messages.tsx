'use client';

import { HandHeart, LoaderCircle, User, Clock, Flame, Star } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

export type Message = {
  role: 'user' | 'bot';
  content: string;
};

const promptSuggestions = {
  "Recent": [
    { icon: HandHeart, title: "Speak Any Language:", description: "Translate phrases instantly." },
    { icon: HandHeart, title: "Explore Philosophy:", description: "Discuss profound questions." },
    { icon: HandHeart, title: "Code Problem Solver:", description: "" }
  ],
  "Frequent": [
    { icon: Flame, title: "Imagination Unleashed:", description: "Create a unique story from any idea." },
    { icon: Flame, title: "Learn Something New:", description: "Explain complex topics in simple terms." },
    { icon: Flame, title: "Cooking Made Easy:", description: "Get recipe ideas." }
  ],
  "Recommended": [
    { icon: Star, title: "Virtual Travel Buddy:", description: "Tour the world virtually." },
    { icon: Star, title: "Healthy Living Tips:", description: "Receive fitness and wellness advice." },
    { icon: Star, title: "Art & Music Picks:", description: "Discover art and music" }
  ]
};

type ChatMessagesProps = {
  messages: Message[];
  isLoading: boolean;
  onPromptSelect: (prompt: string) => void;
};

export function ChatMessages({ messages, isLoading, onPromptSelect }: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const renderIcon = (IconComponent: React.ElementType) => <IconComponent className="h-5 w-5 mr-2 text-zinc-400" />;

  return (
    <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center pt-8 text-center animate-in fade-in duration-500">
             <h1 className="text-4xl font-bold text-white mb-8">NurtureTalk</h1>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl">
              {Object.entries(promptSuggestions).map(([category, prompts]) => (
                <div key={category}>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-center">
                    {category === 'Recent' && <Clock className="h-5 w-5 mr-2" />}
                    {category === 'Frequent' && <Flame className="h-5 w-5 mr-2" />}
                    {category === 'Recommended' && <Star className="h-5 w-5 mr-2" />}
                    {category}
                  </h2>
                  <div className="space-y-4">
                  {prompts.map((prompt, index) => (
                    <Button 
                      key={index} 
                      variant="outline" 
                      className="w-full h-auto text-left justify-start p-4 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                      onClick={() => onPromptSelect(`${prompt.title} ${prompt.description}`)}
                    >
                      <div>
                        <p className="font-semibold">{prompt.title}</p>
                        <p className="text-sm text-zinc-400">{prompt.description}</p>
                      </div>
                    </Button>
                  ))}
                  </div>
                </div>
              ))}
             </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn('flex items-start gap-4 animate-in fade-in-0 zoom-in-95 duration-300', {
              'justify-start': message.role === 'bot',
              'justify-end': message.role === 'user',
            })}
          >
            {message.role === 'bot' && (
              <Avatar className="h-8 w-8 bg-zinc-800">
                 <AvatarFallback className="bg-transparent text-white">
                    <HandHeart className="h-5 w-5" />
                 </AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                'max-w-4xl rounded-lg px-4 py-2 text-base break-words',
                {
                  'bg-zinc-700 text-white': message.role === 'user',
                  'bg-transparent text-zinc-300': message.role === 'bot',
                }
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
             {message.role === 'user' && (
              <Avatar className="h-8 w-8">
                 <AvatarFallback className="bg-zinc-700 text-zinc-300">
                    <User className="h-5 w-5" />
                 </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {isLoading && (
           <div className="flex items-start gap-4 animate-in fade-in duration-300">
              <Avatar className="h-8 w-8 bg-zinc-800">
                 <AvatarFallback className="bg-transparent text-white">
                    <HandHeart className="h-5 w-5" />
                 </AvatarFallback>
              </Avatar>
              <div className="flex items-center space-x-2 rounded-lg bg-transparent px-4 py-2 text-base">
                 <LoaderCircle className="h-5 w-5 animate-spin text-white" />
                 <span className="text-zinc-400">Thinking...</span>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
