import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { SmoothScrollProvider } from "@/components/smooth-scroll";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Write, Design & Publish with AI",
    template: "%s · Book Studio",
  },
  description:
    "Turn an idea into a published, print-ready book. AI brainstorming, chapter writing, grammar polish, DALL-E covers, Stripe checkout and Lulu print-on-demand.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className={`min-h-screen ${font.className} font-sans`}>
        <ThemeProvider>
          <Providers>
            <SmoothScrollProvider>
              <Header />
              <main className="relative">{children}</main>
            </SmoothScrollProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
