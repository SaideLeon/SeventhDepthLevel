
"use client";

import React from "react";
import { User, Bot } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import TypewriterEffect from "@/components/typewriter-effect";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isThinkingPlaceholder?: boolean;
}

interface ChatMessageProps {
  message: Message;
  typingSpeed: number;
}

export default function ChatMessage({ message, typingSpeed }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex items-end gap-2 animate-in fade-in duration-500",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 self-start shadow-sm">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <Card
        className={cn(
          "max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl shadow-md rounded-xl",
          isUser ? "bg-primary text-primary-foreground" : "bg-card",
          !isUser && message.isThinkingPlaceholder && "animate-bubble-pulse"
        )}
      >
        <CardContent className="p-3 text-sm break-words">
          {isUser ? (
            message.content
          ) : message.isThinkingPlaceholder ? (
            message.content
          ) : (
            <TypewriterEffect text={message.content} speed={typingSpeed} />
          )}
        </CardContent>
      </Card>
      {isUser && (
         <Avatar className="h-8 w-8 self-start shadow-sm">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
