'use client';

import { useState, useEffect } from 'react';
import { Header } from './header';
import { ChatInput } from './chat-input';
import { ChatMessages, type Message } from './chat-messages';
import { getChatbotResponse, generateReport } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

export default function ChatLayout() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Generate a unique ID for the conversation on client-side mount.
    setConversationId(crypto.randomUUID());
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = { role: 'user', content: inputValue };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsMessageLoading(true);

    try {
      const response = await getChatbotResponse(inputValue, newMessages);
      const botMessage: Message = { role: 'bot', content: response };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get a response from the chatbot.',
        variant: 'destructive',
      });
       // Revert optimistic UI update on error
       setMessages(prev => prev.slice(0, -1));
       setInputValue(userMessage.content);
    } finally {
      setIsMessageLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (messages.length === 0) {
      toast({
        title: 'Cannot generate report',
        description: 'There are no messages in the conversation yet.',
      });
      return;
    }

    setIsReportLoading(true);
    try {
      const filePath = await generateReport(messages, conversationId);
      toast({
        title: 'Success',
        description: `Your PDF report has been saved to the server at: ${filePath}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate the PDF report.',
        variant: 'destructive',
      });
    } finally {
      setIsReportLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <Header 
        onGenerateReport={handleGenerateReport}
        isGeneratingReport={isReportLoading}
        isMessageLoading={isMessageLoading}
        hasMessages={messages.length > 0}
      />
      <ChatMessages messages={messages} isLoading={isMessageLoading} />
      <ChatInput
        value={inputValue}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        isLoading={isMessageLoading}
      />
    </div>
  );
}
