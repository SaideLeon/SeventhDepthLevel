
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


interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageDataUri?: string;
  isThinkingPlaceholder?: boolean;
  startTime?: number;
  currentProcessingStepMessage?: string; // Changed from isProcessingContext
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

    if (message.isThinkingPlaceholder && message.startTime) { // Now only depends on isThinkingPlaceholder for timer
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
    if (message.role === "assistant" && !message.isThinkingPlaceholder) {
      setIsTypingComplete(false);
    }
    if (isUser || message.isThinkingPlaceholder) {
        setIsTypingComplete(true);
    }
  }, [message.content, message.role, isUser, message.isThinkingPlaceholder]);


  const handleTypingComplete = () => {
    setIsTypingComplete(true);
  };

  const handleCopyText = async () => {
    if (!message.content && !message.imageDataUri) return;
    
    if (!message.content) {
        toast({
            title: "Apenas Imagem",
            description: "A funcionalidade de copiar imagem ainda não está implementada. O texto (se houver) foi copiado.",
        });
        if (!message.content) return; 
    }

    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); 
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
    const markdownContent = (
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
                src={props.src || "https://placehold.co/600x400.png"}
                alt={props.alt || "AI generated image"}
                layout="responsive"
                width={700}
                height={400}
                className="object-contain"
                data-ai-hint="illustration diagram"
              />
            </span>
          ),
        }}
      >
        {message.content}
      </ReactMarkdown>
    );

    const userImageElement = message.imageDataUri && isUser ? (
      <div className="my-2 block rounded-lg overflow-hidden border shadow-sm max-w-xs">
        <Image
          src={message.imageDataUri}
          alt="User uploaded image"
          width={300}
          height={300}
          className="object-contain"
          data-ai-hint="user upload"
        />
      </div>
    ) : null;

    if (isUser) {
      return (
        <div className="flex flex-col"> {/* Ensure content and image are in a column for user */}
          {userImageElement}
          {message.content && markdownContent}
          {!message.content && userImageElement && <span className="text-muted-foreground italic text-xs">(Imagem enviada)</span>}
        </div>
      );
    }

    if (message.isThinkingPlaceholder) {
      return (
        <div className="flex flex-col items-center justify-center h-auto p-2 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground text-center">{message.currentProcessingStepMessage || "Processando..."}</span>
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

    return markdownContent;
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
      <div className={cn("flex flex-col", { "items-end": isUser })}> {/* This div controls alignment of card within the row */}
        <Card
          className={cn(
            "max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl shadow-md rounded-xl",
            isUser ? "bg-primary text-primary-foreground" : "bg-card relative"
          )}
        >
          <CardContent className={cn("p-3 text-sm break-words", {"prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-li:my-0.5 prose-pre:my-2 prose-blockquote:my-2": (isTypingComplete || isUser) && !message.isThinkingPlaceholder })}>
            {renderContent()}
          </CardContent>
          {!isUser && isTypingComplete && !message.isThinkingPlaceholder && message.content && (
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

    