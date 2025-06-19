
'use server';
/**
 * @fileOverview Generates an introduction for an academic work.
 *
 * - generateIntroduction - A function that initiates the introduction generation process.
 * - GenerateIntroductionInput - The input type for the generateIntroduction function.
 * - GenerateIntroductionOutput - The return type for the generateIntroduction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const GenerateIntroductionInputSchema = z.object({
  mainTopic: z.string().describe('The main theme or topic of the academic work for which to write the introduction.'),
  generatedIndex: z.array(z.string()).optional().describe('Optional: The list of section titles for the work, to help structure the introduction.'),
  targetLanguage: z.string().optional().default('pt-BR').describe('The language for the introduction (e.g., "pt-BR", "en").'),
});
export type GenerateIntroductionInput = z.infer<typeof GenerateIntroductionInputSchema>;

const GenerateIntroductionOutputSchema = z.object({
  introduction: z.string().describe('The generated introduction text in Markdown format.'),
});
export type GenerateIntroductionOutput = z.infer<typeof GenerateIntroductionOutputSchema>;

export async function generateIntroduction(input: GenerateIntroductionInput): Promise<GenerateIntroductionOutput> {
  return generateIntroductionFlow(input);
}

const introductionPrompt = ai.definePrompt({
  name: 'generateIntroductionPrompt',
  input: {schema: GenerateIntroductionInputSchema},
  output: {schema: GenerateIntroductionOutputSchema},
  prompt: `Você é um assistente de IA especialista em escrever introduções para trabalhos acadêmicos.
Sua tarefa é gerar uma introdução concisa e informativa em Markdown para um trabalho acadêmico.
O idioma da introdução deve ser: {{{targetLanguage}}}.
O tema principal do trabalho é: "{{{mainTopic}}}"

{{#if generatedIndex}}
A estrutura de seções planejada para o trabalho é:
{{#each generatedIndex}}
- {{{this}}}
{{/each}}
Considere esta estrutura ao delinear o que será abordado no trabalho.
{{/if}}

A introdução deve:
1.  Contextualizar brevemente o tema principal ({{{mainTopic}}}).
2.  Apresentar a relevância ou justificativa do estudo do tema.
3.  Declarar claramente o objetivo geral do trabalho.
4.  Descrever brevemente a estrutura do trabalho, mencionando as principais seções que serão desenvolvidas (baseado no generatedIndex, se fornecido, ou em uma estrutura lógica típica).
5.  Ser escrita em tom formal e acadêmico.
6.  Ter aproximadamente 200-300 palavras.

A sua resposta DEVE ser um objeto JSON com uma única chave "introduction". O valor dessa chave será o texto da introdução em formato Markdown.
Não inclua o título "Introdução" dentro do valor do campo "introduction", pois ele já será um título de seção no documento final.

Exemplo de formato de saída JSON esperado:
{
  "introduction": "Este é o texto da introdução que contextualiza o tema X, aborda sua relevância e descreve as seções subsequentes do trabalho..."
}
`,
});

const generateIntroductionFlow = ai.defineFlow(
  {
    name: 'generateIntroductionFlow',
    inputSchema: GenerateIntroductionInputSchema,
    outputSchema: GenerateIntroductionOutputSchema,
  },
  async (input) => {
    const {output} = await introductionPrompt(input);
    if (!output || typeof output.introduction !== 'string') {
      throw new Error('AI model did not produce a valid introduction in the expected format.');
    }
    return output;
  }
);
    
