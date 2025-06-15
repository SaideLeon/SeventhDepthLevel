
"use client";

import { useEffect, useState } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css"; 
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VSCodeCodeBlockProps {
  filename?: string;
  language?: string;
  code?: string;
  // Props below are to catch them if passed by react-markdown, but not directly used if `code` and `language` are provided.
  className?: string; 
  children?: React.ReactNode; 
  inline?: boolean; 
  node?: any; 
}

export default function VSCodeCodeBlock({ 
  filename: initialFilename, 
  language: initialLanguage = "plaintext", 
  code: initialCode = "",
  // Destructure other props to prevent them from being passed down to div if not needed
  className: propClassName, 
  children: propChildren, 
  inline: propInline, 
  node: propNode, 
  ...restProps 
}: VSCodeCodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const codeToDisplay = initialCode;
  const langToDisplay = initialLanguage === '' ? 'plaintext' : initialLanguage; // Ensure langToDisplay has a default

  useEffect(() => {
    try {
      // More targeted highlighting using a ref could be an option for complex scenarios,
      // but querySelectorAll is fine for typical usage.
      document.querySelectorAll('pre code.language-' + langToDisplay).forEach(el => {
        // Check if already highlighted to prevent re-highlighting by hljs.highlightAll or similar
        if (!el.classList.contains('hljs') && !(el as HTMLElement).dataset.highlighted) {
          hljs.highlightElement(el as HTMLElement);
          (el as HTMLElement).dataset.highlighted = 'true';
        }
      });
    } catch (e) {
      console.error("highlight.js error:", e);
    }
  }, [codeToDisplay, langToDisplay]); // Re-run when code or language changes

  const handleCopy = async () => {
    if (!codeToDisplay) return;
    try {
      await navigator.clipboard.writeText(codeToDisplay);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
      toast({ variant: "destructive", title: "Erro ao copiar", description: "Não foi possível copiar o código." });
    }
  };

  const displayName = initialFilename || langToDisplay;

  return (
    <div className="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-lg border border-gray-700/50 font-mono text-sm my-4 relative group" {...restProps}>
      <div className="flex items-center justify-between bg-[#2d2d2d] text-gray-300 px-4 py-2 border-b border-gray-700/50">
        <div className="flex items-center space-x-2">
          <span className="h-3 w-3 rounded-full bg-red-500 block"></span>
          <span className="h-3 w-3 rounded-full bg-yellow-400 block"></span>
          <span className="h-3 w-3 rounded-full bg-green-500 block"></span>
          <span className="ml-3 text-white font-medium text-xs">{displayName}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-600/50 opacity-50 group-hover:opacity-100 transition-opacity"
          aria-label="Copiar código"
        >
          {isCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <div className="p-4 overflow-x-auto text-white">
        <pre className="!p-0 !bg-transparent !whitespace-pre-wrap !break-words">
          <code className={`language-${langToDisplay}`}>
            {codeToDisplay}
          </code>
        </pre>
      </div>
    </div>
  );
}
