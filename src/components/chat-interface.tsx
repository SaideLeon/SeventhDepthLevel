
"use client";

import type { FormEvent } from "react";
import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizontal, Loader2, Trash2, Settings, SearchCheck, SearchSlash } from "lucide-react";
import ChatMessage from "@/components/chat-message";
import SettingsPopover from "@/components/settings-popover";
import ThemeToggleButton from "./theme-toggle-button";
import { generateResponse, type GenerateResponseOutput, type GenerateResponseInput } from "@/ai/flows/generate-response";
import type { DetectTopicFromTextOutput } from "@/ai/flows/detect-topic-flow";
import type { DecideSearchNecessityOutput } from "@/ai/flows/decide-search-flow";
import type { SearchResult, PageContent } from "@/utils/raspagem";
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
  // images?: MessageImage[]; // Removed as per previous request, AI embeds images
  isProcessingContext?: boolean; 
}

const TYPING_SPEED_STORAGE_KEY = "typewriterai_typing_speed";
const AI_PERSONA_STORAGE_KEY = "typewriterai_persona";
const AI_RULES_STORAGE_KEY = "typewriterai_rules";
const SEARCH_ENABLED_STORAGE_KEY = "typewriterai_search_enabled";


export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [typingSpeed, setTypingSpeed] = useState<number>(1);
  const [aiPersona, setAiPersona] = useState<string>("");
  const [aiRules, setAiRules] = useState<string>("");
  const [isSearchEnabled, setIsSearchEnabled] = useState<boolean>(true); // Master toggle for auto-search feature
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
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

  const updateThinkingMessage = (id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, ...updates } : msg));
  };

  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessageContent = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessageContent,
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const thinkingMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "Thinking...", // Default initial thinking message
      isThinkingPlaceholder: true,
      startTime: Date.now(),
      isProcessingContext: false, // Will be true if search is initiated
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);

    let contextContent: string | undefined = undefined;
    let imageInfo: string | undefined = undefined;
    let performSearch = false;

    try {
      if (isSearchEnabled) {
        updateThinkingMessage(assistantMessageId, { content: "Analyzing need for search...", isProcessingContext: true });
        
        const lastTwoAIMessages = messages.filter(msg => msg.role === 'assistant' && !msg.isThinkingPlaceholder).slice(-2);
        const previousAiResponse1 = lastTwoAIMessages.length > 0 ? lastTwoAIMessages[lastTwoAIMessages.length - 1].content : undefined;
        const previousAiResponse2 = lastTwoAIMessages.length > 1 ? lastTwoAIMessages[0].content : undefined;

        const decisionResponse = await fetch('/api/decide-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                currentUserQuery: userMessageContent,
                previousAiResponse1,
                previousAiResponse2 
            }),
        });

        if (!decisionResponse.ok) {
            const errorData = await decisionResponse.json();
            throw new Error(`Failed to decide search necessity: ${errorData.error || decisionResponse.statusText}`);
        }
        const decisionResult: DecideSearchNecessityOutput = await decisionResponse.json();
        performSearch = decisionResult.decision === "SEARCH_NEEDED";

        if (performSearch) {
          updateThinkingMessage(assistantMessageId, { content: "Detecting topic...", isProcessingContext: true });
          const topicResponse = await fetch('/api/detect-topic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ textQuery: userMessageContent }),
          });
          if (!topicResponse.ok) throw new Error("Failed to detect topic");
          const topicResult: DetectTopicFromTextOutput = await topicResponse.json();
          const detectedTopic = topicResult.detectedTopic;

          if (detectedTopic) {
             updateThinkingMessage(assistantMessageId, { content: `Searching for: "${detectedTopic}"...` });
            const searchApiResponse = await fetch('/api/raspagem', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ termoBusca: detectedTopic, todasPaginas: false }),
            });
            if (!searchApiResponse.ok) throw new Error("Failed to search articles");
            const searchResults: SearchResult[] = await searchApiResponse.json();

            if (searchResults.length > 0) {
              updateThinkingMessage(assistantMessageId, { content: `Fetching content for "${searchResults[0].titulo}"...` });
              const contentApiResponse = await fetch('/api/raspagem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: searchResults[0].url }),
              });
              if (!contentApiResponse.ok) throw new Error("Failed to fetch article content");
              const pageContent: PageContent = await contentApiResponse.json();

              if (pageContent.conteudo && !pageContent.erro) {
                contextContent = `Title: ${pageContent.titulo}\nAuthor: ${pageContent.autor || 'N/A'}\nContent:\n${pageContent.conteudo.substring(0, 30000)}...`; // Increased context limit
                
                if (pageContent.imagens && pageContent.imagens.length > 0) {
                  // AI will embed images using markdown, so we just pass the info
                  imageInfo = `Found images that might be relevant: ${pageContent.imagens.map(img => `${img.legenda || pageContent.titulo || 'Image'} (${img.src})`).join('; ')}`;
                }
              }
            } else {
               updateThinkingMessage(assistantMessageId, { content: `No direct articles found for "${detectedTopic}". Proceeding with general knowledge...` });
               await new Promise(resolve => setTimeout(resolve, 1500)); 
            }
          }
        } else {
            updateThinkingMessage(assistantMessageId, { content: "Proceeding with general knowledge...", isProcessingContext: false });
            await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
        }
      } else {
         updateThinkingMessage(assistantMessageId, { content: "Generating response...", isProcessingContext: false });
      }
      
      // Final phase: AI generation
      updateThinkingMessage(assistantMessageId, { 
        content: contextContent ? "Generating response with new context..." : "Generating response...", 
        isProcessingContext: false 
      });

      const aiInput: GenerateResponseInput = {
        prompt: userMessage.content,
        persona: aiPersona || undefined,
        rules: aiRules || undefined,
        contextContent: contextContent,
        imageInfo: imageInfo,
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
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isLoading && inputValue.trim()) {
         handleSendMessage();
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="p-4 border-b flex justify-between items-center shadow-sm sticky top-0 bg-background z-10">
        <h1 className="text-2xl font-headline font-semibold text-primary">TypewriterAI</h1>
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
           <Button variant="ghost" size="icon" onClick={() => setIsSearchEnabled(prev => !prev)} aria-label={isSearchEnabled ? "Disable Contextual Search Automation" : "Enable Contextual Search Automation"}>
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
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center" ref={formRef}>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 rounded-full px-4 py-2 focus-visible:ring-primary"
            aria-label="Message input"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()} size="icon" className="rounded-full bg-primary hover:bg-primary/90 disabled:bg-muted" aria-label="Send message">
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
