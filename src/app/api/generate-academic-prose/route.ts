
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
        imageInfo, // Added this field
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
      imageInfo, // Pass it to the flow
      conversationHistory,
      targetLanguage: targetLanguage || "pt-BR",
      citationStyle: citationStyle || "APA",
    };

    const result: GenerateAcademicResponseOutput = await generateAcademicResponse(flowInput);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/generate-academic-prose:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during academic prose generation";
    // Log the full error if it's an AI flow error
    if (error && typeof error === 'object' && 'message' in error && (error as any).message.includes("AI model did not produce")) {
        console.error("Detailed AI Flow Error:", JSON.stringify(error, null, 2));
    }
    return NextResponse.json(
      { error: "Falha ao gerar o conteúdo acadêmico.", details: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
    
