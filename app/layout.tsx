import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import UtmCapture from "@/components/UtmCapture";
import CookieBanner from "@/components/CookieBanner";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL, SITE_NAME } from "@/lib/site";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const TITLE = "Atacado na Fronteira — Suplementos e produtos premium";
const DESCRIPTION = "Catálogo direto do Paraguai com as melhores marcas. Atacado e varejo, preços em USD, PIX e retirada na loja. Estoque imediato.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Anti-flash: a home é estática (ISR) e serve a vitrine sem filtro para
            qualquer URL; com ?cat/?marca/?q o grid fica oculto até o client
            aplicar o recorte — senão o usuário vê Xiaomi/JBL por um instante
            antes da categoria clicada. Inline e parser-blocking de propósito. */}
        <script dangerouslySetInnerHTML={{ __html:
          `try{var p=new URLSearchParams(location.search);if(p.get('cat')||p.get('marca')||p.get('q'))document.documentElement.setAttribute('data-filtro-pendente','1')}catch(e){}`
        }} />
        <UtmCapture />
        <Providers>{children}</Providers>
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}
