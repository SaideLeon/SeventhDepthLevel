
import { NextRequest, NextResponse } from "next/server";
import { detectTopicFromText, type DetectTopicFromTextInput } from "@/ai/flows/detect-topic-flow";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { textQuery, targetLanguage } = body;

    if (!textQuery) {
      return NextResponse.json(
        { error: "textQuery is required." },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const topicInput: DetectTopicFromTextInput = {
           textQuery: textQuery,
           targetLanguage: targetLanguage || "pt-BR", // Default to pt-BR if not provided
         };

    const topicResult = await detectTopicFromText(topicInput);

    return NextResponse.json(topicResult);
  } catch (error) {
    console.error("Error detecting topic:", error);
    return NextResponse.json(
      { error: "Failed to detect topic." },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
