'use server';
/**
 * @fileOverview Generates a concise session title based on the initial user-AI interaction.
 *
 * - generateSessionTitle - A function that initiates the title generation process.
 * - GenerateSessionTitleInput - The input type for the generateSessionTitle function.
 * - GenerateSessionTitleOutput - The return type for the generateSessionTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSessionTitleInputSchema = z.object({
  userFirstMessageContent: z
    .string()
    .describe("The content of the user's first message in the session."),
  aiFirstResponseContent: z
    .string()
    .describe("The content of the AI's first response in the session."),
  targetLanguage: z
    .string()
    .optional()
    .default('pt-BR')
    .describe('The language for the generated title (e.g., "en", "es", "pt-BR").'),
});
export type GenerateSessionTitleInput = z.infer<typeof GenerateSessionTitleInputSchema>;

const GenerateSessionTitleOutputSchema = z.object({
  generatedTitle: z
    .string()
    .describe('A concise, descriptive title for the session (max 5 words).'),
});
export type GenerateSessionTitleOutput = z.infer<typeof GenerateSessionTitleOutputSchema>;

export async function generateSessionTitle(
  input: GenerateSessionTitleInput
): Promise<GenerateSessionTitleOutput> {
  return generateSessionTitleFlow(input);
}

const generateSessionTitlePrompt = ai.definePrompt({
  name: 'generateSessionTitlePrompt',
  input: {schema: GenerateSessionTitleInputSchema},
  output: {schema: GenerateSessionTitleOutputSchema},
  prompt: `Based on the user's first message and the AI's first response, generate a very short and concise title (max 5 words) for this conversation.
The title must be in {{{targetLanguage}}}.
The title should summarize the *main topic or subject* of the conversation. Avoid simply repeating the user's question if it is one.
Instead, create a title that describes what the conversation is *about*.

User's first message: "{{userFirstMessageContent}}"
AI's first response: "{{aiFirstResponseContent}}"

Return only the generated title in the 'generatedTitle' field.

Examples:
- User: "Qual a capital da França?" AI: "A capital da França é Paris." -> Title: "Capital da França"
- User: "Explique fotossíntese." AI: (explains) -> Title: "Sobre Fotossíntese" or "Explicação Fotossíntese"
- User: (image of a dog) AI: "Esta é uma imagem de um cachorro." -> Title: "Imagem: Cachorro" or "Análise de Imagem"
- User: "Preciso de um código em Python para um loop for." AI: (provides code) -> Title: "Loop For Python" or "Código Python"
- User: "o que é sistema digestivo" AI: "O sistema digestivo é responsável por..." -> Title: "Sistema Digestivo"

Be very concise. Focus on the subject.
`,
});

const generateSessionTitleFlow = ai.defineFlow(
  {
    name: 'generateSessionTitleFlow',
    inputSchema: GenerateSessionTitleInputSchema,
    outputSchema: GenerateSessionTitleOutputSchema,
  },
  async (input: GenerateSessionTitleInput) => {
    const {output} = await generateSessionTitlePrompt(input);
    if (!output) {
      console.error(`Flow ${generateSessionTitlePrompt.name} returned null output for input:`, input);
      // Fallback to a generic title if AI fails to generate one
      return { generatedTitle: "Nova Conversa" };
    }
    return output;
  }
);
