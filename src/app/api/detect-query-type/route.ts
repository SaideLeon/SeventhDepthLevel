
import { NextRequest, NextResponse } from "next/server";
import { detectQueryType, type DetectQueryTypeInput } from "@/ai/flows/detect-query-type-flow";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentUserQuery, userImageProvided, targetLanguage } = body;

    // currentUserQuery can be empty if only an image is sent, so no strict check here.
    // userImageProvided must be boolean.

    if (typeof userImageProvided !== 'boolean') {
        return NextResponse.json(
            { error: "userImageProvided (boolean) is required." },
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    const queryTypeInput: DetectQueryTypeInput = {
        currentUserQuery: currentUserQuery || "", // Default to empty string if null/undefined
        userImageProvided,
        targetLanguage: targetLanguage || "pt-BR",
    };

    const queryTypeResult = await detectQueryType(queryTypeInput);

    return NextResponse.json(queryTypeResult);
  } catch (error) {
    console.error("Error detecting query type:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to detect query type.", details: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

    