
import { NextRequest, NextResponse } from "next/server";
import { decideSearchNecessity, type DecideSearchNecessityInput } from "@/ai/flows/decide-search-flow";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentUserQuery, previousAiResponse1, previousAiResponse2, targetLanguage } = body;

    if (!currentUserQuery) {
      return NextResponse.json(
        { error: "currentUserQuery is required." },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const decisionInput: DecideSearchNecessityInput = {
        currentUserQuery,
        previousAiResponse1: previousAiResponse1 || undefined,
        previousAiResponse2: previousAiResponse2 || undefined,
        targetLanguage: targetLanguage || "pt-BR",
    };

    const decisionResult = await decideSearchNecessity(decisionInput);

    return NextResponse.json(decisionResult);
  } catch (error) {
    console.error("Error deciding search necessity:", error);
    // Ensure error is an instance of Error for safer message access
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to decide search necessity.", details: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
