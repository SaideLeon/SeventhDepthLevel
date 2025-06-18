
import {NextRequest, NextResponse } from 'next/server';
import { generateAcademicSection, type GenerateAcademicSectionInput, type GenerateAcademicSectionOutput } from '@/ai/flows/generate-academic-section-flow';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sectionTitle, mainTopic, fichasDeLeitura, completedSections, targetLanguage, citationStyle, wordCountTarget } = body;

    const missingFields = [];
    if (!sectionTitle) missingFields.push('sectionTitle');
    if (!mainTopic) missingFields.push('mainTopic');
    // fichasDeLeitura and completedSections are optional

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Campo(s) obrigatório(s) ausente(s): ${missingFields.join(', ')}` },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const input: GenerateAcademicSectionInput = {
     sectionTitle,
     mainTopic,
     fichasDeLeitura: fichasDeLeitura || [],
     completedSections: completedSections || [],
     targetLanguage: targetLanguage || "pt-BR",
     citationStyle: citationStyle || "APA",
     wordCountTarget: wordCountTarget ? parseInt(wordCountTarget, 10) : 500,
    };

    const result: GenerateAcademicSectionOutput = await generateAcademicSection(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating academic section:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during academic section generation";
    return NextResponse.json(
      { error: "Falha ao gerar o conteúdo da seção.", details: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
    