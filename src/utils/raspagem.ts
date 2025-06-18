
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

  while (pagina <= maxPaginas) {
    const url = pagina === 1
      ? `https://www.todamateria.com.br/?s=${encodedQuery}`
      : `https://www.todamateria.com.br/page/${pagina}/?s=${encodedQuery}`;
    
    try {
      const { data: html } = await axios.get(url, { timeout: 10000 });
      const $ = load(html);
      let encontrouNestaPagina = false;
      
      $('a.card-item').each((_, el) => {
        let href = $(el).attr('href');
        const titulo = $(el).find('.card-title').text().trim() || $(el).attr('title') || '';
        if (href && href.startsWith('/')) {
          href = 'https://www.todamateria.com.br' + href;
        }
        if (
          href &&
          titulo.length > 0 &&
          !urlsSet.has(href)
        ) {
          resultados.push({ titulo, url: href });
          urlsSet.add(href);
          encontrouNestaPagina = true;
        }
      });

      if (!encontrouNestaPagina && pagina === 1) {
        break;
      }
      if (pagina >= maxPaginas || !encontrouNestaPagina) {
         break;
      }
      pagina++;

    } catch (error) {
      console.error(`Erro ao raspar página de busca ${url}:`, error);
      break;
    }
  }
  return resultados;
}

async function rasparConteudoPagina(url: string): Promise<PageContent> {
  try {
    const { data: html } = await axios.get(url, { timeout: 10000 });
    const $ = load(html);
    const titulo = $('h1').first().text().trim();
    const paragrafos: string[] = [];
    const imagens: { src: string; legenda: string }[] = [];
    
    $('figure').each((_, fig) => {
      const img = $(fig).find('img').first();
      let src = img.attr('src') || img.data('src') || '';
      if (src && src.startsWith('/')) src = 'https://www.todamateria.com.br' + src;
      const legenda = $(fig).find('figcaption').text().trim();
      if (src) imagens.push({ src, legenda });
    });

    $('.main-content article img, .main-content .content img, article .content img, article img').each((_, img) => {
      let src = $(img).attr('src') || $(img).data('src') || '';
      if (src && src.startsWith('/')) src = 'https://www.todamateria.com.br' + src;
      if (src && !imagens.some(im => im.src === src)) {
        imagens.push({ src, legenda: $(img).attr('alt') || '' });
      }
    });

    $('.main-content article p, .main-content .content p, article .content p, article p').each((_, el) => {
      const txt = $(el).text().trim();
      if (txt.length > 0) paragrafos.push(txt);
    });

    if (paragrafos.length === 0) {
      $('p').each((_, el) => {
        if (
          $(el).parents('.sidebar, .footer, .ad-unit, header, nav, script, style').length === 0 &&
          $(el).text().trim().length > 0
        ) {
          paragrafos.push($(el).text().trim());
        }
      });
    }

    let autor =
      $('.author-article--b__info__name').first().text().trim() ||
      $('.autor, .author, .author-name').first().text().trim() ||
      '';
    
    let dataPublicacao = 
        $('meta[property="article:published_time"]').attr('content') ||
        $('time[itemprop="datePublished"]').attr('datetime') ||
        $('.posted-on time, .entry-date, .published').first().attr('datetime') ||
        $('.posted-on time, .entry-date, .published').first().text().trim() ||
        '';


    if (!autor || !dataPublicacao) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).html() || '{}');
          if (json && typeof json === 'object') {
            if (!autor) {
                if (json.author && typeof json.author === 'object' && 'name' in json.author && typeof json.author.name === 'string') {
                  autor = json.author.name;
                } else if (Array.isArray(json.author) && json.author[0]?.name && typeof json.author[0].name === 'string') {
                   autor = json.author[0].name;
                }
            }
            if (!dataPublicacao && json.datePublished && typeof json.datePublished === 'string') {
                dataPublicacao = json.datePublished;
            }
          }
        } catch (e) {
          // console.warn('Error parsing JSON-LD for author/date:', e);
        }
      });
    }
    
    return {
      url,
      titulo,
      conteudo: paragrafos.join('\n\n'),
      imagens,
      autor,
      dataPublicacao: dataPublicacao || undefined,
    };
  } catch(e) {
    console.error(`Erro ao raspar conteúdo da página ${url}:`, e);
    return { url, titulo: '', conteudo: '', imagens: [], autor: '', erro: true };
  }
}

export { rasparTodasPaginasBusca, rasparConteudoPagina };

    