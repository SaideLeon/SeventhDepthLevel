
"use client";

import React, { useState, useEffect } from "react";
import { User, Bot, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import TypewriterEffect from "@/components/typewriter-effect";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import VSCodeCodeBlock from "./vscode-code-block";

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
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (message.isThinkingPlaceholder && message.startTime) {
      setElapsedTime(Date.now() - message.startTime);
      intervalId = setInterval(() => {
        if (message.startTime) {
          setElapsedTime(Date.now() - message.startTime);
        }
      }, 100);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [message.isThinkingPlaceholder, message.startTime]);

  useEffect(() => {
    // Reset typing complete state when message content changes (for new AI messages)
    if (message.role === "assistant" && !message.isThinkingPlaceholder) {
      setIsTypingComplete(false);
    }
    // If it's a user message, or a thinking placeholder, consider typing "complete" for rendering purposes
    if (isUser || message.isThinkingPlaceholder) {
        setIsTypingComplete(true);
    }

  }, [message.content, message.role, isUser, message.isThinkingPlaceholder]);


  const handleTypingComplete = () => {
    setIsTypingComplete(true);
  };

  const renderContent = () => {
    if (isUser) {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              if (!inline && match) {
                return (
                  <VSCodeCodeBlock
                    language={match[1]}
                    code={String(children).replace(/\n$/, '')}
                    className={className}
                    node={node}
                    {...props}
                  />
                );
              } else if (inline) {
                return (
                  <code className="bg-muted px-1.5 py-0.5 rounded-sm font-mono text-sm mx-0.5" {...props}>
                    {children}
                  </code>
                );
              }
              // Fallback for code blocks without a language or if something goes wrong
              return (
                 <VSCodeCodeBlock
                    language="plaintext"
                    code={String(children).replace(/\n$/, '')}
                    className={className}
                    node={node}
                    {...props}
                  />
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      );
    }

    if (message.isThinkingPlaceholder) {
      return (
        <div className="flex justify-center items-center h-8 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          {message.startTime && (
            <span className="text-xs text-muted-foreground">
              ({elapsedTime} ms)
            </span>
          )}
        </div>
      );
    }

    if (!isTypingComplete) {
      return <TypewriterEffect text={message.content} speed={typingSpeed} onComplete={handleTypingComplete} />;
    }

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
           code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              if (!inline && match) {
                return (
                  <VSCodeCodeBlock
                    language={match[1]}
                    code={String(children).replace(/\n$/, '')}
                    className={className}
                    node={node}
                    {...props}
                  />
                );
              } else if (inline) {
                return (
                  <code className="bg-muted px-1.5 py-0.5 rounded-sm font-mono text-sm mx-0.5" {...props}>
                    {children}
                  </code>
                );
              }
              return (
                 <VSCodeCodeBlock
                    language="plaintext"
                    code={String(children).replace(/\n$/, '')}
                    className={className}
                    node={node}
                    {...props}
                  />
              );
            },
        }}
      >
        {message.content}
      </ReactMarkdown>
    );
  };


  return (
    <div
      className={cn(
        "flex items-end gap-2 animate-in fade-in duration-500 markdown-container",
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
           message.isThinkingPlaceholder ? "animate-bubble-pulse" : ""
        )}
      >
        <CardContent className={cn("p-3 text-sm break-words", {"prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-li:my-0.5 prose-pre:my-2 prose-blockquote:my-2": isTypingComplete || isUser })}>
          {renderContent()}
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
