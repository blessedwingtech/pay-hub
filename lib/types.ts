// Types for Pay-Hub and Multi-tenant Satellites (Dynamic & Universal)

export type KnownSatelliteSite = "MEMOTONIK" | "SHOPTONIK" | "ACADEMY" | "BWT" | "PRESSTONIK";
export type SatelliteSite = string;

export type PaymentProvider = "STRIPE" | "PAYPAL" | "MONCASH";
export type TransactionType = "ONE_TIME" | "SUBSCRIPTION" | "DONATION" | "PAYOUT";
export type TransactionStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELED" | "REFUNDED";
export type PayoutChannel = "STRIPE" | "PAYPAL" | "MONCASH";
export type PayoutStatus = "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";
export type SubscriptionStatus = "INCOMPLETE" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID";

export interface PayCheckoutParams {
  userId: string;
  email: string;
  fullName?: string;
  amount: number;
  currency?: string; // Default 'USD'
  sourceSite: SatelliteSite;
  type?: TransactionType; // Default 'ONE_TIME'
  planId?: string; // If SUBSCRIPTION
  description?: string;
  returnUrl: string;
  cancelUrl?: string;
  webhookUrl?: string; // Dynamic target webhook endpoint
  siteName?: string; // Dynamic display name (ex: "PressTonik")
  accentColor?: string; // Dynamic brand color (ex: "#ec4899")
  logoText?: string; // Dynamic initials badge (ex: "PT")
  logoUrl?: string; // Dynamic remote logo image
  metadata?: Record<string, any>;
}

export interface PayDonateParams {
  userId?: string;
  email?: string;
  fullName?: string;
  amount?: number;
  currency?: string;
  recurring?: boolean;
  frequency?: "monthly" | "once";
  cause?: string;
  returnUrl?: string;
  webhookUrl?: string;
}

export interface PayoutRequestParams {
  sellerId: string;
  sourceSite: SatelliteSite;
  amount: number;
  currency: string;
  channel: PayoutChannel;
  destination: string; // Stripe Connect ID, PayPal Email, or MonCash Phone
  webhookUrl?: string;
  metadata?: Record<string, any>;
}

export interface PayHubWebhookPayload {
  eventId: string;
  eventType: string; // e.g. "payment.completed", "subscription.created", "payout.succeeded"
  event: string; // Alias for standardized consumption by all satellites
  timestamp: string;
  sourceSite: SatelliteSite;
  data: {
    transactionId?: string;
    satelliteUserId?: string;
    sellerId?: string;
    amount?: number;
    currency?: string;
    status: string;
    provider: PaymentProvider | PayoutChannel;
    type?: TransactionType;
    planId?: string;
    payoutId?: string;
    destination?: string;
    metadata?: Record<string, any>;
  };
}

export interface SatelliteConfig {
  name: string;
  displayName: string;
  description: string;
  accentColor: string;
  logoText: string;
  logoUrl?: string;
  webhookUrlEnv?: string;
  webhookUrl?: string;
}

/**
 * Built-in presets for standard BitTonik ecosystem applications.
 */
export const SATELLITE_CONFIGS: Record<string, SatelliteConfig> = {
  MEMOTONIK: {
    name: "MEMOTONIK",
    displayName: "MemoTonik",
    description: "Plateforme IA de productivité et mémorisation active",
    accentColor: "#3b82f6",
    logoText: "MT",
    webhookUrlEnv: "MEMOTONIK_WEBHOOK_URL",
  },
  SHOPTONIK: {
    name: "SHOPTONIK",
    displayName: "ShopTonik",
    description: "Marketplace & Commerce digital multi-vendeurs",
    accentColor: "#10b981",
    logoText: "ST",
    webhookUrlEnv: "SHOPTONIK_WEBHOOK_URL",
  },
  ACADEMY: {
    name: "ACADEMY",
    displayName: "BitTonik Academy",
    description: "Formations d'élite en programmation, IA & Finance",
    accentColor: "#8b5cf6",
    logoText: "BA",
    webhookUrlEnv: "ACADEMY_WEBHOOK_URL",
  },
  BWT: {
    name: "BWT",
    displayName: "BitTonik World Trust (BWT)",
    description: "Fonds humanitaire pour l'éducation et la solidarité",
    accentColor: "#f59e0b",
    logoText: "BWT",
    webhookUrlEnv: "BWT_WEBHOOK_URL",
  },
  PRESSTONIK: {
    name: "PRESSTONIK",
    displayName: "PressTonik",
    description: "Médias d'investigation, tech & analyses économiques",
    accentColor: "#ec4899",
    logoText: "PT",
    webhookUrlEnv: "PRESSTONIK_WEBHOOK_URL",
  },
};

/**
 * Helper to generate title case name from code (e.g. "EDUTONIK" -> "Edutonik")
 */
function toTitleCase(str: string): string {
  if (!str) return "Satellite";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Helper to extract 2 letters initials from a string
 */
function extractInitials(str: string): string {
  if (!str) return "BT";
  const clean = str.replace(/[^a-zA-Z0-9]/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || "BT";
}

/**
 * Universally resolves satellite configuration:
 * 1. Takes dynamic query/body branding parameters if supplied.
 * 2. Merges with built-in preset if known.
 * 3. Fallbacks to a sleek BitTonik-themed default for ANY new satellite without crashing.
 */
export function resolveSatelliteConfig(params: {
  sourceSite?: string | null;
  siteName?: string | null;
  accentColor?: string | null;
  logoText?: string | null;
  logoUrl?: string | null;
  webhookUrl?: string | null;
}): SatelliteConfig {
  const code = (params.sourceSite || "BITTONIK").toUpperCase().trim();
  const preset = SATELLITE_CONFIGS[code];

  const defaultDisplayName = preset?.displayName || params.siteName || toTitleCase(code);
  const defaultAccent = params.accentColor || preset?.accentColor || "#3b82f6";
  const defaultLogoText = params.logoText || preset?.logoText || extractInitials(defaultDisplayName);
  const defaultDesc = preset?.description || `Service sécurisé propulsé par BitTonik Pay-Hub (${defaultDisplayName})`;
  const defaultWebhookEnv = `${code}_WEBHOOK_URL`;

  return {
    name: code,
    displayName: params.siteName || defaultDisplayName,
    description: defaultDesc,
    accentColor: defaultAccent,
    logoText: defaultLogoText,
    logoUrl: params.logoUrl || preset?.logoUrl,
    webhookUrlEnv: defaultWebhookEnv,
    webhookUrl: params.webhookUrl || preset?.webhookUrl,
  };
}
