import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Source_Serif_4({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(env.siteUrl()),
    title: { default: `${s.storeName} — ${s.tagline}`, template: `%s | ${s.storeName}` },
    description: "Actionable ebooks and guides on websites, SEO, digital marketing, AI and business growth.",
    openGraph: { type: "website", siteName: s.storeName },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = { themeColor: "#14244a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
