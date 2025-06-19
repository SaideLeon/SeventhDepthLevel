
import { Groq } from 'groq-sdk';
import type { ConteudoRaspado, FichaLeitura, ImagemConteudo } from '../../types'; // Adjusted import
import { env } from "@/lib/env";

const apiKey = env.GROQ_API_KEY;

if (!apiKey) {
  console.warn('⚠️ GROQ_API_KEY não está definida. O agente de fichamento Groq não funcionará.');
}

const groq = new Groq({ apiKey: apiKey || "MISSING_API_KEY" }); // Provide a fallback for initialization

async function gerarResumoIA(texto: string, titulo: string, promptCustomizado?: string): Promise<string> {
  if (!apiKey) {
    console.warn("⚠️ Sem API Key da Groq. Retornando resumo simples para fichamento.");
    return texto.slice(0, 500) + (texto.length > 500 ? '...' : '');
  }
  const promptBase = promptCustomizado ||
    `Resuma o texto abaixo em até 5 frases, destacando os pontos mais relevantes para uso em trabalhos acadêmicos, como conceitos centrais, argumentos do autor, contribuições teóricas ou críticas principais.`;
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado em criar resumos didáticos e objetivos para fichas de leitura acadêmica. Seu papel é extrair e sintetizar as ideias centrais de textos de forma clara, coerente e útil para a elaboração de trabalhos acadêmicos. O resumo deve servir como base para análise, discussão e referência teórica."
        },
        {
          role: "user",
          content: `${promptBase}\nTítulo: ${titulo}\nTexto: ${texto}`
        }
      ],
      model: 'llama3-8b-8192', // Updated model to a more common one, user can adjust
      temperature: 0.7,
      max_tokens: 400, // Groq uses max_tokens
      top_p: 1,
      // stream: false, // stream is default false
    });
    return chatCompletion.choices[0]?.message?.content?.trim() || '';
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'message' in e) {
      console.warn('⚠️ Erro ao gerar resumo com IA (Groq):', (e as any).message);
    } else {
      console.warn('⚠️ Erro ao gerar resumo com IA (Groq):', e);
    }
    return texto.slice(0, 500) + (texto.length > 500 ? '...' : '');
  }
}

async function criarFichaLeitura(conteudo: ConteudoRaspado, promptCustomizado?: string): Promise<FichaLeitura> {
  const resumoGerado = await gerarResumoIA(conteudo.conteudo, conteudo.titulo, promptCustomizado);
  return {
    url: conteudo.url,
    titulo: conteudo.titulo,
    autor: conteudo.autor,
    imagens: conteudo.imagens as ImagemConteudo[] | undefined, // Cast if necessary
    resumo: resumoGerado,
    citacao: conteudo.citacao, // This field comes from ConteudoRaspado; if not present in raspagem, it will be undefined
  };
}

export { criarFichaLeitura, gerarResumoIA };
// No need to export types FichaLeitura, ConteudoRaspado from here if defined in ../../types
