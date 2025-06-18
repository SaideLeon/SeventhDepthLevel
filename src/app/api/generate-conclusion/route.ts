
import {NextRequest, NextResponse } from 'next/server';
import { generateConclusion, type GenerateConclusionInput, type GenerateConclusionOutput } from '@/ai/flows/generate-conclusion-flow';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mainTopic, introductionContent, developedSectionsContent, targetLanguage } = body;

    const missingFields = [];
    if (!mainTopic) missingFields.push('mainTopic');
    if (!developedSectionsContent || !Array.isArray(developedSectionsContent) || developedSectionsContent.length === 0) {
      missingFields.push('developedSectionsContent (array não vazio)');
    }
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Campo(s) obrigatório(s) ausente(s): ${missingFields.join(', ')}`},
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const input: GenerateConclusionInput = { 
      mainTopic,
      introductionContent: introductionContent || undefined,
      developedSectionsContent,
      targetLanguage: targetLanguage || "pt-BR",
    };

    const result: GenerateConclusionOutput = await generateConclusion(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating conclusion:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during conclusion generation";
    return NextResponse.json(
      { error: "Falha ao gerar a conclusão.", details: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
    