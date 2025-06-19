
'use server';
/**
 * @fileOverview Generates a conclusion for an academic work.
 *
 * - generateConclusion - A function that initiates the conclusion generation process.
 * - GenerateConclusionInput - Input type.
 * - GenerateConclusionOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

export const GenerateConclusionInputSchema = z.object({
  mainTopic: z.string().describe('The main theme or topic of the academic work.'),
  introductionContent: z.string().optional().describe('The content of the introduction, to recall objectives.'),
  developedSectionsContent: z.array(z.object({title: z.string(), content: z.string()})).describe('An array containing the title and content of all developed sections of the work.'),
  targetLanguage: z.string().optional().default('pt-BR').describe('The language for the conclusion.'),
});
export type GenerateConclusionInput = z.infer<typeof GenerateConclusionInputSchema>;

const GenerateConclusionOutputSchema = z.object({
  conclusion: z.string().describe('The generated conclusion text in Markdown format.'),
});
export type GenerateConclusionOutput = z.infer<typeof GenerateConclusionOutputSchema>;

export async function generateConclusion(input: GenerateConclusionInput): Promise<GenerateConclusionOutput> {
  return generateConclusionFlow(input);
}

ai.registry.addHandlebarsHelper('substring', function (str: string, start: number, end: number) {
  if (typeof str === 'string') {
    return str.substring(start, end);
  }
  return '';
});

const conclusionPrompt = ai.definePrompt({
  name: 'generateConclusionPrompt',
  input: {schema: GenerateConclusionInputSchema},
  output: {schema: GenerateConclusionOutputSchema},
  prompt: `Você é um assistente de IA especialista em escrever conclusões para trabalhos acadêmicos.
Sua tarefa é gerar uma conclusão concisa e reflexiva em Markdown.
O idioma da conclusão deve ser: {{{targetLanguage}}}.
O tema principal do trabalho é: "{{{mainTopic}}}"

{{#if introductionContent}}
A introdução do trabalho (para relembrar os objetivos) foi:
{{{introductionContent}}}
---
{{/if}}

O conteúdo das seções desenvolvidas no trabalho foi:
{{#each developedSectionsContent}}
Seção: {{title}}
Conteúdo (resumido): {{#substring content 0 300}}...{{/substring}}
---
{{/each}}

A conclusão deve:
1.  Retomar brevemente o tema principal ({{{mainTopic}}}) e os objetivos do trabalho (se a introdução foi fornecida).
2.  Sumarizar as principais descobertas, argumentos ou pontos discutidos nas seções desenvolvidas.
3.  Apresentar reflexões finais sobre o tema, com base no que foi exposto.
4.  Pode (opcionalmente) indicar limitações do estudo ou sugerir caminhos para pesquisas futuras.
5.  Ser escrita em tom formal e acadêmico.
6.  Ter aproximadamente 200-300 palavras.

Sua resposta DEVE ser EXCLUSIVAMENTE um objeto JSON válido, sem nenhum texto ou formatação Markdown antes ou depois dele.
O objeto JSON deve ter uma única chave "conclusion". O valor dessa chave será o texto da conclusão em formato Markdown.
Não inclua o título "Conclusão" dentro do valor do campo "conclusion".

Exemplo de formato de saída JSON esperado:
{
  "conclusion": "Em suma, este trabalho explorou o tema X, recapitulando os principais achados e oferecendo reflexões finais..."
}
`,
});

const generateConclusionFlow = ai.defineFlow(
  {
    name: 'generateConclusionFlow',
    inputSchema: GenerateConclusionInputSchema,
    outputSchema: GenerateConclusionOutputSchema,
  },
  async (input) => {
    const {output} = await conclusionPrompt(input);
    if (
        !output ||
        typeof output !== 'object' ||
        !output.hasOwnProperty('conclusion') ||
        typeof output.conclusion !== 'string'
      ) {
        const actualOutputForError = output ? JSON.stringify(output, null, 2).substring(0, 200) : String(output);
        console.error(`[generateConclusionFlow] Invalid output structure. Expected { conclusion: string }, got: ${actualOutputForError}`);
        throw new Error(`AI model did not produce the expected output structure for conclusion. Actual: ${actualOutputForError}...`);
      }
    return output as GenerateConclusionOutput;
  }
);
    
