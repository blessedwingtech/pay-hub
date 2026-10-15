"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  ShieldCheck,
  Check,
  AlertCircle,
  ArrowRight,
  Lock,
  Smartphone,
} from "lucide-react";
import { PaymentProvider, resolveSatelliteConfig } from "@/lib/types";

function CheckoutContent() {
  const searchParams = useSearchParams();

  // Parse parameters from SSO / Satellite call
  const userId = searchParams.get("user_id") || searchParams.get("userId") || "guest_user";
  const emailParam = searchParams.get("email") || "";
  const fullNameParam = searchParams.get("full_name") || searchParams.get("fullName") || "";
  const amountParam = searchParams.get("amount") || "29.99";
  const currencyParam = (searchParams.get("currency") || "USD").toUpperCase();
  const sourceSiteParam = (
    searchParams.get("source_site") ||
    searchParams.get("sourceSite") ||
    "BITTONIK"
  ).toUpperCase();
  const typeParam = (searchParams.get("type") || "ONE_TIME") as "ONE_TIME" | "SUBSCRIPTION" | "DONATION";
  const planIdParam = searchParams.get("plan_id") || searchParams.get("planId") || "";
  const descriptionParam = searchParams.get("description") || "";
  const returnUrlParam = searchParams.get("return_url") || searchParams.get("returnUrl") || "https://bittonik.com";
  const cancelUrlParam = searchParams.get("cancel_url") || searchParams.get("cancelUrl") || returnUrlParam;

  // Dynamic branding & webhook parameters
  const siteNameParam = searchParams.get("site_name") || searchParams.get("siteName") || "";
  const accentColorParam = searchParams.get("accent_color") || searchParams.get("accentColor") || "";
  const logoTextParam = searchParams.get("logo_text") || searchParams.get("logoText") || "";
  const logoUrlParam = searchParams.get("logo_url") || searchParams.get("logoUrl") || "";
  const webhookUrlParam = searchParams.get("webhook_url") || searchParams.get("webhookUrl") || "";

  // Resolve satellite branding dynamically without crashing
  const siteConfig = resolveSatelliteConfig({
    sourceSite: sourceSiteParam,
    siteName: siteNameParam,
    accentColor: accentColorParam,
    logoText: logoTextParam,
    logoUrl: logoUrlParam,
    webhookUrl: webhookUrlParam,
  });

  // Form states
  const [email, setEmail] = useState(emailParam);
  const [fullName, setFullName] = useState(fullNameParam);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>("STRIPE");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const amount = parseFloat(amountParam) || 0;

  // Calculate Haitian Gourde estimate (1 USD ~ 132 HTG)
  const htgAmount = currencyParam === "HTG" ? amount : Math.round(amount * 132);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    if (!email) {
      setErrorMessage("Veuillez saisir votre adresse email pour la facturation.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email,
          fullName,
          amount,
          currency: currencyParam,
          sourceSite: siteConfig.name,
          provider: selectedProvider,
          type: typeParam,
          planId: planIdParam,
          description: descriptionParam || `${siteConfig.displayName} - ${typeParam === "SUBSCRIPTION" ? "Abonnement" : "Achat"}`,
          returnUrl: returnUrlParam,
          cancelUrl: cancelUrlParam,
          webhookUrl: siteConfig.webhookUrl || undefined,
          siteName: siteConfig.displayName,
          accentColor: siteConfig.accentColor,
          logoText: siteConfig.logoText,
          logoUrl: siteConfig.logoUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Impossible d'initialiser le paiement.");
      }

      // Redirect user to the provider's payment page (Stripe, PayPal, or MonCash)
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      console.error("Checkout submission failed:", err);
      setErrorMessage(err.message || "Une erreur est survenue lors du démarrage du paiement.");
      setLoading(false);
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      {/* Top Banner Info with Dynamic Branding */}
      <div className="mb-8 flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3.5">
          {siteConfig.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={siteConfig.logoUrl}
              alt={siteConfig.displayName}
              className="w-11 h-11 rounded-xl object-cover border border-slate-800 shadow-md"
            />
          ) : (
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-md transition-transform"
              style={{
                backgroundColor: `${siteConfig.accentColor}25`,
                borderColor: `${siteConfig.accentColor}60`,
                borderWidth: "1px",
                color: siteConfig.accentColor,
              }}
            >
              {siteConfig.logoText}
            </div>
          )}
          <div>
            <div className="text-xs text-slate-400">Paiement sécurisé pour</div>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <span>{siteConfig.displayName}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                {siteConfig.name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Pay-Hub Encrypted Gateway</span>
          <span className="sm:hidden">Sécurisé</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Order Summary */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <h2 className="text-base font-semibold text-slate-200 uppercase tracking-wider text-xs">
              Récapitulatif de commande
            </h2>

            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-lg">
                  {descriptionParam || `${siteConfig.displayName} Services`}
                </h3>
                {typeParam === "SUBSCRIPTION" && (
                  <span
                    className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full border font-medium"
                    style={{
                      backgroundColor: `${siteConfig.accentColor}20`,
                      borderColor: `${siteConfig.accentColor}50`,
                      color: siteConfig.accentColor,
                    }}
                  >
                    Abonnement récurrent
                  </span>
                )}
                {typeParam === "DONATION" && (
                  <span className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                    Don de soutien
                  </span>
                )}
                {typeParam === "ONE_TIME" && (
                  <span className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                    Paiement unique
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-white">
                  {amount.toFixed(2)} {currencyParam}
                </div>
                {currencyParam !== "HTG" && (
                  <div className="text-xs text-slate-400">≈ {htgAmount} HTG</div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 space-y-2 text-sm text-slate-400">
              <div className="flex justify-between">
                <span>Sous-total</span>
                <span className="text-white font-medium">
                  {amount.toFixed(2)} {currencyParam}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Frais de traitement</span>
                <span className="text-emerald-400 font-medium">Offerts (0.00)</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800 text-base font-bold text-white">
                <span>Total à régler</span>
                <span style={{ color: siteConfig.accentColor }}>
                  {amount.toFixed(2)} {currencyParam}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-slate-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Garantie BitTonik Pay-Hub
              </div>
              <p>
                Vos identifiants et coordonnées bancaires sont chiffrés et ne transitent
                jamais en clair. Facturation gérée pour {siteConfig.displayName}.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Form & Provider Selection */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleCheckout}
            className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6"
          >
            <h2 className="text-xl font-bold text-white">Sélectionnez le mode de paiement</h2>

            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 flex items-start gap-3 text-red-200 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <div>{errorMessage}</div>
              </div>
            )}

            {/* Providers Selection Radios */}
            <div className="space-y-3">
              {/* Stripe */}
              <label
                onClick={() => setSelectedProvider("STRIPE")}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                  selectedProvider === "STRIPE"
                    ? "border-blue-500 bg-blue-950/20 shadow-md shadow-blue-500/10"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedProvider === "STRIPE"
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-slate-700 bg-slate-800"
                    }`}
                  >
                    {selectedProvider === "STRIPE" && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Carte Bancaire / Apple Pay / Google Pay</div>
                    <div className="text-xs text-slate-400">Visa, Mastercard, Amex, Apple Pay & Google Pay via Stripe</div>
                  </div>
                </div>
                <CreditCard className="w-5 h-5 text-blue-400 shrink-0" />
              </label>

              {/* PayPal */}
              <label
                onClick={() => setSelectedProvider("PAYPAL")}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                  selectedProvider === "PAYPAL"
                    ? "border-sky-500 bg-sky-950/20 shadow-md shadow-sky-500/10"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedProvider === "PAYPAL"
                        ? "border-sky-500 bg-sky-500 text-white"
                        : "border-slate-700 bg-slate-800"
                    }`}
                  >
                    {selectedProvider === "PAYPAL" && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">PayPal</div>
                    <div className="text-xs text-slate-400">Paiement instantané avec votre compte PayPal ou CB</div>
                  </div>
                </div>
                <div className="font-bold text-sky-400 text-sm">PayPal</div>
              </label>

              {/* MonCash (Haiti) */}
              <label
                onClick={() => setSelectedProvider("MONCASH")}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                  selectedProvider === "MONCASH"
                    ? "border-red-500 bg-red-950/20 shadow-md shadow-red-500/10"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedProvider === "MONCASH"
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-slate-700 bg-slate-800"
                    }`}
                  >
                    {selectedProvider === "MONCASH" && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">MonCash (Haïti - Digicel)</div>
                    <div className="text-xs text-slate-400">Paiement Mobile Money en HTG ({htgAmount} HTG)</div>
                  </div>
                </div>
                <Smartphone className="w-5 h-5 text-red-400 shrink-0" />
              </label>
            </div>

            {/* Customer Information */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300">Coordonnées du client</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Email de facturation *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean@exemple.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: `linear-gradient(135deg, ${siteConfig.accentColor}, #2563eb)`,
              }}
              className="w-full py-4 rounded-xl font-bold text-white text-base shadow-lg transition active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Connexion à {selectedProvider}...</span>
                </>
              ) : (
                <>
                  <span>
                    Payer {amount.toFixed(2)} {currencyParam}{" "}
                    {selectedProvider === "MONCASH" ? `(${htgAmount} HTG)` : ""}
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="text-center text-xs text-slate-500">
              Transaction sécurisée par BitTonik Pay-Hub pour {siteConfig.displayName}.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center space-y-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-slate-400">Chargement de la session de paiement...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
