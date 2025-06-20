
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
  prompt: `Você é um assistente de IA especialista em estruturar trabalhos acadêmicos (TCCs, monografias).
Sua tarefa é gerar um índice (uma lista de títulos de seções) para um trabalho acadêmico com base no tema principal fornecido: "{{{mainTopic}}}".
O idioma dos títulos deve ser: {{{targetLanguage}}}.

Use a seguinte estrutura acadêmica padrão como guia OBRIGATÓRIO. Adapte os títulos e subtópicos para que se encaixem no tema principal "{{{mainTopic}}}".

**ESTRUTURA ACADÊMICA PADRÃO (GUIA):**
- Resumo
- Lista de Abreviaturas e Siglas (incluir apenas se o tema sugerir a necessidade)
- Introdução (O conteúdo desta seção deve abordar: Problematização/Justificativa, Objetivo Geral, Objetivos Específicos)
- Referencial Teórico / Revisão de Literatura (Esta é a seção de desenvolvimento principal. O título deve ser adaptado ao tema. Ex: "Referencial Teórico sobre Fotossíntese". O conteúdo deve ser detalhado com subtópicos relevantes ao {{{mainTopic}}}, como Definições, Fases, Fatores, etc.)
- Metodologia (Se for uma revisão bibliográfica, o título pode ser "Metodologia da Pesquisa Bibliográfica". Detalhar o tipo de pesquisa, coleta de dados, etc.)
- Resultados e Discussão (O título pode ser adaptado. Ex: "Análise e Discussão dos Fatores da Fotossíntese". Apresentar e discutir os achados.)
- Conclusão (Sintetizar os resultados, contribuições, limitações e sugestões futuras.)
- Referências Bibliográficas

**TAREFA:**
Com base na estrutura acima e no tema "{{{mainTopic}}}", gere uma lista de títulos de seção.
A sua saída DEVE ser uma lista (array) de strings. NÃO gere uma estrutura aninhada. Gere uma lista simples com os títulos das seções principais.

**Exemplo de SAÍDA ESPERADA para o tema "Impacto da IA na Educação":**
{
  "generatedIndex": [
    "Resumo",
    "Introdução",
    "Referencial Teórico: A Inteligência Artificial e suas Implicações na Educação",
    "Metodologia",
    "Análise e Discussão do Impacto da IA em Ambientes Educacionais",
    "Conclusão",
    "Referências Bibliográficas"
  ]
}

Agora, gere o índice para o tema "{{{mainTopic}}}".
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
    // Ensure "Referências Bibliográficas" is the last item if present, or add it.
    const finalIndex = output.generatedIndex.filter(item => !/refer[êe]ncias|bibliografia/i.test(item));
    finalIndex.push("Referências Bibliográficas");

    // Ensure "Resumo" is the first item if not present.
    if (!/resumo/i.test(finalIndex[0])) {
      finalIndex.unshift("Resumo");
    }

    // Ensure "Conclusão" is just before references
    const conclusionIndex = finalIndex.findIndex(item => /conclus[ãa]o/i.test(item));
    if (conclusionIndex > -1) {
        const [conclusion] = finalIndex.splice(conclusionIndex, 1);
        finalIndex.splice(finalIndex.length - 1, 0, conclusion);
    } else {
        finalIndex.splice(finalIndex.length - 1, 0, "Conclusão");
    }

    return { generatedIndex: finalIndex };
  }
);
    
