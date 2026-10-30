import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import type { ReactNode } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import LeaveAdmin from "../components/LeaveAdmin";
import Analytics from "../components/Analytics";
import HydrationFlag from "../components/HydrationFlag";
import { adsActive, isPublisherId } from "../lib/ads";
import ConsentBanner from "../components/ConsentBanner";
import { getAdConfig, getMeasurementId, getNavigation, getOptionalSetting, getSetting } from "../lib/content";
import "./globals.css";

// Fonts are downloaded at build time and served from this site, so visitors make no request to Google.
// Three weights only (regular, medium, semibold): every extra weight is another file for every visitor to download.
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-poppins", display: "swap" });

export function generateMetadata(): Metadata {
  return {
    title: { default: getSetting("site_name"), template: `%s | ${getSetting("site_name")}` },
    description: getSetting("site_tagline"),
    // Lets Google confirm you own the site for AdSense without loading anything in visitors' browsers.
    ...(isPublisherId(getOptionalSetting("adsense_publisher_id")) ? { other: { "google-adsense-account": getOptionalSetting("adsense_publisher_id") } } : {}),
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-30 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-brand"
        >
          Skip to content
        </a>
        <HydrationFlag />
        <LeaveAdmin />
        <Analytics measurementId={getMeasurementId()} />
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <ConsentBanner measurementId={getMeasurementId()} adsActive={adsActive(getAdConfig())} privacyPath={getNavigation("footer_legal").find((l) => /privacy/i.test(l.label))?.url} />
      </body>
    </html>
  );
}
