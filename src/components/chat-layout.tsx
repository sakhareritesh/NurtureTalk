
"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "./header";
import { ChatInput } from "./chat-input";
import { ChatMessages, type Message } from "./chat-messages";
import { getChatbotResponse } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import { v4 as uuidv4 } from "uuid";

const CHAT_HISTORY_KEY = "chat-history";

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

type ChatLayoutProps = {
  activeChat: Chat | null;
  onChatUpdate: (chat: Chat) => void;
  onToggleSidebar: () => void;
};

export default function ChatLayout({
  activeChat,
  onChatUpdate,
  onToggleSidebar,
}: ChatLayoutProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (activeChat) {
      setMessages(activeChat.messages);
      setShowWelcomeScreen(activeChat.messages.length === 0);
    } else {
      setMessages([]);
      setShowWelcomeScreen(true);
    }
  }, [activeChat]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (showWelcomeScreen) {
      setShowWelcomeScreen(false);
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setInputValue(prompt);
    setShowWelcomeScreen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeChat) return;

    const userMessage: Message = { role: "user", content: inputValue };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const currentInputValue = inputValue;
    setInputValue("");
    setIsMessageLoading(true);

    try {
      const response = await getChatbotResponse(
        currentInputValue,
        activeChat.id,
        newMessages
      );
      const botMessage: Message = { role: "bot", content: response };
      const updatedMessages = [...newMessages, botMessage];
      setMessages(updatedMessages);

      const firstUserMessage = updatedMessages.find((m) => m.role === "user");
      const newTitle =
        activeChat.title === "New Chat" && firstUserMessage
          ? firstUserMessage.content.substring(0, 30)
          : activeChat.title;

      onChatUpdate({
        ...activeChat,
        title: newTitle,
        messages: updatedMessages,
      });
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      });
      setMessages(newMessages);
      setInputValue(userMessage.content);
    } finally {
      setIsMessageLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!activeChat || messages.length < 2) {
      toast({
        title: "Cannot generate report",
        description: "There is no bot response to generate a report from.",
      });
      return;
    }

    try {
      // Find the last bot message that isn't the PDF request confirmation
      const lastBotMessage = messages
        .slice()
        .reverse()
        .find(m => m.role === 'bot' && !m.content.includes('<PDF_REQUEST>'));
      
      if (!lastBotMessage) {
        toast({
          title: "Cannot generate report",
          description: "Could not find a previous bot response to summarize.",
        });
        return;
      }

      const pdf = new jsPDF();
      const conversationText = `NurtureTalk: ${lastBotMessage.content.replace(/<PDF_REQUEST>/g, '')}`;

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

      pdf.save(`NurtureTalk-Report.pdf`);

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
    }
  };

  return (
    <div className="flex h-full flex-col bg-background relative">
      <Header onToggleSidebar={onToggleSidebar} />
      <ChatMessages
        messages={messages}
        isLoading={isMessageLoading}
        onPromptSelect={handlePromptSelect}
        onGenerateReport={handleGenerateReport}
        showWelcomeScreen={showWelcomeScreen}
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
