
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input as ShadInput } from '@/components/ui/input'; // Renomeado para evitar conflito com HTML input
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from "@/components/ui/progress";
import { Loader2, SendHorizontal, Paperclip, Sparkles, BookCheck, FileText as FileTextIcon } from 'lucide-react';
import MarkdownToDocx from '@/components/MarkdownToDocx';
import { useToast } from "@/hooks/use-toast";
import { MarkdownWithCode } from '@/components/Markdown/MarkdownWithCode';
import type { SearchResult } from "@/utils/raspagem"; 
import type { DetectTopicFromTextOutput } from "@/ai/flows/detect-topic-flow";
import type { FichaLeitura, ConteudoRaspado } from "@/types";
import type { GenerateIndexOutput } from "@/ai/flows/generate-index-flow";
import type { GenerateIntroductionOutput } from "@/ai/flows/generate-introduction-flow";
import type { GenerateAcademicSectionOutput, GenerateAcademicSectionInput } from "@/ai/flows/generate-academic-section-flow";
import type { GenerateConclusionOutput } from "@/ai/flows/generate-conclusion-flow";
import type { GenerateBibliographyOutput } from "@/ai/flows/generate-bibliography-flow";
import { BookMarked } from 'lucide-react';


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
  
  const [isWriting, setIsWriting] = useState(false);
  const [writingProgress, setWritingProgress] = useState(0);
  const [writingCurrentLogItem, setWritingCurrentLogItem] = useState("");
  
  const [currentDetectedTopic, setCurrentDetectedTopic] = useState<string | null>(null);
  const [researchedFichas, setResearchedFichas] = useState<FichaLeitura[]>([]);
  const [generatedIndex, setGeneratedIndex] = useState<string[]>([]);
  const [developedSections, setDevelopedSections] = useState<AcademicWorkSection[]>([]);
  const [generatedFullText, setGeneratedFullText] = useState<string | null>(null);
  const [researchLog, setResearchLog] = useState<string[]>([]);
  const [writingLog, setWritingLog] = useState<string[]>([]);

  const [startFichamentoChain, setStartFichamentoChain] = useState(false);
  const [fichamentoCompleted, setFichamentoCompleted] = useState(false);
  const [startWritingChain, setStartWritingChain] = useState(false);

  const isLoading = isResearching || isWriting;

  const scrollToBottom = useCallback(() => {
    if (workAreaRef.current) {
      workAreaRef.current.scrollTop = workAreaRef.current.scrollHeight;
    }
  }, []);

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
    scrollToBottom();
  }, [researchLog, writingLog, generatedFullText, researchedFichas, scrollToBottom]);


  useEffect(() => {
    if (activeWork) {
        // Only set workThemeInput if activeWork.id changes AND no process is active/starting
        // This prevents overwriting user input during an ongoing operation or on minor prop updates
        const currentWorkIdInDataAttr = (workAreaRef.current as HTMLDivElement & { dataset: { currentWorkId?: string } })?.dataset?.currentWorkId;
        if (activeWork.id !== currentWorkIdInDataAttr && !isLoading && !startFichamentoChain && !startWritingChain && !fichamentoCompleted) {
            setWorkThemeInput(activeWork.theme || ''); 
            if (workAreaRef.current) {
                (workAreaRef.current as HTMLDivElement & { dataset: { currentWorkId?: string } }).dataset.currentWorkId = activeWork.id;
            }
        }
        
        setResearchedFichas(activeWork.fichas || []);
        setGeneratedFullText(activeWork.fullGeneratedText || null);
        setGeneratedIndex(activeWork.generatedIndex || []);
        setDevelopedSections(activeWork.sections || []);
        setResearchLog(activeWork.researchLog || []);
        setWritingLog(activeWork.writingLog || []);
        setCurrentDetectedTopic(activeWork.detectedTopic || null);
        
        // Reset flags if the active work itself changes, to avoid auto-starting processes for a newly selected work
        if (activeWork.id !== currentWorkIdInDataAttr) {
            setIsResearching(false);
            setIsWriting(false);
            setStartFichamentoChain(false);
            setFichamentoCompleted(false);
            setStartWritingChain(false);
        }

    } else {
      setWorkThemeInput('');
      setResearchedFichas([]);
      setGeneratedFullText(null);
      setGeneratedIndex([]);
      setDevelopedSections([]);
      setResearchLog([]);
      setWritingLog([]);
      setCurrentDetectedTopic(null);
      setStartFichamentoChain(false);
      setFichamentoCompleted(false);
      setStartWritingChain(false);
      if (workAreaRef.current) {
        (workAreaRef.current as HTMLDivElement & { dataset: { currentWorkId?: string } }).dataset.currentWorkId = undefined;
      }
    }
  }, [activeWork, isLoading, startFichamentoChain, startWritingChain, fichamentoCompleted]);

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
    setResearchedFichas([]);
    // Do not clear researchLog here, addResearchLog will append
    addResearchLog(`Iniciando pesquisa para o tema: "${themeForResearch}"`);
    setResearchProgress(0);
    setResearchCurrentStep(0);
    setResearchTotalSteps(0);
    // setCurrentDetectedTopic(null); // Keep previous detected topic if re-researching same theme maybe? Or clear? Cleared by handleInitiateFullProcess.

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
        throw new Error(`Falha ao detectar tópico: ${errorData.details || errorData.error || topicResponse.statusText}`);
      }
      const topicResult: DetectTopicFromTextOutput = await topicResponse.json();
      if (topicResult.detectedTopic) {
        effectiveSearchTopic = topicResult.detectedTopic;
        setCurrentDetectedTopic(effectiveSearchTopic);
        addResearchLog(`✅ Tópico detectado para pesquisa: "${effectiveSearchTopic}"`);
      } else {
        addResearchLog(`⚠️ Não foi possível refinar o tópico. Usando o tema original: "${effectiveSearchTopic}"`);
        setCurrentDetectedTopic(effectiveSearchTopic); // Use original theme if detection yields nothing
      }
    } catch (error: any) {
      addResearchLog(`❌ Erro ao detectar tópico: ${error.message}. Usando tema original.`);
      setCurrentDetectedTopic(effectiveSearchTopic); // Fallback to original theme on error
    }
    setResearchProgress(10);
    if (activeWork) { // Ensure activeWork exists
        onUpdateWork({ ...activeWork, detectedTopic: effectiveSearchTopic, theme: themeForResearch, title: activeWork.title || themeForResearch, researchLog: researchLog, lastUpdatedAt: Date.now() });
    }


    addResearchLog(`Buscando até 10 artigos para: "${effectiveSearchTopic}"...`);
    let searchResults: SearchResult[] = [];
    try {
      const scraperSearchResponse = await fetch('/api/raspagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termoBusca: effectiveSearchTopic, todasPaginas: true, maxPaginas: 3 }), // Fetch more initially, then slice
      });
      if (!scraperSearchResponse.ok) {
         const errorData = await scraperSearchResponse.json().catch(() => ({}));
        throw new Error(`Falha ao buscar artigos: ${errorData.error || scraperSearchResponse.statusText}`);
      }
      const allSearchResults: SearchResult[] = await scraperSearchResponse.json();
      searchResults = allSearchResults.slice(0, 10); // Limit to 10
      addResearchLog(`🔗 ${searchResults.length} artigos encontrados para processamento.`);
      if (searchResults.length === 0) {
        addResearchLog('Nenhum artigo encontrado. Tente um tema diferente.');
        setIsResearching(false);
        setResearchProgress(100);
        setFichamentoCompleted(true); 
        if (activeWork) onUpdateWork({ ...activeWork, researchLog: researchLog, fichas: [], lastUpdatedAt: Date.now() });
        return;
      }
    } catch (error: any) {
      addResearchLog(`❌ Erro ao buscar artigos: ${error.message}`);
      setIsResearching(false);
      setResearchProgress(100);
       if (activeWork) onUpdateWork({ ...activeWork, researchLog: researchLog, lastUpdatedAt: Date.now() });
      return;
    }
    setResearchTotalSteps(searchResults.length);
    setResearchProgress(20);

    const fetchedFichas: FichaLeitura[] = [];
    for (let i = 0; i < searchResults.length; i++) {
      const article = searchResults[i];
      setResearchCurrentStep(i + 1);
      const currentProgressStep = 20 + ((i + 1) / searchResults.length) * 70; // 70% of progress for fichamento
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
        const pageContent: ConteudoRaspado = await contentResponse.json();
        if (pageContent.erro || !pageContent.conteudo) {
            addResearchLog(`⚠️ Conteúdo não encontrado ou erro ao raspar: "${article.titulo.substring(0,50)}...". Pulando.`);
            continue;
        }

        addResearchLog(`⚙️ Gerando ficha para "${pageContent.titulo || article.titulo}" (Usando Groq)...`);
        
        const fichamentoInputAPIBody = {
          conteudo: pageContent,
        };

        const fichamentoResponse = await fetch('/api/fichamento', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(fichamentoInputAPIBody)
        });

        if(!fichamentoResponse.ok) {
            const errorData = await fichamentoResponse.json().catch(() => ({ error: "Erro desconhecido", details: "Não foi possível analisar a resposta de erro do servidor." }));
            throw new Error(`Falha ao gerar ficha (Groq): ${errorData.details || errorData.error || fichamentoResponse.statusText}`);
        }
        const fichaGerada: FichaLeitura = await fichamentoResponse.json();
        
        fetchedFichas.push(fichaGerada);
        setResearchedFichas(prev => [...prev, fichaGerada]); // Update UI immediately
        addResearchLog(`✅ Ficha (Groq) para "${fichaGerada.titulo.substring(0,50)}..." criada.`);

      } catch (error: any) {
        addResearchLog(`❌ Erro ao processar artigo "${article.titulo.substring(0,50)}...": ${error.message}`);
      }
    }
    
    if (activeWork) { // Ensure activeWork exists
        onUpdateWork({ ...activeWork, fichas: fetchedFichas, researchLog: [...researchLog, `📚 Fichamento (Groq) concluído. ${fetchedFichas.length} fichas geradas.`], lastUpdatedAt: Date.now() });
    }
    addResearchLog(`📚 Fichamento (Groq) concluído. ${fetchedFichas.length} fichas geradas.`);
    setResearchProgress(100);
    setIsResearching(false);
    setFichamentoCompleted(true);
  }, [activeWork, onUpdateWork, targetLanguage, toast, addResearchLog, researchLog]); // Added researchLog


  const handleStartWriting = useCallback(async () => {
    if (!activeWork) {
      toast({ title: "Erro", description: "Nenhum trabalho acadêmico ativo para iniciar o desenvolvimento.", variant: "destructive" });
      setIsWriting(false);
      return;
    }

    const finalThemeForWriting = currentDetectedTopic || activeWork.theme;

    if (!finalThemeForWriting) {
        toast({ title: "Erro", description: "O tema principal do trabalho não está definido. Por favor, insira um tema no campo abaixo e inicie o processo.", variant: "destructive" });
        setIsWriting(false);
        return;
    }

    if (researchedFichas.length === 0 && !activeWork.fullGeneratedText) { // Check activeWork.fullGeneratedText for resuming
      addWritingLog("⚠️ Não há fichas de leitura para basear o desenvolvimento. O texto será gerado com conhecimento geral.");
      toast({ title: "Aviso", description: "Não há fichas de leitura. O texto será gerado com conhecimento geral.", variant: "default" });
    }

    setIsWriting(true);
    // Do not clear writingLog here, addWritingLog will append
    addWritingLog(`Iniciando desenvolvimento do trabalho: "${activeWork.title || finalThemeForWriting}"`);
    setWritingProgress(0);
    // Do not reset generatedFullText or developedSections if resuming or continuing
    // setGeneratedFullText(''); 
    // setDevelopedSections([]);
    
    let tempGeneratedIndexTitles: string[] = generatedIndex.length > 0 ? generatedIndex : []; // Use existing index if available

    if (tempGeneratedIndexTitles.length === 0) { // Only generate index if not already present
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
            tempGeneratedIndexTitles = indexResult.generatedIndex;
            setGeneratedIndex(tempGeneratedIndexTitles);
            addWritingLog(`📑 Índice gerado com ${tempGeneratedIndexTitles.length} seções: ${tempGeneratedIndexTitles.join(', ')}`);
        } catch (error: any) {
            addWritingLog(`❌ Erro ao gerar índice: ${error.message}. Usando estrutura padrão.`);
            tempGeneratedIndexTitles = ["Introdução", `Desenvolvimento sobre ${finalThemeForWriting}`, "Conclusão", "Referências Bibliográficas"];
            setGeneratedIndex(tempGeneratedIndexTitles);
        }
    } else {
        addWritingLog(`📑 Usando índice existente com ${tempGeneratedIndexTitles.length} seções.`);
    }

    setWritingProgress(10);
    if (activeWork) {
        onUpdateWork({ ...activeWork, generatedIndex: tempGeneratedIndexTitles, writingLog: writingLog, lastUpdatedAt: Date.now() });
    }

    let tempFullText = generatedFullText || `# ${activeWork.title || finalThemeForWriting}\n\n`; // Start with existing or new title
    // setGeneratedFullText(tempFullText); // This will be updated progressively
    
    const tempDevelopedSections: AcademicWorkSection[] = [...developedSections]; // Start with existing sections

    for (let i = 0; i < tempGeneratedIndexTitles.length; i++) {
        const sectionTitle = tempGeneratedIndexTitles[i];
        
        // Skip if section already exists and has content
        const existingSection = tempDevelopedSections.find(s => s.title === sectionTitle);
        if (existingSection && existingSection.content.trim() !== "" && !existingSection.content.includes("não pôde ser gerado")) {
            addWritingLog(`⏭️ Pulando seção já existente: "${sectionTitle}"`);
            const currentProgressStep = 10 + ((i + 1) / tempGeneratedIndexTitles.length) * 85;
            setWritingProgress(currentProgressStep);
            continue;
        }

        const currentProgressStep = 10 + ((i + 1) / tempGeneratedIndexTitles.length) * 85;
        setWritingProgress(currentProgressStep);
        addWritingLog(`✍️ Escrevendo seção ${i+1}/${tempGeneratedIndexTitles.length}: "${sectionTitle}"...`);
        
        let sectionContent = "";
        try {
            const sectionTitleLower = sectionTitle.toLowerCase();
            let response;
            if (sectionTitleLower.includes("introdução")) {
                response = await fetch('/api/generate-introduction', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ mainTopic: finalThemeForWriting, generatedIndex: tempGeneratedIndexTitles, targetLanguage })
                });
                if (!response.ok) { const err = await response.json(); throw new Error(err.details || err.error || "Erro desconhecido ao gerar introdução"); }
                const result: GenerateIntroductionOutput = await response.json();
                sectionContent = result.introduction;
            } else if (sectionTitleLower.includes("conclusão")) {
                const introContent = tempDevelopedSections.find(s => s.title.toLowerCase().includes("introdução"))?.content;
                const coreSections = tempDevelopedSections.filter(s => 
                    !s.title.toLowerCase().includes("introdução") &&
                    !s.title.toLowerCase().includes("conclusão") &&
                    !s.title.toLowerCase().includes("bibliografia") &&
                    !s.title.toLowerCase().includes("referências")
                );
                response = await fetch('/api/generate-conclusion', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ mainTopic: finalThemeForWriting, introductionContent: introContent, developedSectionsContent: coreSections, targetLanguage})
                });
                 if (!response.ok) { const err = await response.json(); throw new Error(err.details || err.error || "Erro desconhecido ao gerar conclusão"); }
                const result: GenerateConclusionOutput = await response.json();
                sectionContent = result.conclusion;
            } else if (sectionTitleLower.includes("bibliografia") || sectionTitleLower.includes("referências")) {
                const fichasForBiblio = researchedFichas.map(f => ({
                    url: f.url,
                    titulo: f.titulo,
                    autor: f.autor,
                    anoPublicacao: f.anoPublicacao || 's.d.', 
                    palavrasChave: f.palavrasChave || [], 
                }));
                 response = await fetch('/api/generate-bibliography', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ fichasDeLeitura: fichasForBiblio, citationStyle, targetLanguage })
                });
                 if (!response.ok) { const err = await response.json(); throw new Error(err.details || err.error || "Erro desconhecido ao gerar bibliografia"); }
                const result: GenerateBibliographyOutput = await response.json();
                sectionContent = result.bibliography;
            } else { 
                const fichasForSection = researchedFichas.map(f => ({
                    url: f.url,
                    titulo: f.titulo,
                    autor: f.autor,
                    anoPublicacao: f.anoPublicacao || 's.d.',
                    palavrasChave: f.palavrasChave || [],
                    resumo: f.resumo,
                    citacoesRelevantes: f.citacao ? [f.citacao] : (f.citacoesRelevantes || []),
                }));
                const sectionInput: GenerateAcademicSectionInput = {
                    sectionTitle,
                    mainTopic: finalThemeForWriting,
                    fichasDeLeitura: fichasForSection,
                    completedSections: tempDevelopedSections.filter(s => s.title !== sectionTitle), // Pass previously completed sections
                    targetLanguage,
                    citationStyle,
                    wordCountTarget: 500
                };
                 response = await fetch('/api/generate-academic-section', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(sectionInput)
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
        
        // Update or add section
        const existingSectionIndex = tempDevelopedSections.findIndex(s => s.title === sectionTitle);
        if (existingSectionIndex > -1) {
            tempDevelopedSections[existingSectionIndex] = currentSection;
        } else {
            tempDevelopedSections.push(currentSection);
        }
        setDevelopedSections([...tempDevelopedSections]); // Update UI immediately

        // Reconstruct full text based on index order
        tempFullText = `# ${activeWork.title || finalThemeForWriting}\n\n`;
        tempGeneratedIndexTitles.forEach(title => {
            const section = tempDevelopedSections.find(s => s.title === title);
            if (section) {
                tempFullText += `## ${section.title}\n\n${section.content}\n\n`;
            }
        });
        setGeneratedFullText(tempFullText);
        addWritingLog(`✅ Seção "${sectionTitle}" escrita.`);

        if (activeWork) {
            onUpdateWork({ ...activeWork, sections: [...tempDevelopedSections], fullGeneratedText: tempFullText, writingLog: writingLog, lastUpdatedAt: Date.now() });
        }
    }

    addWritingLog("🎉 Desenvolvimento do trabalho concluído!");
    setWritingProgress(100);
    setIsWriting(false);
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
  }, [activeWork, onUpdateWork, currentDetectedTopic, researchedFichas, targetLanguage, citationStyle, toast, addWritingLog, writingLog, generatedIndex, developedSections, generatedFullText]); // Added dependencies


  useEffect(() => {
    if (startFichamentoChain && activeWork && activeWork.theme && !isLoading && !isResearching) {
        const themeToUse = activeWork.theme;
        if(themeToUse) {
            handleStartResearch(themeToUse);
        } else {
            addResearchLog("⚠️ Tema do trabalho não definido. Não é possível iniciar a pesquisa.");
            toast({ title: "Tema Ausente", description: "O tema do trabalho precisa ser definido para iniciar a pesquisa.", variant: "destructive"});
        }
        setStartFichamentoChain(false);
    }
  }, [startFichamentoChain, activeWork, isLoading, isResearching, handleStartResearch, addResearchLog, toast]);

  useEffect(() => {
    if (fichamentoCompleted && !isResearching && !isWriting) {
      if (researchedFichas.length > 0) {
        setStartWritingChain(true);
      } else {
        addWritingLog("⚠️ Pesquisa concluída, mas nenhuma ficha foi gerada. Desenvolvimento automático não iniciado.");
        toast({
            title: "Pesquisa Incompleta",
            description: "Nenhuma ficha de leitura foi gerada. Não é possível iniciar o desenvolvimento do texto automaticamente.",
            variant: "default",
        });
      }
      setFichamentoCompleted(false); 
    }
  }, [fichamentoCompleted, isResearching, isWriting, researchedFichas, addWritingLog, toast]);

  useEffect(() => {
    if (startWritingChain && !isLoading && !isWriting) {
      handleStartWriting();
      setStartWritingChain(false);
    }
  }, [startWritingChain, isLoading, isWriting, handleStartWriting]);


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
    
    setResearchedFichas([]);
    setGeneratedIndex([]);
    setDevelopedSections([]);
    setGeneratedFullText(null);
    setResearchLog([`Iniciando processo completo para: "${themeToUse}"`]); // Initialize with this message
    setWritingLog([]);
    setCurrentDetectedTopic(null); 
    setResearchProgress(0);
    setWritingProgress(0);
    setIsResearching(false); 
    setIsWriting(false);
    
    const updatedWorkData: AcademicWork = { 
      ...activeWork, 
      theme: themeToUse, 
      title: activeWork.title && !activeWork.title.startsWith("Novo Trabalho") ? activeWork.title : themeToUse, // Use existing title if not default, else use new theme
      fichas: [], 
      sections: [], 
      fullGeneratedText: "", 
      generatedIndex: [], 
      researchLog: [`Iniciando processo completo para: "${themeToUse}"`], 
      writingLog: [],
      detectedTopic: null, 
      lastUpdatedAt: Date.now() 
    };
    onUpdateWork(updatedWorkData); 
    
    setStartFichamentoChain(true);
    
    if (!themeOverride) {
        setWorkThemeInput("");
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
  const hasAnyContent = researchedFichas.length > 0 || generatedFullText;
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
            <div className="text-xs space-y-1 p-2 border rounded-md bg-card shadow-sm max-h-60 overflow-y-auto">
              <h3 className="font-semibold text-sm mb-1 text-primary sticky top-0 bg-card/80 backdrop-blur-sm py-1">Log da Pesquisa:</h3>
              {researchLog.map((log, i) => <div key={`rl-${activeWork.id}-${i}`}>{log}</div>)}
               {isResearching && (
                <div className="sticky bottom-0 bg-card/80 backdrop-blur-sm p-1 rounded">
                    <Progress value={researchProgress} className="w-full h-1.5" />
                    <p className="text-xs text-muted-foreground text-center mt-0.5">Etapa {researchCurrentStep} de {researchTotalSteps}</p>
                </div>
                )}
            </div>
          )}

          {researchedFichas.length > 0 && (
            <div className="text-xs space-y-1 p-2 border rounded-md bg-card shadow-sm max-h-72 overflow-y-auto">
              <h3 className="font-semibold text-sm mb-1 text-primary sticky top-0 bg-card/80 backdrop-blur-sm py-1">Fichas de Leitura Geradas ({researchedFichas.length}):</h3>
              {researchedFichas.map((ficha, i) => (
                <details key={`ficha-${activeWork.id}-${i}`} className="mb-1 p-1.5 border-b border-border last:border-b-0">
                    <summary className="font-medium cursor-pointer text-primary/90 hover:underline text-xs">{ficha.titulo.substring(0,70)}...</summary>
                    <p className="mt-0.5 text-muted-foreground text-[11px]"><strong>Autor:</strong> {ficha.autor || "N/A"}</p>
                    <p className="text-muted-foreground text-[11px]"><strong>Resumo:</strong> {ficha.resumo.substring(0,120)}...</p>
                    {ficha.citacao && <p className="text-muted-foreground text-[11px]"><strong>Citação Principal:</strong> {ficha.citacao.substring(0,100)}...</p>}
                    <a href={ficha.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-[11px]">Ver fonte</a>
                </details>
              ))}
            </div>
          )}
          
          {writingLog.length > 0 && (
             <div className="text-xs space-y-1 p-2 border rounded-md bg-card shadow-sm max-h-60 overflow-y-auto">
              <h3 className="font-semibold text-sm mb-1 text-primary sticky top-0 bg-card/80 backdrop-blur-sm py-1">Log do Desenvolvimento:</h3>
              {writingLog.map((log, i) => <div key={`wl-${activeWork.id}-${i}`}>{log}</div>)}
              {isWriting && (
                <div className="sticky bottom-0 bg-card/80 backdrop-blur-sm p-1 rounded">
                    <Progress value={writingProgress} className="w-full h-1.5" />
                    {writingCurrentLogItem && <p className="text-xs text-muted-foreground text-center mt-0.5 truncate">{writingCurrentLogItem.split(': ').slice(-1)[0]}</p>}
                </div>
                )}
            </div>
          )}

          {generatedFullText && (
            <div className="p-2 border rounded-md bg-card shadow-sm">
                 <div className="flex justify-between items-center mb-2 sticky top-0 bg-card/80 backdrop-blur-sm py-1 z-10">
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

      <div className="p-2 md:p-4 border-t bg-background sticky bottom-0 z-20">
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

