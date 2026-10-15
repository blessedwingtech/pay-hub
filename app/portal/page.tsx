"use client";

import React, { useState } from "react";
import {
  UserCircle,
  ExternalLink,
  ShieldCheck,
  Receipt,
  CreditCard,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { SatelliteSite, SATELLITE_CONFIGS } from "@/lib/types";

export default function PortalPage() {
  const [userId, setUserId] = useState("");
  const [sourceSite, setSourceSite] = useState<SatelliteSite>("MEMOTONIK");
  const [returnUrl, setReturnUrl] = useState("https://memotonik.bittonik.com/dashboard");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenPortal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    if (!userId.trim()) {
      setErrorMessage("Veuillez renseigner votre identifiant utilisateur.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/portal/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId.trim(),
          sourceSite,
          returnUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Impossible d'accéder au portail de facturation.");
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error("Portal error:", err);
      setErrorMessage(
        err.message || "Impossible de localiser un compte Stripe actif pour cet utilisateur."
      );
      setLoading(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-3">
          <UserCircle className="w-3.5 h-3.5" />
          Portail Client BitTonik
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          Gestion de vos Abonnements & Factures
        </h1>
        <p className="text-slate-300 text-base">
          Mettez à jour vos cartes bancaires, téléchargez vos reçus et modifiez ou résiliez
          vos formules d&apos;abonnement en toute autonomie.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left: Action Form */}
        <div className="md:col-span-7">
          <form
            onSubmit={handleOpenPortal}
            className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6"
          >
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-400" />
              Accéder à l&apos;espace facturation
            </h2>

            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 flex items-start gap-3 text-red-200 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <div>{errorMessage}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Plateforme d&apos;origine
              </label>
              <select
                value={sourceSite}
                onChange={(e) => {
                  const site = e.target.value as SatelliteSite;
                  setSourceSite(site);
                  if (site === "MEMOTONIK") setReturnUrl("https://memotonik.bittonik.com/dashboard");
                  else if (site === "SHOPTONIK") setReturnUrl("https://shop.bittonik.com/account");
                  else if (site === "ACADEMY") setReturnUrl("https://academy.bittonik.com/learn");
                  else if (site === "PRESSTONIK") setReturnUrl("https://press.bittonik.com/account");
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {Object.keys(SATELLITE_CONFIGS).map((key) => (
                  <option key={key} value={key}>
                    {SATELLITE_CONFIGS[key]?.displayName || key} ({key})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Identifiant Utilisateur Satellite (user_id)
              </label>
              <input
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Ex: usr_memo_7849123"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
              />
              <span className="text-xs text-slate-500 mt-1 block">
                Votre ID unique sur la plateforme satellite sélectionnée.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                URL de retour après consultation
              </label>
              <input
                type="url"
                required
                value={returnUrl}
                onChange={(e) => setReturnUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition shadow-lg shadow-purple-500/20 active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Ouverture du portail Stripe...</span>
              ) : (
                <>
                  <span>Ouvrir l&apos;espace Stripe Billing</span>
                  <ExternalLink className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Portal Capabilities Info */}
        <div className="md:col-span-5 space-y-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Ce que vous pouvez gérer
            </h3>

            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <Receipt className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-white">Factures & Reçus</div>
                  <div className="text-xs text-slate-400">Téléchargement instantané au format PDF officiel avec TVA.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className="w-4 h-4 text-blue-400 shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-white">Moyens de paiement</div>
                  <div className="text-xs text-slate-400">Remplacement de carte bancaire expirée ou ajout de sauvegarde.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-white">Cycle d&apos;abonnement</div>
                  <div className="text-xs text-slate-400">Passage mensuel vers annuel, pause ou résiliation sans engagement.</div>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Authentification sécurisée par lien à usage unique Stripe Customer Portal.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
