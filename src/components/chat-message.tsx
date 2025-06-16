
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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


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
  const contentToPdfRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadPdf = async () => {
    const elementToCapture = contentToPdfRef.current;
    if (!elementToCapture || !message.content) {
      toast({ title: "Erro ao Baixar PDF", description: "Nenhum conteúdo para baixar.", variant: "destructive" });
      return;
    }

    toast({ title: "Preparando PDF...", description: "Aguarde enquanto o documento é gerado." });

    const clonedElementContainer = document.createElement('div');

    // Base styles for the off-screen container
    clonedElementContainer.style.position = 'absolute';
    clonedElementContainer.style.left = '-9999px'; // Position off-screen
    clonedElementContainer.style.top = '-9999px';
    clonedElementContainer.style.width = '794px'; // A4 width at 96 DPI (approx 210mm)
    clonedElementContainer.style.padding = '20px';
    clonedElementContainer.style.background = '#ffffff'; // Force white background
    clonedElementContainer.style.fontFamily = 'Arial, sans-serif'; // Force standard font
    clonedElementContainer.style.color = '#000000'; // Force black text
    
    // Apply prose classes for structure, but override colors/fonts
    clonedElementContainer.className = 'markdown-container prose prose-sm max-w-none';

    // Override Tailwind prose CSS variables for simple black/white theme
    // This is crucial for html2canvas to render predictable colors
    const styleOverrides = `
      --tw-prose-body: #000000;
      --tw-prose-headings: #000000;
      --tw-prose-lead: #000000;
      --tw-prose-links: #0000EE; /* Standard blue for links */
      --tw-prose-bold: #000000;
      --tw-prose-counters: #000000;
      --tw-prose-bullets: #000000;
      --tw-prose-hr: #cccccc; /* Light gray for HR */
      --tw-prose-quotes: #000000;
      --tw-prose-quote-borders: #cccccc;
      --tw-prose-captions: #000000;
      --tw-prose-code: #000000; /* For inline code text */
      --tw-prose-pre-code: #000000; /* For code block text */
      --tw-prose-pre-bg: #f5f5f5; /* Light gray for code block background */
      --tw-prose-th-borders: #cccccc;
      --tw-prose-td-borders: #cccccc;
      /* Invert variables are not needed as we force light theme */
    `;
    clonedElementContainer.style.cssText += styleOverrides;


    const clonedContent = elementToCapture.cloneNode(true) as HTMLElement;
    // Remove interactive elements from clone if necessary (e.g., copy buttons from code blocks)
    // This example assumes VSCodeCodeBlock does not add its own copy button inside the captured area.
    // If it does, those would need to be querySelected and removed from `clonedContent`.
    
    clonedElementContainer.appendChild(clonedContent);
    document.body.appendChild(clonedElementContainer);

    try {
      const canvas = await html2canvas(clonedElementContainer, {
        scale: 2, // Improves quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff', // Ensure canvas background is white
        removeContainer: true, // html2canvas option to remove the container after capture
        onclone: (documentClone) => {
            // Apply styles to the cloned document if needed, for elements html2canvas might create
            // For example, if VSCodeCodeBlock dynamically loads styles, this might be a place
            // But we try to set most things on clonedElementContainer directly.
        }
      });

      // html2canvas might not need explicit removal if removeContainer:true works
      if (clonedElementContainer.parentNode) {
        document.body.removeChild(clonedElementContainer);
      }

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 15; // PDF margin in mm

      const imgProps = pdf.getImageProperties(imgData);
      const aspectRatio = imgProps.width / imgProps.height;

      let newImgWidth = pdfWidth - 2 * margin;
      let newImgHeight = newImgWidth / aspectRatio;

      // Fit image within page margins, handling both portrait and landscape aspects
      if (newImgHeight > pdfHeight - 2 * margin) {
        newImgHeight = pdfHeight - 2 * margin;
        newImgWidth = newImgHeight * aspectRatio;
      }
      
      // Ensure the image width does not exceed the page width after height adjustment
      if (newImgWidth > pdfWidth - 2 * margin) {
          newImgWidth = pdfWidth - 2 * margin;
          newImgHeight = newImgWidth / aspectRatio;
      }


      const xOffset = margin + Math.max(0, (pdfWidth - 2 * margin - newImgWidth) / 2); // Center if smaller
      const yOffset = margin;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, newImgWidth, newImgHeight);
      pdf.save(`Cabulador-Resposta-${message.id.substring(0,6)}.pdf`);

      toast({ title: "Download Iniciado", description: "Seu PDF está sendo baixado." });

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      if (clonedElementContainer.parentNode) {
           document.body.removeChild(clonedElementContainer);
      }
      toast({ title: "Erro ao Baixar PDF", description: "Não foi possível gerar o PDF. Tente novamente.", variant: "destructive" });
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
        // Fallback pre for non-VSCodeCodeBlock scenarios (should ideally not happen with current logic)
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
        // This case should be handled by the `pre` component custom renderer above for block code.
        // If it's reached, it means it's a block code not wrapped in `pre` by react-markdown,
        // which is unusual. We'll render it as a VSCodeCodeBlock.
        const match = /language-(\w+)/.exec(className || '');
        const lang = match ? match[1] : 'plaintext';
        const codeString = Array.isArray(children) ? children.join('') : String(children);
        return <VSCodeCodeBlock language={lang} code={codeString.replace(/\n$/, '')} filename={lang !== 'plaintext' ? `code.${lang}`: undefined}/>;
      },
       img: ({ node, ...props }: any) => ( 
        // For PDF, we might want to ensure images are not too wide and have some margin.
        // The off-screen div's width and prose classes should handle sizing.
        <span className="block my-3 rounded-lg overflow-hidden border shadow-sm">
          <Image
            src={props.src || "https://placehold.co/600x400.png"}
            alt={props.alt || "AI generated image"}
            layout="responsive"
            width={700} // This width is for layout responsiveness in browser
            height={400}// This height is for layout responsiveness in browser
            className="object-contain" // Ensures image scales within bounds
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

    // Typist complete, render full Markdown
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {message.content}
      </ReactMarkdown>
    );
  };


  return (
    <div
      className={cn(
        "flex items-end gap-2 animate-in fade-in duration-500 markdown-container group", // markdown-container sets up prose context
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
            isUser ? "bg-primary text-primary-foreground" : "bg-card relative" // Added relative for positioning copy/download buttons
          )}
        >
          <CardContent className={cn(
            "p-3 text-sm break-words", 
            // Apply prose styling directly if not using markdown-container class on parent,
            // or ensure markdown-container styles are correctly scoped.
            // For assistant messages, prose styles are applied by `markdown-container` class on root or `renderContent` wrapper
            {"prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-li:my-0.5 prose-pre:my-2 prose-blockquote:my-2": isUser || (message.role === 'assistant' && !message.isThinkingPlaceholder)}
            )}>
            {/* The ref is now applied to the direct content wrapper for PDF generation */}
            <div ref={contentToPdfRef}>
              {renderContent()}
            </div>
          </CardContent>
          {/* Action buttons (Copy/Download) for assistant messages */}
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
                onClick={handleDownloadPdf}
                className="h-7 w-7 text-muted-foreground hover:text-accent focus-visible:text-accent"
                aria-label="Baixar resposta como PDF"
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

    