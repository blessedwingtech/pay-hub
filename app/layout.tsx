import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { ShieldCheck, CreditCard, HeartHandshake, UserCircle, RefreshCw, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "BitTonik Pay-Hub | Hub Financier Universel",
  description:
    "Passerelle universelle de paiement, abonnement et reversement multi-tenant pour MemoTonik, ShopTonik, Academy, BWT et PressTonik.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-slate-950 text-slate-100 flex flex-col min-h-screen selection:bg-blue-600 selection:text-white">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                ₿
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors">
                  Pay<span className="text-blue-500">-Hub</span>
                </span>
                <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/60">
                  BitTonik Ecosystem
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-3 text-sm font-medium">
              <Link
                href="/donate"
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition flex items-center gap-1.5"
              >
                <HeartHandshake className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Dons BWT</span>
              </Link>
              <Link
                href="/portal"
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition flex items-center gap-1.5"
              >
                <UserCircle className="w-4 h-4 text-purple-400" />
                <span className="hidden md:inline">Portail Client</span>
              </Link>
              <div className="hidden lg:flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SSL 256-bit Sécurisé</span>
              </div>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950 text-slate-400 text-xs py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-300">BitTonik Pay-Hub</span>
              <span>© {new Date().getFullYear()}</span>
              <span>•</span>
              <span className="text-slate-500">Propulsé par MonCash, Carte Bancaire & PayPal</span>
              <span>•</span>
              <Link href="/terms" className="text-slate-400 hover:text-white transition underline underline-offset-2">
                Conditions & Devises
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Systèmes opérationnels (99.99%)
              </span>
              <span>•</span>
              <span>Conforme PCI-DSS</span>
              <span>•</span>
              <Link
                href="/recurring"
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition"
                title="Accès Administration des Services"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Administration</span>
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
