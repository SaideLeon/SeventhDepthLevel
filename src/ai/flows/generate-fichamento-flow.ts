
'use server';
/**
 * @fileOverview Generates a reading summary (ficha de leitura) from scraped web content.
 *
 * - generateFichamento - A function that initiates the fichamento generation process.
 * - GenerateFichamentoInput - The input type for the generateFichamento function.
 * - GenerateFichamentoOutput (FichaLeitura) - The return type for the generateFichamento function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Based on PageContent from raspagem.ts and FichaLeitura from user's example
const ScrapedContentSchema = z.object({
  url: z.string().describe("The URL of the scraped page."),
  titulo: z.string().describe("The title of the scraped page."),
  conteudo: z.string().describe("The main text content scraped from the page."),
  autor: z.string().optional().describe("The author of the content, if available."),
  dataPublicacao: z.string().optional().describe("Publication date, if available. Should be parsed to extract the year only for 'anoPublicacao'."),
});
export type GenerateFichamentoInput = z.infer<typeof ScrapedContentSchema>;

export const FichaLeituraSchema = z.object({
  url: z.string().describe("URL of the source material."),
  titulo: z.string().describe("Title of the source material."),
  autor: z.string().optional().describe("Author(s) of the source material."),
  anoPublicacao: z.string().optional().describe("Year of publication. Extracted from 'dataPublicacao' or text. Use 's.d.' if not found."),
  palavrasChave: z.array(z.string()).optional().describe("A list of 3-5 main keywords summarizing the content, in the language of the content."),
  resumo: z.string().describe("A concise summary of the content (around 150-250 words, or up to 5 key sentences), highlighting key arguments, concepts, and conclusions relevant for academic research. Must be in the language of the content."),
  citacoesRelevantes: z.array(z.string()).optional().describe("One or two direct short quotes from the text that are particularly relevant or impactful. Must be exact quotes from the provided 'conteudo'."),
  comentariosAdicionais: z.string().optional().describe("Brief personal notes or connections to the main theme of study (optional).")
});
export type FichaLeitura = z.infer<typeof FichaLeituraSchema>;

export async function generateFichamento(input: GenerateFichamentoInput): Promise<FichaLeitura> {
  return generateFichamentoFlow(input);
}

const fichamentoPrompt = ai.definePrompt({
  name: 'generateFichamentoPrompt',
  input: {schema: ScrapedContentSchema},
  output: {schema: FichaLeituraSchema},
  prompt: `Você é um assistente especializado em criar fichas de leitura didáticas e objetivas para fins acadêmicos.
Seu papel é extrair e sintetizar as ideias centrais de textos de forma clara, coerente e útil para a elaboração de trabalhos acadêmicos.
A ficha deve servir como base para análise, discussão e referência teórica.

Analise o seguinte conteúdo raspado de uma página da web:

URL Original: {{{url}}}
Título Original: {{{titulo}}}
Autor Original (se disponível): {{#if autor}}{{{autor}}}{{else}}Não informado{{/if}}
Data de Publicação Original (se disponível): {{#if dataPublicacao}}{{{dataPublicacao}}}{{else}}Não informada{{/if}}

Conteúdo Principal do Texto:
"""
{{{conteudo}}}
"""
---

Sua tarefa é gerar uma "Ficha de Leitura" ESTRITAMENTE com os seguintes campos, preenchendo-os com base no conteúdo fornecido:

1.  **url**: A URL original do material (use o valor de "URL Original" fornecido acima).
2.  **titulo**: O título original do material (use o valor de "Título Original" fornecido acima).
3.  **autor**: O autor original, se disponível no "Autor Original" ou inferível do texto. Caso contrário, deixe em branco ou use "Não informado".
4.  **anoPublicacao**: O ano de publicação. Extraia APENAS O ANO da "Data de Publicação Original". Se a data completa for fornecida (ex: "2023-03-15" ou "15 de março de 2023"), use "2023". Se apenas o ano for fornecido (ex: "Publicado em 2022"), use "2022". Se não houver data ou ano no campo "Data de Publicação Original" ou inferível do texto, use "s.d." (sem data).
5.  **palavrasChave**: Gere uma lista de 3 a 5 palavras-chave principais que resumem o conteúdo do texto. As palavras-chave devem estar no mesmo idioma do "Conteúdo Principal do Texto". Se não for possível identificar palavras-chave específicas, retorne uma lista vazia.
6.  **resumo**: Crie um resumo conciso do "Conteúdo Principal do Texto" (com cerca de 150-250 palavras OU em até 5 frases). O resumo DEVE destacar os pontos mais relevantes para uso em trabalhos acadêmicos, como conceitos centrais, argumentos do autor, contribuições teóricas ou críticas principais. O resumo DEVE estar no mesmo idioma do "Conteúdo Principal do Texto".
7.  **citacoesRelevantes**: Extraia UMA ou DUAS citações DIRETAS e CURTAS do "Conteúdo Principal do Texto" que sejam particularmente relevantes, impactantes ou que exemplifiquem um ponto crucial. As citações devem ser literais do texto. Se não encontrar citações curtas e altamente relevantes, retorne uma lista vazia.
8.  **comentariosAdicionais**: (Opcional) Adicione breves notas pessoais ou conexões com um tema principal de estudo. Se não tiver comentários, pode deixar este campo em branco ou omiti-lo.

Instruções Adicionais:
- Seja objetivo e foque nos aspectos acadêmicos do texto.
- Priorize informações factuais e argumentos centrais.
- Certifique-se de que o resumo e as citações sejam extraídos fielmente do conteúdo fornecido.
- As palavras-chave devem ser concisas e representativas.
- Para o campo 'autor', se não houver um autor explícito no input 'Autor Original', tente identificar um autor mencionado no 'Conteúdo Principal do Texto', se aplicável (ex: "segundo Fulano...", "o estudo de Ciclano..."). Se ainda assim não for claro, use "Não informado".

Responda APENAS com a estrutura JSON da Ficha de Leitura.
`,
});

const generateFichamentoFlow = ai.defineFlow(
  {
    name: 'generateFichamentoFlow',
    inputSchema: ScrapedContentSchema,
    outputSchema: FichaLeituraSchema,
  },
  async (input) => {
    let processedInput = {...input};
    
    const {output} = await fichamentoPrompt(processedInput);
    if (!output) {
      throw new Error('AI model did not produce the expected FichaLeitura output structure.');
    }
    
    return {
      ...output,
      autor: output.autor?.trim() || undefined, 
      anoPublicacao: output.anoPublicacao?.trim() || undefined,
      comentariosAdicionais: output.comentariosAdicionais?.trim() || undefined,
      palavrasChave: output.palavrasChave || [],
      citacoesRelevantes: output.citacoesRelevantes || [],
    };
  }
);
    

