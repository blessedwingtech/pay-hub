"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ArrowRight, ShieldCheck, ExternalLink } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();

  const sessionId = searchParams.get("session_id") || searchParams.get("order_id") || "tx_confirmed";
  const provider = searchParams.get("provider") || "STRIPE";
  const returnUrl = searchParams.get("return_url") || "/";

  const [countdown, setCountdown] = useState<number>(5);

  useEffect(() => {
    if (!returnUrl || returnUrl === "/") return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = returnUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [returnUrl]);

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-slate-800 max-w-lg w-full text-center space-y-6 shadow-2xl">
        {/* Animated Check Icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10 animate-bounce" />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Paiement Confirmé !
          </h1>
          <p className="text-slate-300 text-sm mt-2">
            Votre transaction a été validée avec succès par la passerelle {provider}.
          </p>
        </div>

        {/* Transaction details card */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left text-xs space-y-2">
          <div className="flex justify-between text-slate-400">
            <span>Passerelle</span>
            <span className="text-white font-semibold">{provider}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Identifiant Transaction</span>
            <span className="text-white font-mono truncate max-w-[200px]">{sessionId}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Statut Hub</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Enregistré & Synchronisé
            </span>
          </div>
        </div>

        {/* Redirection info */}
        {returnUrl && returnUrl !== "/" ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Redirection automatique vers votre espace dans{" "}
              <span className="text-blue-400 font-bold">{countdown}</span> seconde{countdown > 1 ? "s" : ""}...
            </p>
            <a
              href={returnUrl}
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-[0.99]"
            >
              <span>Continuer maintenant</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-700 transition border border-slate-700"
          >
            <span>Retour à l&apos;accueil Pay-Hub</span>
          </a>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
