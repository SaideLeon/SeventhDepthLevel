
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input as ShadInput } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from "@/components/ui/progress";
import { Loader2, SendHorizontal, Sparkles, BookCheck, FileText as FileTextLucideIcon, FileText } from 'lucide-react';
import MarkdownToDocx from '@/components/MarkdownToDocx';
import { useToast } from "@/hooks/use-toast";
import { MarkdownWithCode } from '@/components/Markdown/MarkdownWithCode';
import type { SearchResult, PageContent, ImagemConteudo } from "@/utils/raspagem";
import type { DetectTopicFromTextOutput } from "@/ai/flows/detect-topic-flow";
import type { FichaLeitura } from "@/types";
import type { GenerateIndexOutput } from "@/ai/flows/generate-index-flow";
import type { GenerateBibliographyOutput } from "@/ai/flows/generate-bibliography-flow";
import type { GenerateAcademicResponseOutput } from '@/ai/flows/generate-academic-response-flow';
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
    "Estudo do Sistema Digestivo",
    "Importância da fotossíntese na biodiversidade",
    "História da Segunda Guerra Mundial",
    "Efeitos dos Tipos de Clima no Meio Ambiente e na Sociedade"
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
      if (!isLoading && !startFichamentoChain && !startWritingChain && !fichamentoCompleted) {
        if (activeWork.theme && workThemeInput === '') {
          // setWorkThemeInput(activeWork.theme); // Comentado para priorizar input do usuário
        }
      }

      setResearchedFichas(activeWork.fichas || []);
      setGeneratedFullText(activeWork.fullGeneratedText || null);
      setGeneratedIndex(activeWork.generatedIndex || []);
      setDevelopedSections(activeWork.sections || []);
      setResearchLog(activeWork.researchLog || []);
      setWritingLog(activeWork.writingLog || []);
      setCurrentDetectedTopic(activeWork.detectedTopic || null);

      const currentWorkIdInDataAttr = (workAreaRef.current as HTMLDivElement & { dataset: { currentWorkId?: string } })?.dataset?.currentWorkId;
      if (activeWork.id !== currentWorkIdInDataAttr) {
        setIsResearching(false);
        setIsWriting(false);
        setStartFichamentoChain(false);
        setFichamentoCompleted(false);
        setStartWritingChain(false);
        if (workAreaRef.current) {
          (workAreaRef.current as HTMLDivElement & { dataset: { currentWorkId?: string } }).dataset.currentWorkId = activeWork.id;
        }
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
  }, [activeWork, isLoading, startFichamentoChain, startWritingChain, fichamentoCompleted, workThemeInput]);


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
    let currentResearchLogs = [`${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit'})}: Iniciando pesquisa para o tema: "${themeForResearch}"`];
    setResearchLog(currentResearchLogs); // Initial log
    setResearchProgress(0);
    setResearchCurrentStep(0);
    setResearchTotalSteps(0);

    let effectiveSearchTopic = themeForResearch;

    const tempAddResearchLog = (message: string) => {
        const logMsg = `${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit'})}: ${message}`;
        console.log(`[Pesquisa Temp]: ${message}`);
        currentResearchLogs = [...currentResearchLogs.slice(-50), logMsg];
        setResearchLog(currentResearchLogs);
    };


    tempAddResearchLog(`Detectando tópico principal para "${effectiveSearchTopic}"...`);
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
        tempAddResearchLog(`✅ Tópico detectado para pesquisa: "${effectiveSearchTopic}"`);
      } else {
        tempAddResearchLog(`⚠️ Não foi possível refinar o tópico. Usando o tema original: "${effectiveSearchTopic}"`);
        setCurrentDetectedTopic(effectiveSearchTopic);
      }
    } catch (error: any) {
      tempAddResearchLog(`❌ Erro ao detectar tópico: ${error.message}. Usando tema original.`);
      setCurrentDetectedTopic(effectiveSearchTopic);
    }
    setResearchProgress(10);
    if (activeWork) {
        onUpdateWork({ ...activeWork, detectedTopic: effectiveSearchTopic, theme: themeForResearch, title: activeWork.title || themeForResearch, researchLog: currentResearchLogs, lastUpdatedAt: Date.now() });
    }

    tempAddResearchLog(`Buscando até 10 artigos para: "${effectiveSearchTopic}"...`);
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
      tempAddResearchLog(`🔗 ${searchResults.length} artigos encontrados para processamento.`);
      if (searchResults.length === 0) {
        tempAddResearchLog('Nenhum artigo encontrado. Tente um tema diferente.');
        setIsResearching(false);
        setResearchProgress(100);
        setFichamentoCompleted(true);
        if (activeWork) onUpdateWork({ ...activeWork, researchLog: currentResearchLogs, fichas: [], lastUpdatedAt: Date.now() });
        return;
      }
    } catch (error: any) {
      tempAddResearchLog(`❌ Erro ao buscar artigos: ${error.message}`);
      setIsResearching(false);
      setResearchProgress(100);
      if (activeWork) onUpdateWork({ ...activeWork, researchLog: currentResearchLogs, lastUpdatedAt: Date.now() });
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
      tempAddResearchLog(`📄 Processando artigo ${i + 1}/${searchResults.length}: "${article.titulo.substring(0,50)}..."`);

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
            tempAddResearchLog(`⚠️ Conteúdo não encontrado ou erro ao raspar: "${article.titulo.substring(0,50)}...". Pulando.`);
            continue;
        }

        tempAddResearchLog(`⚙️ Gerando ficha para "${pageContent.titulo || article.titulo}" (Usando Groq)...`);

        const fichamentoInputAPIBody = {
          conteudo: pageContent, // pageContent is ConteudoRaspado
        };

        const fichamentoResponse = await fetch('/api/fichamento', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(fichamentoInputAPIBody)
        });

        if(!fichamentoResponse.ok) {
            const errorData = await fichamentoResponse.json().catch(() => ({ error: "Erro desconhecido", details: "Não foi possível analisar a resposta de erro do servidor." }));
            throw new Error(`Falha ao gerar ficha ${errorData.details || errorData.error || fichamentoResponse.statusText}`);
        }
        const fichaGerada: FichaLeitura = await fichamentoResponse.json();

        fetchedFichas.push(fichaGerada);
        setResearchedFichas(prev => [...prev, fichaGerada]);
        tempAddResearchLog(`✅ Ficha para "${fichaGerada.titulo.substring(0,50)}..." criada.`);

      } catch (error: any) {
        tempAddResearchLog(`❌ Erro ao processar artigo "${article.titulo.substring(0,50)}...": ${error.message}`);
      }
    }

    tempAddResearchLog(`📚 Fichamento concluído. ${fetchedFichas.length} fichas geradas.`);
    if (activeWork) {
        onUpdateWork({ ...activeWork, fichas: fetchedFichas, researchLog: currentResearchLogs, lastUpdatedAt: Date.now() });
    }
    setResearchProgress(100);
    setIsResearching(false);
    setFichamentoCompleted(true);
  }, [activeWork, onUpdateWork, targetLanguage, toast]);


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

    setIsWriting(true);
    let currentWritingLogs = [`${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit'})}: Iniciando desenvolvimento do trabalho: "${activeWork.title || finalThemeForWriting}"`];
    setWritingLog(currentWritingLogs);
    setWritingProgress(0);

    const tempAddWritingLog = (message: string) => {
        const logMessage = `${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit'})}: ${message}`;
        console.log(`[Desenvolvimento Temp]: ${message}`);
        currentWritingLogs = [...currentWritingLogs.slice(-50), logMessage];
        setWritingCurrentLogItem(logMessage); // Para UI
        setWritingLog(currentWritingLogs); // Para persistência
    };

    let tempGeneratedIndexTitles: string[] = generatedIndex.length > 0 ? generatedIndex : [];

    if (tempGeneratedIndexTitles.length === 0) {
        try {
            tempAddWritingLog("⚙️ Gerando índice do trabalho...");
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
            tempAddWritingLog(`📑 Índice gerado com ${tempGeneratedIndexTitles.length} seções: ${tempGeneratedIndexTitles.join(', ')}`);
        } catch (error: any) {
            tempAddWritingLog(`❌ Erro ao gerar índice: ${error.message}. Usando estrutura padrão.`);
            tempGeneratedIndexTitles = ["Introdução", `Desenvolvimento sobre ${finalThemeForWriting}`, "Conclusão", "Referências Bibliográficas"];
            setGeneratedIndex(tempGeneratedIndexTitles);
        }
    } else {
        tempAddWritingLog(`📑 Usando índice existente com ${tempGeneratedIndexTitles.length} seções.`);
    }

    setWritingProgress(10);
    if (activeWork) {
        onUpdateWork({ ...activeWork, generatedIndex: tempGeneratedIndexTitles, writingLog: currentWritingLogs, lastUpdatedAt: Date.now() });
    }

    let tempFullText = "";
    const tempDevelopedSections: AcademicWorkSection[] = developedSections.length > 0 ? [...developedSections] : [];

    for (let i = 0; i < tempGeneratedIndexTitles.length; i++) {
        const sectionTitle = tempGeneratedIndexTitles[i];
        const currentProgressStep = 10 + ((i + 1) / tempGeneratedIndexTitles.length) * 85;
        setWritingProgress(currentProgressStep);
        tempAddWritingLog(`✍️ Escrevendo seção ${i+1}/${tempGeneratedIndexTitles.length}: "${sectionTitle}"...`);

        let sectionContent = "";
        try {
            const sectionTitleLower = sectionTitle.toLowerCase();
            let apiResponse;

            if (sectionTitleLower.includes("referências") || sectionTitleLower.includes("bibliografia")) {
                const fichasForBiblio = researchedFichas.map(f => ({
                    url: f.url,
                    titulo: f.titulo,
                    autor: f.autor,
                    anoPublicacao: f.anoPublicacao || 's.d.',
                    palavrasChave: f.palavrasChave || [],
                }));
                 apiResponse = await fetch('/api/generate-bibliography', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ fichasDeLeitura: fichasForBiblio, citationStyle, targetLanguage })
                });
                if (!apiResponse.ok) { const err = await apiResponse.json(); throw new Error(err.details || err.error || "Erro desconhecido ao gerar bibliografia"); }
                const result: GenerateBibliographyOutput = await apiResponse.json();
                sectionContent = result.bibliography;
            } else {
                let prosePrompt = "";
                let contextForProse = "";
                let imageInfoForProse: string | undefined = undefined;

                const formattedFichas = researchedFichas.map((f, idx) =>
                    `Ficha ${idx+1}: Título: ${f.titulo}\nAutor: ${f.autor || 'N/A'}\nAno: ${f.anoPublicacao || 's.d.'}\nResumo: ${f.resumo}\nCitações: ${(f.citacoesRelevantes || [f.citacao || 'N/A']).join('; ')}\nURL: ${f.url}`
                ).join("\n\n---\n\n");

                if (sectionTitleLower.includes("introdução")) {
                    prosePrompt = `Você é um assistente acadêmico. Escreva a INTRODUÇÃO para um trabalho com o tema principal "${finalThemeForWriting}". A estrutura planejada do trabalho (índice) é: ${tempGeneratedIndexTitles.join(', ')}. Contextualize o tema, apresente sua relevância, o objetivo geral do trabalho e descreva brevemente a estrutura que será seguida. Use um tom formal e acadêmico. O idioma é ${targetLanguage}.`;
                    if (formattedFichas) {
                        contextForProse = `Considere as seguintes fichas de leitura como material de base, se relevante para a introdução:\n${formattedFichas}`;
                    }
                } else if (sectionTitleLower.includes("conclusão")) {
                    const introContent = tempDevelopedSections.find(s => s.title.toLowerCase().includes("introdução"))?.content;
                    const coreSectionsContent = tempDevelopedSections
                        .filter(s => !s.title.toLowerCase().includes("introdução") && !s.title.toLowerCase().includes("conclusão") && !s.title.toLowerCase().includes("referências") && !s.title.toLowerCase().includes("bibliografia"))
                        .map(s => `Seção: ${s.title}\n${(s.content || "").substring(0, 500)}...`) // Add guard for s.content
                        .join("\n\n---\n\n");
                    prosePrompt = `Você é um assistente acadêmico. Escreva a CONCLUSÃO para um trabalho com o tema principal "${finalThemeForWriting}". A introdução (se disponível) foi: "${introContent || 'Não fornecida'}". As seções desenvolvidas (resumidas) foram: "${coreSectionsContent || 'Não fornecidas'}". Retome brevemente o tema principal, sumarize as principais descobertas ou argumentos, apresente reflexões finais e, opcionalmente, sugira limitações ou caminhos para pesquisas futuras. Use um tom formal e acadêmico. O idioma é ${targetLanguage}.`;
                } else {
                    prosePrompt = `Você é um assistente acadêmico. Desenvolva o conteúdo para a seção intitulada "${sectionTitle}" de um trabalho sobre "${finalThemeForWriting}". O idioma é ${targetLanguage} e o estilo de citação é ${citationStyle}.`;
                    if (formattedFichas) {
                         prosePrompt += ` Baseie-se PRINCIPALMENTE nas seguintes fichas de leitura, integrando as informações de forma coesa e citando as fontes quando utilizá-las:\n${formattedFichas}`;

                         const imagesFromFichas: string[] = [];
                         researchedFichas.forEach(ficha => {
                            if (ficha.imagens && ficha.imagens.length > 0) {
                                ficha.imagens.forEach((img: ImagemConteudo) => {
                                    imagesFromFichas.push(`${img.legenda || ficha.titulo} (${img.src})`);
                                });
                            }
                         });
                         if (imagesFromFichas.length > 0) {
                            imageInfoForProse = `Imagens de contexto: ${imagesFromFichas.join('; ')}`;
                         }

                    } else {
                        prosePrompt += " Baseie-se no seu conhecimento geral sobre o tema para desenvolver esta seção, pois não foram fornecidas fichas de leitura específicas.";
                    }
                    if (tempDevelopedSections.length > 0) {
                        const previousSectionsSummary = tempDevelopedSections.map(s => `Seção Anterior: ${s.title}\n${(s.content || "").substring(0, 300)}...`).join("\n---\n"); // Add guard for s.content
                        prosePrompt += `\n\nConsidere também o conteúdo das seções já escritas para manter a coerência e evitar repetições desnecessárias:\n${previousSectionsSummary}`;
                    }
                }

                const proseInput = {
                    prompt: prosePrompt,
                    contextContent: contextForProse || ( (sectionTitleLower.includes("desenvolvimento") || (!sectionTitleLower.includes("introdução") && !sectionTitleLower.includes("conclusão"))) && formattedFichas ? formattedFichas : undefined),
                    imageInfo: imageInfoForProse,
                    targetLanguage,
                    citationStyle
                };

                apiResponse = await fetch('/api/generate-academic-prose', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(proseInput)
                });
                if (!apiResponse.ok) {
                    const errText = await apiResponse.text();
                    console.error("Erro API /generate-academic-prose:", errText);
                    let err;
                    try {
                        err = JSON.parse(errText);
                    } catch (parseError) {
                        err = { error: "Erro desconhecido ao gerar conteúdo", details: errText.substring(0, 200) };
                    }
                    throw new Error(err.details || err.error || `Erro desconhecido ao gerar conteúdo para "${sectionTitle}"`);
                }
                const result: GenerateAcademicResponseOutput = await apiResponse.json();
                sectionContent = result.response;
            }
        } catch (error: any) {
            tempAddWritingLog(`❌ Erro ao gerar conteúdo para "${sectionTitle}": ${error.message || String(error)}. Usando placeholder.`);
            sectionContent = `## ${sectionTitle}\n\nConteúdo para "${sectionTitle}" não pôde ser gerado devido a um erro. Por favor, tente novamente ou edite manualmente.`;
        }

        const currentSection: AcademicWorkSection = { title: sectionTitle, content: sectionContent };
        tempDevelopedSections.push(currentSection);
        setDevelopedSections([...tempDevelopedSections]);

        if (sectionTitle.toLowerCase().includes("referências") || sectionTitle.toLowerCase().includes("bibliografia")) {
            tempFullText += `## ${sectionTitle}\n\n${sectionContent}\n\n`;
        } else {
            tempFullText += `${sectionContent}\n\n`;
        }

        setGeneratedFullText(tempFullText);
        tempAddWritingLog(`✅ Seção "${sectionTitle}" escrita.`);

        if (activeWork) {
            onUpdateWork({ ...activeWork, sections: [...tempDevelopedSections], fullGeneratedText: tempFullText, writingLog: currentWritingLogs, lastUpdatedAt: Date.now() });
        }
    }

    tempAddWritingLog("🎉 Desenvolvimento do trabalho concluído!");
    setWritingProgress(100);
    setIsWriting(false);
    if (activeWork) {
      onUpdateWork({
        ...activeWork,
        sections: tempDevelopedSections,
        fullGeneratedText: tempFullText,
        title: activeWork.title || finalThemeForWriting,
        theme: finalThemeForWriting,
        writingLog: currentWritingLogs,
        lastUpdatedAt: Date.now()
      });
    }
  }, [activeWork, onUpdateWork, currentDetectedTopic, researchedFichas, targetLanguage, citationStyle, toast, generatedIndex, developedSections]);


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
    setResearchLog([`${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit'})}: Iniciando processo completo para: "${themeToUse}"`]);
    setWritingLog([]);
    setCurrentDetectedTopic(null);
    setResearchProgress(0);
    setWritingProgress(0);
    setIsResearching(false);
    setIsWriting(false);

    const updatedWorkData: AcademicWork = {
      ...activeWork,
      theme: themeToUse,
      title: (activeWork.title && !activeWork.title.startsWith("Novo Trabalho")) || themeOverride ? (themeOverride || activeWork.title) : themeToUse,
      fichas: [],
      sections: [],
      fullGeneratedText: "",
      generatedIndex: [],
      researchLog: [`${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit'})}: Iniciando processo completo para: "${themeToUse}"`],
      writingLog: [],
      detectedTopic: null,
      lastUpdatedAt: Date.now()
    };
    onUpdateWork(updatedWorkData);

    setStartFichamentoChain(true);

    if (!themeOverride && workThemeInput.trim() === themeToUse) {
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
                    <p className="text-muted-foreground text-[11px]"><strong>Resumo:</strong> {(ficha.resumo || "").substring(0,120)}...</p> {/* Guard against undefined */}
                    {ficha.citacao && <p className="text-muted-foreground text-[11px]"><strong>Citação Principal:</strong> {ficha.citacao.substring(0,100)}...</p>}
                     {ficha.imagens && ficha.imagens.length > 0 && (
                        <div className="mt-1">
                            <p className="text-muted-foreground text-[11px] font-semibold">Imagens:</p>
                            {ficha.imagens.map((img, imgIdx) => (
                                <div key={imgIdx} className="ml-2 my-0.5">
                                    <a href={img.src} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-[10px] truncate block max-w-full">
                                        - {img.legenda || `Imagem ${imgIdx + 1}`} ({img.src.substring(0,40)}...)
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
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

          {generatedFullText && activeWork && (
            <div className="p-2 border rounded-md bg-card shadow-sm">
                 <div className="flex justify-between items-center mb-2 sticky top-0 bg-card/80 backdrop-blur-sm py-1 z-10">
                    <h2 className="font-bold text-lg text-primary">{activeWork.title || workThemeInput || "Trabalho Acadêmico"}</h2>
                    <MarkdownToDocx
                        markdownContent={generatedFullText}
                        fileName={`Cognick_Trabalho_${(activeWork?.title || workThemeInput || 'Academico').replace(/\s+/g, '_').substring(0,30)}`}
                        disabled={!generatedFullText || isLoading}
                    />
                 </div>
                 <h3 className="font-semibold text-sm text-primary">Conteúdo Gerado:</h3>
                <div className="markdown-container prose-sm max-w-none mt-1">
                    <MarkdownWithCode content={generatedFullText} />
                </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-2 md:p-4 border-t bg-background sticky bottom-0 z-20">
        <div className="flex gap-2 items-start">
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
