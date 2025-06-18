
'use server';

/**
 * @fileOverview This file is a duplicate of generate-academic-response-flow.ts and will be removed.
 * Please use generate-academic-response-flow.ts for academic-style responses
 * or generate-simple-response-flow.ts for other types of responses.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const GenerateAcademicResponseInputSchema = z.object({
  prompt: z.string().describe('The prompt to send to the AI.'),
  userImageInputDataUri: z.string().optional().describe("A Data URI of an image uploaded by the user with their prompt. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  persona: z.string().optional().describe('The persona the AI should adopt.'),
  rules: z.string().optional().describe('Specific rules the AI should follow when responding.'),
  contextContent: z.string().optional().describe('Additional context obtained from web scraping to help answer the prompt.'),
  imageInfo: z.string().optional().describe('Information about images found during web scraping, if any (e.g., list of image URLs or descriptions in the format "alt text (URL)").'),
  conversationHistory: z.array(MessageSchema).optional().describe('The recent history of the conversation, to provide context. User\'s current query is separate in "prompt". Ordered from oldest to newest relevant message.'),
});
export type GenerateAcademicResponseInput = z.infer<typeof GenerateAcademicResponseInputSchema>;

const GenerateAcademicResponseOutputSchema = z.object({
  response: z.string().describe('The AI generated academic response.'),
});
export type GenerateAcademicResponseOutput = z.infer<typeof GenerateAcademicResponseOutputSchema>;

export async function generateAcademicResponse(input: GenerateAcademicResponseInput): Promise<GenerateAcademicResponseOutput> {
  // This function body is intentionally left simple as the file is marked for removal.
  // It calls a placeholder prompt to avoid build errors if still imported.
  console.warn("DEPRECATED: generate-response.ts is being called. Use generate-academic-response-flow.ts or generate-simple-response-flow.ts instead.");
  
  const placeholderPrompt = ai.definePrompt({
    name: 'placeholderAcademicResponsePromptForDeprecatedFile',
    input: {schema: GenerateAcademicResponseInputSchema},
    output: {schema: GenerateAcademicResponseOutputSchema},
    prompt: `This is a placeholder prompt from a deprecated file. User asked: {{prompt}}`,
  });

  const {output} = await placeholderPrompt(input);
  return output!;
}
    