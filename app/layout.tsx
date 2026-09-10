import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "ThreatScope — Cybersecurity Trend Intelligence",
    template: "%s · ThreatScope",
  },
  description:
    "Live cybersecurity trend dashboard: NVD advisories, CISA known-exploited vulnerabilities, ransomware crew activity, and threat intel headlines in one view.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <div className="backdrop-aurora" aria-hidden />
        <div className="backdrop-grid" aria-hidden />
        <Nav />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
        <footer className="border-t border-edge/70 py-8">
          <div className="mx-auto max-w-7xl px-4 text-xs text-muted sm:px-6">
            <p className="mb-2">
              Data sources: NVD (NIST), CISA KEV catalog, ransomware.live, and public security
              news feeds. Cached and revalidated server-side.
            </p>
            <p>
              Built for defensive research and awareness. Nothing here is an endorsement of the
              actors listed.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
