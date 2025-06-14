
'use server';

/**
 * @fileOverview Generates a response from the AI and displays it with a typewriter effect.
 *
 * - generateResponse - A function that generates a response from the AI.
 * - GenerateResponseInput - The input type for the generateResponse function.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateResponseInputSchema = z.object({
  prompt: z.string().describe('The prompt to send to the AI.'),
  persona: z.string().optional().describe('The persona the AI should adopt.'),
  rules: z.string().optional().describe('Specific rules the AI should follow when responding.'),
  contextContent: z.string().optional().describe('Additional context obtained from web scraping to help answer the prompt.'),
  imageInfo: z.string().optional().describe('Information about images found during web scraping, if any (e.g., list of image URLs or descriptions).'),
});
export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The AI generated response.'),
});
export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
  return generateResponseFlow(input);
}

const generateResponsePrompt = ai.definePrompt({
  name: 'generateResponsePrompt',
  input: {schema: GenerateResponseInputSchema},
  output: {schema: GenerateResponseOutputSchema},
  prompt: `{{#if persona}}You are acting as: {{persona}}.{{/if}}

{{#if rules}}
Please follow these rules when responding:
{{rules}}
---
{{/if}}

{{#if contextContent}}
Use the following information from a web search to help answer the user's question.
This information was retrieved from the web and should be prioritized.
If the information seems relevant, incorporate it naturally into your response.
Context:
{{{contextContent}}}

{{#if imageInfo}}
The search also found the following image(s) which might be relevant:
{{{imageInfo}}}
(You do not need to display the images or directly reference them unless it's natural to the conversation, just be aware of their existence and content if described).
{{/if}}
---
{{/if}}

User's question: {{prompt}}`,
});

const generateResponseFlow = ai.defineFlow(
  {
    name: 'generateResponseFlow',
    inputSchema: GenerateResponseInputSchema,
    outputSchema: GenerateResponseOutputSchema,
  },
  async input => {
    const {output} = await generateResponsePrompt(input);
    return output!;
  }
);
