
'use server';
/**
 * @fileOverview This file is deprecated. Bibliography generation is now handled
 * by the `generate-academic-response-flow`.
 */

console.warn("DEPRECATED: generate-bibliography-flow.ts is no longer used. Use generate-academic-response-flow.ts instead.");

export const GenerateBibliographyInputSchema = {};
export type GenerateBibliographyInput = any;
export type GenerateBibliographyOutput = any;


export async function generateBibliography(input: GenerateBibliographyInput): Promise<GenerateBibliographyOutput> {
  throw new Error("The 'generateBibliography' flow is deprecated. Use 'generateAcademicResponse' flow instead by providing a prompt to generate the bibliography.");
}
    
