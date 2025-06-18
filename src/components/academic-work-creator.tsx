
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input as ShadInput } from '@/components/ui/input'; // Renamed to avoid conflict
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from "@/components/ui/progress";
import { Loader2, Download, PlayCircle, BookCheck, AlertTriangle } from 'lucide-react';
import MarkdownToDocx from '@/components/MarkdownToDocx';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MarkdownWithCode } from '@/components/Markdown/MarkdownWithCode';
import type { SearchResult, PageContent } from "@/utils/raspagem"; // For scraper results
import type { DetectTopicFromTextOutput } from "@/ai/flows/detect-topic-flow";


// Define types consistent with chat-interface.tsx
interface AcademicWorkSection {
  title: string;
  content: string;
}

interface AcademicWork {
  id: string;
  theme: string;
  title: string;
  sections: AcademicWorkSection[];
  fullGeneratedText?: string;
  createdAt: number;
  lastUpdatedAt: number;
}

interface FichaLeitura {
    titulo: string;
    autor: string;
    anoPublicacao: string;
    palavrasChave: string[];
    resumo: string;
    citacoesRelevantes: string[];
    comentariosAdicionais: string;
    url: string;
}

interface AcademicWorkCreatorProps {
  activeWork: AcademicWork | null | undefined;
  onUpdateWork: (updatedWork: AcademicWork) => void;
}

