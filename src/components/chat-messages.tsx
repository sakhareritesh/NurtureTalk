"use client";

import { HandHeart, LoaderCircle, User, Briefcase, DollarSign, Lightbulb, Download } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useMemo } from 'react';
import { Button } from './ui/button';
import { jsPDF } from "jspdf";
import { useToast } from "@/hooks/use-toast";


export type Message = {
  role: 'user' | 'bot';
  content: string;
};

const promptSuggestions = {
  "Getting Started": [
    { icon: Lightbulb, title: "Explain the role of NGOs", description: "in community development." },
    { icon: Lightbulb, title: "How do I start an NGO?", description: "List the key steps." },
    { icon: Lightbulb, title: "What is a theory of change?", description: "and why is it important?" }
  ],
  "Fundraising & Grants": [
    { icon: DollarSign, title: "Suggest fundraising ideas", description: "for a small NGO." },
    { icon: DollarSign, title: "How to write a grant proposal?", description: "Provide a template." },
    { icon: DollarSign, title: "What is impact investing?", description: "Explain the pros & cons." }
  ],
  "Operations & Management": [
    { icon: Briefcase, title: "How to recruit and manage volunteers?", description: "Share best practices." },
    { icon: Briefcase, title: "Principles of good NGO governance?", description: "" },
    { icon: Briefcase, title: "How to measure social impact?", description: "" }
  ]
};

type ChatMessagesProps = {
  messages: Message[];
  isLoading: boolean;
  onPromptSelect: (prompt: string) => void;
};

export function ChatMessages({ messages, isLoading, onPromptSelect }: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleGeneratePdf = (summaryContent: string) => {
    try {
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 40;
      const usableWidth = pageWidth - margin * 2;
      let y = margin;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('Chat Summary', pageWidth / 2, y, { align: 'center' });
      y += 25;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(150);
      const timestamp = new Date().toLocaleString();
      pdf.text(`Generated on: ${timestamp}`, pageWidth / 2, y, { align: 'center' });
      y += 40;

      pdf.setTextColor(0);
      pdf.setFontSize(12);
      
      const textLines = pdf.splitTextToSize(summaryContent, usableWidth);
      
      textLines.forEach((line: string) => {
        if (y + 12 > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += 18;
      });

      pdf.save(`NurtureTalk-Summary.pdf`);

      toast({
        title: "Success",
        description: "Your PDF summary is downloading.",
        duration: 3000,
      });

    } catch (error) {
      console.error("Error generating PDF report:", error);
      toast({
        title: "Error",
        description: "Failed to generate the PDF summary.",
        variant: "destructive",
      });
    }
  };

  const MessageItem = ({ message }: { message: Message }) => {
    const summaryContent = useMemo(() => {
      const match = message.content.match(/<SUMMARY>([\s\S]*?)<\/SUMMARY>/);
      return match ? match[1].trim() : null;
    }, [message.content]);
  
    const regularContent = message.content.replace(/<SUMMARY>[\s\S]*?<\/SUMMARY>/, '').trim();
  
    return (
      <div
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
          {regularContent && <p className="whitespace-pre-wrap">{regularContent}</p>}
          {summaryContent && (
            <div className="mt-4">
              <Button onClick={() => handleGeneratePdf(summaryContent)}>
                <Download className="mr-2 h-4 w-4" />
                Download Summary
              </Button>
            </div>
          )}
        </div>
         {message.role === 'user' && (
          <Avatar className="h-8 w-8">
             <AvatarFallback className="bg-zinc-700 text-zinc-300">
                <User className="h-5 w-5" />
             </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  return (
    <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center pt-8 text-center animate-in fade-in duration-500">
             <h1 className="text-4xl font-bold text-white mb-8">NurtureTalk</h1>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl">
              {Object.entries(promptSuggestions).map(([category, prompts]) => (
                <div key={category}>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-center">
                    {category === 'Getting Started' && <Lightbulb className="h-5 w-5 mr-2" />}
                    {category === 'Fundraising & Grants' && <DollarSign className="h-5 w-5 mr-2" />}
                    {category === 'Operations & Management' && <Briefcase className="h-5 w-5 mr-2" />}
                    {category}
                  </h2>
                  <div className="space-y-4">
                  {prompts.map((prompt, index) => (
                    <Button 
                      key={index} 
                      variant="outline" 
                      className="w-full h-auto text-left justify-start p-4 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white min-h-[5rem]"
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
          <MessageItem key={`${message.role}-${message.content}-${index}`} message={message} />
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
