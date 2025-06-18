
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input as ShadInput } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from "@/components/ui/progress";
import { Loader2, Download, PlayCircle, BookCheck, AlertTriangle, FileText } from 'lucide-react';
import MarkdownToDocx from '@/components/MarkdownToDocx';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MarkdownWithCode } from '@/components/Markdown/MarkdownWithCode';
import type { SearchResult, PageContent } from "@/utils/raspagem";
import type { DetectTopicFromTextOutput } from "@/ai/flows/detect-topic-flow";
import type { FichaLeitura, GenerateFichamentoInput } from "@/ai/flows/generate-fichamento-flow";
import type { GenerateIndexOutput } from "@/ai/flows/generate-index-flow";
import type { GenerateIntroductionOutput } from "@/ai/flows/generate-introduction-flow";
import type { GenerateAcademicSectionOutput } from "@/ai/flows/generate-academic-section-flow";
import type { GenerateConclusionOutput } from "@/ai/flows/generate-conclusion-flow";
import type { GenerateBibliographyOutput } from "@/ai/flows/generate-bibliography-flow";


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
  fichas?: FichaLeitura[]; // Store generated fichas with the work
  generatedIndex?: string[]; // Store generated index
}

interface AcademicWorkCreatorProps {
  activeWork: AcademicWork | null | undefined;
  onUpdateWork: (updatedWork: AcademicWork) => void;
}

