"use client";

import { useState } from "react";
import { Header } from "./header";
import { ChatInput } from "./chat-input";
import { ChatMessages, type Message } from "./chat-messages";
import { getChatbotResponse } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

type ChatLayoutProps = {
  activeChat: Chat | null;
  onMessagesChange: (chatId: string, messages: Message[]) => void;
  onToggleSidebar: () => void;
};

export default function ChatLayout({ activeChat, onMessagesChange, onToggleSidebar }: ChatLayoutProps) {
  const [inputValue, setInputValue] = useState("");
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handlePromptSelect = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeChat) return;

    const userMessage: Message = { role: "user", content: inputValue };
    const newMessages = [...activeChat.messages, userMessage];
    onMessagesChange(activeChat.id, newMessages);
    setInputValue("");
    setIsMessageLoading(true);

    try {
      const response = await getChatbotResponse(
        inputValue,
        activeChat.id,
        newMessages
      );
      const botMessage: Message = { role: "bot", content: response };
      onMessagesChange(activeChat.id, [...newMessages, botMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description:
          "Failed to get a response from the chatbot. Please check your credentials.",
        variant: "destructive",
      });
      onMessagesChange(activeChat.id, newMessages);
      setInputValue(userMessage.content);
    } finally {
      setIsMessageLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!activeChat || activeChat.messages.length === 0) {
      toast({
        title: "Cannot generate summary",
        description: "There are no messages in the conversation yet.",
        variant: "destructive",
      });
      return;
    }

    const lastBotMessage = [...activeChat.messages].reverse().find(msg => msg.role === 'bot');

    if (!lastBotMessage) {
      toast({
        title: "Cannot generate summary",
        description: "There are no responses from the bot yet.",
        variant: "destructive",
      });
      return;
    }

    setIsReportLoading(true);
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

      // Add Title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('Chat Summary', pageWidth / 2, y, { align: 'center' });
      y += 25;

      // Add Timestamp
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(150);
      const timestamp = new Date().toLocaleString();
      pdf.text(`Generated on: ${timestamp}`, pageWidth / 2, y, { align: 'center' });
      y += 40;

      // Add Final Response Content
      pdf.setTextColor(0);
      pdf.setFontSize(12);
      
      const textLines = pdf.splitTextToSize(lastBotMessage.content, usableWidth);
      
      textLines.forEach((line: string) => {
        if (y + 12 > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += 18; // Line height
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
    } finally {
      setIsReportLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background relative">
       <Header
        onGenerateReport={handleGenerateReport}
        isGeneratingReport={isReportLoading}
        isMessageLoading={isMessageLoading}
        hasMessages={!!activeChat && activeChat.messages.length > 0}
        onToggleSidebar={onToggleSidebar}
      />
      <ChatMessages 
        messages={activeChat?.messages ?? []} 
        isLoading={isMessageLoading}
        onPromptSelect={handlePromptSelect}
      />
      <div className="w-full">
        <ChatInput
          value={inputValue}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isMessageLoading || !activeChat}
        />
      </div>
    </div>
  );
}
