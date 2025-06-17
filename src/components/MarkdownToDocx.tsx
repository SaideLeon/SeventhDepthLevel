
// src/components/MarkdownToDocx.tsx
'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MarkdownToDocxProps {
  markdownContent: string | null;
  fileName?: string;
  disabled?: boolean;
}

export default function MarkdownToDocx({ markdownContent, fileName = "documento_cabulador_ai", disabled = false }: MarkdownToDocxProps) {
  const { toast } = useToast();
  const [isConverting, setIsConverting] = React.useState(false);

  const gerarDoc = async () => {
    if (!markdownContent) {
      toast({
        title: "Sem Conteúdo",
        description: "Não há texto para converter para DOCX.",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);

    try {
      const response = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markdownContent }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erro desconhecido ao processar a resposta do servidor."}));
        throw new Error(errorData.error || `Falha ao gerar DOCX no servidor: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "DOCX Gerado",
        description: `${fileName}.docx foi baixado com sucesso.`,
        variant: "default",
        className: "bg-accent text-accent-foreground",
      });

    } catch (error) {
      console.error("Erro ao gerar DOCX:", error);
      toast({
        title: "Falha na Geração do DOCX",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao criar o arquivo DOCX.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Button
      onClick={gerarDoc}
      disabled={!markdownContent || isConverting || disabled}
      variant="ghost" 
      size="icon"    
      className="h-7 w-7 text-muted-foreground hover:text-accent-foreground focus-visible:text-accent-foreground" 
      aria-label="Baixar como DOCX"
    >
      {isConverting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </Button>
  );
}
