"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

function CancelContent() {
  const searchParams = useSearchParams();
  const cancelUrl = searchParams.get("cancel_url") || searchParams.get("return_url") || "/";

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-slate-800 max-w-lg w-full text-center space-y-6 shadow-2xl">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Paiement non finalisé
          </h1>
          <p className="text-slate-300 text-sm mt-2">
            La procédure de règlement a été interrompue ou annulée. Aucun débit n&apos;a été effectué sur votre compte.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => window.history.back()}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réessayer</span>
          </button>

          <a
            href={cancelUrl}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 text-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retourner au site</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function CancelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <CancelContent />
    </Suspense>
  );
}
