import "./globals.css";
import { ReactNode } from "react";
import { Inter, Noto_Sans_Devanagari, JetBrains_Mono } from "next/font/google";

/**
 * Fonts loaded with next/font: no layout shift, self-hosted at build time.
 *  - Inter            UI face
 *  - Noto Devanagari  Hindi briefings/chips (applied automatically because the
 *                      sans stack lists it after Inter; Devanagari glyphs fall
 *                      through Inter, which has none)
 *  - JetBrains Mono   district codes, hashes, evidence JSON
 */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const noto = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-noto", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata = {
  title: "FHTC Sentinel",
  description:
    "Jal Jeevan Mission field-verification console. Flags districts whose FHTC data looks internally inconsistent.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${noto.variable} ${mono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