export default function AcademicWorkCreator({ activeWork, onUpdateWork }: AcademicWorkCreatorProps) {
  const { toast } = useToast();

  const [workTheme, setWorkTheme] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('pt-BR');
  const [citationStyle, setCitationStyle] = useState('APA');

  // Phase 1: Research & Fichamento
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchCurrentStep, setResearchCurrentStep] = useState(0);
  const [researchTotalSteps, setResearchTotalSteps] = useState(0);
  const [researchLog, setResearchLog] = useState<string[]>([]);
  const [researchedFichas, setResearchedFichas] = useState<FichaLeitura[]>([]);
  const [detectedTopicForSearch, setDetectedTopicForSearch] = useState<string | null>(null);
  
  // Phase 2: Writing (Index, Sections, Conclusion, Bibliography)
  const [isWriting, setIsWriting] = useState(false);
  const [writingProgress, setWritingProgress] = useState(0);
  const [writingCurrentLogItem, setWritingCurrentLogItem] = useState("");
  const [writingLog, setWritingLog] = useState<string[]>([]);
  const [generatedFullText, setGeneratedFullText] = useState<string | null>(null);
  const [currentGeneratedIndex, setCurrentGeneratedIndex] = useState<string[]>([]);
  const [currentDevelopedSections, setCurrentDevelopedSections] = useState<AcademicWorkSection[]>([]);

  // Automatic workflow control
  const [startFichamentoChain, setStartFichamentoChain] = useState(false);
  const [fichamentoCompleted, setFichamentoCompleted] = useState(false);


  useEffect(() => {
    if (activeWork) {
      setWorkTheme(activeWork.theme || '');
      setResearchedFichas(activeWork.fichas || []);
      setGeneratedFullText(activeWork.fullGeneratedText || null);
      setCurrentGeneratedIndex(activeWork.generatedIndex || []);
      setCurrentDevelopedSections(activeWork.sections || []);
      setResearchLog(activeWork.title ? [`Trabalho "${activeWork.title}" carregado.`] : []);
      setWritingLog([]);
      setIsResearching(false);
      setIsWriting(false);
      setDetectedTopicForSearch(null);
      setStartFichamentoChain(false);
      setFichamentoCompleted(false);
    } else {
      setWorkTheme('');
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
    setResearchLog(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  const addWritingLog = useCallback((message: string) => {
    console.log(`[Desenvolvimento]: ${message}`);
    setWritingCurrentLogItem(`${new Date().toLocaleTimeString()}: ${message}`);
    setWritingLog(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  // Auto-start Fichamento (Research) when workTheme is set and startFichamentoChain is true
  useEffect(() => {
    if (startFichamentoChain && workTheme.trim() && activeWork && !isResearching && !isWriting) {
      handleStartResearch();
      setStartFichamentoChain(false); // Reset trigger
    }
  }, [startFichamentoChain, workTheme, activeWork, isResearching, isWriting]);

  // Auto-start Development (Writing) when Fichamento is completed
  useEffect(() => {
    if (fichamentoCompleted && activeWork && researchedFichas.length > 0 && !isWriting && !isResearching) {
      handleStartWriting();
      setFichamentoCompleted(false); // Reset trigger
    } else if (fichamentoCompleted && researchedFichas.length === 0) {
        addWritingLog("⚠️ Pesquisa concluída, mas nenhuma ficha foi gerada. Não é possível iniciar o desenvolvimento do texto automaticamente.");
        setFichamentoCompleted(false);
    }
  }, [fichamentoCompleted, activeWork, researchedFichas, isWriting, isResearching]);


  const handleInitiateFullProcess = () => {
    if (!workTheme.trim()) {
      toast({ title: "Tema Necessário", description: "Por favor, defina o tema principal do trabalho.", variant: "destructive"});
      return;
    }
    if (activeWork) {
      onUpdateWork({ ...activeWork, theme: workTheme, title: activeWork.title || workTheme, fichas: [], sections: [], fullGeneratedText: "", generatedIndex: [], lastUpdatedAt: Date.now() });
    }
    setResearchedFichas([]);
    setGeneratedFullText("");
    setCurrentGeneratedIndex([]);
    setCurrentDevelopedSections([]);
    setResearchLog([]);
    setWritingLog([]);
    setStartFichamentoChain(true); // Trigger the research phase
  };


  const handleStartResearch = async () => {
    if (!activeWork || !workTheme.trim()) {
      toast({ title: "Erro", description: "Defina um tema para o trabalho.", variant: "destructive" });
      return;
    }
    setIsResearching(true);
    setResearchedFichas([]);
    setResearchLog([`Iniciando pesquisa para o tema: "${workTheme}"`]);
    setResearchProgress(0);
    setResearchCurrentStep(0);
    setResearchTotalSteps(0);
    setDetectedTopicForSearch(null);

    let effectiveSearchTopic = workTheme.trim();

    // 1. Detect Topic
    addResearchLog(`Detectando tópico principal para "${effectiveSearchTopic}"...`);
    setResearchProgress(5);
    try {
      const topicResponse = await fetch('/api/detectTopic', { // Corrected API endpoint name
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
      } else {
        addResearchLog(`⚠️ Não foi possível refinar o tópico. Usando o tema original: "${effectiveSearchTopic}"`);
        setDetectedTopicForSearch(effectiveSearchTopic); // Use original if detection fails
      }
    } catch (error: any) {
      addResearchLog(`❌ Erro ao detectar tópico: ${error.message}. Usando tema original.`);
      setDetectedTopicForSearch(effectiveSearchTopic); // Fallback to original
    }
    setResearchProgress(10);

    // 2. Search for articles (up to 10)
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
        addResearchLog('Nenhum artigo encontrado. Tente um tema diferente.');
        setIsResearching(false);
        setResearchProgress(100);
        setFichamentoCompleted(true); // Mark as completed even if no fichas to potentially trigger user action or different flow
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

    // 3. Process each article and generate Ficha
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
        const fichamentoResponse = await fetch('/api/fichamento', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(pageContent) // Send the whole PageContent as FichamentoInput
        });
        if(!fichamentoResponse.ok) {
            const errorData = await fichamentoResponse.json().catch(() => ({}));
            throw new Error(`Falha ao gerar ficha: ${errorData.error || fichamentoResponse.statusText}`);
        }
        const fichaGerada: FichaLeitura = await fichamentoResponse.json();
        
        fetchedFichas.push(fichaGerada);
        setResearchedFichas(prev => [...prev, fichaGerada]); // Update UI progressively
        addResearchLog(`✅ Ficha para "${fichaGerada.titulo.substring(0,50)}..." criada.`);

      } catch (error: any) {
        addResearchLog(`❌ Erro ao processar artigo "${article.titulo.substring(0,50)}...": ${error.message}`);
      }
    }
    
    if (activeWork) {
        onUpdateWork({ ...activeWork, fichas: fetchedFichas, lastUpdatedAt: Date.now() });
    }
    addResearchLog(`📚 Fichamento concluído. ${fetchedFichas.length} fichas geradas.`);
    setResearchProgress(100);
    setIsResearching(false);
    setFichamentoCompleted(true); // Trigger next phase
  };


  const handleStartWriting = async () => {
    if (!activeWork) {
        toast({ title: "Erro", description: "Nenhum trabalho ativo.", variant: "destructive" });
        return;
    }
    if (researchedFichas.length === 0 && !activeWork.fullGeneratedText) {
      toast({ title: "Aviso", description: "Não há fichas de leitura para basear o desenvolvimento. O texto será gerado com conhecimento geral.", variant: "default" });
    }

    setIsWriting(true);
    setWritingLog([`Iniciando desenvolvimento do trabalho: "${activeWork.title || workTheme}"`]);
    setWritingProgress(0);
    setGeneratedFullText('');
    setCurrentDevelopedSections([]);
    setCurrentGeneratedIndex([]);
    
    let generatedIndexTitles: string[] = [];
    try {
        addWritingLog("⚙️ Gerando índice do trabalho...");
        const indexResponse = await fetch('/api/generate-index', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ mainTopic: detectedTopicForSearch || activeWork.theme, targetLanguage, numSections: 3 }) // 3 dev sections + intro/conc/biblio
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
        generatedIndexTitles = ["Introdução", `Desenvolvimento sobre ${detectedTopicForSearch || activeWork.theme}`, "Conclusão", "Referências Bibliográficas"];
        setCurrentGeneratedIndex(generatedIndexTitles);
    }
    setWritingProgress(10);

    let currentFullText = `# ${activeWork.title || workTheme}\n\n`;
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
                    body: JSON.stringify({ mainTopic: detectedTopicForSearch || activeWork.theme, generatedIndex: generatedIndexTitles, targetLanguage })
                });
                if (!response.ok) throw new Error(await response.text());
                const result: GenerateIntroductionOutput = await response.json();
                sectionContent = result.introduction;
            } else if (sectionTitleLower.includes("conclusão")) {
                const introContent = tempDevelopedSections.find(s => s.title.toLowerCase().includes("introdução"))?.content;
                response = await fetch('/api/generate-conclusion', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ mainTopic: detectedTopicForSearch || activeWork.theme, introductionContent: introContent, developedSectionsContent: tempDevelopedSections, targetLanguage})
                });
                 if (!response.ok) throw new Error(await response.text());
                const result: GenerateConclusionOutput = await response.json();
                sectionContent = result.conclusion;
            } else if (sectionTitleLower.includes("bibliografia") || sectionTitleLower.includes("referências")) {
                 response = await fetch('/api/generate-bibliography', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ fichasDeLeitura: researchedFichas, citationStyle, targetLanguage })
                });
                 if (!response.ok) throw new Error(await response.text());
                const result: GenerateBibliographyOutput = await response.json();
                sectionContent = result.bibliography;
            } else { // Development section
                 response = await fetch('/api/generate-academic-section', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        sectionTitle,
                        mainTopic: detectedTopicForSearch || activeWork.theme,
                        fichasDeLeitura: researchedFichas,
                        completedSections: tempDevelopedSections,
                        targetLanguage,
                        citationStyle,
                        wordCountTarget: 500
                    })
                });
                if (!response.ok) throw new Error(await response.text());
                const result: GenerateAcademicSectionOutput = await response.json();
                sectionContent = result.sectionContent;
            }
        } catch (error: any) {
            addWritingLog(`❌ Erro ao gerar conteúdo para "${sectionTitle}": ${error.message || String(error)}. Usando placeholder.`);
            sectionContent = `Conteúdo para "${sectionTitle}" não pôde ser gerado devido a um erro.`;
        }
        
        const currentSection: AcademicWorkSection = { title: sectionTitle, content: sectionContent };
        tempDevelopedSections.push(currentSection);
        setCurrentDevelopedSections(prev => [...prev, currentSection]);

        currentFullText += `## ${sectionTitle}\n\n${sectionContent}\n\n`;
        setGeneratedFullText(currentFullText);
        addWritingLog(`✅ Seção "${sectionTitle}" escrita.`);
    }

    if (activeWork) {
      onUpdateWork({ ...activeWork, sections: tempDevelopedSections, fullGeneratedText: currentFullText, title: activeWork.title || workTheme, theme: workTheme, lastUpdatedAt: Date.now() });
    }
    addWritingLog("🎉 Desenvolvimento do trabalho concluído!");
    setWritingProgress(100);
    setIsWriting(false);
  };


  if (!activeWork) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <BookCheck className="w-16 h-16 mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Nenhum Trabalho Acadêmico Selecionado</h2>
        <p className="text-muted-foreground">Crie um novo trabalho ou selecione um existente na barra lateral.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-2 md:p-4 gap-2 md:gap-4">
      <Card className="flex-shrink-0">
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="text-lg md:text-xl">Criador de Trabalhos Acadêmicos: <span className="text-primary">{activeWork.title || "Novo Trabalho"}</span></CardTitle>
          <CardDescription>Defina o tema, inicie a pesquisa e, em seguida, o desenvolvimento do seu trabalho.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-grow w-full">
              <Label htmlFor="work-theme">Tema Principal / Título Provisório:</Label>
              <ShadInput 
                id="work-theme" 
                value={workTheme} 
                onChange={(e) => setWorkTheme(e.target.value)}
                placeholder="Ex: O impacto da IA na Educação Superior em Moçambique"
                disabled={isResearching || isWriting}
                className="text-sm md:text-base"
              />
            </div>
            <Button 
                onClick={handleInitiateFullProcess} 
                disabled={isResearching || isWriting || !workTheme.trim()} 
                className="w-full sm:w-auto flex-shrink-0"
                size="default"
              >
                {(isResearching || isWriting) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                {(isResearching || isWriting) ? 'Processando...' : 'Iniciar Processo Completo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-2 md:gap-4 flex-1 min-h-0">
        <Card className="flex flex-col">
          <CardHeader className="py-3 md:py-4">
            <CardTitle className="text-base md:text-lg">1. Pesquisa e Fichamento</CardTitle>
            <CardDescription className="text-xs">
              Detecta o tópico, busca até 10 fontes e gera fichas de leitura.
              {detectedTopicForSearch && <span className="block mt-1">Tópico para pesquisa: <strong className="text-primary">{detectedTopicForSearch}</strong></span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-2 md:space-y-3 flex flex-col min-h-0">
            {isResearching && (
              <div className="flex-shrink-0">
                <Progress value={researchProgress} className="w-full h-2" />
                <p className="text-xs text-muted-foreground text-center mt-1">Passo {researchCurrentStep} de {researchTotalSteps}</p>
              </div>
            )}
            <Label className="text-xs md:text-sm pt-1">Log da Pesquisa:</Label>
            <ScrollArea className="h-24 md:h-32 w-full rounded-md border p-2 text-xs flex-shrink-0 bg-muted/30">
              {researchLog.length === 0 && !isResearching && <div className="text-muted-foreground">Aguardando início da pesquisa...</div>}
              {researchLog.map((log, i) => <div key={i}>{log}</div>)}
            </ScrollArea>
            
            <Label className="text-xs md:text-sm pt-1">Fichas Geradas ({researchedFichas.length}):</Label>
             <ScrollArea className="flex-1 w-full rounded-md border p-2 text-xs bg-muted/30 min-h-[5rem] md:min-h-[6rem]">
              {isResearching && researchedFichas.length === 0 && <div className="text-muted-foreground">Gerando fichas...</div>}
              {!isResearching && researchedFichas.length === 0 && <div className="text-muted-foreground">Nenhuma ficha gerada ainda.</div>}
              {researchedFichas.map((ficha, i) => (
                <details key={i} className="mb-1 p-1.5 border-b border-border last:border-b-0">
                    <summary className="font-semibold cursor-pointer text-primary hover:underline text-xs">{ficha.titulo.substring(0,60)}...</summary>
                    <p className="mt-0.5 text-muted-foreground text-[11px]"><strong>Autor:</strong> {ficha.autor || "N/A"} ({ficha.anoPublicacao || "s.d."})</p>
                    <p className="text-muted-foreground text-[11px]"><strong>Resumo:</strong> {ficha.resumo.substring(0,100)}...</p>
                    {ficha.palavrasChave && ficha.palavrasChave.length > 0 && <p className="text-muted-foreground text-[11px]"><strong>Palavras-chave:</strong> {ficha.palavrasChave.join(', ')}</p>}
                    <a href={ficha.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[11px]">Ver fonte</a>
                </details>
              ))}
            </ScrollArea>
          </CardContent>
           <CardFooter className="py-2 md:py-3 border-t">
             <p className="text-xs text-muted-foreground">Fase de pesquisa para coletar informações e criar fichas de leitura.</p>
           </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="py-3 md:py-4">
            <CardTitle className="text-base md:text-lg">2. Desenvolvimento do Trabalho</CardTitle>
            <CardDescription className="text-xs">Gera índice, introdução, desenvolvimento das seções, conclusão e bibliografia.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-2 md:space-y-3 flex flex-col min-h-0">
             {isWriting && (
                <div className="flex-shrink-0">
                    <Progress value={writingProgress} className="w-full h-2" />
                    <p className="text-xs text-muted-foreground text-center mt-1">{writingCurrentLogItem || "Preparando para escrever..."}</p>
                </div>
             )}
            <Label className="text-xs md:text-sm pt-1">Log do Desenvolvimento:</Label>
            <ScrollArea className="h-24 md:h-32 w-full rounded-md border p-2 text-xs flex-shrink-0 bg-muted/30">
                {writingLog.length === 0 && !isWriting && <div className="text-muted-foreground">Aguardando início do desenvolvimento...</div>}
                {isWriting && writingLog.length === 0 && <div className="text-muted-foreground">Iniciando...</div>}
                {writingLog.map((log, i) => <div key={i}>{log}</div>)}
            </ScrollArea>

            <Label className="text-xs md:text-sm pt-1">Conteúdo Gerado (Prévia):</Label>
            <ScrollArea className="flex-1 w-full rounded-md border p-2 bg-card min-h-[5rem] md:min-h-[6rem]">
                {generatedFullText ? (
                    <MarkdownWithCode content={generatedFullText} />
                ) : (
                    <div className="text-xs text-muted-foreground">
                        {isWriting ? "Gerando conteúdo..." : "Nenhum conteúdo gerado ainda."}
                    </div>
                )}
            </ScrollArea>
          </CardContent>
          <CardFooter className="py-2 md:py-3 border-t flex justify-between items-center">
             <p className="text-xs text-muted-foreground flex-1 mr-2">Fase de escrita do trabalho.</p>
            <MarkdownToDocx 
                markdownContent={generatedFullText} 
                fileName={`Cognick_Trabalho_${(activeWork?.title || workTheme || 'Academico').replace(/\s+/g, '_').substring(0,30)}`} 
                disabled={!generatedFullText || isWriting || isResearching}
            />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
    