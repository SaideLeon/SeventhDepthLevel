
'use server';

/**
 * @fileOverview Generates an academic-style response from the AI, potentially with web context and citations.
 *
 * - generateAcademicResponse - A function that generates an academic response from the AI.
 * - GenerateAcademicResponseInput - The input type for the generateAcademicResponse function.
 * - GenerateAcademicResponseOutput - The return type for the generateAcademicResponse function.
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
  return generateAcademicResponseFlow(input);
}

const generateAcademicResponsePrompt = ai.definePrompt({
  name: 'generateAcademicResponsePrompt',
  input: {schema: GenerateAcademicResponseInputSchema},
  output: {schema: GenerateAcademicResponseOutputSchema},
  prompt: `{{#if persona}}You are acting as: {{persona}}.{{/if}}

{{#if rules}}
Please follow these general rules when responding:
{{rules}}
---
{{/if}}

{{#if conversationHistory}}
Consider the following recent conversation history to understand the context. The user's current query/prompt is provided separately below and is the most recent part of this interaction.
Previous messages (oldest relevant to most recent before current query):
{{#each conversationHistory}}
{{role}}: {{{content}}}
---
{{/each}}
{{/if}}

The output must be formatted in Markdown.
When generating the text, please follow these steps meticulously:
1.  **Structure and Headings**: Structure the academic text with clear and relevant headings (e.g., # Section Title, ## Subsection, etc.) only if appropriate for the section. Use Markdown heading syntax.
2.  **Content Development**: For the heading(s) you create or identify, ensure that the content beneath it is thoroughly developed and expanded upon. Provide detailed explanations, examples, arguments, and supporting details as appropriate for an academic paper.
3.  **Image Placement and Formatting - CRITICAL INSTRUCTIONS**:
    a.  **Contextual Placement**: If images are provided in the context (via \`imageInfo\`), and you determine an image is directly relevant to a specific heading or subheading you are generating, you **MUST** insert that image using Markdown format (\`![alt text](URL)\`) immediately **underneath** that relevant heading.
    b.  **Alt Text**: Use the image's original caption (available from the \`imageInfo\` string, typically in "alt text (URL)" format) as the alt text in the Markdown.
    c.  **URL Formatting - ABSOLUTELY CRITICAL**: For ALL images, you **MUST** ensure that no URL parameters (like '?width=50&blur=10', '?size=small', etc.) are included in the image source URL within the Markdown. ALWAYS use only the base image URL. For example, if the context provides an image as 'https://static.todamateria.com.br/upload/fo/to/fotossistemas.jpg?width=50&blur=10', you MUST render it in Markdown as '![alt text](https://static.todamateria.com.br/upload/fo/to/fotossistemas.jpg)'. This rule applies to all images, including those from a technical sheet (ficha técnica) or any other source mentioned in the context.
4.  **Citation Style - CRITICAL INSTRUCTION: YOU MUST PRIORITIZE NARRATIVE CITATIONS.**
    When citing sources, you **MUST** primarily use a **narrative style**, integrating the author's name directly into the sentence using phrases like "Segundo Autor (data)...", "De acordo com Autor (data)...", "Autor (data) afirma que...", "Autor (data) explica que...", "Como Fulano (ano) aponta...", "Sicrano (ano) argumenta que...".
    **Example of the PREFERRED Narrative Style:**
    *   \`Segundo Castilho (s.d.), no ciclo rápido, o carbono move-se rapidamente...\`
    *   \`De acordo com Batista (s.d.), a fotossíntese transforma a energia luminosa...\`
    *   \`Pinto (2008) explica que a nova reforma só surgirá em 1982...\`
    **AVOID this parenthetical style for paraphrases and short quotes as the primary method:**
    *   \`No ciclo rápido, o carbono move-se rapidamente... (Castilho, s.d.).\`
    *   \`A fotossíntese transforma a energia luminosa... (Batista, s.d.).\`

    While adhering to the American Psychological Association (APA) 7th edition guidelines (author-date system, page numbers for direct quotes), your default approach for all paraphrases and short direct quotes **MUST BE NARRATIVE.**
    *   **Indirect Citation / Paraphrasing (MUST BE NARRATIVE):** Example: \`Pinto (2008) discute como a nova reforma...\` or \`Segundo Pinto (2008), a nova reforma... (p. 29).\` (If page number is relevant for the paraphrase).
    *   **Direct Citation (Short, less than 40 words - MUST BE NARRATIVE):** Incorporate the quote into the text, introducing it with the author's name. Example: \`Silva e Ribeiro (2002) afirmam que era um estágio que conferia “habilitação preferencial para o provimento dos lugares de arquivista” (pp. 143-144).\`
    *   **Direct Citation (Long, 40 words or more):** For long quotes *only*, present them in an indented block. In this specific case, a parenthetical citation at the end of the block is acceptable and standard APA. Example:
        Na década de 70 abre-se um novo período na vida dos profissionais da informação com a criação da primeira associação profissional do sector. Nessa altura:

        > Debatia-se então, o orgulho de ser um profissional BAD sem complexos perante as outras profissões mais afirmativas e com maior reconhecimento social, com estatutos remuneratórios mais compensadores e carreiras mais bem definidas e estruturadas. Foram tempos de mudança, de luta, em que se ganhou consciência de classe. (Queirós, 2001, pp. 1-2)
    *   **Citation of a Citation (Secondary Source - MUST BE NARRATIVE):** Transmit the idea of an author whose original work you have not read, but was cited in another source. Example: \`A pesquisa de Smith indicou... (conforme citado por Jones, 2010, p. 15).\` or \`Smith (conforme citado por Jones, 2010) argumentou que...\`.
5.  **Bibliographic References - MANDATORY**: After all main content and any concluding remarks, you **MUST** include a final section titled 'Referências' (or its equivalent in the target language if specified, e.g., 'References' for English).
    *   In this section, list all unique sources cited throughout your response.
    *   Format each entry in this list according to the American Psychological Association (APA) 7th edition guidelines.
6.  **Final Output**: The final output must be a single Markdown string. Ensure proper Markdown formatting for headings, paragraphs, lists, images, citations, and the reference list.
---

{{#if contextContent}}
Use the following information from a web search to help answer the user's question.
This information was retrieved from the web and should be prioritized.
If the information seems relevant, incorporate it naturally into your response, following all formatting and citation guidelines mentioned above, especially:
- **PRIORITIZE NARRATIVE CITATIONS** (Instruction 4)
- **CRITICAL IMAGE URL FORMATTING** (Instruction 3c)
- **CONTEXTUAL IMAGE PLACEMENT** (Instruction 3a)
- **MANDATORY BIBLIOGRAPHIC REFERENCES** (Instruction 5)
Context:
{{{contextContent}}}

{{#if imageInfo}}
The search also found the following image(s) which might be relevant. Refer to \`imageInfo\` for details like 'alt text (URL)'.
{{{imageInfo}}}
(Remember to place relevant images under their corresponding headings as per instruction 3a and format their URLs correctly as per instruction 3c.)
{{/if}}
---
{{/if}}

{{#if userImageInputDataUri}}
The user has also provided the following image directly with their current query:
{{media url=userImageInputDataUri}}
Please consider this image when forming your response.
---
{{/if}}
User's current question/prompt: {{prompt}}`,
});

const generateAcademicResponseFlow = ai.defineFlow(
  {
    name: 'generateAcademicResponseFlow',
    inputSchema: GenerateAcademicResponseInputSchema,
    outputSchema: GenerateAcademicResponseOutputSchema,
  },
  async (input): Promise<GenerateAcademicResponseOutput> => {
    const {output} = await generateAcademicResponsePrompt(input);
    if (!output) {
      console.error(`Flow ${generateAcademicResponsePrompt.name} returned null output for input:`, input);
      throw new Error(`AI model did not produce the expected output structure for ${generateAcademicResponsePrompt.name}.`);
    }
    return output;
  }
);
