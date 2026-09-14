import type { Metadata } from "next";
import Script from "next/script";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-plex-sans",
});

const plexSerif = IBM_Plex_Serif({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plex-serif",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "MedHUSM - Assistente de Raciocínio Clínico",
  description: "Plataforma educacional e de suporte clínico do HUSM",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#E0E5EC",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  return (
    <html lang="pt-BR">
      <body className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable}`}>
        {clarityProjectId && (
          <Script
            id="microsoft-clarity"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${clarityProjectId}");
              `,
            }}
          />
        )}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
