
'use server';
/**
 * @fileOverview Generates an academic index (table of contents) based on a main topic/theme.
 *
 * - generateIndex - A function that initiates the index generation process.
 * - GenerateIndexInput - The input type for the generateIndex function.
 * - GenerateIndexOutput - The return type for the generateIndex function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateIndexInputSchema = z.object({
  mainTopic: z.string().describe('The main theme or topic of the academic work.'),
  targetLanguage: z.string().optional().default('pt-BR').describe('The language for the index titles (e.g., "pt-BR", "en").'),
  numSections: z.number().optional().default(5).describe('Approximate number of main sections desired (excluding intro, conclusion, biblio).'),
});
export type GenerateIndexInput = z.infer<typeof GenerateIndexInputSchema>;

const GenerateIndexOutputSchema = z.object({
  generatedIndex: z.array(z.string()).describe('A list of proposed section titles, including Introduction, main development sections, Conclusion, and References.'),
});
export type GenerateIndexOutput = z.infer<typeof GenerateIndexOutputSchema>;

export async function generateIndex(input: GenerateIndexInput): Promise<GenerateIndexOutput> {
  return generateIndexFlow(input);
}

const indexPrompt = ai.definePrompt({
  name: 'generateIndexPrompt',
  input: {schema: GenerateIndexInputSchema},
  output: {schema: GenerateIndexOutputSchema},
  prompt: `Você é um assistente de IA especialista em estruturar trabalhos acadêmicos.
Sua tarefa é gerar um índice (lista de títulos de seções) para um trabalho acadêmico com base no tema principal fornecido.
O idioma dos títulos deve ser: {{{targetLanguage}}}.
O tema principal é: "{{{mainTopic}}}"
O número aproximado de seções de desenvolvimento desejadas (além de Introdução, Conclusão e Bibliografia) é: {{{numSections}}}.

O índice DEVE incluir obrigatoriamente:
1. Introdução
2. Seções de desenvolvimento relacionadas ao tema principal (aproximadamente {{{numSections}}} seções).
3. Conclusão
4. Referências Bibliográficas (ou "Referências" ou "Bibliografia")

Crie títulos de seção claros, concisos e que sigam uma progressão lógica.
As seções de desenvolvimento devem cobrir aspectos importantes do tema principal.

Exemplo de formato de saída para o tema "Impacto da IA na Educação":
generatedIndex: [
  "Introdução",
  "A Inteligência Artificial como Ferramenta Pedagógica",
  "Desafios Éticos da IA na Educação",
  "O Futuro da Aprendizagem com IA",
  "Conclusão",
  "Referências Bibliográficas"
]

Responda apenas com a estrutura JSON solicitada.
`,
});

const generateIndexFlow = ai.defineFlow(
  {
    name: 'generateIndexFlow',
    inputSchema: GenerateIndexInputSchema,
    outputSchema: GenerateIndexOutputSchema,
  },
  async (input) => {
    const {output} = await indexPrompt(input);
    if (!output || !output.generatedIndex || output.generatedIndex.length < 3) { // Basic validation
      throw new Error('AI model did not produce a valid index structure.');
    }
    return output;
  }
);
    