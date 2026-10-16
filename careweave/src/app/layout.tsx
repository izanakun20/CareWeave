import type { Metadata } from "next";
import Link from "next/link";
import Thread from "@/components/Thread";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CareWeave — Hospital Operations Intelligence",
    template: "%s | CareWeave",
  },
  description:
    "Which departments make patients wait longest, why, and what operations should examine first. Synthetic data for demonstration only.",
};

const NAV_LINKS = [
  { href: "/", label: "Command Center" },
  { href: "/forecast", label: "Forecast" },
  { href: "/diagnostics", label: "Diagnostics" },
  { href: "/model", label: "How It Thinks" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0B1F3A] text-white font-atkinson antialiased">
        {/* Navigation */}
        <nav
          className="sticky top-0 z-50 bg-[#0B1F3A]/90 backdrop-blur border-b border-[#19E3F5]/10"
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
            {/* Brand */}
            <Link
              href="/"
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19E3F5] rounded"
            >
              <Thread className="w-8 h-8" />
              <span className="font-bold text-lg tracking-tight">
                Care<span className="text-[#19E3F5]">Weave</span>
              </span>
            </Link>

            {/* Nav links */}
            <ul className="hidden sm:flex items-center gap-1" role="list">
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19E3F5]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>

        {/* Footer — required on every page */}
        <footer className="border-t border-[#19E3F5]/10 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              <span className="font-semibold text-amber-400">
                Synthetic data. For operations use only.
              </span>{" "}
              Not for clinical decisions. CareWeave — DATATHON 2026 · Team Uncharted.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Thread className="w-5 h-5 opacity-40" />
              <span>Health Track: The Forgotten Patient</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
