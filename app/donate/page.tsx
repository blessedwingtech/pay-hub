"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Heart,
  ShieldCheck,
  Check,
  ArrowRight,
  Sparkles,
  CreditCard,
  Smartphone,
  Award,
} from "lucide-react";
import { PaymentProvider } from "@/lib/types";

function DonateContent() {
  const searchParams = useSearchParams();

  const [frequency, setFrequency] = useState<"once" | "monthly">("monthly");
  const [selectedAmount, setSelectedAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [cause, setCause] = useState<string>("education");
  const [donorName, setDonorName] = useState<string>(searchParams.get("full_name") || "");
  const [donorEmail, setDonorEmail] = useState<string>(searchParams.get("email") || "");
  const [provider, setProvider] = useState<PaymentProvider>("STRIPE");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const presetAmounts = [10, 25, 50, 100, 250];
  const finalAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (finalAmount <= 0) {
      setError("Veuillez spécifier un montant de don supérieur à zéro.");
      setLoading(false);
      return;
    }

    if (!donorEmail) {
      setError("Veuillez indiquer une adresse email pour l'envoi de votre reçu de don.");
      setLoading(false);
      return;
    }

    try {
      const returnUrl = searchParams.get("return_url") || "https://bwt.bittonik.com";
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: searchParams.get("user_id") || `donor_${Date.now()}`,
          email: donorEmail,
          fullName: donorName,
          amount: finalAmount,
          currency,
          sourceSite: "BWT",
          provider,
          type: frequency === "monthly" ? "SUBSCRIPTION" : "DONATION",
          description: `Don BWT - ${frequency === "monthly" ? "Soutien Mensuel" : "Don Ponctuel"} (${cause})`,
          returnUrl,
          metadata: {
            cause,
            frequency,
            isDonation: true,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Impossible d'initialiser le don.");
      }

      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      console.error("Donation failed:", err);
      setError(err.message || "Erreur lors du traitement du don.");
      setLoading(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
          <Heart className="w-3.5 h-3.5 fill-current" />
          BitTonik World Trust (BWT)
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          Chaque contribution compte pour l&apos;avenir
        </h1>
        <p className="text-slate-300 text-base">
          Soutenez nos actions d&apos;éducation technologique, bourses d&apos;excellence et projets humanitaires. Reçu fiscal émis automatiquement.
        </p>
      </div>

      <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl space-y-8">
        {/* Frequency selector tabs */}
        <div className="flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setFrequency("monthly")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
              frequency === "monthly"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Don Mensuel (Impact continu)
          </button>
          <button
            type="button"
            onClick={() => setFrequency("once")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              frequency === "once"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Don Unique
          </button>
        </div>

        {/* Currency selection */}
        <div className="flex items-center justify-center gap-2">
          {["USD", "EUR", "HTG"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition border ${
                currency === c
                  ? "bg-slate-800 text-white border-amber-500/80"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Preset Amounts */}
        <div className="space-y-4">
          <label className="block text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Choisissez votre montant
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {presetAmounts.map((amt) => {
              const displayAmt = currency === "HTG" ? amt * 130 : amt;
              const isSelected = selectedAmount === displayAmt && !customAmount;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(displayAmt);
                    setCustomAmount("");
                  }}
                  className={`py-3.5 px-3 rounded-2xl font-bold text-base transition border ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10 text-amber-300 shadow-md"
                      : "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {displayAmt} {currency}
                </button>
              );
            })}
          </div>

          <div className="max-w-xs mx-auto pt-2">
            <input
              type="number"
              min="1"
              step="any"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(0);
              }}
              placeholder={`Autre montant en ${currency}...`}
              className="w-full text-center px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition"
            />
          </div>
        </div>

        {/* Cause selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Affectation des fonds
          </label>
          <select
            value={cause}
            onChange={(e) => setCause(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
          >
            <option value="education">Bourses d&apos;études et Formations Tech pour jeunes défavorisés</option>
            <option value="emergency">Soutien humanitaire et d&apos;urgence Haïti</option>
            <option value="innovation">Fonds de dotation pour la recherche IA ouverte</option>
            <option value="general">Où le besoin est le plus urgent (Fonds général BWT)</option>
          </select>
        </div>

        {/* Donor info */}
        <form onSubmit={handleDonate} className="space-y-6 pt-4 border-t border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Nom du donateur (ou &quot;Anonyme&quot;)
              </label>
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="Ex: Alexandre Mentor"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Email pour le reçu fiscal *
              </label>
              <input
                type="email"
                required
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                placeholder="reçu@exemple.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Provider Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setProvider("STRIPE")}
              className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                provider === "STRIPE"
                  ? "border-amber-500 bg-amber-500/10 text-white"
                  : "border-slate-800 bg-slate-900 text-slate-400"
              }`}
            >
              <span className="text-xs font-medium">Carte / Apple Pay</span>
              <CreditCard className="w-4 h-4 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => setProvider("PAYPAL")}
              className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                provider === "PAYPAL"
                  ? "border-amber-500 bg-amber-500/10 text-white"
                  : "border-slate-800 bg-slate-900 text-slate-400"
              }`}
            >
              <span className="text-xs font-medium">PayPal</span>
              <span className="text-xs font-bold text-sky-400">PP</span>
            </button>
            <button
              type="button"
              onClick={() => setProvider("MONCASH")}
              className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                provider === "MONCASH"
                  ? "border-amber-500 bg-amber-500/10 text-white"
                  : "border-slate-800 bg-slate-900 text-slate-400"
              }`}
            >
              <span className="text-xs font-medium">MonCash (HTG)</span>
              <Smartphone className="w-4 h-4 text-red-400" />
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs">
              {error}
            </div>
          )}

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-slate-950 text-base bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 transition shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Préparation du don...</span>
            ) : (
              <>
                <Heart className="w-5 h-5 fill-current" />
                <span>
                  Faire un don de {finalAmount} {currency}{" "}
                  {frequency === "monthly" ? "/ mois" : ""}
                </span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-2">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Don 100% sécurisé
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Award className="w-4 h-4 text-amber-400" /> Reçu fiscal automatique
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DonatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <DonateContent />
    </Suspense>
  );
}
