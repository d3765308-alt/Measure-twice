import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });
const body = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Measure Twice",
  description: "Pick a home project, enter your dimensions, and see the materials, tools and what you save compared with hiring it out."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <header className="top">
          <div className="top-in">
            <Link href="/" className="brand"><h1 style={{ fontSize: "inherit" }}>Measure Twice</h1></Link>
            <p className="tag">Plan the job, price the materials, and see what you keep compared with hiring a contractor.</p>
          </div>
          <div className="ruler" aria-hidden="true" />
        </header>
        <main className="wrap">
          {children}
          <p className="foot">
            Some links are affiliate links. If you buy through them, we earn a commission at no extra cost to you. Prices change often, so confirm the price at checkout.
            Savings figures are estimates for planning, not a quote. Electrical, plumbing, roofing and structural work is regulated by state and local code, so check permit and licensing rules for your address before you start.
          </p>
        </main>
      </body>
    </html>
  );
}
