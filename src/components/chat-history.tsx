"use client";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import type { Chat } from "./chat-layout";

type ChatHistoryProps = {
  chats: Chat[];
  activeChatId: string | null;
  onChatSelect: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
};

export function ChatHistory({
  chats,
  activeChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
}: ChatHistoryProps) {
  return (
    <div className="flex h-full flex-col p-4 bg-card border-r">
      <Button
        onClick={onNewChat}
        className="w-full justify-start gap-2 mb-4"
        variant="outline"
      >
        <Plus className="h-4 w-4" />
        New Chat
      </Button>
      <div className="flex-1 overflow-y-auto -mx-4 px-4">
        <h2 className="text-lg font-semibold text-foreground mb-2 px-4">History</h2>
        <div className="space-y-1">
          {chats.map((chat) => (
            <div key={chat.id} className="group relative">
              <Button
                variant="ghost"
                onClick={() => onChatSelect(chat.id)}
                className={cn(
                  "w-full justify-start gap-2 truncate",
                  chat.id === activeChatId && "bg-accent text-accent-foreground"
                )}
              >
                <MessageSquare className="h-4 w-4" />
                <span className="flex-1 text-left truncate">
                  {chat.title}
                </span>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
