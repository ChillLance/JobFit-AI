import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { AppLanguageSelector } from "@/components/AppLanguageSelector";
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
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 py-2 backdrop-blur sm:px-6">
          <span className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight text-slate-200">
            JobFit<span className="text-orange-400"> AI</span>
          </span>
          <AppLanguageSelector />
        </div>
        {children}
      </body>
    </html>
  );
}
