
'use server';

/**
 * @fileOverview Generates an academic-style response from the AI, potentially with web context and citations.
 * Can also be used for specific academic writing tasks like Introduction, Section development, or Conclusion.
 *
 * - generateAcademicResponse - A function that generates an academic response from the AI.
 * - GenerateAcademicResponseInput - The input type for the generateAcademicResponse function.
 * - GenerateAcademicResponseOutput - The return type for the generateAcademicResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FichaLeitura } from '@/types'; // Assuming FichaLeitura from Groq might be passed.

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

// Zod schema for FichaLeitura, adapted for Genkit input if needed.
// This is for context, the actual FichaLeitura object comes from Groq.
const FichaLeituraInputSchemaForGenkitContext = z.object({
  url: z.string().describe("URL of the source material."),
  titulo: z.string().describe("Title of the source material."),
  autor: z.string().optional().describe("Author(s) of the source material."),
  anoPublicacao: z.string().optional().describe("Year of publication. Use 's.d.' if not found."),
  palavrasChave: z.array(z.string()).optional().describe("A list of main keywords summarizing the content."),
  resumo: z.string().describe("A concise summary of the content."),
  citacoesRelevantes: z.array(z.string()).optional().describe("Direct short quotes from the text."),
  comentariosAdicionais: z.string().optional().describe("Additional comments or notes about the source."),
});
export type FichaLeituraForGenkitContext = z.infer<typeof FichaLeituraInputSchemaForGenkitContext>;


const GenerateAcademicResponseInputSchema = z.object({
  prompt: z.string().describe('The prompt to send to the AI. This should clearly state the academic task (e.g., "Write an introduction for...", "Develop the section titled \'X\' using the provided context...", "Write the conclusion for...").'),
  userImageInputDataUri: z.string().optional().describe("A Data URI of an image uploaded by the user with their prompt. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  persona: z.string().optional().default("Cognick, seu assistente de estudos").describe('The persona the AI should adopt.'),
  rules: z.string().optional().describe('Specific rules the AI should follow when responding.'),
  contextContent: z.string().optional().describe('Additional context, which could be formatted fichas de leitura, previously written sections, or web scraping results, to help answer the prompt.'),
  imageInfo: z.string().optional().describe('Information about images found during web scraping, if any (e.g., list of image URLs or descriptions in the format "alt text (URL)"). This is used for sections other than intro/conclusion.'),
  conversationHistory: z.array(MessageSchema).optional().describe('The recent history of the conversation, to provide context. User\'s current query is separate in "prompt". Ordered from oldest to newest relevant message.'),
  targetLanguage: z.string().optional().default('pt-BR').describe('The language for the response.'),
  citationStyle: z.string().optional().default('APA').describe('The citation style to follow (e.g., APA, ABNT, MLA).'),
});
export type GenerateAcademicResponseInput = z.infer<typeof GenerateAcademicResponseInputSchema>;

const GenerateAcademicResponseOutputSchema = z.object({
  response: z.string().describe('The AI generated academic response in Markdown format.'),
});
export type GenerateAcademicResponseOutput = z.infer<typeof GenerateAcademicResponseOutputSchema>;

export async function generateAcademicResponse(input: GenerateAcademicResponseInput): Promise<GenerateAcademicResponseOutput> {
  return generateAcademicResponseFlow(input);
}

const generateAcademicResponsePrompt = ai.definePrompt({
  name: 'generateAcademicResponsePrompt',
  input: {schema: GenerateAcademicResponseInputSchema},
  output: {schema: GenerateAcademicResponseOutputSchema},
  prompt: `Você é o Cognick, um assistente de IA focado em ajudar com estudos e aprendizado escolar, incluindo a redação de trabalhos acadêmicos. Sua missão é ser um companheiro prestativo e amigável para estudantes.
O idioma principal é {{{targetLanguage}}}. O estilo de citação a ser seguido é {{{citationStyle}}}.

**Sobre sua identidade:**
*   Se o usuário perguntar quem você é, responda concisamente que você é o **'Cognick', seu assistente virtual para estudos.**
*   Se perguntarem sobre sua criação, responda que você é o Cognick, um projeto desenvolvido por Saíde Omar Saíde.
*   **Importante:** NÃO se descreva como um 'modelo de linguagem grande', 'treinado pelo Google', etc. Mantenha o foco em Saíde Omar Saíde como desenvolvedor.
*   Mantenha sempre a conversa focada em auxiliar o usuário com suas dúvidas e tarefas escolares.
---

{{#if persona}}Você está agindo como: {{persona}}.{{else}}Sua persona padrão é 'Cognick, seu assistente de estudos'.{{/if}}

{{#if rules}}
Por favor, siga estas regras gerais ao responder:
{{rules}}
---
{{/if}}

{{#if conversationHistory}}
Considere o seguinte histórico recente da conversa para entender o contexto. A pergunta/prompt atual do usuário é fornecida separadamente abaixo e é a parte mais recente desta interação.
Mensagens anteriores (da mais antiga relevante para a mais recente antes da pergunta atual):
{{#each conversationHistory}}
{{role}}: {{{content}}}
---
{{/each}}
{{/if}}

A saída deve ser formatada em Markdown.
Ao gerar o texto, por favor, siga estas etapas meticulosamente:
1.  **Estrutura e Cabeçalhos**: Você pode usar sub-cabeçalhos (ex: ### Subtítulo, #### Outro Subtítulo) dentro do conteúdo da seção que está gerando, se for apropriado para organizar o texto.
    **Importante**: Se o prompt atual pedir para você gerar o conteúdo para UMA seção específica (ex: "Desenvolva a seção 'Título Principal da Seção'...", "Escreva a introdução...", "Escreva a conclusão..."), **NÃO** inclua o título principal dessa seção (ou "Introdução", "Conclusão") como um cabeçalho no início da sua resposta. O título principal já será adicionado externamente. Gere apenas o texto que deve vir *abaixo* desse título principal.
2.  **Desenvolvimento do Conteúdo**: Para o(s) cabeçalho(s) que você criar ou identificar, assegure que o conteúdo abaixo dele seja completamente desenvolvido e expandido. Forneça explicações detalhadas, exemplos, argumentos e detalhes de suporte conforme apropriado para um trabalho acadêmico e de acordo com o prompt atual.
3.  **Colocação e Formatação de Imagens - INSTRUÇÕES CRÍTICAS (APENAS PARA SEÇÕES DE DESENVOLVIMENTO, NÃO PARA INTRODUÇÃO/CONCLUSÃO)**:
    a.  **Condição**: Se estiver desenvolvendo uma seção principal (NÃO uma introdução ou conclusão) e se imagens forem fornecidas no contexto (via \`imageInfo\` OU dentro do \`contextContent\` que representa fichas de leitura), e você determinar que uma imagem é diretamente relevante para um cabeçalho ou subcabeçalho específico que você está gerando, você **DEVE** inserir essa imagem usando o formato Markdown (\`![texto alternativo](URL)\`) imediatamente **ABAIXO** desse cabeçalho relevante.
    b.  **Texto Alternativo**: Use a legenda original da imagem (disponível na string \`imageInfo\` ou na ficha de leitura) como o texto alternativo no Markdown.
    c.  **Formatação de URL - ABSOLUTAMENTE CRÍTICO**: Para TODAS as imagens, você **DEVE** garantir que nenhum parâmetro de URL (como '?width=50&blur=10', '?size=small', etc.) seja incluído na URL de origem da imagem dentro do Markdown. SEMPRE use apenas a URL base da imagem.
4.  **Estilo de Citação - INSTRUÇÃO CRÍTICA: VOCÊ DEVE PRIORIZAR CITAÇÕES NARRATIVAS.**
    Ao citar fontes (informações de \`contextContent\`), use primariamente um **estilo narrativo**, integrando o nome do autor diretamente na frase (ex: "Segundo Autor (data)...", "De acordo com Autor (data)..."). Siga as diretrizes da APA 7ª edição (autor-data, número de página para citações diretas).
    **Exemplo do Estilo Narrativo PREFERIDO:**
    *   \`Segundo Castilho (s.d.), no ciclo rápido, o carbono move-se rapidamente...\`
    *   \`Pinto (2008) explica que a nova reforma só surgirá em 1982...\`
    **EVITE este estilo parentético para paráfrases e citações curtas como método principal:**
    *   \`No ciclo rápido, o carbono move-se rapidamente... (Castilho, s.d.).\`
5.  **Referências Bibliográficas - OBRIGATÓRIO (SE O PROMPT FOR ESPECIFICAMENTE SOBRE GERAR REFERÊNCIAS)**: Se o prompt atual pedir explicitamente para gerar uma lista de referências (ex: "Gere a bibliografia baseada nestas fichas"), você **DEVE** incluir uma seção final intitulada 'Referências' (ou seu equivalente no idioma de destino). Liste todas as fontes únicas citadas, formatadas conforme APA 7ª edição. CASO CONTRÁRIO, se o prompt for para gerar introdução, seção ou conclusão, NÃO adicione uma lista de referências no final dessa parte específica.
6.  **Saída Final**: A saída final deve ser uma única string Markdown.

---

{{#if contextContent}}
Use as seguintes informações de contexto (podem ser fichas de leitura, conteúdo de seções anteriores, ou resultados de pesquisa web) para ajudar a responder à pergunta/tarefa do usuário.
Esta informação deve ser priorizada. Incorpore-a naturalmente em sua resposta, seguindo todas as diretrizes de formatação e citação.
Contexto:
{{{contextContent}}}
---
{{/if}}

{{#if imageInfo}}
As seguintes informações sobre imagens foram fornecidas. Se estiver escrevendo uma seção de DESENVOLVIMENTO (não introdução/conclusão), considere incorporá-las contextualmente conforme as instruções:
{{{imageInfo}}}
---
{{/if}}

{{#if userImageInputDataUri}}
O usuário também forneceu a seguinte imagem diretamente com sua pergunta atual:
{{media url=userImageInputDataUri}}
---
{{/if}}

Tarefa/prompt atual do usuário: {{{prompt}}}

Responda APENAS com o texto Markdown solicitado. Não adicione comentários ou explicações sobre o que você está fazendo, a menos que o prompt peça explicitamente.
Se o prompt for para gerar uma INTRODUÇÃO, gere APENAS o texto da introdução, sem repetir o título "Introdução".
Se o prompt for para gerar uma SEÇÃO específica (cujo título foi fornecido no prompt), gere APENAS o conteúdo dessa seção, sem repetir o título da seção principal no início da sua resposta.
Se o prompt for para gerar uma CONCLUSÃO, gere APENAS o texto da conclusão, sem repetir o título "Conclusão".
Se o prompt for para gerar uma BIBLIOGRAFIA, gere APENAS a lista de referências.
Sua resposta deve ser EXCLUSIVAMENTE um objeto JSON válido, sem nenhum texto ou formatação Markdown antes ou depois dele.
O objeto JSON deve ter uma única chave "response". O valor dessa chave será o conteúdo solicitado em formato Markdown.
Exemplo de formato de saída JSON esperado:
{
  "response": "Este é o conteúdo Markdown gerado para a tarefa solicitada..."
}
`,
});

const generateAcademicResponseFlow = ai.defineFlow(
  {
    name: 'generateAcademicResponseFlow',
    inputSchema: GenerateAcademicResponseInputSchema,
    outputSchema: GenerateAcademicResponseOutputSchema,
  },
  async (input): Promise<GenerateAcademicResponseOutput> => {
    const {output} = await generateAcademicResponsePrompt(input);
    if (
        !output ||
        typeof output !== 'object' ||
        !output.hasOwnProperty('response') ||
        typeof output.response !== 'string'
      ) {
        const actualOutputForError = output ? JSON.stringify(output, null, 2).substring(0, 300) : String(output);
        console.error(`[generateAcademicResponseFlow] Invalid output structure. Expected { response: string }, got: ${actualOutputForError}`);
        throw new Error(`AI model did not produce the expected output structure for 'response' in generateAcademicResponseFlow. Actual: ${actualOutputForError}...`);
      }
    return output as GenerateAcademicResponseOutput;
  }
);
    
