"use client";

import { useState } from "react";
import { Header } from "./header";
import { ChatInput } from "./chat-input";
import { ChatMessages, type Message } from "./chat-messages";
import { getChatbotResponse } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import { upsertVectorStore } from "@/services/vector-store";

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

export default function ChatLayout({
  activeChat,
  onMessagesChange,
  onToggleSidebar,
}: ChatLayoutProps) {
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
    setInputValue("");
    setIsMessageLoading(true);

    try {
      
      await upsertVectorStore([userMessage], activeChat.id);

      
      const response = await getChatbotResponse(
        inputValue,
        activeChat.id,
        newMessages
      );
      const botMessage: Message = { role: "bot", content: response };
      const updatedMessages = [...newMessages, botMessage];

      
      await upsertVectorStore([botMessage], activeChat.id);

      
      onMessagesChange(activeChat.id, updatedMessages);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      });
      setInputValue(userMessage.content);
    } finally {
      setIsMessageLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!activeChat || activeChat.messages.length === 0) {
      toast({
        title: "Cannot generate report",
        description: "There are no messages in the conversation yet.",
      });
      return;
    }

    setIsReportLoading(true);
    try {
      const pdf = new jsPDF();
      const conversationText = activeChat.messages
        .map(
          (msg) =>
            `${msg.role === "bot" ? "NurtureTalk" : "You"}: ${msg.content}`
        )
        .join("\n\n");

      pdf.setFont("helvetica");
      pdf.setFontSize(12);

      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const usableWidth = pageWidth - margin * 2;
      let y = margin;

      pdf.setFont("helvetica", "bold");
      pdf.text("NurtureTalk Conversation Report", pageWidth / 2, y, {
        align: "center",
      });
      y += 10;
      pdf.setFont("helvetica", "normal");

      const textLines = pdf.splitTextToSize(conversationText, usableWidth);

      for (const line of textLines) {
        if (y + 10 > pageHeight - margin) {
          pdf.addPage();
          y = margin;
          pdf.setFont("helvetica", "bold");
          pdf.text("NurtureTalk Conversation Report", pageWidth / 2, y, {
            align: "center",
          });
          y += 10;
          pdf.setFont("helvetica", "normal");
        }
        pdf.text(line, margin, y);
        y += 7;
      }

      pdf.save(`NurtureTalk-Report-${activeChat.id}.pdf`);

      toast({
        title: "Success",
        description: "Your PDF report is downloading.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error generating PDF report:", error);
      toast({
        title: "Error",
        description: "Failed to generate the PDF report.",
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