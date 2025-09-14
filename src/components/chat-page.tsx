"use client";

import { useState, useEffect, useCallback } from "react";
import ChatLayout from "@/components/chat-layout";
import { ChatHistory } from "@/components/chat-history";
import { v4 as uuidv4 } from "uuid";

const CHAT_HISTORY_KEY = "chat-history";

export interface Message {
  role: "user" | "bot";
  content: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const handleNewChat = useCallback(() => {
    const newChat: Chat = {
      id: uuidv4(),
      title: "New Chat",
      messages: [],
    };
    setChats((prevChats) => {
      const updatedChats = [newChat, ...prevChats];
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedChats));
      return updatedChats;
    });
    setActiveChatId(newChat.id);
  }, []);

  useEffect(() => {
    try {
      const savedChats = localStorage.getItem(CHAT_HISTORY_KEY);
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);
        if (parsedChats.length > 0) {
          setChats(parsedChats);
          setActiveChatId(parsedChats[0].id);
        } else {
          handleNewChat();
        }
      } else {
        handleNewChat();
      }
    } catch (error) {
      console.error("Failed to load chat history from localStorage:", error);
      handleNewChat();
    }
  }, [handleNewChat]);


  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
  };

  const handleDeleteChat = (id: string) => {
    setChats((prevChats) => {
      const updatedChats = prevChats.filter((chat) => chat.id !== id);
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedChats));
      
      if (activeChatId === id) {
        if (updatedChats.length > 0) {
          setActiveChatId(updatedChats[0].id);
        } else {
          // If all chats are deleted, create a new one
          handleNewChat();
        }
      }
      
      // This handles the case where the filter results in an empty array
      if (updatedChats.length === 0) {
        const newChat: Chat = { id: uuidv4(), title: "New Chat", messages: [] };
        setActiveChatId(newChat.id);
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify([newChat]));
        return [newChat];
      }

      return updatedChats;
    });
  };

  const handleChatTitleChange = (chatId: string, newTitle: string) => {
    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => 
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      );
      // No need to save to localStorage here, it's handled by the message update logic
      return updatedChats;
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <div
        className={`transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "w-80" : "w-0"
        } h-full flex-shrink-0 overflow-hidden bg-zinc-900 border-r border-zinc-800`}
      >
        <ChatHistory
          chats={chats}
          activeChatId={activeChatId}
          onChatSelect={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
        />
      </div>
      <div className="flex flex-1 flex-col">
        <ChatLayout
          activeChatId={activeChatId}
          onNewChat={handleNewChat}
          onChatTitleChange={handleChatTitleChange}
          onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
        />
      </div>
    </div>
  );
}
