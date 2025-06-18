
import axios from 'axios';
import { load } from 'cheerio';

export interface SearchResult {
  titulo: string;
  url: string;
}

export interface PageContent {
  url: string;
  titulo: string;
  conteudo: string;
  imagens: Array<{ src: string; legenda: string }>;
  autor: string;
  dataPublicacao?: string; // Optional: Add publication date if available
  erro?: boolean;
}

async function rasparTodasPaginasBusca(query: string, todasPaginas: boolean = false, maxPaginasOption?: number): Promise<SearchResult[]> {
  let pagina = 1;
  const resultados: SearchResult[] = [];
  const urlsSet = new Set<string>();
  const encodedQuery = encodeURIComponent(query);
  
  // If todasPaginas is true, search up to maxPaginasOption (default 3 if not provided). Otherwise, search 1 page.
  const maxPaginas = todasPaginas ? (maxPaginasOption || 3) : 1;
  console.log(`Raspagem: Buscando até ${maxPaginas} páginas de resultados para "${query}"`);

  while (pagina <= maxPaginas) {
    const url = pagina === 1
      ? `https://www.todamateria.com.br/?s=${encodedQuery}`
      : `https://www.todamateria.com.br/page/${pagina}/?s=${encodedQuery}`;
    
    console.log(`Raspagem: Tentando página ${pagina}: ${url}`);
    try {
      const { data: html } = await axios.get(url, { 
        timeout: 15000,
        headers: { // Add headers to mimic a browser
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9,pt;q=0.8',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        }
      });
      const $ = load(html);
      let encontrouNestaPagina = 0;
      
      $('a.card-item').each((_, el) => {
        let href = $(el).attr('href');
        const titulo = $(el).find('.card-title').text().trim() || $(el).attr('title') || '';
        if (href && href.startsWith('/')) {
          href = 'https://www.todamateria.com.br' + href;
        }
        if (
          href &&
          titulo.length > 0 &&
          !urlsSet.has(href) &&
          href.includes("todamateria.com.br/") // Basic filter for relevance
        ) {
          resultados.push({ titulo, url: href });
          urlsSet.add(href);
          encontrouNestaPagina++;
        }
      });
      console.log(`Raspagem: Encontrados ${encontrouNestaPagina} novos resultados na página ${pagina}. Total até agora: ${resultados.length}`);

      if (encontrouNestaPagina === 0 && pagina === 1 && $('body').text().includes("Nenhum resultado encontrado")) {
         console.log(`Raspagem: "Nenhum resultado encontrado" na primeira página. Parando.`);
         break;
      }
      if (pagina >= maxPaginas || encontrouNestaPagina === 0 ) { // Stop if max pages reached or no new results
         console.log(`Raspagem: Condição de parada atingida na página ${pagina}.`);
         break;
      }
      pagina++;
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200)); // Small delay between page fetches

    } catch (error: any) {
      console.error(`Erro ao raspar página de busca ${url}:`, error.message);
      if (axios.isAxiosError(error) && error.response?.status === 404 && pagina > 1) {
        console.log(`Raspagem: Página ${pagina} não encontrada (404), provavelmente fim dos resultados.`);
      }
      break; 
    }
  }
  console.log(`Raspagem: Finalizado. Total de resultados únicos: ${resultados.length}`);
  return resultados;
}

