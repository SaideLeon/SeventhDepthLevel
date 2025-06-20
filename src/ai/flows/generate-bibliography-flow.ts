
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

const FichaLeituraInputSchemaForBiblio = z.object({
  url: z.string().describe("URL of the source material."),
  titulo: z.string().describe("Title of the source material."),
  autor: z.string().optional().describe("Author(s) of the source material."),
  anoPublicacao: z.string().optional().describe("Year of publication. Use 's.d.' if not found."),
  palavrasChave: z.array(z.string()).optional().describe("A list of main keywords summarizing the content."), 
});
export type FichaLeituraForBiblio = z.infer<typeof FichaLeituraInputSchemaForBiblio>;


export const GenerateBibliographyInputSchema = z.object({
  fichasDeLeitura: z.array(FichaLeituraInputSchemaForBiblio).describe('An array of reading summaries (fichas de leitura) from which to generate the bibliography.'),
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
- **Sua resposta DEVE começar com o título "Referências" (ou um equivalente apropriado no idioma de destino, como "Referências Bibliográficas") formatado como um cabeçalho Markdown de nível 2 (por exemplo, \`## Referências\`).**
- Abaixo do título, para cada ficha, crie uma entrada de referência formatada.
- Siga as convenções gerais do estilo {{{citationStyle}}}. Por exemplo:
    - **APA:** Sobrenome, Iniciais. (Ano). *Título do trabalho*. URL
    - **ABNT (Brasil):** SOBRENOME, Nome. *Título do trabalho*. Local: Editora, Ano. Disponível em: <URL>. Acesso em: dia mês. ano. (Simplifique para apenas Autor, Ano, Título, URL se os detalhes de Local/Editora não estiverem nas fichas).
- Se o autor não estiver disponível, comece com o título.
- Se o ano não estiver disponível, use "s.d." (sem data).
- Liste as referências em ordem alfabética pelo sobrenome do primeiro autor (ou pelo título, se não houver autor).
- Cada referência deve ser um item de uma lista não ordenada em Markdown (usando '* ').

Sua resposta DEVE ser EXCLUSIVAMENTE um objeto JSON válido, sem nenhum texto ou formatação Markdown antes ou depois dele.
O objeto JSON deve ter uma única chave "bibliography". O valor dessa chave será o conteúdo da seção de bibliografia, incluindo o título, em formato Markdown.

Exemplo de formato de saída JSON esperado (para estilo APA simplificado):
{
  "bibliography": "## Referências\\n\\n* Autor, A. A. (Ano). *Título do trabalho*. URL\\n* Nome da Organização. (Ano). *Título do trabalho*. URL\\n* *Título do trabalho quando não há autor*. (Ano). URL"
}

(Note que no exemplo JSON acima, \\n representa novas linhas no Markdown gerado.)
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
      return { bibliography: "## Referências\n\nNenhuma fonte fornecida para gerar a bibliografia." };
    }
    const {output} = await bibliographyPrompt(input);
    if (
        !output ||
        typeof output !== 'object' ||
        !output.hasOwnProperty('bibliography') ||
        typeof output.bibliography !== 'string'
      ) {
        const actualOutputForError = output ? JSON.stringify(output, null, 2).substring(0, 200) : String(output);
        console.error(`[generateBibliographyFlow] Invalid output structure. Expected { bibliography: string }, got: ${actualOutputForError}`);
        throw new Error(`AI model did not produce the expected output structure for bibliography. Actual: ${actualOutputForError}...`);
      }
    return output as GenerateBibliographyOutput;
  }
);
    
