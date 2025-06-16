
"use client";

import type { FormEvent, ChangeEvent } from "react";
import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizontal, Loader2, PlusCircle, Settings, SearchCheck, SearchSlash, Paperclip, X, MessageSquareText, Sparkles } from "lucide-react";
import ChatMessage from "@/components/chat-message";
import SettingsPopover from "@/components/settings-popover";
import ThemeToggleButton from "./theme-toggle-button";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarContent,
} from "@/components/ui/sidebar";


import { generateAcademicResponse, type GenerateAcademicResponseOutput, type GenerateAcademicResponseInput } from "@/ai/flows/generate-academic-response-flow";
import { generateSimpleResponse, type GenerateSimpleResponseOutput, type GenerateSimpleResponseInput } from "@/ai/flows/generate-simple-response-flow";
import type { DetectTopicFromTextOutput } from "@/ai/flows/detect-topic-flow";
import type { DetectQueryTypeOutput } from "@/ai/flows/detect-query-type-flow";
import type { GenerateSessionTitleOutput } from "@/ai/flows/generate-session-title-flow";

import type { SearchResult, PageContent } from "@/utils/raspagem";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  lastUpdatedAt: number;
  hasAiGeneratedTitle?: boolean;
}

const TYPING_SPEED_STORAGE_KEY = "cabulador_typing_speed";
const AI_PERSONA_STORAGE_KEY = "cabulador_persona";
const AI_RULES_STORAGE_KEY = "cabulador_rules";
const SEARCH_ENABLED_STORAGE_KEY = "cabulador_search_enabled";
const SESSIONS_STORAGE_KEY = "cabulador_sessions";
const ACTIVE_SESSION_ID_STORAGE_KEY = "cabulador_active_session_id";

const SUGGESTION_PROMPTS = [
  "O que é fotossíntese?",
  "Explique o sistema digestivo.",
  "O que é pretérito perfeito?",
  "Quais foram as principais causas da Primeira Guerra Mundial?"
];


