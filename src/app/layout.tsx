
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import 'highlight.js/styles/github-dark.css'; // Import highlight.js theme

const appUrl = 'https://cognick.vercel.app'; // Assuming a new project might have a new URL
const ogImageUrl = `${appUrl}/og-image.png`; 
const twitterImageUrl = `${appUrl}/twitter-image.png`; 

export const metadata: Metadata = {
  title: {
    default: 'Cognick - Seu Assistente de Estudos com IA',
    template: '%s | Cognick',
  },
  description: 'Cognick é um assistente de IA para estudos, desenvolvido por Saíde Omar Saíde (Quelimane, Moçambique), para ajudar estudantes com suas dúvidas e aprendizado escolar.',
  keywords: ['Cognick', 'assistente de estudos', 'IA para estudantes', 'ajuda escolar', 'educação', 'inteligência artificial', 'Saíde Omar Saíde', 'Quelimane', 'Moçambique'],
  authors: [{ name: 'Saíde Omar Saíde', url: appUrl }],
  creator: 'Saíde Omar Saíde',
  publisher: 'Saíde Omar Saíde',
  applicationName: 'Cognick',
  metadataBase: new URL(appUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Cognick - Seu Assistente de Estudos com IA',
    description: 'Obtenha ajuda com seus estudos com o Cognick, uma IA desenvolvida por Saíde Omar Saíde.',
    url: appUrl,
    siteName: 'Cognick',
    images: [
      {
        url: 'https://placehold.co/1200x630.png', 
        width: 1200,
        height: 630,
        alt: 'Cognick - Assistente de Estudos com IA',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cognick - Seu Assistente de Estudos com IA',
    description: 'Seu parceiro de estudos inteligente, desenvolvido por Saíde Omar Saíde.',
    images: ['https://placehold.co/1200x600.png'], 
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
  icons: {
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
        <meta property="og:image:alt" content="Cognick - Assistente de Estudos com IA" />
        <meta name="twitter:image:alt" content="Cognick - Seu parceiro de estudos inteligente" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
