
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
  className?: string; // To catch the className prop from react-markdown
  children?: React.ReactNode; // To catch children if passed differently
  inline?: boolean; // To catch inline prop from react-markdown
  node?: any; // To catch node prop from react-markdown
}

export default function VSCodeCodeBlock({ filename: initialFilename, language: initialLanguage, code: initialCode, ...props }: VSCodeCodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  // Extract code from children if initialCode is not directly provided
  // react-markdown passes code as children
  const code = initialCode || (Array.isArray(props.children) ? String(props.children[0]) : String(props.children)).replace(/\n$/, '');
  
  // Extract language from className if not directly provided
  // react-markdown passes language as className="language-xyz"
  let language = initialLanguage || "plaintext";
  if (props.className) {
    const match = /language-(\w+)/.exec(props.className || '');
    if (match) {
      language = match[1];
    }
  }
  
  const filename = initialFilename || "file.txt";


  useEffect(() => {
    try {
      const elements = document.querySelectorAll('pre code');
      if (elements.length > 0) {
        // More targeted highlighting can be done if needed
        // For now, highlightAll is used as in the original component
        elements.forEach(el => hljs.highlightElement(el as HTMLElement));
      }
    } catch (e) {
      console.error("highlight.js error:", e);
    }
  }, [code, language]); // Re-run when code or language changes

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      // Removed success toast to adhere to PRD guidelines
      // toast({ title: "Copiado!", description: "O código foi copiado para a área de transferência." });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
      toast({ variant: "destructive", title: "Erro ao copiar", description: "Não foi possível copiar o código." });
    }
  };

  const displayName = filename && filename !== "file.txt" ? filename : language;

  return (
    <div className="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-lg border border-gray-700/50 font-mono text-sm my-4 relative group">
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

      <div className="p-4 overflow-x-auto text-white hljs">
        <pre key={`${language}-${code.substring(0,50)}`} className="!p-0 !bg-transparent !whitespace-pre-wrap !break-words">
          <code className={`language-${language}`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}
