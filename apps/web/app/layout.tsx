import type { Metadata } from "next";
import "./globals.css";



export const metadata: Metadata = {
  title: "DREAMMATE — Your AI Companion",
  description: "An AI companion that cares about you without trying to keep you addicted to it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0f] text-zinc-100 font-sans">{children}</body>
    </html>
  );
}
