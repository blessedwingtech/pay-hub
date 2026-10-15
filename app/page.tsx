import Link from "next/link";
import {
  CreditCard,
  ShieldCheck,
  Zap,
  ArrowRight,
  Send,
  Building,
  GraduationCap,
  Heart,
  Newspaper,
  Layers,
  Banknote,
  CheckCircle2,
} from "lucide-react";
import { SATELLITE_CONFIGS, SatelliteSite } from "@/lib/types";

export default function HomePage() {
  const satellites: SatelliteSite[] = [
    "MEMOTONIK",
    "SHOPTONIK",
    "ACADEMY",
    "BWT",
    "PRESSTONIK",
  ];

  const getSatelliteIcon = (key: SatelliteSite) => {
    switch (key) {
      case "MEMOTONIK":
        return <Zap className="w-5 h-5 text-blue-400" />;
      case "SHOPTONIK":
        return <Building className="w-5 h-5 text-emerald-400" />;
      case "ACADEMY":
        return <GraduationCap className="w-5 h-5 text-purple-400" />;
      case "BWT":
        return <Heart className="w-5 h-5 text-amber-400" />;
      case "PRESSTONIK":
        return <Newspaper className="w-5 h-5 text-pink-400" />;
      default:
        return <Layers className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <Layers className="w-3.5 h-3.5" />
          Noyau Financier Multi-tenant
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
          BitTonik <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Pay-Hub</span>
        </h1>
        <p className="text-lg text-slate-300 leading-relaxed">
          Le centre névralgique de facturation, d’abonnements et de reversements
          pour l&apos;ensemble des applications de la constellation BitTonik.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/checkout?user_id=demo_user_123&email=user@bittonik.com&full_name=Alexandre+BitTonik&amount=29.99&currency=USD&source_site=MEMOTONIK&type=SUBSCRIPTION&plan_id=pro-monthly&return_url=https://memotonik.bittonik.com/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold text-white shadow-lg shadow-blue-500/25 transition active:scale-95"
          >
            <CreditCard className="w-5 h-5" />
            Tester le Checkout MemoTonik
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
          <Link
            href="/donate"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 font-semibold text-slate-200 transition active:scale-95"
          >
            <Heart className="w-5 h-5 text-amber-400" />
            Portail de Dons BWT
          </Link>
        </div>
      </div>

      {/* Gateway Providers Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-900/50">
              International
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Actif
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Stripe & Stripe Connect</h3>
          <p className="text-sm text-slate-400 mb-4">
            Cartes bancaires, Apple Pay, Google Pay, abonnements Stripe Billing et transferts vendeurs connectés.
          </p>
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Pay-In & Pay-Out Direct
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-950/60 px-2.5 py-1 rounded-md border border-sky-900/50">
              Global
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Actif
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">PayPal & Payouts API</h3>
          <p className="text-sm text-slate-400 mb-4">
            Paiements instantanés PayPal Wallet et reversements automatisés par batch email pour les créateurs.
          </p>
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> PayPal REST & Payouts
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-950/60 px-2.5 py-1 rounded-md border border-red-900/50">
              Haïti Local (HTG)
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Actif
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">MonCash Digicel</h3>
          <p className="text-sm text-slate-400 mb-4">
            Passerelle Mobile Money en Gourdes haïtiennes et décaissement direct (Disbursement B2C) par SMS.
          </p>
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Pay-In & Retraits HTG
          </div>
        </div>
      </div>

      {/* Satellites Matrix */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Banknote className="w-6 h-6 text-blue-400" />
            Satellites Connectés au Hub
          </h2>
          <span className="text-xs text-slate-400 font-medium">5 Satellites Opérationnels</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {satellites.map((key) => {
            const config = SATELLITE_CONFIGS[key] || {
              displayName: key,
              description: "Satellite connecté au hub universel BitTonik",
            };
            return (
              <div
                key={key}
                className="glass-card p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    {getSatelliteIcon(key)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{config.displayName}</h4>
                    <span className="text-xs text-slate-400 font-mono">{key}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  {config.description}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
                  <span className="text-slate-400">Signature HMAC-SHA256</span>
                  <span className="text-emerald-400 font-medium">Connecté</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Banner */}
      <div className="glass-panel p-8 rounded-2xl border border-blue-900/30 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Sécurité & Dispatcher Sécurisé</h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Chaque événement de paiement ou de reversement est horodaté et cryptographiquement
              signé avec une clé HMAC-SHA256 transmise aux serveurs satellites.
            </p>
          </div>
        </div>
        <Link
          href="/portal"
          className="whitespace-nowrap px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition border border-slate-700"
        >
          Espace Gestion & Factures
        </Link>
      </div>
    </div>
  );
}
