
import { NextRequest, NextResponse } from "next/server";
import { generateBibliography, type GenerateBibliographyInput, type GenerateBibliographyOutput } from "@/ai/flows/generate-bibliography-flow";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fichasDeLeitura, citationStyle, targetLanguage } = body;

    const missingFields = [];
    if (!fichasDeLeitura || !Array.isArray(fichasDeLeitura)) { // fichasDeLeitura can be an empty array
      missingFields.push("fichasDeLeitura (array)");
    }
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Campo(s) obrigatório(s) ausente(s) ou tipo inválido: ${missingFields.join(", ")}` },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const input: GenerateBibliographyInput = { 
        fichasDeLeitura,
        citationStyle: citationStyle || "APA",
        targetLanguage: targetLanguage || "pt-BR",
    };

    const result: GenerateBibliographyOutput = await generateBibliography(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating bibliography:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during bibliography generation";
    return NextResponse.json(
      { error: "Falha ao gerar a bibliografia.", details: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
    