
'use server';
/**
 * @fileOverview Detects the type of user query to route to the appropriate AI flow.
 *
 * - detectQueryType - A function that initiates the query type detection process.
 * - DetectQueryTypeInput - The input type for the detectQueryType function.
 * - DetectQueryTypeOutput - The return type for the detectQueryType function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectQueryTypeInputSchema = z.object({
  currentUserQuery: z
    .string()
    .describe('The user\'s current question or statement.'),
  userImageProvided: z
    .boolean()
    .describe('Whether the user has provided an image with their query.'),
  targetLanguage: z
    .string()
    .optional()
    .default('pt-BR')
    .describe('The primary language of the conversation (e.g., "en", "es", "pt-BR").'),
});
export type DetectQueryTypeInput = z.infer<typeof DetectQueryTypeInputSchema>;

const DetectQueryTypeOutputSchema = z.object({
  queryType: z
    .enum(['IMAGE_ANALYSIS', 'CODING_TECHNICAL', 'ACADEMIC_RESEARCH', 'GENERAL_CONVERSATION'])
    .describe(
      "The classified type of the user's query. " +
      "'IMAGE_ANALYSIS': If user provided an image. " +
      "'CODING_TECHNICAL': For programming, software, or technical computing queries. " +
      "'ACADEMIC_RESEARCH': For queries requiring in-depth information, facts, or structured explanations. " +
      "'GENERAL_CONVERSATION': For casual chat, simple questions, or creative requests not fitting other categories."
    ),
    reasoning: z.string().optional().describe("A brief explanation for the decision (optional, for debugging or logging).")
});
export type DetectQueryTypeOutput = z.infer<typeof DetectQueryTypeOutputSchema>;

export async function detectQueryType(
  input: DetectQueryTypeInput
): Promise<DetectQueryTypeOutput> {
  return detectQueryTypeFlow(input);
}

const detectQueryTypePrompt = ai.definePrompt({
  name: 'detectQueryTypePrompt',
  input: {schema: DetectQueryTypeInputSchema},
  output: {schema: DetectQueryTypeOutputSchema},
  prompt: `You are an expert query classifier. Your task is to determine the nature of the user's query.
The conversation language is {{{targetLanguage}}}.

User has provided an image: {{#if userImageProvided}}Yes{{else}}No{{/if}}.
User query: "{{currentUserQuery}}"

Classify the query into one of the following categories and provide your reasoning:
- 'IMAGE_ANALYSIS': If an image was provided by the user with their query. This category takes precedence over all others if an image is present.
- 'CODING_TECHNICAL': If the query is primarily about programming, software development, code, algorithms, data structures, specific programming languages (e.g., Python, JavaScript, Java, C++, SQL, HTML, CSS), frameworks (e.g., React, Angular, Django, Next.js), debugging, software errors, software architecture, technical computing concepts, command-line interfaces, APIs, or requests to write or explain code.
- 'ACADEMIC_RESEARCH': If the query seeks detailed explanations, factual information that might require in-depth research or citations, historical context, scientific concepts, complex topics typically found in academic settings, or requests for essays/reports. Assume this if it's not clearly coding, image-related, or simple conversation, especially if the user expects a well-structured and sourced answer.
- 'GENERAL_CONVERSATION': For casual conversation, simple questions that can be answered from general knowledge without needing web search or citations, creative requests (like writing a short poem if not for an academic purpose), opinions, or general inquiries not fitting other categories.

If an image is present, the type MUST be 'IMAGE_ANALYSIS'.
If no image, then prioritize 'CODING_TECHNICAL' if the query strongly matches its description.
Otherwise, distinguish between 'ACADEMIC_RESEARCH' and 'GENERAL_CONVERSATION'.

Respond with the classification in the 'queryType' field and a brief reasoning in the 'reasoning' field.
If the query is empty or just says "hi", classify as 'GENERAL_CONVERSATION'.
If 'currentUserQuery' is empty and 'userImageProvided' is true, classify as 'IMAGE_ANALYSIS'.

Example Classifications:
1. User Query: "Explique a teoria da relatividade.", Image Provided: No -> queryType: 'ACADEMIC_RESEARCH', reasoning: "Query asks for a detailed explanation of a scientific concept."
2. User Query: "Como faço um loop for em Python?", Image Provided: No -> queryType: 'CODING_TECHNICAL', reasoning: "Query is about Python programming."
3. User Query: "Olá, como você está?", Image Provided: No -> queryType: 'GENERAL_CONVERSATION', reasoning: "Casual greeting."
4. User Query: "Descreva esta imagem.", Image Provided: Yes -> queryType: 'IMAGE_ANALYSIS', reasoning: "User provided an image and asked for a description."
5. User Query: "Quais foram as principais causas da Primeira Guerra Mundial?", Image Provided: No -> queryType: 'ACADEMIC_RESEARCH', reasoning: "Query asks for historical facts and causes, suitable for research."
6. User Query: "Me fale sobre o que está nesta foto de um gato.", Image Provided: Yes -> queryType: 'IMAGE_ANALYSIS', reasoning: "User provided an image and asked about it."
7. User Query: "Preciso de ajuda com um erro no meu código React.", Image Provided: No -> queryType: 'CODING_TECHNICAL', reasoning: "Query asks for help with a React code error."
8. User Query: "", Image Provided: Yes -> queryType: 'IMAGE_ANALYSIS', reasoning: "User provided an image without specific text query."
`,
});

const detectQueryTypeFlow = ai.defineFlow(
  {
    name: 'detectQueryTypeFlow',
    inputSchema: DetectQueryTypeInputSchema,
    outputSchema: DetectQueryTypeOutputSchema,
  },
  async (input: DetectQueryTypeInput) => {
    // Handle edge case for empty query with image directly
    if (input.userImageProvided && !input.currentUserQuery.trim()) {
      return {
        queryType: 'IMAGE_ANALYSIS',
        reasoning: 'User provided an image without a specific text query.',
      };
    }
    const {output} = await detectQueryTypePrompt(input);
    return output!;
  }
);

    