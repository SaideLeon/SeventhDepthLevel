
"use client";

import React, { useState, useEffect } from "react";
import { User, Bot, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import TypewriterEffect from "@/components/typewriter-effect";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isThinkingPlaceholder?: boolean;
  startTime?: number;
}

interface ChatMessageProps {
  message: Message;
  typingSpeed: number;
}

export default function ChatMessage({ message, typingSpeed }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (message.isThinkingPlaceholder && message.startTime) {
      // Set initial elapsed time
      setElapsedTime(Date.now() - message.startTime);
      
      intervalId = setInterval(() => {
        if (message.startTime) { // Check again in case startTime becomes undefined
          setElapsedTime(Date.now() - message.startTime);
        }
      }, 100); // Update every 100ms
    } else {
      setElapsedTime(0); // Reset if not thinking or no start time
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [message.isThinkingPlaceholder, message.startTime]);

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
        )}
      >
        <CardContent className="p-3 text-sm break-words">
          {isUser ? (
            message.content
          ) : message.isThinkingPlaceholder ? (
            <div className="flex justify-center items-center h-8 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              {message.startTime && (
                <span className="text-xs text-muted-foreground">
                  ({elapsedTime} ms)
                </span>
              )}
            </div>
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
