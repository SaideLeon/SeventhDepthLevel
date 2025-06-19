
import { NextRequest, NextResponse } from "next/server";
import { generateAcademicResponse, type GenerateAcademicResponseInput, type GenerateAcademicResponseOutput } from "@/ai/flows/generate-academic-response-flow";
import type { FichaLeitura } from '@/types'; // Import FichaLeitura from main types

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
        prompt, 
        userImageInputDataUri, 
        persona, 
        rules, 
        contextContent, // This will carry formatted fichas or other context
        imageInfo, 
        conversationHistory,
        targetLanguage,
        citationStyle 
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "O campo 'prompt' (contendo a tarefa acadêmica) é obrigatório." },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const flowInput: GenerateAcademicResponseInput = {
      prompt,
      userImageInputDataUri,
      persona,
      rules,
      contextContent,
      imageInfo,
      conversationHistory,
      targetLanguage: targetLanguage || "pt-BR",
      citationStyle: citationStyle || "APA",
    };

    const result: GenerateAcademicResponseOutput = await generateAcademicResponse(flowInput);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/generate-academic-prose:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during academic prose generation";
    return NextResponse.json(
      { error: "Falha ao gerar o conteúdo acadêmico.", details: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
    
