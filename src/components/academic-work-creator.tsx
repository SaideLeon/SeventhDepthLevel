
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input as ShadInput } from '@/components/ui/input'; // Renomeado para evitar conflito com o novo Input
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from "@/components/ui/progress";
import { Loader2, Download, PlayCircle, BookCheck, AlertTriangle, FileText, Sparkles, SendHorizontal, Paperclip } from 'lucide-react';
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
import { cn } from "@/lib/utils";

export interface AcademicWorkSection {
  title: string;
  content: string;
}

export interface AcademicWork {
  id: string;
  theme: string;
  title: string;
  sections: AcademicWorkSection[];
  fullGeneratedText?: string;
  createdAt: number;
  lastUpdatedAt: number;
  fichas?: FichaLeitura[];
  generatedIndex?: string[];
  researchLog?: string[];
  writingLog?: string[];
  detectedTopic?: string | null;
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

  const [workThemeInput, setWorkThemeInput] = useState('');
  const [targetLanguage] = useState('pt-BR');
  const [citationStyle] = useState('APA');

  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchCurrentStep, setResearchCurrentStep] = useState(0);
  const [researchTotalSteps, setResearchTotalSteps] = useState(0);
  const [researchLog, setResearchLog] = useState<string[]>([]);
  const [researchedFichas, setResearchedFichas] = useState<FichaLeitura[]>([]);
  const [detectedTopicForSearch, setDetectedTopicForSearch] = useState<string | null>(null);
  
  const [isWriting, setIsWriting] = useState(false);
  const [writingProgress, setWritingProgress] = useState(0);
  const [writingCurrentLogItem, setWritingCurrentLogItem] = useState("");
  const [writingLog, setWritingLog] = useState<string[]>([]);
  const [generatedFullText, setGeneratedFullText] = useState<string | null>(null);
  const [currentGeneratedIndex, setCurrentGeneratedIndex] = useState<string[]>([]);
  const [currentDevelopedSections, setCurrentDevelopedSections] = useState<AcademicWorkSection[]>([]);

  const [startFichamentoChain, setStartFichamentoChain] = useState(false);
  const [fichamentoCompleted, setFichamentoCompleted] = useState(false);

  const isLoading = isResearching || isWriting;

  const scrollToBottom = () => {
    if (workAreaRef.current) {
      workAreaRef.current.scrollTop = workAreaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [researchLog, writingLog, generatedFullText, researchedFichas]);


  useEffect(() => {
    if (activeWork) {
      setWorkThemeInput(activeWork.theme || '');
      setResearchedFichas(activeWork.fichas || []);
      setGeneratedFullText(activeWork.fullGeneratedText || null);
      setCurrentGeneratedIndex(activeWork.generatedIndex || []);
      setCurrentDevelopedSections(activeWork.sections || []);
      setResearchLog(activeWork.researchLog || (activeWork.title ? [`Trabalho "${activeWork.title}" carregado.`] : []));
      setWritingLog(activeWork.writingLog || []);
      setDetectedTopicForSearch(activeWork.detectedTopic || null);
      
      setIsResearching(false);
      setIsWriting(false);
      setStartFichamentoChain(false);
      setFichamentoCompleted(false);
    } else {
      setWorkThemeInput('');
      setResearchedFichas([]);
      setGeneratedFullText(null);
      setCurrentGeneratedIndex([]);
      setCurrentDevelopedSections([]);
      setResearchLog([]);
      setWritingLog([]);
      setDetectedTopicForSearch(null);
      setStartFichamentoChain(false);
      setFichamentoCompleted(false);
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

  useEffect(() => {
    if (startFichamentoChain && workThemeInput.trim() && activeWork && !isLoading) {
      handleStartResearch();
      setStartFichamentoChain(false);
    }
  }, [startFichamentoChain, workThemeInput, activeWork, isLoading]);

  useEffect(() => {
    if (fichamentoCompleted && activeWork && researchedFichas.length > 0 && !isLoading) {
      handleStartWriting();
      setFichamentoCompleted(false);
    } else if (fichamentoCompleted && researchedFichas.length === 0 && !isLoading) {
        addResearchLog("⚠️ Pesquisa concluída, mas nenhuma ficha foi gerada. Não é possível iniciar o desenvolvimento do texto automaticamente.");
        addWritingLog("⚠️ Pesquisa concluída, mas nenhuma ficha foi gerada. Não é possível iniciar o desenvolvimento do texto automaticamente.");
        setFichamentoCompleted(false);
        setIsResearching(false); 
        setIsWriting(false); 
    }
  }, [fichamentoCompleted, activeWork, researchedFichas, isLoading]);


  const handleInitiateFullProcess = (themeOverride?: string) => {
    const themeToUse = themeOverride || workThemeInput.trim();
    if (!themeToUse) {
      toast({ title: "Tema Necessário", description: "Por favor, defina o tema principal do trabalho.", variant: "destructive"});
      return;
    }
    if (activeWork) {
      const updatedWorkData = { 
        ...activeWork, 
        theme: themeToUse, 
        title: activeWork.title || themeToUse, 
        fichas: [], 
        sections: [], 
        fullGeneratedText: "", 
        generatedIndex: [], 
        researchLog: [], 
        writingLog: [],
        detectedTopic: null,
        lastUpdatedAt: Date.now() 
      };
      onUpdateWork(updatedWorkData);
      setResearchedFichas([]);
      setGeneratedFullText("");
      setCurrentGeneratedIndex([]);
      setCurrentDevelopedSections([]);
      setResearchLog([`Iniciando processo para: "${themeToUse}"`]);
      setWritingLog([]);
      setDetectedTopicForSearch(null);
      setStartFichamentoChain(true); 
      if (!themeOverride) setWorkThemeInput("");
    }
  };

  const handleStartResearch = async () => {
    if (!activeWork || !workThemeInput.trim()) {
      toast({ title: "Erro", description: "Defina um tema para o trabalho.", variant: "destructive" });
      return;
    }
    setIsResearching(true);
    setResearchedFichas([]);
    setResearchLog(prev => [...prev, `Iniciando pesquisa para o tema: "${workThemeInput}"`]);
    setResearchProgress(0);
    setResearchCurrentStep(0);
    setResearchTotalSteps(0);
    setDetectedTopicForSearch(null);

    let effectiveSearchTopic = workThemeInput.trim();

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
        throw new Error(`Falha ao detectar tópico: ${errorData.error || topicResponse.statusText}`);
      }
      const topicResult: DetectTopicFromTextOutput = await topicResponse.json();
      if (topicResult.detectedTopic) {
        effectiveSearchTopic = topicResult.detectedTopic;
        setDetectedTopicForSearch(effectiveSearchTopic);
        addResearchLog(`✅ Tópico detectado para pesquisa: "${effectiveSearchTopic}"`);
        if (activeWork) onUpdateWork({ ...activeWork, detectedTopic: effectiveSearchTopic, lastUpdatedAt: Date.now() });
      } else {
        addResearchLog(`⚠️ Não foi possível refinar o tópico. Usando o tema original: "${effectiveSearchTopic}"`);
        setDetectedTopicForSearch(effectiveSearchTopic);
        if (activeWork) onUpdateWork({ ...activeWork, detectedTopic: effectiveSearchTopic, lastUpdatedAt: Date.now() });
      }
    } catch (error: any) {
      addResearchLog(`❌ Erro ao detectar tópico: ${error.message}. Usando tema original.`);
      setDetectedTopicForSearch(effectiveSearchTopic);
       if (activeWork) onUpdateWork({ ...activeWork, detectedTopic: effectiveSearchTopic, lastUpdatedAt: Date.now() });
    }
    setResearchProgress(10);

    addResearchLog(`Buscando até 10 artigos para: "${effectiveSearchTopic}"...`);
    let searchResults: SearchResult[] = [];
    try {
      const scraperSearchResponse = await fetch('/api/raspagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termoBusca: effectiveSearchTopic, todasPaginas: true, maxPaginas: 3 }),
      });
      if (!scraperSearchResponse.ok) {
         const errorData = await scraperSearchResponse.json().catch(() => ({}));
        throw new Error(`Falha ao buscar artigos: ${errorData.error || scraperSearchResponse.statusText}`);
      }
      const allSearchResults: SearchResult[] = await scraperSearchResponse.json();
      searchResults = allSearchResults.slice(0, 10);
      addResearchLog(`🔗 ${searchResults.length} artigos encontrados para processamento.`);
      if (searchResults.length === 0) {
        addResearchLog('Nenhum artigo encontrado. Tente um tema diferente ou ajuste a pesquisa contextual nas configurações.');
        setIsResearching(false);
        setResearchProgress(100);
        setFichamentoCompleted(true); 
        return;
      }
    } catch (error: any) {
      addResearchLog(`❌ Erro ao buscar artigos: ${error.message}`);
      setIsResearching(false);
      setResearchProgress(100);
      return;
    }
    setResearchTotalSteps(searchResults.length);
    setResearchProgress(20);

    const fetchedFichas: FichaLeitura[] = [];
    for (let i = 0; i < searchResults.length; i++) {
      const article = searchResults[i];
      setResearchCurrentStep(i + 1);
      const currentProgress = 20 + ((i + 1) / searchResults.length) * 70;
      setResearchProgress(currentProgress);
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
            throw new Error(`Falha ao gerar ficha: ${errorData.error || fichamentoResponse.statusText}`);
        }
        const fichaGerada: FichaLeitura = await fichamentoResponse.json();
        
        fetchedFichas.push(fichaGerada);
        setResearchedFichas(prev => [...prev, fichaGerada]);
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
    setFichamentoCompleted(true);
  };


  const handleStartWriting = async () => {
    if (!activeWork) {
        toast({ title: "Erro", description: "Nenhum trabalho ativo.", variant: "destructive" });
        return;
    }
    const finalDetectedTopic = detectedTopicForSearch || activeWork.detectedTopic || activeWork.theme;
    if (researchedFichas.length === 0 && !activeWork.fullGeneratedText) {
      addWritingLog("⚠️ Não há fichas de leitura para basear o desenvolvimento. O texto será gerado com conhecimento geral.");
      toast({ title: "Aviso", description: "Não há fichas de leitura. O texto será gerado com conhecimento geral.", variant: "default" });
    }

    setIsWriting(true);
    setWritingLog(prev => [...prev, `Iniciando desenvolvimento do trabalho: "${activeWork.title || finalDetectedTopic}"`]);
    setWritingProgress(0);
    setGeneratedFullText('');
    setCurrentDevelopedSections([]);
    setCurrentGeneratedIndex([]);
    
    let generatedIndexTitles: string[] = [];
    try {
        addWritingLog("⚙️ Gerando índice do trabalho...");
        setWritingProgress(5);
        const indexResponse = await fetch('/api/generate-index', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ mainTopic: finalDetectedTopic, targetLanguage, numSections: 3 })
        });
        if(!indexResponse.ok) {
            const errorData = await indexResponse.json().catch(() => ({}));
            throw new Error(`Falha ao gerar índice: ${errorData.error || indexResponse.statusText}`);
        }
        const indexResult: GenerateIndexOutput = await indexResponse.json();
        generatedIndexTitles = indexResult.generatedIndex;
        setCurrentGeneratedIndex(generatedIndexTitles);
        if (activeWork) onUpdateWork({ ...activeWork, generatedIndex: generatedIndexTitles, lastUpdatedAt: Date.now() });
        addWritingLog(`📑 Índice gerado com ${generatedIndexTitles.length} seções: ${generatedIndexTitles.join(', ')}`);
    } catch (error: any) {
        addWritingLog(`❌ Erro ao gerar índice: ${error.message}. Usando estrutura padrão.`);
        generatedIndexTitles = ["Introdução", `Desenvolvimento sobre ${finalDetectedTopic}`, "Conclusão", "Referências Bibliográficas"];
        setCurrentGeneratedIndex(generatedIndexTitles);
    }
    setWritingProgress(10);

    let currentFullText = `# ${activeWork.title || finalDetectedTopic}\n\n`;
    setGeneratedFullText(currentFullText);
    const tempDevelopedSections: AcademicWorkSection[] = [];

    for (let i = 0; i < generatedIndexTitles.length; i++) {
        const sectionTitle = generatedIndexTitles[i];
        const currentProgress = 10 + ((i + 1) / generatedIndexTitles.length) * 85;
        setWritingProgress(currentProgress);
        addWritingLog(`✍️ Escrevendo seção ${i+1}/${generatedIndexTitles.length}: "${sectionTitle}"...`);
        
        let sectionContent = "";
        try {
            const sectionTitleLower = sectionTitle.toLowerCase();
            let response;
            if (sectionTitleLower.includes("introdução")) {
                response = await fetch('/api/generate-introduction', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ mainTopic: finalDetectedTopic, generatedIndex: generatedIndexTitles, targetLanguage })
                });
                if (!response.ok) { const err = await response.json(); throw new Error(err.details || err.error || "Erro desconhecido"); }
                const result: GenerateIntroductionOutput = await response.json();
                sectionContent = result.introduction;
            } else if (sectionTitleLower.includes("conclusão")) {
                const introContent = tempDevelopedSections.find(s => s.title.toLowerCase().includes("introdução"))?.content;
                response = await fetch('/api/generate-conclusion', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ mainTopic: finalDetectedTopic, introductionContent: introContent, developedSectionsContent: tempDevelopedSections, targetLanguage})
                });
                 if (!response.ok) { const err = await response.json(); throw new Error(err.details || err.error || "Erro desconhecido"); }
                const result: GenerateConclusionOutput = await response.json();
                sectionContent = result.conclusion;
            } else if (sectionTitleLower.includes("bibliografia") || sectionTitleLower.includes("referências")) {
                 response = await fetch('/api/generate-bibliography', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ fichasDeLeitura: researchedFichas, citationStyle, targetLanguage })
                });
                 if (!response.ok) { const err = await response.json(); throw new Error(err.details || err.error || "Erro desconhecido"); }
                const result: GenerateBibliographyOutput = await response.json();
                sectionContent = result.bibliography;
            } else { 
                 response = await fetch('/api/generate-academic-section', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        sectionTitle,
                        mainTopic: finalDetectedTopic,
                        fichasDeLeitura: researchedFichas,
                        completedSections: tempDevelopedSections,
                        targetLanguage,
                        citationStyle,
                        wordCountTarget: 500
                    })
                });
                if (!response.ok) { const err = await response.json(); throw new Error(err.details || err.error || "Erro desconhecido"); }
                const result: GenerateAcademicSectionOutput = await response.json();
                sectionContent = result.sectionContent;
            }
        } catch (error: any) {
            addWritingLog(`❌ Erro ao gerar conteúdo para "${sectionTitle}": ${error.message || String(error)}. Usando placeholder.`);
            sectionContent = `Conteúdo para "${sectionTitle}" não pôde ser gerado devido a um erro. Por favor, tente novamente ou edite manualmente.`;
        }
        
        const currentSection: AcademicWorkSection = { title: sectionTitle, content: sectionContent };
        tempDevelopedSections.push(currentSection);
        setCurrentDevelopedSections(prev => [...prev, currentSection]);

        currentFullText += `## ${sectionTitle}\n\n${sectionContent}\n\n`;
        setGeneratedFullText(currentFullText);
        addWritingLog(`✅ Seção "${sectionTitle}" escrita.`);
    }

    if (activeWork) {
      onUpdateWork({ 
        ...activeWork, 
        sections: tempDevelopedSections, 
        fullGeneratedText: currentFullText, 
        title: activeWork.title || finalDetectedTopic, 
        theme: finalDetectedTopic, 
        writingLog: [...writingLog, "🎉 Desenvolvimento do trabalho concluído!"],
        lastUpdatedAt: Date.now() 
      });
    }
    addWritingLog("🎉 Desenvolvimento do trabalho concluído!");
    setWritingProgress(100);
    setIsWriting(false);
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

  const hasContentToDisplay = researchLog.length > 0 || writingLog.length > 0 || researchedFichas.length > 0 || generatedFullText;

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <ScrollArea className="flex-1 p-3 md:p-4" viewportRef={workAreaRef}>
        <div className="space-y-4">
          {!hasContentToDisplay && !isLoading && (
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
                <div className="sticky bottom-0 bg-muted/50 p-1 rounded">
                    <Progress value={researchProgress} className="w-full h-1.5" />
                    <p className="text-xs text-muted-foreground text-center mt-0.5">Etapa {researchCurrentStep} de {researchTotalSteps}</p>
                </div>
                )}
            </div>
          )}

          {researchedFichas.length > 0 && (
            <div className="text-xs space-y-1 p-2 border rounded-md bg-muted/20 max-h-72 overflow-y-auto">
              <h3 className="font-semibold text-sm mb-1 text-primary">Fichas de Leitura Geradas ({researchedFichas.length}):</h3>
              {researchedFichas.map((ficha, i) => (
                <details key={`ficha-${i}`} className="mb-1 p-1.5 border-b border-border last:border-b-0">
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
                <div className="sticky bottom-0 bg-muted/50 p-1 rounded">
                    <Progress value={writingProgress} className="w-full h-1.5" />
                    {writingCurrentLogItem && <p className="text-xs text-muted-foreground text-center mt-0.5 truncate">{writingCurrentLogItem.split(': ').slice(-1)[0]}</p>}
                </div>
                )}
            </div>
          )}

          {generatedFullText && (
            <div className="p-2 border rounded-md bg-card">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-sm text-primary">Conteúdo Gerado:</h3>
                    <MarkdownToDocx 
                        markdownContent={generatedFullText} 
                        fileName={`Cognick_Trabalho_${(activeWork?.title || workThemeInput || 'Academico').replace(/\s+/g, '_').substring(0,30)}`} 
                        disabled={!generatedFullText || isLoading}
                    />
                 </div>
                <div className="markdown-container prose-sm max-w-none">
                    <MarkdownWithCode content={generatedFullText} />
                </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-2 md:p-4 border-t bg-background sticky bottom-0">
        <div className="flex gap-2 items-start">
            {/* O botão de anexo pode ser removido ou adaptado para outra funcionalidade se não for relevante para temas */}
            <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="rounded-full flex-shrink-0 mt-1 invisible" /* Mantendo para layout mas invisível */
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