async function rasparConteudoPagina(url: string): Promise<PageContent> {
  console.log(`Raspagem Conteúdo: Iniciando para ${url}`);
  try {
    const { data: html } = await axios.get(url, { 
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.todamateria.com.br/', // Good practice to include referer
        }
    });
    const $ = load(html);
    const titulo = $('h1.titulo-materia, h1.article-title, h1').first().text().trim();
    const paragrafos: string[] = [];
    const imagens: { src: string; legenda: string }[] = [];
    
    // Prioritize figures for images as they often have captions
    $('figure.image-container, figure.wp-caption, figure').each((_, fig) => {
      const img = $(fig).find('img').first();
      let src = img.attr('src') || img.data('src') || '';
      if (src && src.startsWith('//')) src = 'https:' + src;
      else if (src && src.startsWith('/')) src = new URL(src, 'https://www.todamateria.com.br').toString();
      
      const legenda = $(fig).find('figcaption, .wp-caption-text').text().trim();
      if (src && !imagens.some(im => im.src === src)) { // Avoid duplicates
          imagens.push({ src, legenda: legenda || img.attr('alt') || titulo || 'Imagem relacionada' });
      }
    });

    // General image scraping as fallback or supplement
    $('.main-content article img, .entry-content img, article .content img, article img').each((_, imgEl) => {
      const img = $(imgEl);
      let src = img.attr('src') || img.data('src') || '';
      if (src && src.startsWith('//')) src = 'https:' + src;
      else if (src && src.startsWith('/')) src = new URL(src, 'https://www.todamateria.com.br').toString();
      
      if (src && !imagens.some(im => im.src === src)) { // Avoid duplicates
        const altText = img.attr('alt') || '';
        const figureParent = img.closest('figure');
        const caption = figureParent.length ? figureParent.find('figcaption, .wp-caption-text').text().trim() : '';
        imagens.push({ src, legenda: caption || altText || titulo || 'Imagem ilustrativa' });
      }
    });

    // Content extraction from main article body
    const articleSelectors = [
        'article .entry-content p', 
        'article .materia-conteudo p',
        'article .td-post-content p',
        '.main-content article p', 
        '.main-content .content p', 
        'article .content p', 
        'article p' // More generic as fallback
    ];
    let foundParagraphs = false;
    for (const selector of articleSelectors) {
        $(selector).each((_, el) => {
            const txt = $(el).text().trim();
            if (txt.length > 20) { // Basic filter for meaningful paragraphs
                 paragrafos.push(txt);
                 foundParagraphs = true;
            }
        });
        if(foundParagraphs) break; // If a specific selector yielded results, assume it's the main content
    }
    

    // Fallback if no specific article paragraphs found
    if (paragrafos.length === 0) {
      $('p').each((_, el) => {
        const pElement = $(el);
        // Exclude paragraphs from common non-content areas
        if (pElement.parents('.sidebar, .footer, .ad-unit, header, nav, script, style, .comments-area, .related-posts, .breadcrumbs').length === 0) {
          const txt = pElement.text().trim();
          if (txt.length > 20) {
            paragrafos.push(txt);
          }
        }
      });
    }

    let autor =
      $('.author-article--b__info__name a, .meta-author .fn, .author-name a, .author a, .posted-by a, .author-info .name').first().text().trim() ||
      $('meta[name="author"]').attr('content') ||
      '';
    
    let dataPublicacao = 
        $('meta[property="article:published_time"]').attr('content') ||
        $('time[itemprop="datePublished"]').attr('datetime') ||
        $('.entry-date.published, .meta-date, .post-date, .date.published').first().attr('datetime') ||
        $('.entry-date.published, .meta-date, .post-date, .date.published').first().text().trim() ||
        '';

    // Extract from JSON-LD if not found
    if (!autor || !dataPublicacao) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const jsonHtml = $(el).html();
          if (jsonHtml) {
            const jsonData = JSON.parse(jsonHtml);
            const graph = Array.isArray(jsonData['@graph']) ? jsonData['@graph'] : [jsonData];

            for (const item of graph) {
                if (item && typeof item === 'object') {
                    if (!autor && item.author && typeof item.author === 'object' && 'name' in item.author && typeof item.author.name === 'string') {
                    autor = item.author.name;
                    } else if (!autor && Array.isArray(item.author) && item.author[0]?.name && typeof item.author[0].name === 'string') {
                    autor = item.author[0].name;
                    }
                    if (!dataPublicacao && item.datePublished && typeof item.datePublished === 'string') {
                    dataPublicacao = item.datePublished;
                    }
                     if (!dataPublicacao && item.dateModified && typeof item.dateModified === 'string') { // Fallback to modified date
                      if (!dataPublicacao) dataPublicacao = item.dateModified;
                    }
                }
                 if(autor && dataPublicacao) break;
            }

          }
        } catch (e) {
          // console.warn('Raspagem Conteúdo: Erro ao analisar JSON-LD:', e);
        }
      });
    }
    
    console.log(`Raspagem Conteúdo: Sucesso para ${url}. Título: ${titulo}, Autor: ${autor || 'N/A'}, Data: ${dataPublicacao || 'N/A'}`);
    return {
      url,
      titulo,
      conteudo: paragrafos.join('\n\n'),
      imagens,
      autor: autor || "Não especificado",
      dataPublicacao: dataPublicacao || undefined,
    };

  } catch(e: any) {
    console.error(`Erro ao raspar conteúdo da página ${url}:`, e.message);
    return { url, titulo: '', conteudo: `Falha ao carregar conteúdo de ${url}. Erro: ${e.message}`, imagens: [], autor: '', erro: true };
  }
}

export { rasparTodasPaginasBusca, rasparConteudoPagina };

    
