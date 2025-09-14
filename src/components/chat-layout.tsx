"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "./header";
import { ChatInput } from "./chat-input";
import { ChatMessages, type Message } from "./chat-messages";
import { getChatbotResponse } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import type { Chat } from "./chat-page";

const CHAT_HISTORY_KEY = "chat-history";

type ChatLayoutProps = {
  activeChatId: string | null;
  onNewChat: () => void;
  onChatTitleChange: (chatId: string, newTitle: string) => void;
  onToggleSidebar: () => void;
};

export default function ChatLayout({ activeChatId, onNewChat, onChatTitleChange, onToggleSidebar }: ChatLayoutProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (activeChatId) {
      const allChats: Chat[] = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');
      const activeChat = allChats.find(chat => chat.id === activeChatId);
      const currentMessages = activeChat?.messages || [];
      setMessages(currentMessages);
      setShowWelcomeScreen(currentMessages.length === 0);
      setInputValue(""); // Clear input when chat changes
    }
  }, [activeChatId]);

  const updateLocalStorage = (chatId: string, updatedMessages: Message[]) => {
    const allChats: Chat[] = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');
    const chatIndex = allChats.findIndex(chat => chat.id === chatId);

    if (chatIndex !== -1) {
      allChats[chatIndex].messages = updatedMessages;
      
      const firstUserMessage = updatedMessages.find(m => m.role === 'user');
      if (allChats[chatIndex].title === "New Chat" && firstUserMessage) {
        const newTitle = firstUserMessage.content.substring(0, 30);
        allChats[chatIndex].title = newTitle;
        onChatTitleChange(chatId, newTitle);
      }
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(allChats));
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (showWelcomeScreen) {
      setShowWelcomeScreen(false);
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setInputValue(prompt);
    if (showWelcomeScreen) {
      setShowWelcomeScreen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeChatId) return;

    const userMessage: Message = { role: "user", content: inputValue };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    updateLocalStorage(activeChatId, newMessages);
    setInputValue("");
    setIsMessageLoading(true);

    try {
      const response = await getChatbotResponse(
        inputValue,
        activeChatId,
        newMessages
      );
      const botMessage: Message = { role: "bot", content: response };
      const finalMessages = [...newMessages, botMessage];
      setMessages(finalMessages);
      updateLocalStorage(activeChatId, finalMessages);
    } catch (error) {
      toast({
        title: "Error",
        description:
          "Failed to get a response from the chatbot. Please check your credentials.",
        variant: "destructive",
      });
      // Revert to previous state on error
      setMessages(newMessages);
      setInputValue(userMessage.content);
    } finally {
      setIsMessageLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background relative">
       <Header
        isMessageLoading={isMessageLoading}
        hasMessages={messages.length > 0}
        onToggleSidebar={onToggleSidebar}
      />
      <ChatMessages 
        messages={messages} 
        isLoading={isMessageLoading}
        onPromptSelect={handlePromptSelect}
        showWelcomeScreen={showWelcomeScreen}
      />
      <div className="w-full">
        <ChatInput
          value={inputValue}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isMessageLoading || !activeChatId}
        />
      </div>
    </div>
  );
}
