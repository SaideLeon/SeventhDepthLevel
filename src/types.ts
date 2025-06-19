
export interface ImagemConteudo {
  src: string;
  legenda: string;
}

export interface ConteudoRaspado {
  url: string;
  titulo: string;
  conteudo: string;
  imagens?: ImagemConteudo[];
  autor?: string;
  dataPublicacao?: string;
  erro?: boolean;
  citacao?: string; // Added optional, as per user's Groq agent output structure for FichaLeitura
}

export interface FichaLeitura {
  url: string;
  titulo: string;
  autor?: string;
  imagens?: ImagemConteudo[];
  resumo: string;
  citacao?: string;
  // Fields that were in Genkit's FichaLeituraSchema, now potentially missing or adapted:
  anoPublicacao?: string; // Can be derived or left undefined
  palavrasChave?: string[]; // Might be part of resumo or comments, or Groq prompted separately
  citacoesRelevantes?: string[]; // Groq agent has singular 'citacao'
  comentariosAdicionais?: string; // Groq agent doesn't have this
}
