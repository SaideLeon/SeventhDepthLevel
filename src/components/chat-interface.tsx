
"use client";

import type { FormEvent, ChangeEvent } from "react";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizontal, Loader2, Trash2, Settings, SearchCheck, SearchSlash, Paperclip, X } from "lucide-react";
import ChatMessage from "@/components/chat-message";
import SettingsPopover from "@/components/settings-popover";
import ThemeToggleButton from "./theme-toggle-button";
import { generateResponse, type GenerateResponseOutput, type GenerateResponseInput } from "@/ai/flows/generate-response";
import type { DetectTopicFromTextOutput } from "@/ai/flows/detect-topic-flow";
import type { DecideSearchNecessityOutput } from "@/ai/flows/decide-search-flow";
import type { SearchResult, PageContent } from "@/utils/raspagem";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageDataUri?: string; // For user-uploaded images
  isThinkingPlaceholder?: boolean;
  startTime?: number;
  isProcessingContext?: boolean;
}

const TYPING_SPEED_STORAGE_KEY = "seventhdepthlevel_typing_speed";
const AI_PERSONA_STORAGE_KEY = "seventhdepthlevel_persona";
const AI_RULES_STORAGE_KEY = "seventhdepthlevel_rules";
const SEARCH_ENABLED_STORAGE_KEY = "seventhdepthlevel_search_enabled";


