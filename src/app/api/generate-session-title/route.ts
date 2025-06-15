import { NextRequest, NextResponse } from "next/server";
import { generateSessionTitle, type GenerateSessionTitleInput } from "@/ai/flows/generate-session-title-flow";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userFirstMessageContent, aiFirstResponseContent, targetLanguage } = body;

    if (aiFirstResponseContent === undefined) { // userFirstMessageContent can be empty (e.g. image only)
      return NextResponse.json(
        { error: "aiFirstResponseContent is required." },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const titleInput: GenerateSessionTitleInput = {
        userFirstMessageContent: userFirstMessageContent || "",
        aiFirstResponseContent: aiFirstResponseContent,
        targetLanguage: targetLanguage || "pt-BR",
    };

    const titleResult = await generateSessionTitle(titleInput);

    return NextResponse.json(titleResult);
  } catch (error) {
    console.error("Error generating session title:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate session title.", details: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
