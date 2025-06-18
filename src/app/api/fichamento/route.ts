
import { NextRequest, NextResponse } from 'next/server';
import { generateFichamento, type GenerateFichamentoInput, type FichaLeitura } from '@/ai/flows/generate-fichamento-flow';
import type { PageContent } from '@/utils/raspagem'; // Assuming PageContent matches GenerateFichamentoInput structure

export async function POST(req: NextRequest) {
  try {
    const body: PageContent = await req.json(); // Expecting scraped content

    if (!body || !body.conteudo || !body.titulo || !body.url) {
      return NextResponse.json(
        { error: "Conteúdo, título e URL da página são obrigatórios para o fichamento." },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fichamentoInput: GenerateFichamentoInput = {
      url: body.url,
      titulo: body.titulo,
      conteudo: body.conteudo,
      autor: body.autor,
      dataPublicacao: body.dataPublicacao,
    };

    const ficha: FichaLeitura = await generateFichamento(fichamentoInput);

    return NextResponse.json(ficha);

  } catch (error) {
    console.error("Error creating fichamento:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during fichamento";
    return NextResponse.json(
      { error: "Falha ao gerar a ficha de leitura.", details: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
    