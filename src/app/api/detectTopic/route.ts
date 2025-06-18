
import { NextRequest, NextResponse } from "next/server";
import { detectTopicFromText, type DetectTopicFromTextInput, type DetectTopicFromTextOutput } from "@/ai/flows/detect-topic-flow";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { textQuery, targetLanguage } = body; // Changed from topicTitles to textQuery

    if (!textQuery) { // Check for textQuery
      return NextResponse.json(
        { error: "textQuery (tema para detecção) é obrigatório." },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const topicInput: DetectTopicFromTextInput = {
           textQuery: textQuery, // Use textQuery
           targetLanguage: targetLanguage || "pt-BR",
         };

    const topicResult: DetectTopicFromTextOutput = await detectTopicFromText(topicInput); // Call correct flow

    return NextResponse.json(topicResult);
  } catch (error) {
    console.error("Error detecting topic:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during topic detection";
    return NextResponse.json(
      { error: "Falha ao detectar o tópico.", details: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
    