export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [typingSpeed, setTypingSpeed] = useState<number>(1);
  const [aiPersona, setAiPersona] = useState<string>("");
  const [aiRules, setAiRules] = useState<string>("");
  const [isSearchEnabled, setIsSearchEnabled] = useState<boolean>(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedSpeed = localStorage.getItem(TYPING_SPEED_STORAGE_KEY);
    if (storedSpeed) setTypingSpeed(Number(storedSpeed));
    else setTypingSpeed(1);

    const storedPersona = localStorage.getItem(AI_PERSONA_STORAGE_KEY);
    if (storedPersona) setAiPersona(storedPersona);

    const storedRules = localStorage.getItem(AI_RULES_STORAGE_KEY);
    if (storedRules) setAiRules(storedRules);

    const storedSearchEnabled = localStorage.getItem(SEARCH_ENABLED_STORAGE_KEY);
    if (storedSearchEnabled) setIsSearchEnabled(storedSearchEnabled === 'true');
    else setIsSearchEnabled(true);
  }, []);

  useEffect(() => {
    localStorage.setItem(TYPING_SPEED_STORAGE_KEY, typingSpeed.toString());
  }, [typingSpeed]);

  useEffect(() => {
    localStorage.setItem(AI_PERSONA_STORAGE_KEY, aiPersona);
  }, [aiPersona]);

  useEffect(() => {
    localStorage.setItem(AI_RULES_STORAGE_KEY, aiRules);
  }, [aiRules]);

  useEffect(() => {
    localStorage.setItem(SEARCH_ENABLED_STORAGE_KEY, String(isSearchEnabled));
  }, [isSearchEnabled]);


  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Imagem Muito Grande",
          description: "Por favor, selecione uma imagem menor que 5MB.",
          variant: "destructive",
        });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({
          title: "Tipo de Arquivo Inválido",
          description: "Por favor, selecione um arquivo de imagem (JPEG, PNG, WEBP, GIF).",
          variant: "destructive",
        });
        return;
      }
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImageFile(null);
    setSelectedImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  const fileToDataUri = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const updateThinkingMessage = (id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, ...updates } : msg));
  };

  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const userMessageContent = inputValue.trim();
    if ((!userMessageContent && !selectedImageFile) || isLoading) return;

    let userImageDataUri: string | undefined = undefined;

    setIsLoading(true);

    if (selectedImageFile) {
      try {
        userImageDataUri = await fileToDataUri(selectedImageFile);
      } catch (error) {
        console.error("Error converting image to Data URI:", error);
        toast({
          title: "Erro ao Processar Imagem",
          description: "Não foi possível processar a imagem selecionada.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    setInputValue("");
    clearSelectedImage();


    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessageContent,
      imageDataUri: userImageDataUri,
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const thinkingMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "Pensando...",
      isThinkingPlaceholder: true,
      startTime: Date.now(),
      isProcessingContext: false,
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);

    let contextContent: string | undefined = undefined;
    let imageInfo: string | undefined = undefined;
    
    try {
      if (isSearchEnabled && userMessageContent) { // Check for userMessageContent before deciding to search
        updateThinkingMessage(assistantMessageId, { content: "Analisando a necessidade de pesquisa...", isProcessingContext: true });

        const lastTwoAIMessages = messages.filter(msg => msg.role === 'assistant' && !msg.isThinkingPlaceholder && msg.id !== assistantMessageId).slice(-2);
        const previousAiResponse1 = lastTwoAIMessages.length > 0 ? lastTwoAIMessages[lastTwoAIMessages.length - 1].content : undefined;
        const previousAiResponse2 = lastTwoAIMessages.length > 1 ? lastTwoAIMessages[0].content : undefined;

        const decisionResponse = await fetch('/api/decide-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentUserQuery: userMessageContent, // Safe, as userMessageContent is not empty here
                previousAiResponse1,
                previousAiResponse2
            }),
        });

        if (!decisionResponse.ok) {
            const errorData = await decisionResponse.json();
            throw new Error(`Failed to decide search necessity: ${errorData.error || decisionResponse.statusText}`);
        }
        const decisionResult: DecideSearchNecessityOutput = await decisionResponse.json();
        
        if (decisionResult.decision === "SEARCH_NEEDED") {
          updateThinkingMessage(assistantMessageId, { content: "Detectando o tópico para pesquisa...", isProcessingContext: true });
          const topicResponse = await fetch('/api/detect-topic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ textQuery: userMessageContent }), // Safe, as userMessageContent is not empty
          });
          if (!topicResponse.ok) throw new Error("Falha ao detectar o tópico");
          const topicResult: DetectTopicFromTextOutput = await topicResponse.json();
          const detectedTopic = topicResult.detectedTopic;

          if (detectedTopic) {
            updateThinkingMessage(assistantMessageId, { content: `Pesquisando por: "${detectedTopic}"... (até 3 páginas)` });
            const searchApiResponse = await fetch('/api/raspagem', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ termoBusca: detectedTopic, todasPaginas: true }),
            });
            if (!searchApiResponse.ok) throw new Error("Falha ao buscar artigos");
            const searchResults: SearchResult[] = await searchApiResponse.json();

            const articlesToFetch = searchResults.slice(0, 3);
            let aggregatedContext: string[] = [];
            let aggregatedImageInfo: string[] = [];

            if (articlesToFetch.length > 0) {
              for (let i = 0; i < articlesToFetch.length; i++) {
                const article = articlesToFetch[i];
                updateThinkingMessage(assistantMessageId, { content: `Buscando conteúdo para o artigo ${i + 1} de ${articlesToFetch.length}: "${article.titulo.substring(0,30)}"...` });
                const contentApiResponse = await fetch('/api/raspagem', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: article.url }),
                });
                if (!contentApiResponse.ok) {
                  console.warn(`Falha ao buscar conteúdo para ${article.url}`);
                  continue;
                }
                const pageContent: PageContent = await contentApiResponse.json();

                if (pageContent.conteudo && !pageContent.erro) {
                  aggregatedContext.push(`Fonte ${i + 1}: ${pageContent.titulo}\nAutor: ${pageContent.autor || 'N/A'}\nConteúdo:\n${pageContent.conteudo.substring(0, 10000)}...`);
                  if (pageContent.imagens && pageContent.imagens.length > 0) {
                    aggregatedImageInfo.push(pageContent.imagens.map(img => `${img.legenda || pageContent.titulo || 'Imagem'} (${img.src})`).join('; '));
                  }
                }
              }
              if (aggregatedContext.length > 0) {
                contextContent = aggregatedContext.join("\n\n---\n\n");
                if (aggregatedImageInfo.length > 0) {
                    imageInfo = `Imagens encontradas que podem ser relevantes: ${aggregatedImageInfo.join('; ')}`;
                }
              } else {
                 updateThinkingMessage(assistantMessageId, { content: `Nenhum conteúdo de artigo encontrado para "${detectedTopic}". Prosseguindo com conhecimento geral...` });
                 await new Promise(resolve => setTimeout(resolve, 1500));
              }
            } else {
               updateThinkingMessage(assistantMessageId, { content: `Nenhum artigo relevante encontrado para "${detectedTopic}". Prosseguindo com conhecimento geral...` });
               await new Promise(resolve => setTimeout(resolve, 1500));
            }
          }
        } else { // Decision was NO_SEARCH_NEEDED
            updateThinkingMessage(assistantMessageId, { content: "Prosseguindo com conhecimento geral...", isProcessingContext: false });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else if (isSearchEnabled && !userMessageContent && userImageDataUri) {
        // Image only, search enabled, but no text to search for.
        updateThinkingMessage(assistantMessageId, { content: "Gerando resposta para a imagem...", isProcessingContext: false });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
       else { // Search disabled or no text content (and no image if previous block didn't catch it)
         updateThinkingMessage(assistantMessageId, { content: "Gerando resposta...", isProcessingContext: false });
         // Add a small delay if no specific processing happened before this.
         if (!userMessageContent && !userImageDataUri) { // Should be rare due to button guards
            await new Promise(resolve => setTimeout(resolve, 500));
         } else if (!userMessageContent && userImageDataUri && !isSearchEnabled) { // Image only, search disabled
            await new Promise(resolve => setTimeout(resolve, 500));
         }
      }

      updateThinkingMessage(assistantMessageId, {
        content: contextContent ? "Gerando resposta com o novo contexto..." : "Gerando resposta...",
        isProcessingContext: false
      });

      const conversationHistoryForAI = messages
        .filter(msg => !msg.isThinkingPlaceholder && !msg.isProcessingContext && msg.id !== assistantMessageId)
        .slice(-6)
        .map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));


      const aiInput: GenerateResponseInput = {
        prompt: userMessage.content,
        userImageInputDataUri: userMessage.imageDataUri,
        persona: aiPersona || undefined,
        rules: aiRules || undefined,
        contextContent: contextContent,
        imageInfo: imageInfo,
        conversationHistory: conversationHistoryForAI.length > 0 ? conversationHistoryForAI : undefined,
      };

      const aiResult: GenerateResponseOutput = await generateResponse(aiInput);

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: aiResult.response, isThinkingPlaceholder: false, startTime: undefined, isProcessingContext: false }
            : msg
        )
      );
    } catch (error) {
      console.error("Error in AI response generation:", error);
      let errorDescription = "Falha ao obter uma resposta da IA. Por favor, tente novamente.";
      if (error instanceof Error) {
        if (error.message.includes("decide search necessity")) errorDescription = "Falha ao decidir se a pesquisa era necessária.";
        else if (error.message.includes("detect topic")) errorDescription = "Falha ao detectar o tópico.";
        else if (error.message.includes("search articles")) errorDescription = "Falha ao buscar artigos.";
        else if (error.message.includes("fetch article content")) errorDescription = "Falha ao buscar conteúdo do artigo.";
      }
      toast({
        title: "Erro",
        description: errorDescription,
        variant: "destructive",
      });
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: "Desculpe, não consegui processar sua solicitação.", isThinkingPlaceholder: false, startTime: undefined, isProcessingContext: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConversation = () => {
    setMessages([]);
    clearSelectedImage();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isLoading && (inputValue.trim() || selectedImageFile)) {
         handleSendMessage();
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="p-4 border-b flex justify-between items-center shadow-sm sticky top-0 bg-background z-10">
        <h1 className="text-2xl font-headline font-semibold text-primary">SeventhDepthLevel</h1>
        <div className="flex items-center gap-2">
          <ThemeToggleButton />
          <SettingsPopover
            currentSpeed={typingSpeed}
            onSpeedChange={setTypingSpeed}
            currentPersona={aiPersona}
            onPersonaChange={setAiPersona}
            currentRules={aiRules}
            onRulesChange={setAiRules}
            isSearchEnabled={isSearchEnabled}
            onSearchEnabledChange={setIsSearchEnabled}
          >
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="h-5 w-5 text-muted-foreground hover:text-accent" />
            </Button>
          </SettingsPopover>
          <Button variant="ghost" size="icon" onClick={handleClearConversation} aria-label="Clear conversation">
            <Trash2 className="h-5 w-5 text-muted-foreground hover:text-destructive" />
          </Button>
           <Button variant="ghost" size="icon" onClick={() => setIsSearchEnabled(prev => !prev)} aria-label={isSearchEnabled ? "Desativar Automação de Pesquisa Contextual" : "Ativar Automação de Pesquisa Contextual"}>
            {isSearchEnabled ? <SearchCheck className="h-5 w-5 text-accent" /> : <SearchSlash className="h-5 w-5 text-muted-foreground" />}
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 p-4" viewportRef={chatContainerRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} typingSpeed={typingSpeed} />
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background sticky bottom-0">
        {selectedImagePreview && (
          <div className="mb-2 relative w-24 h-24 border rounded-md overflow-hidden shadow">
            <Image src={selectedImagePreview} alt="Selected preview" layout="fill" objectFit="cover" data-ai-hint="image preview" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-80 hover:opacity-100"
              onClick={clearSelectedImage}
              aria-label="Remover imagem selecionada"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2 items-start" ref={formRef}>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png, image/jpeg, image/webp, image/gif"
            onChange={handleImageFileChange}
            className="hidden"
            id="imageUpload"
            aria-label="Upload de imagem"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full flex-shrink-0 mt-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            aria-label="Anexar imagem"
          >
            <Paperclip className="h-5 w-5 text-muted-foreground hover:text-primary" />
          </Button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Digite sua mensagem ou envie uma imagem..."
            disabled={isLoading}
            className="flex-1 rounded-full px-4 py-2 focus-visible:ring-primary"
            aria-label="Message input"
          />
          <Button type="submit" disabled={isLoading || (!inputValue.trim() && !selectedImageFile)} size="icon" className="rounded-full bg-primary hover:bg-primary/90 disabled:bg-muted flex-shrink-0 mt-1" aria-label="Send message">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendHorizontal className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

    