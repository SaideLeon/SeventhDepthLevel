
import { NextRequest, NextResponse } from 'next/server';
import { criarFichaLeitura } from '@/tools/ai/fichaAgent';
import type { ConteudoRaspado, FichaLeitura } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json(); 
    const conteudo = body.conteudo as ConteudoRaspado; // Assuming body is { conteudo: ConteudoRaspado }
    const promptCustomizado = body.promptCustomizado as string | undefined;

    if (!conteudo || !conteudo.url || !conteudo.titulo || typeof conteudo.conteudo !== 'string') {
      return NextResponse.json(
        { error: "Objeto 'conteudo' inválido ou ausente. Precisa incluir url, titulo e conteudo (string)." },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ficha: FichaLeitura = await criarFichaLeitura(conteudo, promptCustomizado);

    return NextResponse.json(ficha);

  } catch (error) {
    console.error("Error creating fichamento via Groq agent:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during fichamento";
    return NextResponse.json(
      { error: "Falha ao gerar a ficha de leitura.", details: errorMessage },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
