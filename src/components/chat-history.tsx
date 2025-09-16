"use client";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Plus, MessageSquare, Trash2, User } from "lucide-react";
import type { Chat } from "./chat-layout";
import { Avatar, AvatarFallback } from "./ui/avatar";

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
  const groupedChats = chats.reduce((acc, chat) => {
    const date = new Date();
    const now = new Date();
    const diffDays = Math.ceil(
      (now.getTime() - date.getTime()) / (1000 * 3600 * 24)
    );

    let groupTitle = "New";
    if (diffDays <= 7) {
      groupTitle = "Previous 7 Days";
    } else if (diffDays <= 30) {
      groupTitle = "Previous 30 Days";
    } else {
      const month = date.toLocaleString("default", { month: "long" });
      groupTitle = month;
    }

    if (!acc[groupTitle]) {
      acc[groupTitle] = [];
    }
    acc[groupTitle].push(chat);
    return acc;
  }, {} as Record<string, Chat[]>);

  return (
    <div className="flex h-full flex-col p-2 bg-zinc-900 text-white">
      <div className="flex-1 overflow-y-auto">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 mb-4 text-white hover:bg-zinc-800"
          variant="ghost"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        <div className="space-y-4">
          {Object.entries(groupedChats).map(([groupTitle, chatsInGroup]) => (
            <div key={groupTitle}>
              <h2 className="text-xs font-semibold text-zinc-400 px-2 mb-2">
                {groupTitle}
              </h2>
              <div className="space-y-1">
                {chatsInGroup.map((chat) => (
                  <div key={chat.id} className="group relative">
                    <Button
                      variant="ghost"
                      onClick={() => onChatSelect(chat.id)}
                      className={cn(
                        "w-full justify-start gap-2 truncate text-sm text-zinc-300 hover:bg-zinc-800",
                        chat.id === activeChatId && "bg-zinc-800 text-white"
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-zinc-700"
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
          ))}
        </div>
      </div>
      <div className="mt-auto p-2 space-y-2 border-t border-zinc-800">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-zinc-300 hover:bg-zinc-800"
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </div>
    </div>
  );
}