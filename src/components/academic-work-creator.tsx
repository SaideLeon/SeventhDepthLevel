
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input as ShadInput } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from "@/components/ui/progress";
import { Loader2, SendHorizontal, Paperclip, Sparkles, BookCheck, FileText as FileTextIcon } from 'lucide-react'; // Renomeado FileText para evitar conflito
import MarkdownToDocx from '@/components/MarkdownToDocx';
import { useToast } from "@/hooks/use-toast";
import { MarkdownWithCode } from '@/components/Markdown/MarkdownWithCode';
import type { SearchResult, PageContent } from "@/utils/raspagem";
import type { DetectTopicFromTextOutput } from "@/ai/flows/detect-topic-flow";
import type { FichaLeitura } from "@/ai/flows/generate-fichamento-flow";
import type { GenerateIndexOutput } from "@/ai/flows/generate-index-flow";
import type { GenerateIntroductionOutput } from "@/ai/flows/generate-introduction-flow";
import type { GenerateAcademicSectionOutput } from "@/ai/flows/generate-academic-section-flow";
import type { GenerateConclusionOutput } from "@/ai/flows/generate-conclusion-flow";
import type { GenerateBibliographyOutput } from "@/ai/flows/generate-bibliography-flow";
import { BookMarked } from 'lucide-react';


export interface AcademicWorkSection {
  title: string;
  content: string;
}

// Updated AcademicWork interface to include more fields for persistence
export interface AcademicWork {
  id: string;
  theme: string; // User's initial input or refined topic
  title: string; // Can be same as theme or a generated title
  sections: AcademicWorkSection[];
  fullGeneratedText?: string;
  createdAt: number;
  lastUpdatedAt: number;
  fichas?: FichaLeitura[];
  generatedIndex?: string[];
  researchLog?: string[];
  writingLog?: string[];
  detectedTopic?: string | null; // The topic detected by AI, used for search and generation
}


interface AcademicWorkCreatorProps {
  activeWork: AcademicWork | null | undefined;
  onUpdateWork: (updatedWork: AcademicWork) => void;
}

const SUGGESTION_THEMES = [
    "O impacto da Inteligência Artificial na Educação em Moçambique",
    "Desenvolvimento Sustentável e Gestão Ambiental em Quelimane",
    "História da Luta de Libertação Nacional de Moçambique",
    "Desafios da Saúde Pública no Contexto Rural Moçambicano"
];


