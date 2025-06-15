
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
  prompt: `{{#if persona}}You are acting as: {{persona}}.{{/if}}

{{#if rules}}
Please follow these rules when responding:
{{rules}}
---
{{/if}}

{{#if conversationHistory}}
Consider the following recent conversation history:
{{#each conversationHistory}}
{{role}}: {{{content}}}
---
{{/each}}
{{/if}}

{{#if userImageInputDataUri}}
The user has provided the following image with their current query:
{{media url=userImageInputDataUri}}
---
{{/if}}

The output must be formatted in Markdown.
User's current question/prompt: {{prompt}}`,
});

const generateSimpleResponseFlow = ai.defineFlow(
  {
    name: 'generateSimpleResponseFlow',
    inputSchema: GenerateSimpleResponseInputSchema,
    outputSchema: GenerateSimpleResponseOutputSchema,
  },
  async input => {
    const {output} = await generateSimpleResponsePrompt(input);
    return output!;
  }
);

    