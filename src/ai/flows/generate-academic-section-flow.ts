
'use server';
/**
 * @fileOverview Generates content for a specific section of an academic work.
 *
 * - generateAcademicSection - A function that initiates section content generation.
 * - GenerateAcademicSectionInput - Input type.
 * - GenerateAcademicSectionOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';
// Assuming FichaLeitura type for input will be adapted from the Groq FichaLeitura (src/types.ts)
// For Zod validation, we define what this flow *expects*.

const FichaLeituraInputSchemaForGenkit = z.object({
  url: z.string().describe("URL of the source material."),
  titulo: z.string().describe("Title of the source material."),
  autor: z.string().optional().describe("Author(s) of the source material."),
  anoPublicacao: z.string().optional().describe("Year of publication. Use 's.d.' if not found."),
  palavrasChave: z.array(z.string()).optional().describe("A list of main keywords summarizing the content."),
  resumo: z.string().describe("A concise summary of the content."),
  citacoesRelevantes: z.array(z.string()).optional().describe("Direct short quotes from the text."),
  // comentariosAdicionais: z.string().optional(), // Not present in Groq FichaLeitura
});
export type FichaLeituraForGenkit = z.infer<typeof FichaLeituraInputSchemaForGenkit>;


export const GenerateAcademicSectionInputSchema = z.object({
  sectionTitle: z.string().describe('The title of the current section to be developed.'),
  mainTopic: z.string().describe('The overall main topic/theme of the academic paper.'),
  fichasDeLeitura: z.array(FichaLeituraInputSchemaForGenkit).optional().describe('An array of reading summaries (fichas de leitura) relevant to this section or the overall topic. These are the primary sources of information.'),
  completedSections: z.array(z.object({title: z.string(), content: z.string()})).optional().describe('Content of previously written sections, to maintain coherence and avoid repetition. Provided as {title: string, content: string}[].'),
  targetLanguage: z.string().optional().default('pt-BR').describe('The language for the section content.'),
  citationStyle: z.string().optional().default('APA').describe('The citation style to follow (e.g., APA, ABNT, MLA). Provide general guidance if specific style is complex.'),
  wordCountTarget: z.number().optional().default(500).describe('Approximate target word count for this section.'),
});
export type GenerateAcademicSectionInput = z.infer<typeof GenerateAcademicSectionInputSchema>;

const GenerateAcademicSectionOutputSchema = z.object({
  sectionContent: z.string().describe('The generated content for the section in Markdown format.'),
});
export type GenerateAcademicSectionOutput = z.infer<typeof GenerateAcademicSectionOutputSchema>;

export async function generateAcademicSection(input: GenerateAcademicSectionInput): Promise<GenerateAcademicSectionOutput> {
  return generateAcademicSectionFlow(input);
}

// Register Handlebars helper at the module level
ai.registry.addHandlebarsHelper('substring', function (str: string, start: number, end: number) {
  if (typeof str === 'string') {
    return str.substring(start, end);
  }
  return '';
});

const academicSectionPrompt = ai.definePrompt({
  name: 'generateAcademicSectionPrompt',
  input: {schema: GenerateAcademicSectionInputSchema},
  output: {schema: GenerateAcademicSectionOutputSchema},
  prompt: `Você é um assistente de IA especialista em redigir seções de trabalhos acadêmicos.
Sua tarefa é gerar o conteúdo em Markdown para a seção intitulada: "{{sectionTitle}}".
O tema principal do trabalho é: "{{mainTopic}}".
O idioma do conteúdo deve ser: {{{targetLanguage}}}.
O estilo de citação a ser seguido (de forma geral) é: {{{citationStyle}}}.
O tamanho aproximado desejado para esta seção é de {{{wordCountTarget}}} palavras.

{{#if fichasDeLeitura}}
Baseie-se PRINCIPALMENTE nas seguintes fichas de leitura. Integre as informações delas de forma coesa e cite as fontes conforme o estilo de citação.
Fichas de Leitura Fornecidas:
{{#each fichasDeLeitura}}
---
Ficha Título: {{titulo}}
Autor: {{#if autor}}{{autor}}{{else}}N/A{{/if}} ({{#if anoPublicacao}}{{anoPublicacao}}{{else}}s.d.{{/if}})
URL: {{url}}
{{#if palavrasChave}}
Palavras-chave: {{#each palavrasChave}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
Resumo: {{resumo}}
{{#if citacoesRelevantes}}
Citações Relevantes da Ficha:
{{#each citacoesRelevantes}}
- "{{{this}}}"
{{/each}}
{{/if}}
---
{{/each}}
{{else}}
Não foram fornecidas fichas de leitura específicas. Baseie-se no seu conhecimento geral sobre o tema principal "{{mainTopic}}" para desenvolver esta seção.
{{/if}}

{{#if completedSections}}
As seguintes seções já foram escritas. Evite repetir excessivamente o conteúdo delas e mantenha a coerência:
{{#each completedSections}}
---
Seção Anterior Título: {{title}}
Conteúdo da Seção Anterior (resumido): {{#substring content 0 200}}...{{/substring}}
---
{{/each}}
{{/if}}

Instruções para a Seção "{{sectionTitle}}":
- Desenvolva os argumentos de forma clara e lógica.
- Utilize parágrafos bem estruturados.
- Se fichas foram fornecidas, integre as informações delas de forma crítica e analítica, não apenas copiando.
- Cite as fontes das fichas ao usar suas informações. Formato geral para citação no texto: (Autor, Ano). Para citações diretas, inclua número de página se disponível na ficha.
- Mantenha um tom formal e acadêmico.
- Organize o conteúdo para que flua bem e cubra os aspectos principais sugeridos pelo título da seção "{{sectionTitle}}" dentro do contexto do tema "{{mainTopic}}".
- NÃO inclua o título da seção ("{{sectionTitle}}") no início do conteúdo gerado, pois ele já será o título da seção.

Responda apenas com o conteúdo da seção em formato Markdown.
`,
});

const generateAcademicSectionFlow = ai.defineFlow(
  {
    name: 'generateAcademicSectionFlow',
    inputSchema: GenerateAcademicSectionInputSchema,
    outputSchema: GenerateAcademicSectionOutputSchema,
  },
  async (input) => {
    const {output} = await academicSectionPrompt(input);
    if (!output || !output.sectionContent) {
      throw new Error('AI model did not produce valid section content.');
    }
    return output;
  }
);
    