export default function AcademicWorkCreator({ activeWork, onUpdateWork }: AcademicWorkCreatorProps) {
  const { toast } = useToast();

  const [workTitle, setWorkTitle] = useState(''); // User input for overall theme/title
  const [targetLanguage, setTargetLanguage] = useState('pt-BR'); // Could be a select later
  const [citationStyle, setCitationStyle] = useState('APA'); // Could be a select later

  // State for "Fichamento" (Research Phase)
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0); // 0-100
  const [researchCurrentStep, setResearchCurrentStep] = useState(0);
  const [researchTotalSteps, setResearchTotalSteps] = useState(0);
  const [researchLog, setResearchLog] = useState<string[]>([]);
  const [researchedFichas, setResearchedFichas] = useState<FichaLeitura[]>([]);
  const [detectedTopicForSearch, setDetectedTopicForSearch] = useState<string | null>(null);

  // State for "Desenvolvimento" (Writing Phase)
  const [isWriting, setIsWriting] = useState(false);
  const [writingProgress, setWritingProgress] = useState(0); // 0-100
  const [writingCurrentSection, setWritingCurrentSection] = useState(0);
  const [writingTotalSections, setWritingTotalSections] = useState(0);
  const [writingLog, setWritingLog] = useState<string[]>([]);
  const [generatedFullText, setGeneratedFullText] = useState<string | null>(null);


  useEffect(() => {
    if (activeWork) {
      setWorkTitle(activeWork.theme || ''); // Initialize with theme
      setResearchedFichas([]); 
      setGeneratedFullText(activeWork.fullGeneratedText || null);
      setResearchLog(activeWork.title ? [`Trabalho "${activeWork.title}" carregado.`] : []);
      setWritingLog([]);
      setIsResearching(false);
      setIsWriting(false);
      setDetectedTopicForSearch(null);
    } else {
      setWorkTitle('');
      setResearchedFichas([]);
      setGeneratedFullText(null);
      setResearchLog([]);
      setWritingLog([]);
      setDetectedTopicForSearch(null);
    }
  }, [activeWork]);

  const addResearchLog = (message: string) => {
    console.log(`[Pesquisa]: ${message}`);
    setResearchLog(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]); // Keep last 20 logs
  };
  const addWritingLog = (message: string) => {
    console.log(`[Desenvolvimento]: ${message}`);
    setWritingLog(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]); // Keep last 20 logs
  };


  const handleStartResearch = async () => {
    if (!activeWork || !workTitle.trim()) {
      toast({ title: "Erro", description: "Por favor, forneça um tema para o trabalho.", variant: "destructive" });
      return;
    }
    setIsResearching(true);
    setResearchedFichas([]);
    setResearchLog([`Iniciando pesquisa para o tema: "${workTitle}"`]);
    setResearchProgress(0);
    setResearchCurrentStep(0);
    setResearchTotalSteps(0); 
    setDetectedTopicForSearch(null);

    let effectiveSearchTopic = workTitle.trim();

    // 1. Detect Topic
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
      } else {
        addResearchLog(`⚠️ Não foi possível refinar o tópico. Usando o tema original: "${effectiveSearchTopic}"`);
        setDetectedTopicForSearch(effectiveSearchTopic);
      }
    } catch (error: any) {
      addResearchLog(`❌ Erro ao detectar tópico: ${error.message}. Usando tema original.`);
      // Continue with original topic
      setDetectedTopicForSearch(effectiveSearchTopic);
    }
    setResearchProgress(10);

    // 2. Search for articles (up to 10)
    addResearchLog(`Buscando até 10 artigos para: "${effectiveSearchTopic}"...`);
    let searchResults: SearchResult[] = [];
    try {
      const scraperSearchResponse = await fetch('/api/raspagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termoBusca: effectiveSearchTopic, todasPaginas: true, maxPaginas: 3 }), // Search 3 pages of results to get diverse links
      });
      if (!scraperSearchResponse.ok) {
         const errorData = await scraperSearchResponse.json().catch(() => ({}));
        throw new Error(`Falha ao buscar artigos: ${errorData.error || scraperSearchResponse.statusText}`);
      }
      const allSearchResults: SearchResult[] = await scraperSearchResponse.json();
      searchResults = allSearchResults.slice(0, 10); // Limit to 10 articles
      addResearchLog(`🔗 ${searchResults.length} artigos encontrados para processamento.`);
      if (searchResults.length === 0) {
        addResearchLog('Nenhum artigo encontrado. Tente um tema diferente ou verifique os logs.');
        setIsResearching(false);
        setResearchProgress(100);
        return;
      }
    } catch (error: any) {
      addResearchLog(`❌ Erro ao buscar artigos: ${error.message}`);
      setIsResearching(false);
      setResearchProgress(100);
      return;
    }
    setResearchTotalSteps(searchResults.length); // Total steps is number of articles to process for fichas
    setResearchProgress(20);

    // 3. Process each article and generate Ficha
    const fetchedFichas: FichaLeitura[] = [];
    for (let i = 0; i < searchResults.length; i++) {
      const article = searchResults[i];
      setResearchCurrentStep(i + 1);
      const currentProgress = 20 + ((i + 1) / searchResults.length) * 70; // Fichamento is 70% of research phase
      setResearchProgress(currentProgress);
      addResearchLog(`📄 Processando artigo ${i + 1}/${searchResults.length}: "${article.titulo.substring(0,50)}..."`);

      try {
        // 3a. Scrape content
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

        // 3b. Simulate Ficha Técnica Generation
        // TODO: Replace with actual Genkit flow call
        addResearchLog(`⚙️ Gerando ficha para "${pageContent.titulo || article.titulo}"... (simulado)`);
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500)); // Simulate API call delay
        
        const palavrasChaveFicha = pageContent.titulo ? pageContent.titulo.toLowerCase().split(" ").filter(w => w.length > 3) : (effectiveSearchTopic.split(" ").slice(0,5));

        const fichaSimulada: FichaLeitura = {
            titulo: pageContent.titulo || article.titulo,
            autor: pageContent.autor || "Desconhecido",
            anoPublicacao: pageContent.dataPublicacao ? new Date(pageContent.dataPublicacao).getFullYear().toString() : new Date().getFullYear().toString(),
            palavrasChave: [...new Set(palavrasChaveFicha)].slice(0, 5), // Unique keywords
            resumo: `Resumo simulado do artigo "${pageContent.titulo || article.titulo}". Conteúdo principal: ${pageContent.conteudo?.substring(0, 250)}...`,
            citacoesRelevantes: [`"Citação relevante simulada de '${pageContent.titulo || article.titulo}'." (Autor, Ano)`],
            comentariosAdicionais: "Esta é uma ficha gerada automaticamente (simulação).",
            url: article.url,
        };
        fetchedFichas.push(fichaSimulada);
        setResearchedFichas(prevFichas => [...prevFichas, fichaSimulada]);
        addResearchLog(`✅ Ficha para "${fichaSimulada.titulo.substring(0,50)}..." criada.`);

      } catch (error: any) {
        addResearchLog(`❌ Erro ao processar artigo "${article.titulo.substring(0,50)}...": ${error.message}`);
      }
    }

    if (activeWork && fetchedFichas.length > 0) {
        addResearchLog(`📚 Fichamento concluído. ${fetchedFichas.length} fichas geradas. Você pode iniciar o desenvolvimento do trabalho.`);
    } else if (fetchedFichas.length === 0) {
        addResearchLog('⚠️ Nenhuma ficha pôde ser gerada. Verifique os logs de erro ou tente um tema diferente.');
    }
    setResearchProgress(100);
    setIsResearching(false);
  };


  const handleStartWriting = async () => {
    if (!activeWork) {
        toast({ title: "Erro", description: "Nenhum trabalho ativo.", variant: "destructive" });
        return;
    }
    if (researchedFichas.length === 0 && !activeWork.fullGeneratedText) { // Allow rewriting if text exists
      toast({ title: "Aviso", description: "Realize a pesquisa (fichamento) primeiro ou certifique-se de que há fichas disponíveis para gerar um novo trabalho.", variant: "default" });
      // return; // Allow to proceed if user wants to generate without fichas (e.g. from scratch)
    }

    setIsWriting(true);
    setWritingLog([`Iniciando desenvolvimento do trabalho: "${activeWork.title || workTitle}"`]);
    setWritingProgress(0);
    setGeneratedFullText(''); // Clear previous text
    setWritingCurrentSection(0);
    setWritingTotalSections(0);
    
    // 1. Simulate Index Generation
    // TODO: Replace with actual Genkit flow call
    addWritingLog("⚙️ Gerando índice do trabalho... (simulado)");
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    const simulatedIndexBase = ["Introdução", `Desenvolvimento sobre ${detectedTopicForSearch || activeWork.theme || workTitle}`, "Discussão dos Resultados", "Conclusão"];
    // Add Bibliografia only if fichas exist or if explicitly requested
    if (researchedFichas.length > 0) {
        simulatedIndexBase.push("Referências Bibliográficas");
    }
    const simulatedIndex = researchedFichas.length > 1 ? 
        [
            simulatedIndexBase[0], // Intro
            // Add a section per ficha if many fichas, or one main development section
            ...researchedFichas.slice(0,2).map(f => `Análise de "${f.titulo.substring(0,30)}..."`),
            simulatedIndexBase[1], // Main dev topic
            simulatedIndexBase[2], // Discussion
            simulatedIndexBase[3], // Conclusion
            simulatedIndexBase[4]  // Refs if exists
        ].filter(Boolean) as string[]
        : simulatedIndexBase;

    setWritingTotalSections(simulatedIndex.length);
    addWritingLog(`📑 Índice simulado gerado com ${simulatedIndex.length} seções: ${simulatedIndex.join(', ')}`);
    setWritingProgress(10);

    let currentFullText = `# ${activeWork.title || workTitle}\n\n`; // Add main title
    setGeneratedFullText(currentFullText);

    const newSections: AcademicWorkSection[] = [];

    for (let i = 0; i < simulatedIndex.length; i++) {
        const sectionTitle = simulatedIndex[i];
        setWritingCurrentSection(i + 1);
        const currentProgress = 10 + ((i + 1) / simulatedIndex.length) * 85; // Writing is 85% of this phase
        setWritingProgress(currentProgress);
        addWritingLog(`✍️ Escrevendo seção ${i+1}/${simulatedIndex.length}: "${sectionTitle}"... (simulado)`);
        
        // Simulate API call to generate section content
        // TODO: Replace with actual Genkit flow calls (developAcademicSectionFlow, etc.)
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000)); 
        
        let sectionContent = `## ${sectionTitle}\n\n`;
        if (sectionTitle.toLowerCase().includes("introdução")) {
            sectionContent += `Esta é a introdução simulada para o trabalho sobre "${detectedTopicForSearch || activeWork.theme || workTitle}". Ela definiria o escopo, objetivos e a estrutura do trabalho.\n\n`;
        } else if (sectionTitle.toLowerCase().includes("referências bibliográficas") || sectionTitle.toLowerCase().includes("bibliografia")) {
            if (researchedFichas.length > 0) {
                sectionContent += "Aqui seriam listadas as referências com base nas fichas:\n";
                researchedFichas.forEach(ficha => {
                    sectionContent += `*   ${ficha.autor || 'Autor Desconhecido'} (${ficha.anoPublicacao || 's.d.'}). *${ficha.titulo}*. Disponível em: <${ficha.url}>.\n`;
                });
            } else {
                sectionContent += "Nenhuma ficha de leitura foi processada para gerar a bibliografia.\n";
            }
        } else if (sectionTitle.toLowerCase().includes("conclusão")) {
            sectionContent += `Esta é a conclusão simulada, resumindo os principais pontos e talvez sugerindo trabalhos futuros relacionados a "${detectedTopicForSearch || activeWork.theme || workTitle}".\n\n`;
        } else { // Generic development section
            sectionContent += `Este é o conteúdo simulado para a seção "${sectionTitle}". Ele seria gerado pela IA com base nas ${researchedFichas.length} fichas de leitura disponíveis (se houver) e no tema geral. `;
            if (researchedFichas.length > 0) {
                const randomFicha = researchedFichas[Math.floor(Math.random() * researchedFichas.length)];
                sectionContent += `Por exemplo, um parágrafo poderia discutir "${randomFicha.palavrasChave.join(', ')}" com base na ficha de "${randomFicha.titulo.substring(0,30)}...". \n\nCitações como "${randomFicha.citacoesRelevantes[0] || '(Autor, Ano)'}" seriam incluídas.`;
            } else {
                sectionContent += `Como não há fichas de leitura, o desenvolvimento seria baseado no conhecimento geral da IA sobre "${detectedTopicForSearch || activeWork.theme || workTitle}".`;
            }
            sectionContent += `\n\nEste parágrafo continua o desenvolvimento da seção, explorando mais aspectos do tópico, com análises e exemplos.\n\n`;
        }
        
        currentFullText += sectionContent + "\n\n";
        setGeneratedFullText(currentFullText); // Update preview in real-time
        newSections.push({ title: sectionTitle, content: sectionContent });
        addWritingLog(`✅ Seção "${sectionTitle}" escrita.`);
    }

    onUpdateWork({ ...activeWork, sections: newSections, fullGeneratedText: currentFullText, title: activeWork.title || workTitle, theme: workTitle, lastUpdatedAt: Date.now() });
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
          <div>
            <Label htmlFor="work-title">Tema Principal / Título Provisório do Trabalho:</Label>
            <ShadInput 
              id="work-title" 
              value={workTitle} 
              onChange={(e) => {
                setWorkTitle(e.target.value);
                // Update activeWork theme as user types if it's the current one
                if(activeWork) onUpdateWork({...activeWork, theme: e.target.value, title: activeWork.title || e.target.value, lastUpdatedAt: Date.now() });
              }}
              placeholder="Ex: O impacto da Inteligência Artificial na Educação Superior em Moçambique"
              disabled={isResearching || isWriting}
              className="text-sm md:text-base"
            />
          </div>
          {/* Add selects for targetLanguage and citationStyle later */}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-2 md:gap-4 flex-1 min-h-0">
        {/* Research Panel */}
        <Card className="flex flex-col">
          <CardHeader className="py-3 md:py-4">
            <CardTitle className="text-base md:text-lg">1. Pesquisa e Fichamento</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-2 md:space-y-3 flex flex-col min-h-0">
            <Button 
              onClick={handleStartResearch} 
              disabled={isResearching || isWriting || !workTitle.trim()} 
              className="w-full flex-shrink-0"
              size="sm"
            >
              {isResearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              {isResearching ? `Pesquisando ${researchCurrentStep}/${researchTotalSteps}...` : 'Iniciar Pesquisa (até 10 fontes)'}
            </Button>
            {isResearching && <Progress value={researchProgress} className="w-full h-2 flex-shrink-0" />}
            
            <Label className="text-xs md:text-sm pt-1">Log da Pesquisa:</Label>
            <ScrollArea className="h-24 md:h-32 w-full rounded-md border p-2 text-xs flex-shrink-0 bg-muted/30">
              {researchLog.length === 0 && !isResearching && <div className="text-muted-foreground">Aguardando início da pesquisa...</div>}
              {researchLog.map((log, i) => <div key={i}>{log}</div>)}
            </ScrollArea>
            
            <Label className="text-xs md:text-sm pt-1">Fichas Geradas ({researchedFichas.length}):</Label>
             <ScrollArea className="flex-1 w-full rounded-md border p-2 text-xs bg-muted/30 min-h-[5rem] md:min-h-[6rem]">
              {researchedFichas.length === 0 && !isResearching && <div className="text-muted-foreground">Nenhuma ficha gerada ainda.</div>}
              {isResearching && researchedFichas.length === 0 && <div className="text-muted-foreground">Gerando fichas...</div>}
              {researchedFichas.map((ficha, i) => (
                <details key={i} className="mb-1 p-1.5 border-b border-border last:border-b-0">
                    <summary className="font-semibold cursor-pointer text-primary hover:underline">{ficha.titulo.substring(0,60)}...</summary>
                    <p className="mt-0.5 text-muted-foreground text-[11px]"><strong>Autor:</strong> {ficha.autor}</p>
                    <p className="text-muted-foreground text-[11px]"><strong>Resumo:</strong> {ficha.resumo.substring(0,120)}...</p>
                    <a href={ficha.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[11px]">Ver fonte</a>
                </details>
              ))}
            </ScrollArea>
          </CardContent>
           <CardFooter className="py-2 md:py-3 border-t">
             <p className="text-xs text-muted-foreground">Fase de pesquisa para coletar informações e criar fichas de leitura.</p>
           </CardFooter>
        </Card>

        {/* Writing Panel */}
        <Card className="flex flex-col">
          <CardHeader className="py-3 md:py-4">
            <CardTitle className="text-base md:text-lg">2. Desenvolvimento do Trabalho</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-2 md:space-y-3 flex flex-col min-h-0">
             <Button 
                onClick={handleStartWriting} 
                disabled={isWriting || isResearching || (!activeWork.fullGeneratedText && researchedFichas.length === 0)} 
                className="w-full flex-shrink-0"
                size="sm"
            >
              {isWriting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              {isWriting ? `Escrevendo ${writingCurrentSection}/${writingTotalSections}...` : 'Iniciar Desenvolvimento'}
            </Button>
            {isWriting && <Progress value={writingProgress} className="w-full h-2 flex-shrink-0" />}

            <Label className="text-xs md:text-sm pt-1">Log do Desenvolvimento:</Label>
            <ScrollArea className="h-24 md:h-32 w-full rounded-md border p-2 text-xs flex-shrink-0 bg-muted/30">
                {writingLog.length === 0 && !isWriting && <div className="text-muted-foreground">Aguardando início do desenvolvimento...</div>}
                {writingLog.map((log, i) => <div key={i}>{log}</div>)}
            </ScrollArea>

            <Label className="text-xs md:text-sm pt-1">Conteúdo Gerado (Prévia):</Label>
            <ScrollArea className="flex-1 w-full rounded-md border p-2 bg-muted/30 min-h-[5rem] md:min-h-[6rem]">
                {generatedFullText ? (
                    <MarkdownWithCode content={generatedFullText} />
                ) : (
                    <div className="text-xs text-muted-foreground">Nenhum conteúdo gerado ainda. Clique em "Iniciar Desenvolvimento".</div>
                )}
            </ScrollArea>
          </CardContent>
          <CardFooter className="py-2 md:py-3 border-t flex justify-between items-center">
             <p className="text-xs text-muted-foreground flex-1 mr-2">Fase de escrita do trabalho usando as fichas e o tema.</p>
            <MarkdownToDocx 
                markdownContent={generatedFullText} 
                fileName={`Cognick_Trabalho_${(activeWork?.title || workTitle || 'Academico').replace(/\s+/g, '_').substring(0,30)}`} 
                disabled={!generatedFullText || isWriting || isResearching}
            />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

    
