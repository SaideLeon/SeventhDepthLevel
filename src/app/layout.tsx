
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import 'highlight.js/styles/github-dark.css'; // Import highlight.js theme

export const metadata: Metadata = {
  title: {
    default: 'Cabulador - Seu Assistente de Estudos com IA',
    template: '%s | Cabulador',
  },
  description: 'Cabulador é um assistente de IA para estudos, desenvolvido por Saíde Omar Saíde (Quelimane, Moçambique), para ajudar estudantes com suas dúvidas e aprendizado escolar.',
  keywords: ['Cabulador', 'assistente de estudos', 'IA para estudantes', 'ajuda escolar', 'educação', 'inteligência artificial', 'Saíde Omar Saíde', 'Quelimane', 'Moçambique'],
  authors: [{ name: 'Saíde Omar Saíde' }],
  creator: 'Saíde Omar Saíde',
  publisher: 'Saíde Omar Saíde',
  applicationName: 'Cabulador',
  openGraph: {
    title: 'Cabulador - Seu Assistente de Estudos com IA',
    description: 'Obtenha ajuda com seus estudos com o Cabulador, uma IA desenvolvida por Saíde Omar Saíde.',
    siteName: 'Cabulador',
    locale: 'pt_BR', // Consider 'pt_MZ' if more specific to Mozambique
    type: 'website',
    // TODO: Add your app's URL here, e.g., url: 'https://cabulador.app'
    // TODO: Add your Open Graph image URL here, e.g., images: [{ url: 'https://cabulador.app/og-image.png', width: 1200, height: 630, alt: 'Cabulador IA' }]
  },
  twitter: {
    card: 'summary', // Use 'summary_large_image' if you add a Twitter image
    title: 'Cabulador - Seu Assistente de Estudos com IA',
    description: 'Seu parceiro de estudos inteligente, desenvolvido por Saíde Omar Saíde.',
    // TODO: Add your Twitter image URL here, e.g., images: ['https://cabulador.app/twitter-image.png']
    // TODO: Add your Twitter handle here if you have one, e.g., creator: '@SaideOmarSaide'
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
