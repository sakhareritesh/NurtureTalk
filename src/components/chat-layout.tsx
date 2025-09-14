"use client";

import { useState } from "react";
import { Header } from "./header";
import { ChatInput } from "./chat-input";
import { ChatMessages, type Message } from "./chat-messages";
import { getChatbotResponse } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <div className="flex h-full flex-col bg-background relative">
       <Header
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
