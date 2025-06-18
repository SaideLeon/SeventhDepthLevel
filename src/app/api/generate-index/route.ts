
import { NextRequest, NextResponse } from "next/server";
import { generateIndex, type GenerateIndexInput, type GenerateIndexOutput } from "@/ai/flows/generate-index-flow";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mainTopic, targetLanguage, numSections } = body;

    if (!mainTopic) {
      return NextResponse.json(
        { error: "mainTopic é obrigatório." },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const indexInput: GenerateIndexInput = {
      mainTopic,
      targetLanguage: targetLanguage || "pt-BR",
      numSections: numSections ? parseInt(numSections, 10) : undefined,
    };

    const result: GenerateIndexOutput = await generateIndex(indexInput);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating index:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during index generation";
    return NextResponse.json(
      { error: "Falha ao gerar o índice.", details: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
    