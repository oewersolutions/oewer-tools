import type { Metadata } from "next";
import type { ReactNode } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { getSetting } from "../lib/content";
import "./globals.css";

export function generateMetadata(): Metadata {
  return {
    title: { default: getSetting("site_name"), template: `%s | ${getSetting("site_name")}` },
    description: getSetting("site_tagline"),
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-white font-sans text-slate-900 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-30 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-brand"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="mx-auto w-full max-w-page flex-1 px-4 py-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