export default function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
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
    if (storedSpeed) setTypingSpeed(Number(storedSpeed)); else setTypingSpeed(1);
    const storedPersona = localStorage.getItem(AI_PERSONA_STORAGE_KEY);
    if (storedPersona) setAiPersona(storedPersona);
    const storedRules = localStorage.getItem(AI_RULES_STORAGE_KEY);
    if (storedRules) setAiRules(storedRules);
    const storedSearchEnabled = localStorage.getItem(SEARCH_ENABLED_STORAGE_KEY);
    if (storedSearchEnabled) setIsSearchEnabled(storedSearchEnabled === 'true'); else setIsSearchEnabled(true);
  }, []);

  useEffect(() => { localStorage.setItem(TYPING_SPEED_STORAGE_KEY, typingSpeed.toString()); }, [typingSpeed]);
  useEffect(() => { localStorage.setItem(AI_PERSONA_STORAGE_KEY, aiPersona); }, [aiPersona]);
  useEffect(() => { localStorage.setItem(AI_RULES_STORAGE_KEY, aiRules); }, [aiRules]);
  useEffect(() => { localStorage.setItem(SEARCH_ENABLED_STORAGE_KEY, String(isSearchEnabled)); }, [isSearchEnabled]);

  const handleStartNewChat = useCallback(() => {
    const newSessionId = Date.now().toString();
    const newSession: ChatSession = {
      id: newSessionId,
      title: `Nova Conversa (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      messages: [],
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
      hasAiGeneratedTitle: false,
    };
    setSessions(prev => [newSession, ...prev.sort((a,b) => b.lastUpdatedAt - a.lastUpdatedAt)]);
    setActiveSessionId(newSessionId);
    setInputValue("");
    clearSelectedImage();
    return newSessionId;
  }, []);

   useEffect(() => {
    const storedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
    const storedActiveId = localStorage.getItem(ACTIVE_SESSION_ID_STORAGE_KEY);
    let loadedSessions: ChatSession[] = [];

    if (storedSessions) {
      try {
        loadedSessions = JSON.parse(storedSessions);
        loadedSessions = loadedSessions.map(s => ({
            ...s, 
            hasAiGeneratedTitle: s.hasAiGeneratedTitle || false,
            messages: s.messages.map(m => ({...m, applyTypewriter: m.applyTypewriter === undefined ? false : m.applyTypewriter})) 
        }));
      } catch (e) {
        console.error("Failed to parse sessions from localStorage", e);
        loadedSessions = []; 
      }
    }
    
    setSessions(loadedSessions.sort((a,b) => b.lastUpdatedAt - a.lastUpdatedAt));

    if (storedActiveId && loadedSessions.some(s => s.id === storedActiveId)) {
      setActiveSessionId(storedActiveId);
    } else if (loadedSessions.length > 0) {
      setActiveSessionId(loadedSessions[0].id); 
    } else {
      handleStartNewChat();
    }
  }, [handleStartNewChat]);


  useEffect(() => {
    if (sessions.length > 0) {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_ID_STORAGE_KEY, activeSessionId);
    }
  }, [activeSessionId]);


  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId]); 

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const currentMessages = activeSession?.messages || [];


  const updateSessionMessages = (sessionId: string, newMessages: Message[], thinkingMessageIdToRemove?: string) => {
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? {
              ...session,
              messages: thinkingMessageIdToRemove
                ? newMessages.filter(m => m.id !== thinkingMessageIdToRemove)
                : newMessages,
              lastUpdatedAt: Date.now(),
            }
          : session
      ).sort((a,b) => b.lastUpdatedAt - a.lastUpdatedAt)
    );
  };

  const addMessageToSession = (sessionId: string, message: Message) => {
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages, message],
              lastUpdatedAt: Date.now(),
            }
          : session
      ).sort((a,b) => b.lastUpdatedAt - a.lastUpdatedAt)
    );
  };
  
  const updateThinkingMessageInSession = (sessionId: string, thinkingMessageId: string, updates: Partial<Message>) => {
     setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? {
              ...session,
              messages: session.messages.map(msg =>
                msg.id === thinkingMessageId ? { ...msg, ...updates } : msg
              ),
            }
          : session
      ) 
    );
  };

  const replaceThinkingWithMessageInSession = async (
    sessionId: string,
    thinkingMessageId: string,
    finalMessageContent: string,
  ) => {
    let sessionForTitleUpdate: ChatSession | undefined;

    setSessions(prevSessions => {
      const newSessions = prevSessions.map(session => {
        if (session.id === sessionId) {
          const updatedMessages = session.messages.map(msg =>
            msg.id === thinkingMessageId
              ? { ...msg, content: finalMessageContent, isThinkingPlaceholder: false, startTime: undefined, currentProcessingStepMessage: undefined, applyTypewriter: true }
              : msg
          );
          sessionForTitleUpdate = { 
            ...session,
            messages: updatedMessages,
            lastUpdatedAt: Date.now(),
            hasAiGeneratedTitle: session.hasAiGeneratedTitle || false, 
          };
          return sessionForTitleUpdate;
        }
        return session;
      }).sort((a,b) => b.lastUpdatedAt - a.lastUpdatedAt);
      return newSessions;
    });

    if (sessionForTitleUpdate && !sessionForTitleUpdate.hasAiGeneratedTitle) {
        const userFirstMessageForTitle = sessionForTitleUpdate.messages.find(m => m.role === 'user');
        const firstAIMessageForTitle = sessionForTitleUpdate.messages.find(m => m.id === thinkingMessageId && m.role === 'assistant');

        if (userFirstMessageForTitle && firstAIMessageForTitle && firstAIMessageForTitle.content) {
            try {
                const titleResponse = await fetch('/api/generate-session-title', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userFirstMessageContent: userFirstMessageForTitle.content, 
                        aiFirstResponseContent: firstAIMessageForTitle.content, 
                    }),
                });

                const contentType = titleResponse.headers.get("content-type");
                if (titleResponse.ok && contentType && contentType.includes("application/json")) {
                    const titleResult: GenerateSessionTitleOutput & { error?: string; details?: string } = await titleResponse.json();
                    if (titleResult.generatedTitle) {
                        setSessions(prev =>
                            prev.map(s =>
                                s.id === sessionId 
                                    ? { ...s, title: titleResult.generatedTitle, hasAiGeneratedTitle: true, lastUpdatedAt: Date.now() }
                                    : s
                            ).sort((a,b) => b.lastUpdatedAt - a.lastUpdatedAt)
                        );
                    } else if (titleResult.error) {
                        console.warn("API returned error for session title generation:", titleResult.error, titleResult.details);
                    }
                } else {
                    const errorText = await titleResponse.text(); 
                    console.warn(
                        "Failed to generate AI session title. Status:",
                        titleResponse.status,
                        "Content-Type:", contentType,
                        "Response body:", errorText
                    );
                }
            } catch (error) {
                console.error("Error calling generate session title API or parsing its response:", error);
            }
        }
    }
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        toast({ title: "Imagem Muito Grande", description: "Por favor, selecione uma imagem menor que 5MB.", variant: "destructive" });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({ title: "Tipo de Arquivo Inválido", description: "Por favor, selecione um arquivo de imagem (JPEG, PNG, WEBP, GIF).", variant: "destructive"});
        return;
      }
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImageFile(null);
    setSelectedImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = ""; 
  };

  const fileToDataUri = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSendMessage = async (promptTextOverride?: string, e?: FormEvent) => {
    if (e) e.preventDefault();
    const userMessageContent = promptTextOverride ?? inputValue.trim();

    if ((!userMessageContent && !selectedImageFile) || isLoading) return;

    let currentSessionId = activeSessionId;
    if (!currentSessionId || !sessions.find(s => s.id === currentSessionId)) {
        currentSessionId = handleStartNewChat();
    }
    
    if (!currentSessionId) { 
        toast({ title: "Erro", description: "Nenhuma sessão ativa. Por favor, inicie uma nova conversa.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    let userImageDataUri: string | undefined = undefined;

    if (selectedImageFile && !promptTextOverride) { // Only process selected image if not a suggestion click
      try {
        userImageDataUri = await fileToDataUri(selectedImageFile);
      } catch (error) {
        console.error("Error converting image to Data URI:", error);
        toast({ title: "Erro ao Processar Imagem", description: "Não foi possível processar a imagem selecionada.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessageContent,
      imageDataUri: userImageDataUri,
      applyTypewriter: false, 
    };
    addMessageToSession(currentSessionId, userMessage);
    
    const sessionForTempTitle = sessions.find(s => s.id === currentSessionId);
    if (sessionForTempTitle && !sessionForTempTitle.hasAiGeneratedTitle && sessionForTempTitle.title.startsWith("Nova Conversa")) {
        if (userMessageContent) {
            const tempTitle = userMessageContent.substring(0, 30) + (userMessageContent.length > 30 ? "..." : "");
            setSessions(prev => prev.map(s => s.id === currentSessionId ? {...s, title: tempTitle, lastUpdatedAt: Date.now()} : s).sort((a,b) => b.lastUpdatedAt - a.lastUpdatedAt));
        } else if (userImageDataUri) { 
            setSessions(prev => prev.map(s => s.id === currentSessionId ? {...s, title: "Conversa com Imagem", lastUpdatedAt: Date.now()} : s).sort((a,b) => b.lastUpdatedAt - a.lastUpdatedAt));
        }
    }


    if (!promptTextOverride) { // Only clear input if not a suggestion click
        setInputValue("");
        clearSelectedImage();
    }


    const assistantMessageId = (Date.now() + 1).toString();
    const thinkingMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      isThinkingPlaceholder: true,
      startTime: Date.now(),
      currentProcessingStepMessage: "Analisando sua solicitação...",
      applyTypewriter: false, 
    };
    addMessageToSession(currentSessionId, thinkingMessage);

    let contextContent: string | undefined = undefined;
    let imageInfo: string | undefined = undefined;
    let flowToUse: 'simple' | 'academic' = 'academic';
    let searchPerformedAndFoundContext = false;

    try {
      updateThinkingMessageInSession(currentSessionId, assistantMessageId, { currentProcessingStepMessage: "Determinando o tipo de resposta..." });

      let detectedQueryTypeResult: DetectQueryTypeOutput | null = null;
      if (userMessageContent || userImageDataUri || isSearchEnabled) { 
          const queryTypeResponse = await fetch('/api/detect-query-type', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentUserQuery: userMessageContent, userImageProvided: !!userImageDataUri }),
          });
          if (!queryTypeResponse.ok) {
            const errorData = await queryTypeResponse.json(); 
            throw new Error(`Falha ao detectar o tipo de consulta: ${errorData.error || queryTypeResponse.statusText}`);
          }
          detectedQueryTypeResult = await queryTypeResponse.json();
      }

      if (userImageDataUri || !isSearchEnabled || (detectedQueryTypeResult && (detectedQueryTypeResult.queryType === 'CODING_TECHNICAL' || detectedQueryTypeResult.queryType === 'IMAGE_ANALYSIS' || detectedQueryTypeResult.queryType === 'GENERAL_CONVERSATION'))) {
        flowToUse = 'simple';
      } else {
        flowToUse = 'academic';
      }

      if (flowToUse === 'academic' && isSearchEnabled && userMessageContent) {
          updateThinkingMessageInSession(currentSessionId, assistantMessageId, { currentProcessingStepMessage: "Detectando o tópico para pesquisa..." });
          const topicResponse = await fetch('/api/detect-topic', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ textQuery: userMessageContent }),
          });
          if (!topicResponse.ok) throw new Error("Falha ao detectar o tópico");
          const topicResult: DetectTopicFromTextOutput = await topicResponse.json();
          const detectedTopic = topicResult.detectedTopic;

          if (detectedTopic) {
            updateThinkingMessageInSession(currentSessionId, assistantMessageId, { currentProcessingStepMessage: `Pesquisando por: "${detectedTopic}"... (até 3 páginas)` });
            const searchApiResponse = await fetch('/api/raspagem', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
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
                updateThinkingMessageInSession(currentSessionId, assistantMessageId, { currentProcessingStepMessage: `Buscando conteúdo para o artigo ${i + 1} de ${articlesToFetch.length}: "${article.titulo.substring(0,30)}"...` });
                const contentApiResponse = await fetch('/api/raspagem', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: article.url }),
                });
                if (!contentApiResponse.ok) { console.warn(`Falha ao buscar conteúdo para ${article.url}`); continue; }
                const pageContent: PageContent = await contentApiResponse.json();
                if (pageContent.conteudo && !pageContent.erro) {
                  aggregatedContext.push(`Fonte ${i + 1}: ${pageContent.titulo}\nAutor: ${pageContent.autor || 'N/A'}\nConteúdo:\n${pageContent.conteudo.substring(0, 10000)}...`); 
                  if (pageContent.imagens && pageContent.imagens.length > 0) aggregatedImageInfo.push(pageContent.imagens.map(img => `${img.legenda || pageContent.titulo || 'Imagem'} (${img.src})`).join('; '));
                }
              }
              if (aggregatedContext.length > 0) {
                contextContent = aggregatedContext.join("\n\n---\n\n");
                if (aggregatedImageInfo.length > 0) imageInfo = `Imagens encontradas que podem ser relevantes: ${aggregatedImageInfo.join('; ')}`;
                searchPerformedAndFoundContext = true;
              } else {
                 updateThinkingMessageInSession(currentSessionId, assistantMessageId, { currentProcessingStepMessage: `Nenhum conteúdo de artigo encontrado para "${detectedTopic}". Prosseguindo com conhecimento geral...` });
                 await new Promise(resolve => setTimeout(resolve, 1500)); 
              }
            } else {
               updateThinkingMessageInSession(currentSessionId, assistantMessageId, { currentProcessingStepMessage: `Nenhum artigo relevante encontrado para "${detectedTopic}". Prosseguindo com conhecimento geral...` });
               await new Promise(resolve => setTimeout(resolve, 1500)); 
            }
          }
      } else if (flowToUse === 'simple' && (!userMessageContent && userImageDataUri)) { 
          updateThinkingMessageInSession(currentSessionId, assistantMessageId, { currentProcessingStepMessage: "Analisando a imagem..." });
          await new Promise(resolve => setTimeout(resolve, 1000)); 
      } else if (flowToUse === 'simple' && ( !isSearchEnabled || (detectedQueryTypeResult && (detectedQueryTypeResult.queryType === 'CODING_TECHNICAL' || detectedQueryTypeResult.queryType === 'GENERAL_CONVERSATION' || detectedQueryTypeResult.queryType === 'IMAGE_ANALYSIS')) ) ) {
         updateThinkingMessageInSession(currentSessionId, assistantMessageId, { currentProcessingStepMessage: "Preparando uma resposta direta..." });
         await new Promise(resolve => setTimeout(resolve, 1000));
      }


      let finalStepMessage = "Gerando resposta...";
      if (flowToUse === 'academic') {
        if (searchPerformedAndFoundContext) {
            finalStepMessage = "Gerando resposta com o novo contexto...";
        } else if (isSearchEnabled && userMessageContent) { 
            finalStepMessage = "Gerando resposta com base no conhecimento geral...";
        }
      } else if (flowToUse === 'simple' && userImageDataUri && !userMessageContent) {
        finalStepMessage = "Analisando imagem e gerando resposta...";
      }
      updateThinkingMessageInSession(currentSessionId, assistantMessageId, { currentProcessingStepMessage: finalStepMessage });


      const activeSessionMessagesForAI = sessions.find(s => s.id === currentSessionId)?.messages || [];
      const conversationHistoryForAI = activeSessionMessagesForAI
        .filter(msg => !msg.isThinkingPlaceholder && msg.id !== assistantMessageId && msg.id !== userMessage.id) 
        .slice(-6) 
        .map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

      let aiResultText: string;
      if (flowToUse === 'simple') {
        const simpleInput: GenerateSimpleResponseInput = {
          prompt: userMessage.content, userImageInputDataUri: userMessage.imageDataUri,
          persona: aiPersona || undefined, rules: aiRules || undefined,
          conversationHistory: conversationHistoryForAI.length > 0 ? conversationHistoryForAI : undefined,
        };
        const simpleResult: GenerateSimpleResponseOutput = await generateSimpleResponse(simpleInput);
        aiResultText = simpleResult.response;
      } else { 
        const academicInput: GenerateAcademicResponseInput = {
          prompt: userMessage.content, userImageInputDataUri: userMessage.imageDataUri,
          persona: aiPersona || undefined, rules: aiRules || undefined,
          contextContent: contextContent, imageInfo: imageInfo,
          conversationHistory: conversationHistoryForAI.length > 0 ? conversationHistoryForAI : undefined,
        };
        const academicResult: GenerateAcademicResponseOutput = await generateAcademicResponse(academicInput);
        aiResultText = academicResult.response;
      }
      
      await replaceThinkingWithMessageInSession(currentSessionId, assistantMessageId, aiResultText);

    } catch (error) {
      console.error("Error in AI response generation pipeline:", error);
      let errorDescription = "Falha ao obter uma resposta da IA. Por favor, tente novamente.";
      if (error instanceof Error) {
        if (error.message.includes("detect query type")) errorDescription = "Falha ao determinar o tipo de consulta.";
        else if (error.message.includes("detect topic")) errorDescription = "Falha ao detectar o tópico.";
        else if (error.message.includes("search articles")) errorDescription = "Falha ao buscar artigos.";
        else if (error.message.includes("fetch article content")) errorDescription = "Falha ao buscar conteúdo do artigo.";
      }
      toast({ title: "Erro", description: errorDescription, variant: "destructive" });
      await replaceThinkingWithMessageInSession(currentSessionId, assistantMessageId, "Desculpe, não consegui processar sua solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading) return;
    handleSendMessage(suggestion);
  };


  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isLoading && (inputValue.trim() || selectedImageFile)) {
         handleSendMessage();
      }
    }
  };

  const sortedSessions = [...sessions].sort((a,b) => b.lastUpdatedAt - a.lastUpdatedAt);
  const disableNewChatButton = !!activeSession && activeSession.messages.length === 0;


  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" className="border-r h-svh">
        <SidebarHeader className="p-3">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2" 
            onClick={handleStartNewChat}
            disabled={disableNewChatButton}
            title={disableNewChatButton ? "Envie uma mensagem na conversa atual para iniciar uma nova." : "Iniciar nova conversa"}
          >
            <PlusCircle className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Nova Conversa</span>
          </Button>
        </SidebarHeader>
        <ScrollArea className="flex-1 min-h-0"> 
          <div className="p-1 pt-0"> 
            <SidebarMenu>
              {sortedSessions.map((session) => (
                <SidebarMenuItem key={session.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveSessionId(session.id)}
                    isActive={session.id === activeSessionId}
                    className={cn(
                        "w-full text-left justify-start group-data-[collapsible=icon]:justify-center",
                        {"bg-sidebar-accent text-sidebar-accent-foreground": session.id === activeSessionId}
                    )}
                    tooltip={{children: session.title, side: "right", align:"center"}}
                  >
                    <MessageSquareText className="h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:text-inherit" />
                    <span className="truncate">{session.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        </ScrollArea>
      </Sidebar>

      <SidebarInset>
        <div className="flex flex-col h-screen bg-background text-foreground">
          <header className="p-2 border-b flex justify-between items-center shadow-sm sticky top-0 bg-background z-10">
            <div className="flex items-center gap-1">
                 <SidebarTrigger className="md:hidden" /> 
                 <h1 className="text-xl md:text-2xl font-headline font-semibold text-primary">Cabulador</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggleButton />
              <SettingsPopover
                currentSpeed={typingSpeed} onSpeedChange={setTypingSpeed}
                currentPersona={aiPersona} onPersonaChange={setAiPersona}
                currentRules={aiRules} onRulesChange={setAiRules}
                isSearchEnabled={isSearchEnabled} onSearchEnabledChange={setIsSearchEnabled}
              >
                <Button variant="ghost" size="icon" aria-label="Settings">
                  <Settings className="h-5 w-5 text-muted-foreground hover:text-accent" />
                </Button>
              </SettingsPopover>
              <Button variant="ghost" size="icon" onClick={() => setIsSearchEnabled(prev => !prev)} aria-label={isSearchEnabled ? "Desativar Automação de Pesquisa Contextual" : "Ativar Automação de Pesquisa Contextual"}>
                {isSearchEnabled ? <SearchCheck className="h-5 w-5 text-accent" /> : <SearchSlash className="h-5 w-5 text-muted-foreground" />}
              </Button>
            </div>
          </header>

          <ScrollArea className="flex-1 p-4" viewportRef={chatContainerRef}>
            <div className="space-y-4">
              {currentMessages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center pt-10 text-center">
                  <Sparkles className="h-10 w-10 text-primary mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-1">Como posso te ajudar hoje?</h2>
                  <p className="text-sm text-muted-foreground mb-6">Clique em uma sugestão ou digite sua pergunta abaixo.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
                    {SUGGESTION_PROMPTS.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="p-3 h-auto text-sm text-left justify-start leading-snug hover:bg-accent/10 dark:hover:bg-accent/20"
                        onClick={() => handleSuggestionClick(suggestion)}
                        disabled={isLoading}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {currentMessages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} typingSpeed={typingSpeed} />
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background sticky bottom-0">
            {selectedImagePreview && (
              <div className="mb-2 relative w-24 h-24 border rounded-md overflow-hidden shadow">
                <Image src={selectedImagePreview} alt="Selected preview" layout="fill" objectFit="cover" data-ai-hint="image preview" />
                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-80 hover:opacity-100" onClick={clearSelectedImage} aria-label="Remover imagem selecionada">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <form onSubmit={(e) => handleSendMessage(undefined, e)} className="flex gap-2 items-start" ref={formRef}>
              <input type="file" ref={fileInputRef} accept="image/png, image/jpeg, image/webp, image/gif" onChange={handleImageFileChange} className="hidden" id="imageUpload" aria-label="Upload de imagem" />
              <Button type="button" variant="ghost" size="icon" className="rounded-full flex-shrink-0 mt-1" onClick={() => fileInputRef.current?.click()} disabled={isLoading} aria-label="Anexar imagem">
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
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
              </Button>
            </form>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
    
