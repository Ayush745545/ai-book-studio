import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { WebGLBackground } from "@/components/webgl-background";
import { SmoothScrollProvider } from "@/components/smooth-scroll";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "AI Book Studio — Write, Design & Publish with AI",
    template: "%s · AI Book Studio",
  },
  description:
    "Turn an idea into a published, print-ready book. AI brainstorming, chapter writing, grammar polish, DALL-E covers, Stripe checkout and Lulu print-on-demand.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`min-h-screen ${font.className} font-sans`}>
        <Providers>
          <WebGLBackground />
          <SmoothScrollProvider>
            <Header />
            <main className="relative">{children}</main>
            <footer className="relative mt-16 border-t border-white/10 py-8 text-center text-xs text-zinc-600">
              <p>
                AI Book Studio — built with Next.js 14, Prisma, OpenAI, Stripe &amp; Lulu.
              </p>
            </footer>
          </SmoothScrollProvider>
        </Providers>
      </body>
    </html>
  );
}
