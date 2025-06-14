
import axios from 'axios';
import { load } from 'cheerio';

// Removed formatarData import as it's not critical for LLM context

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
  erro?: boolean;
}

async function rasparTodasPaginasBusca(query: string, todasPaginas: boolean = false): Promise<SearchResult[]> {
  let pagina = 1;
  const resultados: SearchResult[] = [];
  const urlsSet = new Set<string>();
  const encodedQuery = encodeURIComponent(query);
  
  // If todasPaginas is true, search up to 3 pages. Otherwise, search 1 page.
  const maxPaginas = todasPaginas ? 3 : 1;

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

      if (!encontrouNestaPagina && pagina === 1) { // If no results on the first page, stop
        break;
      }
      if (pagina >= maxPaginas || !encontrouNestaPagina) { // Stop if max pages reached or no new results on subsequent pages
         break;
      }
      pagina++;

    } catch (error) {
      console.error(`Erro ao raspar página de busca ${url}:`, error);
      break; // Stop if there's an error
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

    if (!autor) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).html() || '{}');
          if (json && typeof json === 'object') {
            if (json.author && typeof json.author === 'object' && 'name' in json.author && typeof json.author.name === 'string') {
              autor = json.author.name;
            } else if (Array.isArray(json.author) && json.author[0]?.name && typeof json.author[0].name === 'string') {
               autor = json.author[0].name;
            }
          }
        } catch (e) {
          // console.warn('Error parsing JSON-LD for author:', e);
        }
      });
    }
    
    return {
      url,
      titulo,
      conteudo: paragrafos.join('\n\n'),
      imagens,
      autor,
    };
  } catch(e) {
    console.error(`Erro ao raspar conteúdo da página ${url}:`, e);
    return { url, titulo: '', conteudo: '', imagens: [], autor: '', erro: true };
  }
}

export { rasparTodasPaginasBusca, rasparConteudoPagina };
