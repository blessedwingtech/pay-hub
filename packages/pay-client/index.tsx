"use client";

import React, { useState } from "react";

export type SatelliteSite = string;
export type TransactionType = "ONE_TIME" | "SUBSCRIPTION" | "DONATION" | "PAYOUT";
export type PaymentProvider = "STRIPE" | "PAYPAL" | "MONCASH";

export interface BuildCheckoutUrlParams {
  baseUrl?: string; // Default: process.env.NEXT_PUBLIC_PAY_HUB_URL || "https://pay.bittonik.com"
  userId: string;
  email: string;
  fullName?: string;
  amount: number;
  currency?: string;
  sourceSite: SatelliteSite; // e.g. "PRESSTONIK", "MEMOTONIK", "SHOPTONIK", "EDUTONIK"
  type?: TransactionType;
  planId?: string;
  description?: string;
  returnUrl: string;
  cancelUrl?: string;
  webhookUrl?: string; // Dynamic webhook endpoint on satellite
  siteName?: string; // Dynamic display name (e.g. "PressTonik")
  accentColor?: string; // Dynamic hex color (e.g. "#ec4899")
  logoText?: string; // Dynamic badge initials (e.g. "PT")
  logoUrl?: string; // Dynamic brand logo URL
  metadata?: Record<string, any>;
}

export interface BuildDonateUrlParams {
  baseUrl?: string;
  userId?: string;
  email?: string;
  fullName?: string;
  amount?: number;
  currency?: string;
  recurring?: boolean;
  cause?: string;
  returnUrl?: string;
  webhookUrl?: string;
}

/**
 * Builds a secure query-string SSO checkout URL targeting BitTonik Pay-Hub.
 */
export function buildPayCheckoutUrl(params: BuildCheckoutUrlParams): string {
  const host =
    params.baseUrl ||
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_PAY_HUB_URL) ||
    "https://pay.bittonik.com";

  const cleanHost = host.replace(/\/+$/, "");
  const url = new URL(`${cleanHost}/checkout`);

  url.searchParams.set("user_id", params.userId);
  url.searchParams.set("email", params.email);
  if (params.fullName) url.searchParams.set("full_name", params.fullName);
  url.searchParams.set("amount", params.amount.toString());
  url.searchParams.set("currency", params.currency || "USD");
  url.searchParams.set("source_site", params.sourceSite);
  url.searchParams.set("type", params.type || "ONE_TIME");
  if (params.planId) url.searchParams.set("plan_id", params.planId);
  if (params.description) url.searchParams.set("description", params.description);
  url.searchParams.set("return_url", params.returnUrl);
  if (params.cancelUrl) url.searchParams.set("cancel_url", params.cancelUrl);

  // Dynamic branding & webhook params
  if (params.webhookUrl) url.searchParams.set("webhook_url", params.webhookUrl);
  if (params.siteName) url.searchParams.set("site_name", params.siteName);
  if (params.accentColor) url.searchParams.set("accent_color", params.accentColor);
  if (params.logoText) url.searchParams.set("logo_text", params.logoText);
  if (params.logoUrl) url.searchParams.set("logo_url", params.logoUrl);

  if (params.metadata) {
    url.searchParams.set("metadata", JSON.stringify(params.metadata));
  }

  return url.toString();
}

/**
 * Builds a donation URL for BitTonik World Trust (BWT)
 */
export function buildPayDonateUrl(params: BuildDonateUrlParams): string {
  const host =
    params.baseUrl ||
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_PAY_HUB_URL) ||
    "https://pay.bittonik.com";

  const cleanHost = host.replace(/\/+$/, "");
  const url = new URL(`${cleanHost}/donate`);

  if (params.userId) url.searchParams.set("user_id", params.userId);
  if (params.email) url.searchParams.set("email", params.email);
  if (params.fullName) url.searchParams.set("full_name", params.fullName);
  if (params.amount) url.searchParams.set("amount", params.amount.toString());
  if (params.currency) url.searchParams.set("currency", params.currency);
  if (params.recurring) url.searchParams.set("recurring", "true");
  if (params.cause) url.searchParams.set("cause", params.cause);
  if (params.returnUrl) url.searchParams.set("return_url", params.returnUrl);
  if (params.webhookUrl) url.searchParams.set("webhook_url", params.webhookUrl);

  return url.toString();
}

/**
 * Helper to verify an incoming Pay-Hub webhook signature on satellite backends (Node.js/Next.js).
 */
export async function verifyPayHubWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;
  try {
    const crypto = await import("crypto");
    const expectedSig = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const providedSig = signatureHeader.replace(/^sha256=/, "");
    return crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export interface PayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checkoutParams: BuildCheckoutUrlParams;
  label?: string;
  variant?: "primary" | "secondary" | "gradient" | "outline" | "custom";
  loadingLabel?: string;
}

/**
 * Universal PayButton for satellite frontends (MemoTonik, ShopTonik, PressTonik, etc.)
 */
export const PayButton: React.FC<PayButtonProps> = ({
  checkoutParams,
  label = "Payer avec Pay-Hub",
  variant = "gradient",
  loadingLabel = "Redirection vers le Hub...",
  className = "",
  style,
  onClick,
  ...props
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) onClick(e);
    if (!e.defaultPrevented) {
      setLoading(true);
      const url = buildPayCheckoutUrl(checkoutParams);
      window.location.href = url;
    }
  };

  const customStyle: React.CSSProperties =
    variant === "custom" && checkoutParams.accentColor
      ? {
          background: `linear-gradient(135deg, ${checkoutParams.accentColor}, #2563eb)`,
          color: "#ffffff",
          ...style,
        }
      : { ...style };

  const variantStyles = {
    gradient:
      "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25",
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700",
    outline: "border-2 border-blue-500 text-blue-400 hover:bg-blue-500/10",
    custom: "shadow-lg text-white hover:opacity-90",
  }[variant];

  return (
    <button
      {...props}
      style={customStyle}
      disabled={loading || props.disabled}
      onClick={handleClick}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${variantStyles} ${className}`}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
