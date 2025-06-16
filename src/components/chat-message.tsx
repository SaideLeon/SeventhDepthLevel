
"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { User, Bot, Loader2, Copy as CopyIcon, Check as CheckIcon, Download } from "lucide-react";
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
  currentProcessingStepMessage?: string;
  applyTypewriter?: boolean;
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
  const contentToDownloadRef = useRef<HTMLDivElement>(null);

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
    let shouldBeComplete = true;
    if (message.role === "assistant" && !message.isThinkingPlaceholder && message.applyTypewriter === true) {
      shouldBeComplete = false;
    }
    setIsTypingComplete(shouldBeComplete);
  }, [message.role, message.isThinkingPlaceholder, message.applyTypewriter, message.id, message.content]);


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

  const handleDownloadDoc = async () => {
    const elementToCapture = contentToDownloadRef.current;
    if (!elementToCapture || !message.content) {
      toast({ title: "Erro ao Baixar Documento", description: "Nenhum conteúdo para baixar.", variant: "destructive" });
      return;
    }

    toast({ title: "Preparando Documento...", description: "Aguarde enquanto o arquivo .doc é gerado." });

    try {
      // Get the inner HTML of the content
      const contentHtml = elementToCapture.innerHTML;

      // Construct a full HTML document string
      // Basic styling is included to suggest a white background and black text.
      // Word will interpret this.
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="pt">
        <head>
          <meta charset="UTF-8">
          <title>Cabulador Resposta</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background-color: #ffffff; color: #000000; }
            /* Add any other specific styles for prose content if needed directly here */
            /* For example, for code blocks (though Word's HTML import handles <pre> and <code> reasonably) */
            pre { background-color: #f0f0f0; padding: 10px; border-radius: 5px; overflow-x: auto; }
            code { font-family: monospace; }
            img { max-width: 100%; height: auto; display: block; margin-top: 10px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
        </html>
      `;

      const blob = new Blob([fullHtml], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Cabulador-Resposta-${message.id.substring(0,6)}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({ title: "Download Iniciado", description: "Seu arquivo .doc está sendo baixado." });

    } catch (error) {
      console.error("Erro ao gerar .doc:", error);
      toast({ title: "Erro ao Baixar Documento", description: "Não foi possível gerar o arquivo .doc. Tente novamente.", variant: "destructive" });
    }
  };


  const markdownComponents = {
    pre: ({ node, children, ...props }: any) => {
        if (children && Array.isArray(children) && children.length > 0) {
          const codeElement = children[0] as React.ReactElement;
          if (codeElement && codeElement.type === 'code' && codeElement.props) {
            const { className, children: codeContentNode } = codeElement.props;
            const language = className?.replace(/^language-/, '') || 'plaintext';
            
            let finalCodeString = '';
            if (Array.isArray(codeContentNode)) {
              finalCodeString = codeContentNode.map(String).join('');
            } else if (codeContentNode !== null && codeContentNode !== undefined) {
              finalCodeString = String(codeContentNode);
            }
            finalCodeString = finalCodeString.replace(/\n$/, '');

            const filename = language !== 'plaintext' && language !== '' ? `code.${language}` : undefined;

            return <VSCodeCodeBlock language={language} code={finalCodeString} filename={filename} />;
          }
        }
        return <pre {...props} className="bg-muted p-2 rounded-md overflow-x-auto my-2 text-sm">{children}</pre>; 
      },
      code({ node, inline, className, children, ...props }: any) {
        if (inline) {
          return (
            <code className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm font-mono text-xs mx-0.5" {...props}>
              {children}
            </code>
          );
        }
        const match = /language-(\w+)/.exec(className || '');
        const lang = match ? match[1] : 'plaintext';
        const codeString = Array.isArray(children) ? children.join('') : String(children);
        return <VSCodeCodeBlock language={lang} code={codeString.replace(/\n$/, '')} filename={lang !== 'plaintext' ? `code.${lang}`: undefined}/>;
      },
       img: ({ node, ...props }: any) => ( 
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
  };

  const renderContent = () => {
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
        <div className="flex flex-col">
          {userImageElement}
          {message.content && (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          )}
          {!message.content && userImageElement && <span className="text-muted-foreground italic text-xs">(Imagem enviada)</span>}
        </div>
      );
    }

    // Assistant messages
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
      return (
        <TypewriterEffect
          text={message.content}
          speed={typingSpeed}
          onComplete={handleTypingComplete}
          markdownComponents={markdownComponents}
          remarkPlugins={[remarkGfm]}
        />
      );
    }

    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
      <div className={cn("flex flex-col", { "items-end": isUser })}>
        <Card
          className={cn(
            "max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl shadow-md rounded-xl",
            isUser ? "bg-primary text-primary-foreground" : "bg-card relative" 
          )}
        >
          <CardContent className={cn(
            "p-3 text-sm break-words", 
            {"prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-li:my-0.5 prose-pre:my-2 prose-blockquote:my-2": isUser || (message.role === 'assistant' && !message.isThinkingPlaceholder)}
            )}>
            <div ref={contentToDownloadRef}>
              {renderContent()}
            </div>
          </CardContent>
          {!isUser && isTypingComplete && !message.isThinkingPlaceholder && message.content && (
            <div className="absolute top-1 right-1 flex space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyText}
                className="h-7 w-7 text-muted-foreground hover:text-accent focus-visible:text-accent"
                aria-label="Copiar texto da IA"
              >
                {isCopied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownloadDoc}
                className="h-7 w-7 text-muted-foreground hover:text-accent focus-visible:text-accent"
                aria-label="Baixar resposta como .doc"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
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
