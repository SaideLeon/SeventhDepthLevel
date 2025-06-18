
import {NextRequest,NextResponse} from 'next/server';
import {generateIntroduction, type GenerateIntroductionInput, type GenerateIntroductionOutput} from '@/ai/flows/generate-introduction-flow';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mainTopic, generatedIndex, targetLanguage } = body;

    const missingFields = [];
    if (!mainTopic) missingFields.push('mainTopic');
    // generatedIndex is optional

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Campo(s) obrigatório(s) ausente(s): ${missingFields.join(', ')}`,
        },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const input: GenerateIntroductionInput = {
      mainTopic,
      generatedIndex: generatedIndex || undefined,
      targetLanguage: targetLanguage || "pt-BR",
    };

    const result: GenerateIntroductionOutput = await generateIntroduction(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating introduction:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during introduction generation";
    return NextResponse.json(
      { error: "Falha ao gerar a introdução.", details: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
    