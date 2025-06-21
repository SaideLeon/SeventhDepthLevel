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
  prompt: z.string().describe('The prompt to send to the AI. This should clearly state the academic task (e.g., "Write an introduction for...", "Develop the section titled \'X\' using the provided context...", "Write the conclusion for...", "Generate the bibliography...").'),
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
1.  **Estrutura e Cabeçalhos**:
    a.  **Título Principal da Seção**: Se o prompt atual pedir para você gerar o conteúdo para UMA seção específica (ex: "Desenvolva a seção 'Título da Seção X'...", "Escreva a introdução para...", "Escreva a conclusão para..."), você **DEVE** iniciar sua resposta com o título principal dessa seção formatado como um cabeçalho Markdown de nível 2 (por exemplo, '## Introdução', '## Título da Seção X', '## Conclusão').
    b.  **Sub-cabeçalhos**: Você pode usar sub-cabeçalhos (ex: ### Subtítulo, #### Outro Subtítulo) dentro do conteúdo da seção que está gerando, se for apropriado para organizar o texto abaixo do título principal.
2.  **Desenvolvimento do Conteúdo**:
    a. Para o(s) cabeçalho(s) que você criar ou identificar, assegure que o conteúdo abaixo dele seja completamente desenvolvido e expandido.
    b. **Foco Estrito na Seção**: Se estiver a desenvolver uma seção de conteúdo (ou seja, não a Introdução nem a Conclusão), a sua tarefa é focar-se exclusivamente no desenvolvimento desse tópico. **NÃO** adicione uma introdução, um resumo prévio ou uma conclusão dentro do corpo desta seção.
    c. **Evite Frases de Fechamento**: Não use palavras ou frases de fechamento como "Em resumo", "portanto", "entretanto", "em conclusão". A sua tarefa é apenas detalhar, explicar e citar autores conforme necessário. Simplesmente desenvolva o tópico.
3.  **Uso e Posicionamento de Imagens - INSTRUÇÕES CRÍTICAS (APENAS PARA SEÇÕES DE DESENVOLVIMENTO. NÃO USE IMAGENS na Introdução, Conclusão ou Metodologia)**:
    a.  **Relevância Contextual**: Use uma imagem do contexto ('imageInfo' ou das fichas de leitura) somente se ela ilustrar DIRETAMENTE o conceito que você acabou de explicar no texto. A imagem serve como um auxílio visual para o conteúdo escrito.
    b.  **Posicionamento Correto**: PRIMEIRO, escreva o parágrafo ou trecho que explica um determinado assunto. DEPOIS, se houver uma imagem relevante para esse assunto, insira-a na linha seguinte. NÃO insira a imagem antes de explicar o conceito relacionado a ela.
    c.  **Função da Imagem**: Sua tarefa é explicar o assunto, não a imagem. A imagem deve ilustrar o que você explicou. Não adicione texto que apenas descreve o que está na imagem.
    d.  **Não Agrupar Imagens**: NÃO insira várias imagens seguidas sem texto explicativo entre elas. Cada imagem deve estar associada a um trecho de texto que a contextualiza.
    e.  **Formato Markdown**: Insira a imagem usando o formato Markdown: '![texto alternativo](URL)'.
    f.  **Texto Alternativo**: Use a legenda original da imagem (disponível em 'imageInfo' ou na ficha de leitura) como o "texto alternativo".
    g.  **Formatação de URL - CRÍTICO**: Para TODAS as imagens, você DEVE garantir que nenhum parâmetro de URL (como '?width=50', '?size=small') seja incluído na URL de origem da imagem. Use sempre a URL base.
4.  **Estilo de Citação - INSTRUÇÃO CRÍTICA: VOCÊ DEVE PRIORIZAR CITAÇÕES NARRATIVAS.**
    Ao citar fontes (informações de 'contextContent'), use primariamente um **estilo narrativo**, integrando o nome do autor diretamente na frase (ex: "Segundo Autor (data)...", "De acordo com Autor (data)..."). Siga as diretrizes da APA 7ª edição (autor-data, número de página para citações diretas).
    **Exemplo do Estilo Narrativo PREFERIDO:**
    *   'Segundo Castilho (s.d.), no ciclo rápido, o carbono move-se rapidamente...'
    *   'Pinto (2008) explica que a nova reforma só surgirá em 1982...'
    **EVITE este estilo parentético para paráfrases e citações curtas como método principal:**
    *   'No ciclo rápido, o carbono move-se rapidamente... (Castilho, s.d.).'
5.  **Referências Bibliográficas - OBRIGATÓRIO (SE O PROMPT FOR ESPECIFICAMENTE SOBRE GERAR REFERÊNCIAS)**: Se o prompt atual pedir explicitamente para gerar uma lista de referências (ex: "Gere a bibliografia baseada nestas fichas"), você **DEVE** iniciar sua resposta com o título '## Referências Bibliográficas' (ou um equivalente apropriado no idioma de destino) e, em seguida, listar todas as fontes únicas fornecidas no contexto, formatadas conforme o estilo de citação solicitado (ex: {{{citationStyle}}}). CASO CONTRÁRIO, se o prompt for para gerar introdução, seção ou conclusão, NÃO adicione uma lista de referências no final dessa parte específica.
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
Se o prompt for para gerar uma INTRODUÇÃO, sua resposta DEVE começar com '## Introdução' seguido pelo conteúdo da introdução.
Se o prompt for para gerar uma SEÇÃO específica (cujo título foi fornecido no prompt, por exemplo, 'Minha Seção'), sua resposta DEVE começar com '## Minha Seção' (usando o título exato fornecido) seguido pelo conteúdo da seção.
Se o prompt for para gerar uma CONCLUSÃO, sua resposta DEVE começar com '## Conclusão' seguido pelo conteúdo da conclusão.
Se o prompt for para gerar uma BIBLIOGRAFIA, sua resposta DEVE começar com '## Referências Bibliográficas' seguido pela lista de referências.
Sua resposta deve ser EXCLUSIVAMENTE um objeto JSON válido, sem nenhum texto ou formatação Markdown antes ou depois dele.
O objeto JSON deve ter uma única chave "response". O valor dessa chave será o conteúdo solicitado em formato Markdown, incluindo o título da seção conforme instruído acima.
Exemplo de formato de saída JSON esperado para uma seção "Exemplo de Título":
{
  "response": "## Exemplo de Título\\n\\nEste é o conteúdo Markdown gerado para a seção..."
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
    