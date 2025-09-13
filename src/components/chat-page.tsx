"use client";

import { useState, useEffect, useCallback } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import ChatLayout, { type Chat } from "@/components/chat-layout";
import { ChatHistory } from "@/components/chat-history";
import { v4 as uuidv4 } from "uuid";

const CHAT_HISTORY_KEY = "chat-history";

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const handleNewChat = useCallback(() => {
    const newChat: Chat = {
      id: uuidv4(),
      title: "New Chat",
      messages: [],
      role: 'user', 
      content: ''
    };
    setChats((prevChats) => [newChat, ...prevChats]);
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

  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chats));
    }
  }, [chats]);

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
  };

  const handleDeleteChat = (id: string) => {
    setChats((prevChats) => {
      const updatedChats = prevChats.filter((chat) => chat.id !== id);
      if (activeChatId === id) {
        if (updatedChats.length > 0) {
          setActiveChatId(updatedChats[0].id);
        } else {
          handleNewChat();
        }
      }
      if(updatedChats.length === 0) {
        const newChat: Chat = { id: uuidv4(), title: "New Chat", messages: [], role: 'user', content: '' };
        setActiveChatId(newChat.id);
        return [newChat];
      }
      return updatedChats;
    });
  };

  const handleMessagesChange = (chatId: string, messages: any[]) => {
    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id === chatId) {
          const firstUserMessage = messages.find(m => m.role === 'user');
          const newTitle =
            chat.title === "New Chat" && firstUserMessage
              ? firstUserMessage.content.substring(0, 30)
              : chat.title;
          return { ...chat, title: newTitle, messages };
        }
        return chat;
      })
    );
  };

  const activeChat = chats.find((chat) => chat.id === activeChatId);

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-zinc-900">
        <Sidebar collapsible="offcanvas" className="w-80 border-r border-zinc-800 bg-zinc-900">
          <ChatHistory
            chats={chats}
            activeChatId={activeChatId}
            onChatSelect={handleSelectChat}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
          />
        </Sidebar>
        <SidebarInset>
          <ChatLayout
            activeChat={activeChat}
            onMessagesChange={handleMessagesChange}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
