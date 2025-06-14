
'use server';
/**
 * @fileOverview Detects the main topic from a given text or user query.
 *
 * - detectTopicFromText - A function that initiates the topic detection process.
 * - DetectTopicFromTextInput - The input type for the detectTopicFromText function.
 * - DetectTopicFromTextOutput - The return type for the detectTopicFromText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectTopicFromTextInputSchema = z.object({
  textQuery: z
    .string()
    .describe('The user query or text from which to detect the main topic.'),
  targetLanguage: z
    .string()
    .optional()
    .default('pt-BR')
    .describe('The language of the input text (e.g., "en", "es", "fr", "pt-BR"). The detected topic should also be in this language.'),
});
export type DetectTopicFromTextInput = z.infer<typeof DetectTopicFromTextInputSchema>;

const DetectTopicFromTextOutputSchema = z.object({
  detectedTopic: z
    .string()
    .describe('The main topic detected from the text, in the specified target language. Should be a concise keyword or short phrase suitable for a search query.'),
});
export type DetectTopicFromTextOutput = z.infer<typeof DetectTopicFromTextOutputSchema>;

export async function detectTopicFromText(
  input: DetectTopicFromTextInput
): Promise<DetectTopicFromTextOutput> {
  return detectTopicFromTextFlow(input);
}

const detectTopicPrompt = ai.definePrompt({
  name: 'detectTopicPrompt',
  input: {schema: DetectTopicFromTextInputSchema},
  output: {schema: DetectTopicFromTextOutputSchema},
  prompt: `You are an expert in identifying the core subject of a query.
Your task is to extract the main topic or central theme from the provided text.
The text is in {{{targetLanguage}}}.
The detected topic should be a concise keyword or a short phrase suitable for a web search query, also in {{{targetLanguage}}}.

Text/Query:
{{{textQuery}}}

Return only the main topic in the 'detectedTopic' field.
For example:
- If the text is "Qual a capital da França?", the topic might be "capital da França".
- If the text is "Explique a teoria da relatividade de Einstein.", the topic might be "teoria da relatividade de Einstein".
- If the text is "Tell me about photosynthesis.", the topic might be "photosynthesis".
- If the text is "How to bake a chocolate cake?", the topic might be "chocolate cake recipe".
- If the text is "História da Segunda Guerra Mundial", the topic might be "Segunda Guerra Mundial".
`,
});

const detectTopicFromTextFlow = ai.defineFlow(
  {
    name: 'detectTopicFromTextFlow',
    inputSchema: DetectTopicFromTextInputSchema,
    outputSchema: DetectTopicFromTextOutputSchema,
  },
  async input => {
    const {output} = await detectTopicPrompt(input);
    return output!;
  }
);
