
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { User, Bot, Loader2, Copy as CopyIcon, Check as CheckIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TypewriterEffect from "@/components/typewriter-effect";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import VSCodeCodeBlock from "./vscode-code-block";
import { useToast } from "@/hooks/use-toast";


interface MessageImage {
  src: string;
  alt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isThinkingPlaceholder?: boolean;
  startTime?: number;
  images?: MessageImage[];
  isProcessingContext?: boolean;
}

interface ChatMessageProps {
  message: Message;
  typingSpeed: number;
}

export default function ChatMessage({ message, typingSpeed }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if ((message.isThinkingPlaceholder || message.isProcessingContext) && message.startTime) {
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
  }, [message.isThinkingPlaceholder, message.isProcessingContext, message.startTime]);

  useEffect(() => {
    if (message.role === "assistant" && !message.isThinkingPlaceholder && !message.isProcessingContext) {
      setIsTypingComplete(false);
    }
    if (isUser || message.isThinkingPlaceholder || message.isProcessingContext) {
        setIsTypingComplete(true);
    }
  }, [message.content, message.role, isUser, message.isThinkingPlaceholder, message.isProcessingContext]);


  const handleTypingComplete = () => {
    setIsTypingComplete(true);
  };

  const handleCopyText = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset icon after 2 seconds
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast({
        title: "Erro ao Copiar",
        description: "Não foi possível copiar o texto para a área de transferência.",
        variant: "destructive",
      });
    }
  };

  const renderContent = () => {
    if (isUser) {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            pre: ({ node, ...props }) => {
              const codeNode = props.children?.[0] as React.ReactElement;
              let codeString = "";
              let language = "plaintext";
              if (codeNode && codeNode.type === 'code') {
                if (codeNode.props.className) {
                  language = codeNode.props.className.replace('language-', '');
                }
                codeString = String(codeNode.props.children).replace(/\n$/, '');
                return <VSCodeCodeBlock language={language} code={codeString} />;
              }
              codeString = String(props.children).replace(/\n$/, '');
              return <VSCodeCodeBlock language={language} code={codeString} />;
            },
            code({ node, inline, className, children, ...props }) {
              if (inline) {
                return (
                  <code className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm font-mono text-xs mx-0.5" {...props}>
                    {children}
                  </code>
                );
              }
              const match = /language-(\w+)/.exec(className || '');
              return (
                 <VSCodeCodeBlock
                    language={match ? match[1] : 'plaintext'}
                    code={String(children).replace(/\n$/, '')}
                  />
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      );
    }

    if (message.isThinkingPlaceholder || message.isProcessingContext) {
      return (
        <div className="flex flex-col items-center justify-center h-auto p-2 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground text-center">{message.content || "Processing..."}</span>
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
           pre: ({ node, ...props }) => {
              const codeNode = props.children?.[0] as React.ReactElement;
              let codeString = "";
              let language = "plaintext";
              if (codeNode && codeNode.type === 'code') {
                 if (codeNode.props.className) {
                    language = codeNode.props.className.replace('language-', '');
                 }
                 codeString = String(codeNode.props.children).replace(/\n$/, '');
                 return <VSCodeCodeBlock language={language} code={codeString} />;
              }
              codeString = String(props.children).replace(/\n$/, '');
              return <VSCodeCodeBlock language={language} code={codeString} />;
            },
            code({ node, inline, className, children, ...props }) {
              if (inline) {
                return (
                  <code className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm font-mono text-xs mx-0.5" {...props}>
                    {children}
                  </code>
                );
              }
              const match = /language-(\w+)/.exec(className || '');
              return (
                 <VSCodeCodeBlock
                    language={match ? match[1] : 'plaintext'}
                    code={String(children).replace(/\n$/, '')}
                  />
              );
            },
             img: ({ node, ...props }) => (
              <span className="block my-3 rounded-lg overflow-hidden border shadow-sm">
                <Image
                  {...(props as React.ComponentProps<typeof Image>)}
                  layout="responsive"
                  width={700} // Provide a default width, layout="responsive" will scale it
                  height={400} // Provide a default height
                  className="object-contain" // Use object-contain or object-cover as needed
                  data-ai-hint="illustration diagram" // Add a generic hint
                />
              </span>
            ),
        }}
      >
        {message.content}
      </ReactMarkdown>
    );
  };


  return (
    <div
      className={cn(
        "flex items-end gap-2 animate-in fade-in duration-500 markdown-container group", 
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
      <div className="flex flex-col w-full">
        <Card
          className={cn(
            "max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl shadow-md rounded-xl",
            isUser ? "bg-primary text-primary-foreground" : "bg-card relative"
          )}
        >
          <CardContent className={cn("p-3 text-sm break-words", {"prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-li:my-0.5 prose-pre:my-2 prose-blockquote:my-2": (isTypingComplete || isUser) && !message.isThinkingPlaceholder && !message.isProcessingContext })}>
            {renderContent()}
          </CardContent>
          {!isUser && isTypingComplete && !message.isThinkingPlaceholder && !message.isProcessingContext && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyText}
              className="absolute top-1 right-1 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
              aria-label="Copiar texto da IA"
            >
              {isCopied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
            </Button>
          )}
        </Card>
        
      </div>
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