export default function AcademicWorkCreator({ activeWork, onUpdateWork }: AcademicWorkCreatorProps) {
  const { toast } = useToast();
  const workAreaRef = useRef<HTMLDivElement>(null);

  const [workThemeInput, setWorkThemeInput] = useState(''); // For the input field
  const [targetLanguage] = useState('pt-BR');
  const [citationStyle] = useState('APA');

  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchCurrentStep, setResearchCurrentStep] = useState(0);
  const [researchTotalSteps, setResearchTotalSteps] = useState(0);
  const [researchLog, setResearchLog] = useState<string[]>([]);
  
  const [isWriting, setIsWriting] = useState(false);
  const [writingProgress, setWritingProgress] = useState(0);
  const [writingCurrentLogItem, setWritingCurrentLogItem] = useState("");
  const [writingLog, setWritingLog] = useState<string[]>([]);
  
  // States for the current work being processed, distinct from activeWork prop for UI updates
  const [currentDetectedTopic, setCurrentDetectedTopic] = useState<string | null>(null);
  const [currentFichas, setCurrentFichas] = useState<FichaLeitura[]>([]);
  const [currentGeneratedIndex, setCurrentGeneratedIndex] = useState<string[]>([]);
  const [currentDevelopedSections, setCurrentDevelopedSections] = useState<AcademicWorkSection[]>([]);
  const [currentFullGeneratedText, setCurrentFullGeneratedText] = useState<string | null>(null);


  // Flags to control the automated workflow
  const [startFichamentoChain, setStartFichamentoChain] = useState(false);
  const [fichamentoCompleted, setFichamentoCompleted] = useState(false);
  const [startWritingChain, setStartWritingChain] = useState(false);


  const isLoading = isResearching || isWriting;

  const scrollToBottom = useCallback(() => {
    if (workAreaRef.current) {
      workAreaRef.current.scrollTop = workAreaRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [researchLog, writingLog, currentFullGeneratedText, currentFichas, scrollToBottom]);


  useEffect(() => {
    if (activeWork) {
      // Only set workThemeInput if a process isn't about to start (which would have cleared it)
      // and the input isn't focused (user might be typing)
      if (!startFichamentoChain && !startWritingChain && document.activeElement !== workAreaRef.current?.querySelector('input')) {
         setWorkThemeInput(activeWork.theme || '');
      }
      setCurrentFichas(activeWork.fichas || []);
      setCurrentFullGeneratedText(activeWork.fullGeneratedText || null);
      setCurrentGeneratedIndex(activeWork.generatedIndex || []);
      setCurrentDevelopedSections(activeWork.sections || []);
      setResearchLog(activeWork.researchLog || (activeWork.title ? [`Trabalho "${activeWork.title}" carregado.`] : []));
      setWritingLog(activeWork.writingLog || []);
      setCurrentDetectedTopic(activeWork.detectedTopic || null);
      
      // Reset process flags
      setIsResearching(false);
      setIsWriting(false);
      setStartFichamentoChain(false);
      setFichamentoCompleted(false);
      setStartWritingChain(false);
    } else {
      // Reset all if no active work
      setWorkThemeInput('');
      setCurrentFichas([]);
      setCurrentFullGeneratedText(null);
      setCurrentGeneratedIndex([]);
      setCurrentDevelopedSections([]);
      setResearchLog([]);
      setWritingLog([]);
      setCurrentDetectedTopic(null);
      setStartFichamentoChain(false);
      setFichamentoCompleted(false);
      setStartWritingChain(false);
    }
  }, [activeWork]);

  const addResearchLog = useCallback((message: string) => {
    console.log(`[Pesquisa]: ${message}`);
    setResearchLog(prev => [...prev.slice(-50), `${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit'})}: ${message}`]);
  }, []);

  const addWritingLog = useCallback((message: string) => {
    console.log(`[Desenvolvimento]: ${message}`);
    const logMessage = `${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit'})}: ${message}`;
    setWritingCurrentLogItem(logMessage);
    setWritingLog(prev => [...prev.slice(-50), logMessage]);
  }, []);

  // --- Research (Fichamento) Process ---
  const handleStartResearch = useCallback(async (themeForResearch: string) => {
    if (!activeWork) {
      toast({ title: "Erro", description: "Nenhum trabalho ativo para iniciar a pesquisa.", variant: "destructive" });
      setIsResearching(false);
      return;
    }
    if (!themeForResearch) {
        toast({ title: "Erro", description: "O tema do trabalho não foi fornecido para a pesquisa.", variant: "destructive" });
        setIsResearching(false);
        return;
    }

    setIsResearching(true);
    setCurrentFichas([]); // Clear previous fichas
    setResearchLog([`Iniciando pesquisa para o tema: "${themeForResearch}"`]);
    setResearchProgress(0);
    setResearchCurrentStep(0);
    setResearchTotalSteps(0);
    setCurrentDetectedTopic(null);

    let effectiveSearchTopic = themeForResearch;

    addResearchLog(`Detectando tópico principal para "${effectiveSearchTopic}"...`);
    setResearchProgress(5);
    try {
      const topicResponse = await fetch('/api/detect-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textQuery: effectiveSearchTopic, targetLanguage }),
      });
      if (!topicResponse.ok) {
        const errorData = await topicResponse.json().catch(() => ({}));
        throw new Error(`Falha ao detectar tópico: ${errorData.error || errorData.details || topicResponse.statusText}`);
      }
      const topicResult: DetectTopicFromTextOutput = await topicResponse.json();
      if (topicResult.detectedTopic) {
        effectiveSearchTopic = topicResult.detectedTopic;
        setCurrentDetectedTopic(effectiveSearchTopic);
        addResearchLog(`✅ Tópico detectado para pesquisa: "${effectiveSearchTopic}"`);
      } else {
        addResearchLog(`⚠️ Não foi possível refinar o tópico. Usando o tema original: "${effectiveSearchTopic}"`);
        setCurrentDetectedTopic(effectiveSearchTopic);
      }
    } catch (error: any) {
      addResearchLog(`❌ Erro ao detectar tópico: ${error.message}. Usando tema original.`);
      setCurrentDetectedTopic(effectiveSearchTopic);
    }
    setResearchProgress(10);
    // Update activeWork with the detected topic
    if (activeWork && effectiveSearchTopic) {
        onUpdateWork({ ...activeWork, detectedTopic: effectiveSearchTopic, theme: themeForResearch, title: activeWork.title || themeForResearch, researchLog, lastUpdatedAt: Date.now() });
    }


    addResearchLog(`Buscando até 10 artigos para: "${effectiveSearchTopic}"...`);
    let searchResults: SearchResult[] = [];
    try {
      const scraperSearchResponse = await fetch('/api/raspagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termoBusca: effectiveSearchTopic, todasPaginas: true, maxPaginas: 3 }), // Search 3 pages, then limit
      });
      if (!scraperSearchResponse.ok) {
         const errorData = await scraperSearchResponse.json().catch(() => ({}));
        throw new Error(`Falha ao buscar artigos: ${errorData.error || scraperSearchResponse.statusText}`);
      }
      const allSearchResults: SearchResult[] = await scraperSearchResponse.json();
      searchResults = allSearchResults.slice(0, 10); // Limit to 10 articles
      addResearchLog(`🔗 ${searchResults.length} artigos encontrados para processamento.`);
      if (searchResults.length === 0) {
        addResearchLog('Nenhum artigo encontrado. Tente um tema diferente ou ajuste a pesquisa contextual nas configurações.');
        setIsResearching(false);
        setResearchProgress(100);
        setFichamentoCompleted(true); 
        if (activeWork) onUpdateWork({ ...activeWork, researchLog, fichas: [], lastUpdatedAt: Date.now() });
        return;
      }
    } catch (error: any) {
      addResearchLog(`❌ Erro ao buscar artigos: ${error.message}`);
      setIsResearching(false);
      setResearchProgress(100);
       if (activeWork) onUpdateWork({ ...activeWork, researchLog, lastUpdatedAt: Date.now() });
      return;
    }
    setResearchTotalSteps(searchResults.length);
    setResearchProgress(20);

    const fetchedFichas: FichaLeitura[] = [];
    for (let i = 0; i < searchResults.length; i++) {
      const article = searchResults[i];
      setResearchCurrentStep(i + 1);
      const currentProgressStep = 20 + ((i + 1) / searchResults.length) * 70;
      setResearchProgress(currentProgressStep);
      addResearchLog(`📄 Processando artigo ${i + 1}/${searchResults.length}: "${article.titulo.substring(0,50)}..."`);

      try {
        const contentResponse = await fetch('/api/raspagem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: article.url }),
        });
        if (!contentResponse.ok) {
            const errorData = await contentResponse.json().catch(() => ({}));
            throw new Error(`Falha ao raspar conteúdo de ${article.url.substring(0,30)}...: ${errorData.error || contentResponse.statusText}`);
        }
        const pageContent: PageContent = await contentResponse.json();
        if (pageContent.erro || !pageContent.conteudo) {
            addResearchLog(`⚠️ Conteúdo não encontrado ou erro ao raspar: "${article.titulo.substring(0,50)}...". Pulando.`);
            continue;
        }

        addResearchLog(`⚙️ Gerando ficha para "${pageContent.titulo || article.titulo}"...`);
        const fichamentoInput = {
          url: pageContent.url,
          titulo: pageContent.titulo,
          conteudo: pageContent.conteudo,
          autor: pageContent.autor,
          dataPublicacao: pageContent.dataPublicacao,
        };
        const fichamentoResponse = await fetch('/api/fichamento', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(fichamentoInput)
        });
        if(!fichamentoResponse.ok) {
            const errorData = await fichamentoResponse.json().catch(() => ({}));
            throw new Error(`Falha ao gerar ficha: ${errorData.details || errorData.error || fichamentoResponse.statusText}`);
        }
        const fichaGerada: FichaLeitura = await fichamentoResponse.json();
        
        fetchedFichas.push(fichaGerada);
        setCurrentFichas(prev => [...prev, fichaGerada]); // Update local state for UI
        addResearchLog(`✅ Ficha para "${fichaGerada.titulo.substring(0,50)}..." criada.`);

      } catch (error: any) {
        addResearchLog(`❌ Erro ao processar artigo "${article.titulo.substring(0,50)}...": ${error.message}`);
      }
    }
    
    if (activeWork) {
        onUpdateWork({ ...activeWork, fichas: fetchedFichas, researchLog: [...researchLog, `📚 Fichamento concluído. ${fetchedFichas.length} fichas geradas.`], lastUpdatedAt: Date.now() });
    }
    addResearchLog(`📚 Fichamento concluído. ${fetchedFichas.length} fichas geradas.`);
    setResearchProgress(100);
    setIsResearching(false);
    setFichamentoCompleted(true); // Signal to start writing if applicable
  }, [activeWork, onUpdateWork, targetLanguage, toast, addResearchLog]);

  // --- Writing Process ---
  const handleStartWriting = useCallback(async () => {
    if (!activeWork || !currentDetectedTopic) {
        toast({ title: "Erro", description: "Trabalho ou tópico principal não definido para iniciar o desenvolvimento.", variant: "destructive" });
        setIsWriting(false);
        return;
    }
    const finalThemeForWriting = currentDetectedTopic || activeWork.theme;

    if (currentFichas.length === 0 && !activeWork.fullGeneratedText) { // Check local currentFichas
      addWritingLog("⚠️ Não há fichas de leitura para basear o desenvolvimento. O texto será gerado com conhecimento geral.");
      toast({ title: "Aviso", description: "Não há fichas de leitura. O texto será gerado com conhecimento geral.", variant: "default" });
    }

    setIsWriting(true);
    setWritingLog([`Iniciando desenvolvimento do trabalho: "${activeWork.title || finalThemeForWriting}"`]); // Use local writingLog
    setWritingProgress(0);
    setCurrentFullGeneratedText(''); // Use local state
    setCurrentDevelopedSections([]); // Use local state
    
    let generatedIndexTitles: string[] = [];
    try {
        addWritingLog("⚙️ Gerando índice do trabalho...");
        setWritingProgress(5);
        const indexResponse = await fetch('/api/generate-index', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ mainTopic: finalThemeForWriting, targetLanguage, numSections: 3 })
        });
        if(!indexResponse.ok) {
            const errorData = await indexResponse.json().catch(() => ({}));
            throw new Error(`Falha ao gerar índice: ${errorData.details || errorData.error || indexResponse.statusText}`);
        }
        const indexResult: GenerateIndexOutput = await indexResponse.json();
        generatedIndexTitles = indexResult.generatedIndex;
        setCurrentGeneratedIndex(generatedIndexTitles); // Update local state
        addWritingLog(`📑 Índice gerado com ${generatedIndexTitles.length} seções: ${generatedIndexTitles.join(', ')}`);
    } catch (error: any) {
        addWritingLog(`❌ Erro ao gerar índice: ${error.message}. Usando estrutura padrão.`);
        generatedIndexTitles = ["Introdução", `Desenvolvimento sobre ${finalThemeForWriting}`, "Conclusão", "Referências Bibliográficas"];
        setCurrentGeneratedIndex(generatedIndexTitles); // Update local state
    }
    setWritingProgress(10);
     // Update activeWork with the generated index
    if (activeWork) {
        onUpdateWork({ ...activeWork, generatedIndex: generatedIndexTitles, writingLog, lastUpdatedAt: Date.now() });
    }

    let tempFullText = `# ${activeWork.title || finalThemeForWriting}\n\n`;
    setCurrentFullGeneratedText(tempFullText);
    const tempDevelopedSections: AcademicWorkSection[] = [];

    for (let i = 0; i < generatedIndexTitles.length; i++) {
        const sectionTitle = generatedIndexTitles[i];
        const currentProgressStep = 10 + ((i + 1) / generatedIndexTitles.length) * 85;
        setWritingProgress(currentProgressStep);
        addWritingLog(`✍️ Escrevendo seção ${i+1}/${generatedIndexTitles.length}: "${sectionTitle}"...`);
        
        let sectionContent = "";
        try {
            const sectionTitleLower = sectionTitle.toLowerCase();
            let response;
            if (sectionTitleLower.includes("introdução")) {
                response = await fetch('/api/generate-introduction', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ mainTopic: finalThemeForWriting, generatedIndex: generatedIndexTitles, targetLanguage })
                });
                if (!response.ok) { const err = await response.json(); throw new Error(err.details || err.error || "Erro desconhecido ao gerar introdução"); }
                const result: GenerateIntroductionOutput = await response.json();
                sectionContent = result.introduction;
            } else if (sectionTitleLower.includes("conclusão")) {
                const introContent = tempDevelopedSections.find(s => s.title.toLowerCase().includes("introdução"))?.content;
                response = await fetch('/api/generate-conclusion', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ mainTopic: finalThemeForWriting, introductionContent: introContent, developedSectionsContent: tempDevelopedSections, targetLanguage})
                });
                 if (!response.ok) { const err = await response.json(); throw new Error(err.details || err.error || "Erro desconhecido ao gerar conclusão"); }
                const result: GenerateConclusionOutput = await response.json();
                sectionContent = result.conclusion;
            } else if (sectionTitleLower.includes("bibliografia") || sectionTitleLower.includes("referências")) {
                 response = await fetch('/api/generate-bibliography', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ fichasDeLeitura: currentFichas, citationStyle, targetLanguage }) // Use local currentFichas
                });
                 if (!response.ok) { const err = await response.json(); throw new Error(err.details || err.error || "Erro desconhecido ao gerar bibliografia"); }
                const result: GenerateBibliographyOutput = await response.json();
                sectionContent = result.bibliography;
            } else { 
                 response = await fetch('/api/generate-academic-section', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        sectionTitle,
                        mainTopic: finalThemeForWriting,
                        fichasDeLeitura: currentFichas, // Use local currentFichas
                        completedSections: tempDevelopedSections,
                        targetLanguage,
                        citationStyle,
                        wordCountTarget: 500
                    })
                });
                if (!response.ok) { const err = await response.json(); throw new Error(err.details || err.error || "Erro desconhecido ao gerar seção"); }
                const result: GenerateAcademicSectionOutput = await response.json();
                sectionContent = result.sectionContent;
            }
        } catch (error: any) {
            addWritingLog(`❌ Erro ao gerar conteúdo para "${sectionTitle}": ${error.message || String(error)}. Usando placeholder.`);
            sectionContent = `Conteúdo para "${sectionTitle}" não pôde ser gerado devido a um erro. Por favor, tente novamente ou edite manualmente.`;
        }
        
        const currentSection: AcademicWorkSection = { title: sectionTitle, content: sectionContent };
        tempDevelopedSections.push(currentSection);
        setCurrentDevelopedSections(prev => [...prev, currentSection]); // Update local state

        tempFullText += `## ${sectionTitle}\n\n${sectionContent}\n\n`;
        setCurrentFullGeneratedText(tempFullText); // Update local state
        addWritingLog(`✅ Seção "${sectionTitle}" escrita.`);
        // Update activeWork progressively
        if (activeWork) {
            onUpdateWork({ ...activeWork, sections: [...tempDevelopedSections], fullGeneratedText: tempFullText, writingLog, lastUpdatedAt: Date.now() });
        }
    }

    addWritingLog("🎉 Desenvolvimento do trabalho concluído!");
    setWritingProgress(100);
    setIsWriting(false);
    // Final update to activeWork
    if (activeWork) {
      onUpdateWork({ 
        ...activeWork, 
        sections: tempDevelopedSections, 
        fullGeneratedText: tempFullText, 
        title: activeWork.title || finalThemeForWriting, 
        theme: finalThemeForWriting, 
        writingLog: [...writingLog, "🎉 Desenvolvimento do trabalho concluído!"],
        lastUpdatedAt: Date.now() 
      });
    }
  }, [activeWork, onUpdateWork, currentDetectedTopic, currentFichas, targetLanguage, citationStyle, toast, addWritingLog]);

  // --- Auto-triggering useEffects ---
  useEffect(() => {
    if (startFichamentoChain && activeWork && activeWork.theme && !isLoading) {
      handleStartResearch(activeWork.theme);
      setStartFichamentoChain(false);
    }
  }, [startFichamentoChain, activeWork, isLoading, handleStartResearch]);

  useEffect(() => {
    if (fichamentoCompleted && !isResearching && !isWriting) { // Check not already writing
      setStartWritingChain(true); // Set flag to start writing
      setFichamentoCompleted(false); // Reset this flag
    }
  }, [fichamentoCompleted, isResearching, isWriting]);

  useEffect(() => {
    if (startWritingChain && currentFichas.length === 0 && !isLoading) {
        addWritingLog("⚠️ Pesquisa concluída, mas nenhuma ficha foi gerada. Não é possível iniciar o desenvolvimento do texto automaticamente.");
        setStartWritingChain(false); // Reset flag
        return;
    }
    if (startWritingChain && !isLoading) {
      handleStartWriting();
      setStartWritingChain(false); // Reset flag
    }
  }, [startWritingChain, currentFichas, isLoading, handleStartWriting, addWritingLog]);

  // --- Main Action ---
  const handleInitiateFullProcess = (themeOverride?: string) => {
    const themeToUse = themeOverride || workThemeInput.trim();
    if (!themeToUse) {
      toast({ title: "Tema Necessário", description: "Por favor, defina o tema principal do trabalho.", variant: "destructive"});
      return;
    }
    if (!activeWork) {
      toast({ title: "Nenhum Trabalho Ativo", description: "Crie ou selecione um trabalho acadêmico primeiro.", variant: "destructive"});
      return;
    }

    // Reset all local states for a fresh start related to content generation
    setCurrentFichas([]);
    setCurrentGeneratedIndex([]);
    setCurrentDevelopedSections([]);
    setCurrentFullGeneratedText(null);
    setResearchLog([`Iniciando processo completo para: "${themeToUse}"`]);
    setWritingLog([]);
    setCurrentDetectedTopic(null);
    setResearchProgress(0);
    setWritingProgress(0);
    setIsResearching(false); 
    setIsWriting(false);
    
    // Update the activeWork's theme and title, and reset its content fields
    const updatedWorkData: AcademicWork = { 
      ...activeWork, 
      theme: themeToUse, 
      title: activeWork.title || themeToUse, // Keep existing title or set to theme
      fichas: [], 
      sections: [], 
      fullGeneratedText: "", 
      generatedIndex: [], 
      researchLog: [`Iniciando processo completo para: "${themeToUse}"`], 
      writingLog: [],
      detectedTopic: null, // Will be set by research phase
      lastUpdatedAt: Date.now() 
    };
    onUpdateWork(updatedWorkData);
    
    setStartFichamentoChain(true); // Signal to start the research (fichamento) chain
    if (!themeOverride) {
        setWorkThemeInput(""); // Clear the input field only if not using a suggestion
    }
  };


  if (!activeWork) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 md:p-8 text-center bg-background text-foreground">
        <BookCheck className="w-12 h-12 md:w-16 md:h-16 mb-4 text-muted-foreground" />
        <h2 className="text-lg md:text-xl font-semibold text-foreground">Nenhum Trabalho Acadêmico Selecionado</h2>
        <p className="text-sm md:text-base text-muted-foreground">Crie um novo trabalho ou selecione um existente na barra lateral.</p>
        <p className="text-xs text-muted-foreground mt-2">Clique no ícone <BookMarked className="inline h-3 w-3" /> acima para alternar para o modo de criação de trabalhos.</p>
      </div>
    );
  }

  const hasAnyLog = researchLog.length > 0 || writingLog.length > 0;
  const hasAnyContent = currentFichas.length > 0 || currentFullGeneratedText;
  const showInitialScreen = !hasAnyLog && !hasAnyContent && !isLoading;


  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <ScrollArea className="flex-1 p-3 md:p-4" viewportRef={workAreaRef}>
        <div className="space-y-4">
          {showInitialScreen && (
            <div className="flex flex-col items-center justify-center pt-10 text-center">
              <Sparkles className="h-10 w-10 text-primary mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-1">Crie seu Trabalho Acadêmico</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Digite o tema do seu trabalho abaixo para iniciar o processo. A IA irá pesquisar, gerar fichas de leitura, criar um índice e desenvolver o conteúdo.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
                {SUGGESTION_THEMES.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="p-3 h-auto text-sm text-left justify-start leading-snug whitespace-normal hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleInitiateFullProcess(suggestion)}
                    disabled={isLoading}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {researchLog.length > 0 && (
            <div className="text-xs space-y-1 p-2 border rounded-md bg-muted/20 max-h-60 overflow-y-auto">
              <h3 className="font-semibold text-sm mb-1 text-primary">Log da Pesquisa:</h3>
              {researchLog.map((log, i) => <div key={`rl-${i}`}>{log}</div>)}
               {isResearching && (
                <div className="sticky bottom-0 bg-muted/50 p-1 rounded backdrop-blur-sm">
                    <Progress value={researchProgress} className="w-full h-1.5" />
                    <p className="text-xs text-muted-foreground text-center mt-0.5">Etapa {researchCurrentStep} de {researchTotalSteps}</p>
                </div>
                )}
            </div>
          )}

          {currentFichas.length > 0 && (
            <div className="text-xs space-y-1 p-2 border rounded-md bg-muted/20 max-h-72 overflow-y-auto">
              <h3 className="font-semibold text-sm mb-1 text-primary">Fichas de Leitura Geradas ({currentFichas.length}):</h3>
              {currentFichas.map((ficha, i) => (
                <details key={`ficha-${activeWork.id}-${i}`} className="mb-1 p-1.5 border-b border-border last:border-b-0">
                    <summary className="font-medium cursor-pointer text-primary/90 hover:underline text-xs">{ficha.titulo.substring(0,70)}...</summary>
                    <p className="mt-0.5 text-muted-foreground text-[11px]"><strong>Autor:</strong> {ficha.autor || "N/A"} ({ficha.anoPublicacao || "s.d."})</p>
                    <p className="text-muted-foreground text-[11px]"><strong>Resumo:</strong> {ficha.resumo.substring(0,120)}...</p>
                    {ficha.palavrasChave && ficha.palavrasChave.length > 0 && <p className="text-muted-foreground text-[11px]"><strong>Palavras-chave:</strong> {ficha.palavrasChave.join(', ')}</p>}
                    <a href={ficha.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-[11px]">Ver fonte</a>
                </details>
              ))}
            </div>
          )}
          
          {writingLog.length > 0 && (
             <div className="text-xs space-y-1 p-2 border rounded-md bg-muted/20 max-h-60 overflow-y-auto">
              <h3 className="font-semibold text-sm mb-1 text-primary">Log do Desenvolvimento:</h3>
              {writingLog.map((log, i) => <div key={`wl-${i}`}>{log}</div>)}
              {isWriting && (
                <div className="sticky bottom-0 bg-muted/50 p-1 rounded backdrop-blur-sm">
                    <Progress value={writingProgress} className="w-full h-1.5" />
                    {writingCurrentLogItem && <p className="text-xs text-muted-foreground text-center mt-0.5 truncate">{writingCurrentLogItem.split(': ').slice(-1)[0]}</p>}
                </div>
                )}
            </div>
          )}

          {currentFullGeneratedText && (
            <div className="p-2 border rounded-md bg-card">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-sm text-primary">Conteúdo Gerado:</h3>
                    <MarkdownToDocx 
                        markdownContent={currentFullGeneratedText} 
                        fileName={`Cognick_Trabalho_${(activeWork?.title || workThemeInput || 'Academico').replace(/\s+/g, '_').substring(0,30)}`} 
                        disabled={!currentFullGeneratedText || isLoading}
                    />
                 </div>
                <div className="markdown-container prose-sm max-w-none">
                    <MarkdownWithCode content={currentFullGeneratedText} />
                </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-2 md:p-4 border-t bg-background sticky bottom-0">
        <div className="flex gap-2 items-start">
            <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="rounded-full flex-shrink-0 mt-1 invisible" 
                aria-label="Anexar (desativado)"
                disabled
            >
                <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
            <ShadInput
                value={workThemeInput}
                onChange={(e) => setWorkThemeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isLoading) handleInitiateFullProcess();}}}
                placeholder="Digite o tema principal do seu trabalho acadêmico aqui..."
                disabled={isLoading}
                className="flex-1 rounded-lg px-4 py-2 focus-visible:ring-primary text-sm"
                aria-label="Input do tema do trabalho"
            />
            <Button 
                type="button" 
                onClick={() => handleInitiateFullProcess()}
                disabled={isLoading || !workThemeInput.trim()} 
                size="icon" 
                className="rounded-full bg-primary hover:bg-primary/90 disabled:bg-muted flex-shrink-0 mt-1" 
                aria-label="Iniciar processo de criação do trabalho"
            >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
            </Button>
        </div>
      </div>
    </div>
  );
}

    