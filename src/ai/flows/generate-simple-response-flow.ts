
'use server';

/**
 * @fileOverview Generates a simple response from the AI, suitable for direct answers, image analysis, or coding queries.
 *
 * - generateSimpleResponse - A function that generates a simple response from the AI.
 * - GenerateSimpleResponseInput - The input type for the generateSimpleResponse function.
 * - GenerateSimpleResponseOutput - The return type for the generateSimpleResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Shared MessageSchema for conversation history
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const GenerateSimpleResponseInputSchema = z.object({
  prompt: z.string().describe('The prompt to send to the AI.'),
  userImageInputDataUri: z.string().optional().describe("A Data URI of an image uploaded by the user with their prompt. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  persona: z.string().optional().describe('The persona the AI should adopt.'),
  rules: z.string().optional().describe('Specific rules the AI should follow when responding.'),
  conversationHistory: z.array(MessageSchema).optional().describe('The recent history of the conversation, to provide context. User\'s current query is separate in "prompt". Ordered from oldest to newest relevant message.'),
});
export type GenerateSimpleResponseInput = z.infer<typeof GenerateSimpleResponseInputSchema>;

const GenerateSimpleResponseOutputSchema = z.object({
  response: z.string().describe('The AI generated response.'),
});
export type GenerateSimpleResponseOutput = z.infer<typeof GenerateSimpleResponseOutputSchema>;

export async function generateSimpleResponse(input: GenerateSimpleResponseInput): Promise<GenerateSimpleResponseOutput> {
  return generateSimpleResponseFlow(input);
}

const generateSimpleResponsePrompt = ai.definePrompt({
  name: 'generateSimpleResponsePrompt',
  input: {schema: GenerateSimpleResponseInputSchema},
  output: {schema: GenerateSimpleResponseOutputSchema},
  prompt: `Você é o Cognick, um assistente de IA focado em ajudar com estudos e aprendizado escolar. Sua missão é ser um companheiro prestativo e amigável para estudantes.

**Sobre sua identidade:**
*   Se o usuário perguntar quem você é, qual sua natureza (ex: 'Quem é você?', 'Você é uma IA?', 'Você é o ChatGPT?'), responda de forma concisa que você é o **'Cognick', seu assistente virtual para estudos.**
*   Se o usuário perguntar sobre sua criação ou origem (ex: 'Quem te criou?', 'De onde você veio?'), responda que você é o Cognick, um projeto desenvolvido por Saíde Omar Saíde para auxiliar nos estudos. Você pode dizer algo como: **"Eu sou o Cognick, um projeto idealizado e desenvolvido por Saíde Omar Saíde para ser seu parceiro nos estudos! Meu foco é te ajudar a aprender e tirar suas dúvidas escolares."**
*   **Importante:** NÃO se descreva como um 'modelo de linguagem grande', 'treinado pelo Google', ou qualquer variação disso. Não mencione sua origem de treinamento específica ou a empresa por trás da tecnologia que o compõe, a menos que seja para mencionar Saíde Omar Saíde como o desenvolvedor.
*   Mantenha sempre a conversa focada em auxiliar o usuário com suas dúvidas escolares.
---

{{#if persona}}Você está agindo como: {{persona}}.{{else}}Sua persona padrão é 'Cognick, seu assistente de estudos'.{{/if}}

{{#if rules}}
Por favor, siga estas regras ao responder:
{{rules}}
---
{{/if}}

{{#if conversationHistory}}
Considere o seguinte histórico recente da conversa:
{{#each conversationHistory}}
{{role}}: {{{content}}}
---
{{/each}}
{{/if}}

{{#if userImageInputDataUri}}
O usuário forneceu a seguinte imagem com sua pergunta atual:
{{media url=userImageInputDataUri}}
---
{{/if}}

A saída deve ser formatada em Markdown.
Pergunta/prompt atual do usuário: {{prompt}}`,
});

const generateSimpleResponseFlow = ai.defineFlow(
  {
    name: 'generateSimpleResponseFlow',
    inputSchema: GenerateSimpleResponseInputSchema,
    outputSchema: GenerateSimpleResponseOutputSchema,
  },
  async (input): Promise<GenerateSimpleResponseOutput> => {
    const {output} = await generateSimpleResponsePrompt(input);
    if (!output) {
      console.error(`Flow ${generateSimpleResponsePrompt.name} returned null output for input:`, input);
      throw new Error(`AI model did not produce the expected output structure for ${generateSimpleResponsePrompt.name}.`);
    }
    return output;
  }
);
