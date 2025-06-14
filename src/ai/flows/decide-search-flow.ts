
'use server';
/**
 * @fileOverview Decides whether a web search is necessary to answer a user's query
 * based on the query itself and the context of the last two AI responses.
 *
 * - decideSearchNecessity - A function that initiates the search decision process.
 * - DecideSearchNecessityInput - The input type for the decideSearchNecessity function.
 * - DecideSearchNecessityOutput - The return type for the decideSearchNecessity function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DecideSearchNecessityInputSchema = z.object({
  currentUserQuery: z.string().describe("The user's current question or statement."),
  previousAiResponse1: z.string().optional().describe("The most recent response from the AI. Provide empty string if not available."),
  previousAiResponse2: z.string().optional().describe("The AI response before the most recent one. Provide empty string if not available."),
  targetLanguage: z.string().optional().default('pt-BR').describe("The primary language of the conversation (e.g., 'en', 'es', 'pt-BR')."),
});
export type DecideSearchNecessityInput = z.infer<typeof DecideSearchNecessityInputSchema>;

const DecideSearchNecessityOutputSchema = z.object({
  decision: z.enum(['SEARCH_NEEDED', 'NO_SEARCH_NEEDED']).describe("The decision whether a web search is needed. 'SEARCH_NEEDED' if new information is likely required, 'NO_SEARCH_NEEDED' if the query can be answered from general knowledge or the provided recent conversation context."),
  reasoning: z.string().optional().describe("A brief explanation for the decision (optional, for debugging or logging).")
});
export type DecideSearchNecessityOutput = z.infer<typeof DecideSearchNecessityOutputSchema>;

export async function decideSearchNecessity(
  input: DecideSearchNecessityInput
): Promise<DecideSearchNecessityOutput> {
  return decideSearchNecessityFlow(input);
}

const decideSearchPrompt = ai.definePrompt({
  name: 'decideSearchPrompt',
  input: {schema: DecideSearchNecessityInputSchema},
  output: {schema: DecideSearchNecessityOutputSchema},
  prompt: `You are an intelligent assistant that determines if a web search is necessary to best answer a user's query.
Analyze the user's current query in the context of the last two AI responses (if available).
The conversation language is {{{targetLanguage}}}.

Consider the following:
- Novelty of Topic: Is the user's query about a completely new subject not covered recently? If so, search might be needed.
- Specificity & Factual Need: Does the query ask for specific, verifiable facts, data, current events, or information that might have changed recently (e.g., "What's the weather like?", "Latest stock price for X?", "Who won the match yesterday?")? If yes, search is likely needed.
- Reliance on Previous Context: Can the query be adequately answered by elaborating on, clarifying, or using information already provided in the last two AI responses? If yes, search might not be needed.
- Sufficiency of General Knowledge: Is the query something a general knowledge AI could answer without fresh web data (e.g., "Explain photosynthesis," "What is the capital of France?", "Summarize this text [if text is in query/context]")? If yes, search is likely not needed.
- User Intent: Is the user asking for an opinion, creative text, a general explanation based on common knowledge, or a direct follow-up that builds on the immediate past? These often don't need a new search.

User's Current Query:
{{{currentUserQuery}}}

AI's Most Recent Response (previousAiResponse1):
{{#if previousAiResponse1}}
{{{previousAiResponse1}}}
{{else}}
(No previous AI response provided or it was the first turn)
{{/if}}

AI's Response Before That (previousAiResponse2):
{{#if previousAiResponse2}}
{{{previousAiResponse2}}}
{{else}}
(No second previous AI response provided)
{{/if}}

Based on this analysis, decide if a web search is necessary.
Return 'SEARCH_NEEDED' or 'NO_SEARCH_NEEDED'. Provide brief reasoning if helpful.

Example Scenarios:
1. User Query: "Tell me more about the 'phase clara' you just mentioned." (previousAiResponse1 discussed 'phase clara')
   Decision: NO_SEARCH_NEEDED (Direct follow-up on existing context)
2. User Query: "What were the main export products of Brazil in 2023?"
   Decision: SEARCH_NEEDED (Specific, factual, recent data)
3. User Query: "Can you write a poem about the sunset?"
   Decision: NO_SEARCH_NEEDED (Creative task, general knowledge)
4. User Query: "Who is the current president of France?" (No recent discussion on this)
   Decision: SEARCH_NEEDED (Specific, current fact)
5. User Query: "Explain the concept of black holes."
   Decision: NO_SEARCH_NEEDED (General scientific knowledge, unless user asks for latest discoveries)
6. User Query: "How does that compare to what you said about photosynthesis earlier?" (previousAiResponse1 was about something else, previousAiResponse2 was about photosynthesis)
   Decision: NO_SEARCH_NEEDED (Can be answered by recalling/relating previous distinct contexts from conversation history if available to main LLM).
7. User Query: "What is the latest news on the Mars rover?"
   Decision: SEARCH_NEEDED (Requires very current information).
`,
});

const decideSearchNecessityFlow = ai.defineFlow(
  {
    name: 'decideSearchNecessityFlow',
    inputSchema: DecideSearchNecessityInputSchema,
    outputSchema: DecideSearchNecessityOutputSchema,
  },
  async input => {
    // Provide defaults for optional fields if they are undefined
    const flowInput = {
      ...input,
      previousAiResponse1: input.previousAiResponse1 || "",
      previousAiResponse2: input.previousAiResponse2 || "",
    };
    const {output} = await decideSearchPrompt(flowInput);
    return output!;
  }
);
