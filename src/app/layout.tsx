import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { AppLanguageSelector } from "@/components/AppLanguageSelector";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { ToriiIcon } from "@/components/ToriiIcon";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for the brand + Latin headings; CJK text falls back to the
// system stacks defined in globals.css.
const displayFont = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "JobFit AI — 求職適配分析",
    template: "%s | JobFit AI",
  },
  description:
    "Local-first job-fit analysis: collect postings with one click, score them against your career profile with local rules plus Gemini / Groq / OpenRouter, and track every application.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200/80 bg-washi/90 px-4 py-2 backdrop-blur sm:px-6">
          <span className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-sm font-bold tracking-tight text-stone-700">
            <ToriiIcon className="h-4 w-4 text-orange-600" />
            JobFit<span className="text-orange-600"> AI</span>
          </span>
          <AppLanguageSelector />
        </div>
        <div className="kiriko-edge shrink-0" aria-hidden="true" />
        {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && <DemoModeBanner />}
        {children}
      </body>
    </html>
  );
}
