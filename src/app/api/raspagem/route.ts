
import { NextRequest, NextResponse } from 'next/server';
import { rasparTodasPaginasBusca, rasparConteudoPagina } from '@/utils/raspagem';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (body.termoBusca) {
      const todasPaginas = body.todasPaginas === true; // Default to false if not provided
      const resultados = await rasparTodasPaginasBusca(body.termoBusca, todasPaginas);
      return NextResponse.json(resultados);
    } else if (body.url) {
      const conteudo = await rasparConteudoPagina(body.url);
      return NextResponse.json(conteudo);
    } else {
      return new NextResponse(JSON.stringify({ error: 'Parâmetros inválidos. Forneça termoBusca ou url.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error("Erro na API de raspagem:", error);
    return new NextResponse(JSON.stringify({ error: 'Erro interno do servidor ao processar a solicitação de raspagem.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
