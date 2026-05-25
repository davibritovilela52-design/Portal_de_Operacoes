import type { Metadata } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';

import './globals.css';

const heading = Manrope({
  subsets: ['latin'],
  variable: '--font-heading'
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-mono'
});

export const metadata: Metadata = {
  title: 'Portal de Operações',
  description: 'Centro de controle operacional da Fase 1 Yachts'
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=window.localStorage.getItem('ops-portal-theme');var theme=stored==='light'?'light':'dark';var root=document.documentElement;root.dataset.theme=theme;root.style.colorScheme=theme;}catch(e){}})();`
          }}
        />
      </head>
      <body className={`${heading.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
