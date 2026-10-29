import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { getSetting } from "../lib/content";
import "./globals.css";

// Fonts are downloaded at build time and served from this site, so visitors make no request to Google.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

export function generateMetadata(): Metadata {
  return {
    title: { default: getSetting("site_name"), template: `%s | ${getSetting("site_name")}` },
    description: getSetting("site_tagline"),
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-30 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-brand"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
