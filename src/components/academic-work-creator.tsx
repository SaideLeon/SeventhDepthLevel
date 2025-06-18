
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input as ShadInput } from '@/components/ui/input'; // Renamed to avoid conflict
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from "@/components/ui/progress";
import { Loader2, Download, PlayCircle, BookCheck, AlertTriangle } from 'lucide-react';
import MarkdownToDocx from '@/components/MarkdownToDocx';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MarkdownWithCode } from '@/components/Markdown/MarkdownWithCode';

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
  const [researchCurrentPage, setResearchCurrentPage] = useState(0);
  const [researchTotalPages, setResearchTotalPages] = useState(0);
  const [researchLog, setResearchLog] = useState<string[]>([]);
  const [researchedFichas, setResearchedFichas] = useState<FichaLeitura[]>([]);
  const [detectedTopic, setDetectedTopic] = useState<string | null>(null);

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
      setResearchedFichas([]); // Reset fichas when work changes
      setGeneratedFullText(activeWork.fullGeneratedText || null);
      setResearchLog([`Trabalho "${activeWork.title}" carregado.`]);
      setWritingLog([]);
      setIsResearching(false);
      setIsWriting(false);
      setDetectedTopic(null);
    } else {
      setWorkTitle('');
      setResearchedFichas([]);
      setGeneratedFullText(null);
      setResearchLog([]);
      setWritingLog([]);
    }
  }, [activeWork]);

  const addResearchLog = (message: string) => {
    console.log(`[Research Log]: ${message}`);
    setResearchLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  const addWritingLog = (message: string) => {
    console.log(`[Writing Log]: ${message}`);
    setWritingLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };


  const handleStartResearch = async () => {
    if (!activeWork || !workTitle.trim()) {
      toast({ title: "Erro", description: "Por favor, forneça um tema para o trabalho.", variant: "destructive" });
      return;
    }
    setIsResearching(true);
    setResearchedFichas([]);
    setResearchLog([`Iniciando pesquisa para: ${workTitle}`]);
    setResearchProgress(0);
    setResearchCurrentPage(0);
    setResearchTotalPages(0);
    setDetectedTopic(null);

    let currentDetectedTopic = workTitle.trim();

    try {
      addResearchLog(`Detectando tópico principal para "${currentDetectedTopic}"...`);
      const topicResponse = await fetch('/api/detect-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textQuery: currentDetectedTopic, targetLanguage }),
      });
      if (!topicResponse.ok) throw new Error('Falha ao detectar tópico: ' + topicResponse.statusText);
      const topicResult = await topicResponse.json();
      currentDetectedTopic = topicResult.detectedTopic || currentDetectedTopic;
      setDetectedTopic(currentDetectedTopic);
      addResearchLog(`Tópico detectado para pesquisa: ${currentDetectedTopic}`);
    } catch (error: any) {
      addResearchLog(`❌ Erro ao detectar tópico: ${error.message}`);
      setIsResearching(false);
      return;
    }

    addResearchLog(`Buscando até 10 artigos para: "${currentDetectedTopic}"...`);
    let searchResults: { titulo: string; url: string }[] = [];
    try {
      const scraperResponse = await fetch('/api/raspagem', { // Assuming this is your scraper endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termoBusca: currentDetectedTopic, todasPaginas: true, maxPaginas: 10 }), // Add maxPaginas
      });
      if (!scraperResponse.ok) throw new Error('Falha ao buscar artigos: ' + scraperResponse.statusText);
      searchResults = await scraperResponse.json();
      setResearchTotalPages(searchResults.length > 10 ? 10 : searchResults.length); // Limit to 10
      addResearchLog(`${searchResults.length} artigos encontrados. Processando até 10.`);
      if (searchResults.length === 0) {
        addResearchLog('Nenhum artigo encontrado. Tente um tema diferente.');
        setIsResearching(false);
        return;
      }
    } catch (error: any) {
      addResearchLog(`❌ Erro ao buscar artigos: ${error.message}`);
      setIsResearching(false);
      return;
    }

    const fetchedFichas: FichaLeitura[] = [];
    const articlesToProcess = searchResults.slice(0, 10);
    setResearchTotalPages(articlesToProcess.length);

    for (let i = 0; i < articlesToProcess.length; i++) {
      const article = articlesToProcess[i];
      setResearchCurrentPage(i + 1);
      setResearchProgress(((i + 1) / articlesToProcess.length) * 100);
      addResearchLog(`Processando artigo ${i + 1}/${articlesToProcess.length}: "${article.titulo}"`);

      try {
        // Step 1: Scrape content
        const contentResponse = await fetch('/api/raspagem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: article.url }),
        });
        if (!contentResponse.ok) throw new Error(`Falha ao raspar conteúdo de ${article.url}: ${contentResponse.statusText}`);
        const pageContent = await contentResponse.json();

        // Step 2: Generate Ficha (Summarization) - Placeholder for now
        // This would call a new Genkit flow: generateFichaFlow
        // For now, let's simulate it.
        addResearchLog(`Gerando ficha para "${article.titulo}"... (simulado)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        
        const fichaSimulada: FichaLeitura = {
            titulo: pageContent.titulo || article.titulo,
            autor: pageContent.autor || "Desconhecido",
            anoPublicacao: new Date(pageContent.dataPublicacao || Date.now()).getFullYear().toString(),
            palavrasChave: currentDetectedTopic.split(" "),
            resumo: `Resumo simulado do artigo "${pageContent.titulo || article.titulo}". Conteúdo principal: ${pageContent.conteudo?.substring(0, 200)}...`,
            citacoesRelevantes: [`"Citação simulada de ${pageContent.titulo || article.titulo}." (Autor, Ano)`],
            comentariosAdicionais: "Esta é uma ficha gerada automaticamente como simulação.",
            url: article.url,
        };
        fetchedFichas.push(fichaSimulada);
        setResearchedFichas([...fetchedFichas]);
        addResearchLog(`✅ Ficha para "${article.titulo}" criada.`);

      } catch (error: any) {
        addResearchLog(`❌ Erro ao processar artigo "${article.titulo}": ${error.message}`);
      }
    }

    if (activeWork && fetchedFichas.length > 0) {
        // Here you might want to save these fichas to the activeWork object
        // For now, they are in `researchedFichas` state.
        addResearchLog('Fichamento concluído. Você pode iniciar o desenvolvimento do trabalho.');
    } else if (fetchedFichas.length === 0) {
        addResearchLog('Nenhuma ficha pôde ser gerada. Verifique os logs de erro.');
    }
    setResearchProgress(100);
    setIsResearching(false);
  };


  const handleStartWriting = async () => {
    if (!activeWork || researchedFichas.length === 0) {
      toast({ title: "Erro", description: "Realize a pesquisa (fichamento) primeiro ou certifique-se de que há fichas disponíveis.", variant: "destructive" });
      return;
    }
    setIsWriting(true);
    setWritingLog([`Iniciando desenvolvimento do trabalho: ${activeWork.title}`]);
    setWritingProgress(0);
    setGeneratedFullText('');
    
    // Simulate index generation
    addWritingLog("Gerando índice do trabalho... (simulado)");
    await new Promise(resolve => setTimeout(resolve, 500));
    const simulatedIndex = ["Introdução", `Desenvolvimento sobre ${detectedTopic || activeWork.theme}`, "Discussão dos Resultados", "Conclusão", "Referências Bibliográficas"];
    setWritingTotalSections(simulatedIndex.length);
    addWritingLog(`Índice gerado com ${simulatedIndex.length} seções.`);

    let currentFullText = "";
    const newSections: AcademicWorkSection[] = [];

    for (let i = 0; i < simulatedIndex.length; i++) {
        const sectionTitle = simulatedIndex[i];
        setWritingCurrentSection(i + 1);
        setWritingProgress(((i + 1) / simulatedIndex.length) * 100);
        addWritingLog(`Escrevendo seção ${i+1}/${simulatedIndex.length}: "${sectionTitle}"... (simulado)`);
        
        // Simulate API call to generate section content
        await new Promise(resolve => setTimeout(resolve, 2000));
        const sectionContent = `## ${sectionTitle}\n\nEste é o conteúdo simulado para a seção "${sectionTitle}". Ele seria gerado pela IA com base nas fichas (${researchedFichas.length} disponíveis) e no tema "${detectedTopic || activeWork.theme}".\n\nPor exemplo, um parágrafo poderia discutir ${researchedFichas[0]?.palavrasChave.join(', ')}.\n\nOutro parágrafo poderia aprofundar um aspecto específico. \n\nE assim por diante, incluindo citações como ${researchedFichas[0]?.citacoesRelevantes[0] || "(Autor, Ano)"}.\n\n`;
        
        currentFullText += sectionContent + "\n\n";
        setGeneratedFullText(currentFullText);
        newSections.push({ title: sectionTitle, content: sectionContent });
        addWritingLog(`✅ Seção "${sectionTitle}" escrita.`);
    }

    onUpdateWork({ ...activeWork, sections: newSections, fullGeneratedText: currentFullText, lastUpdatedAt: Date.now() });
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
    <div className="flex flex-col h-full p-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Criador de Trabalhos Acadêmicos</CardTitle>
          <CardDescription>Defina o tema, pesquise e desenvolva seu trabalho acadêmico.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="work-title">Tema Principal / Título Provisório do Trabalho:</Label>
            <ShadInput 
              id="work-title" 
              value={workTitle} 
              onChange={(e) => setWorkTitle(e.target.value)}
              placeholder="Ex: O impacto da Inteligência Artificial na Educação Superior"
              disabled={isResearching || isWriting}
            />
          </div>
          {/* Add selects for targetLanguage and citationStyle later */}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Research Panel */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">1. Pesquisa e Fichamento</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            <Button onClick={handleStartResearch} disabled={isResearching || isWriting || !workTitle.trim()} className="w-full">
              {isResearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              {isResearching ? `Pesquisando ${researchCurrentPage}/${researchTotalPages}...` : 'Iniciar Pesquisa (até 10 fontes)'}
            </Button>
            {isResearching && <Progress value={researchProgress} className="w-full" />}
            <Label>Log da Pesquisa:</Label>
            <ScrollArea className="h-40 w-full rounded-md border p-2 text-xs">
              {researchLog.map((log, i) => <div key={i}>{log}</div>)}
            </ScrollArea>
            <Label>Fichas Geradas ({researchedFichas.length}):</Label>
             <ScrollArea className="h-40 w-full rounded-md border p-2 text-xs">
              {researchedFichas.length === 0 && !isResearching && <div>Nenhuma ficha gerada ainda.</div>}
              {researchedFichas.map((ficha, i) => (
                <details key={i} className="mb-1 p-1 border-b">
                    <summary className="font-semibold cursor-pointer">{ficha.titulo}</summary>
                    <p className="mt-1 text-muted-foreground"><strong>Autor:</strong> {ficha.autor}</p>
                    <p className="text-muted-foreground"><strong>Resumo:</strong> {ficha.resumo.substring(0,100)}...</p>
                </details>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Writing Panel */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">2. Desenvolvimento do Trabalho</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
             <Button onClick={handleStartWriting} disabled={isWriting || isResearching || researchedFichas.length === 0} className="w-full">
              {isWriting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              {isWriting ? `Escrevendo ${writingCurrentSection}/${writingTotalSections}...` : 'Iniciar Desenvolvimento'}
            </Button>
            {isWriting && <Progress value={writingProgress} className="w-full" />}
            <Label>Log do Desenvolvimento:</Label>
            <ScrollArea className="h-40 w-full rounded-md border p-2 text-xs">
                {writingLog.map((log, i) => <div key={i}>{log}</div>)}
            </ScrollArea>
            <Label>Conteúdo Gerado (Prévia):</Label>
            <ScrollArea className="h-40 w-full rounded-md border p-2">
                {generatedFullText ? (
                    <MarkdownWithCode content={generatedFullText.substring(0, 500) + (generatedFullText.length > 500 ? "..." : "")} />
                ) : (
                    <div className="text-xs text-muted-foreground">Nenhum conteúdo gerado ainda.</div>
                )}
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <MarkdownToDocx 
                markdownContent={generatedFullText} 
                fileName={`Trabalho_${activeWork?.title.replace(/\s/g, '_') || 'Academico'}`} 
                disabled={!generatedFullText || isWriting || isResearching}
            />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}


    