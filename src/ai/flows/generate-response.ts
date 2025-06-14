
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
Please follow these general rules when responding:
{{rules}}
---
{{/if}}

The output must be formatted in Markdown.
When generating the text, please follow these steps:
1.  Structure the academic text with clear and relevant headings (e.g., # Section Title, ## Subsection, etc.) only if appropriate for the section. Use Markdown heading syntax.
2.  For the heading(s) you create or identify from the instructions, ensure that the content beneath it is thoroughly developed and expanded upon. Provide detailed explanations, examples, arguments, and supporting details as appropriate for an academic paper.
3.  **Citation Style - CRITICAL INSTRUCTION: YOU MUST PRIORITIZE NARRATIVE CITATIONS.**
    When citing sources, you **MUST** primarily use a **narrative style**, integrating the author's name directly into the sentence.
    **Example of the PREFERRED Narrative Style:**
    *   \`Segundo Castilho (s.d.), no ciclo rápido, o carbono move-se rapidamente...\`
    *   \`De acordo com Castilho (s.d.), este ciclo envolve...\`
    **AVOID this parenthetical style for paraphrases and short quotes:**
    *   \`No ciclo rápido, o carbono move-se rapidamente... (Castilho, s.d.).\`

    While adhering to the American Psychological Association (APA) 7th edition guidelines (author-date system, page numbers for direct quotes), your default approach for all paraphrases and short direct quotes **MUST BE NARRATIVE.**
    *   **Indirect Citation / Paraphrasing (MUST BE NARRATIVE):** Example: \`Pinto (2008) discute como a nova reforma...\` or \`Segundo Pinto (2008), a nova reforma... (p. 29).\` (If page number is relevant for the paraphrase).
    *   **Direct Citation (Short, less than 40 words - MUST BE NARRATIVE):** Incorporate the quote into the text, introducing it with the author's name. Example: \`Silva e Ribeiro (2002) afirmam que era um estágio que conferia “habilitação preferencial para o provimento dos lugares de arquivista” (pp. 143-144).\`
    *   **Direct Citation (Long, 40 words or more):** For long quotes *only*, present them in an indented block. In this specific case, a parenthetical citation at the end of the block is acceptable and standard APA. Example:
        Na década de 70 abre-se um novo período na vida dos profissionais da informação com a criação da primeira associação profissional do sector. Nessa altura:

        > Debatia-se então, o orgulho de ser um profissional BAD sem complexos perante as outras profissões mais afirmativas e com maior reconhecimento social, com estatutos remuneratórios mais compensadores e carreiras mais bem definidas e estruturadas. Foram tempos de mudança, de luta, em que se ganhou consciência de classe. (Queirós, 2001, pp. 1-2)
    *   **Citation of a Citation (Secondary Source - MUST BE NARRATIVE):** Transmit the idea of an author whose original work you have not read, but was cited in another source. Example: \`A pesquisa de Smith indicou... (conforme citado por Jones, 2010, p. 15).\` or \`Smith (conforme citado por Jones, 2010) argumentou que...\`.
4.  For all images, never include any URL parameters (such as '?width=50&blur=10') in the image source. Always use only the base image URL (e.g., 'https://static.todamateria.com.br/upload/fo/to/fotossistemas.jpg') when inserting images into the Markdown using the format: ![alt text](URL). This applies to all images, including those from the technical sheet (ficha técnica) and any other source.
5.  The final output must be a single Markdown string. Ensure proper Markdown formatting for headings, paragraphs, lists, images, citations, etc.
---

{{#if contextContent}}
Use the following information from a web search to help answer the user's question.
This information was retrieved from the web and should be prioritized.
If the information seems relevant, incorporate it naturally into your response, following all formatting and citation guidelines mentioned above, especially the **CRITICAL INSTRUCTION TO PRIORITIZE NARRATIVE CITATIONS**.
Context:
{{{contextContent}}}

{{#if imageInfo}}
The search also found the following image(s) which might be relevant:
{{{imageInfo}}}
(You do not need to display the images or directly reference them unless it's natural to the conversation, just be aware of their existence and content if described. If you do reference an image, use the Markdown format ![alt text](URL) and adhere to the image URL formatting rules mentioned above.)
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

