
'use server';
/**
 * @fileOverview Generates a bibliography for an academic work based on reading summaries.
 *
 * - generateBibliography - A function that initiates bibliography generation.
 * - GenerateBibliographyInput - Input type.
 * - GenerateBibliographyOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';
import {FichaLeituraSchema} from './generate-fichamento-flow';

export const GenerateBibliographyInputSchema = z.object({
  fichasDeLeitura: z.array(FichaLeituraSchema).describe('An array of reading summaries (fichas de leitura) from which to generate the bibliography.'),
  citationStyle: z.string().optional().default('APA').describe('The citation style to follow (e.g., APA, ABNT, MLA). Provide general guidance if specific style is complex.'),
  targetLanguage: z.string().optional().default('pt-BR').describe('The language for any introductory text if needed (bibliography itself is usually style-dependent).'),
});
export type GenerateBibliographyInput = z.infer<typeof GenerateBibliographyInputSchema>;

const GenerateBibliographyOutputSchema = z.object({
  bibliography: z.string().describe('The generated bibliography in Markdown format (usually a list of formatted references).'),
});
export type GenerateBibliographyOutput = z.infer<typeof GenerateBibliographyOutputSchema>;

export async function generateBibliography(input: GenerateBibliographyInput): Promise<GenerateBibliographyOutput> {
  return generateBibliographyFlow(input);
}

const bibliographyPrompt = ai.definePrompt({
  name: 'generateBibliographyPrompt',
  input: {schema: GenerateBibliographyInputSchema},
  output: {schema: GenerateBibliographyOutputSchema},
  prompt: `Você é um assistente de IA especialista em formatar referências bibliográficas.
Sua tarefa é gerar uma lista de referências em Markdown com base nas fichas de leitura fornecidas.
O estilo de citação geral a ser seguido é: {{{citationStyle}}}.
O idioma é: {{{targetLanguage}}}.

Fichas de Leitura Fornecidas:
{{#each fichasDeLeitura}}
---
Título: {{titulo}}
Autor(es): {{#if autor}}{{autor}}{{else}}N/A{{/if}}
Ano: {{#if anoPublicacao}}{{anoPublicacao}}{{else}}s.d.{{/if}}
URL: {{url}}
{{#if palavrasChave}}Palavras-chave: {{#each palavrasChave}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{/each}}
---

Instruções para a Bibliografia:
- Para cada ficha, crie uma entrada de referência formatada.
- Siga as convenções gerais do estilo {{{citationStyle}}}. Por exemplo:
    - **APA:** Sobrenome, Iniciais. (Ano). *Título do trabalho*. URL
    - **ABNT (Brasil):** SOBRENOME, Nome. *Título do trabalho*. Local: Editora, Ano. Disponível em: <URL>. Acesso em: dia mês. ano. (Simplifique para apenas Autor, Ano, Título, URL se os detalhes de Local/Editora não estiverem nas fichas).
- Se o autor não estiver disponível, comece com o título.
- Se o ano não estiver disponível, use "s.d." (sem data).
- Liste as referências em ordem alfabética pelo sobrenome do primeiro autor (ou pelo título, se não houver autor).
- Cada referência deve ser um item de uma lista não ordenada em Markdown (usando '* ').

Exemplo de formato de saída (estilo APA simplificado):
*   Autor, A. A. (Ano). *Título do trabalho*. URL
*   Nome da Organização. (Ano). *Título do trabalho*. URL
*   *Título do trabalho quando não há autor*. (Ano). URL

Responda apenas com a lista de referências em formato Markdown. Não inclua o título "Referências Bibliográficas" ou "Bibliografia" no início do texto gerado.
`,
});

const generateBibliographyFlow = ai.defineFlow(
  {
    name: 'generateBibliographyFlow',
    inputSchema: GenerateBibliographyInputSchema,
    outputSchema: GenerateBibliographyOutputSchema,
  },
  async (input) => {
    if (!input.fichasDeLeitura || input.fichasDeLeitura.length === 0) {
      return { bibliography: "Nenhuma fonte fornecida para gerar a bibliografia." };
    }
    const {output} = await bibliographyPrompt(input);
    if (!output || !output.bibliography) {
      throw new Error('AI model did not produce a valid bibliography.');
    }
    return output;
  }
);
    