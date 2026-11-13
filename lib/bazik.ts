import crypto from "crypto";
import { SatelliteSite } from "./types";

const BAZIK_USER_ID = process.env.BAZIK_USER_ID || "bzk_5ae8380e_1794545677";
const BAZIK_SECRET_KEY = process.env.BAZIK_SECRET_KEY || "sk_61791d175960c6ae958b131b6f3c111e";
const BAZIK_WEBHOOK_SECRET = process.env.BAZIK_WEBHOOK_SECRET || "whsec_ee0e56e50bfdc39c2eaae93ed44c5ce8";
const BAZIK_BASE_URL = (process.env.BAZIK_BASE_URL || "https://api.bazik.io").replace(/\/+$/, "");

export function isBazikConfigured(): boolean {
  return Boolean(
    BAZIK_USER_ID &&
    BAZIK_SECRET_KEY &&
    !BAZIK_USER_ID.includes("placeholder") &&
    !BAZIK_SECRET_KEY.includes("placeholder")
  );
}

let cachedBazikToken: { token: string; expiresAt: number } | null = null;

/**
 * Retrieves a valid Bearer JWT access token from Bazik API.
 * POST https://api.bazik.io/token
 */
export async function getBazikAccessToken(): Promise<string> {
  if (!isBazikConfigured()) {
    throw new Error("PROVIDER_UNAVAILABLE: Les clés Bazik ne sont pas encore configurées.");
  }

  const now = Date.now();
  // Return cached token if valid for at least 5 more minutes
  if (cachedBazikToken && cachedBazikToken.expiresAt > now + 300000) {
    return cachedBazikToken.token;
  }

  try {
    const response = await fetch(`${BAZIK_BASE_URL}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        userID: BAZIK_USER_ID,
        secretKey: BAZIK_SECRET_KEY,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Bazik Token Auth Error (${response.status})]`, errorText);
      throw new Error(`PROVIDER_UNAVAILABLE: Erreur d'authentification Bazik (${response.status})`);
    }

    const data = await response.json();
    const token = data.access_token || data.token;

    if (!token) {
      throw new Error("PROVIDER_UNAVAILABLE: Jeton d'accès non retourné par Bazik.");
    }

    // expires_in is in seconds, default to 24h if absent
    const expiresInMs = (data.expires_in || 86400) * 1000;
    cachedBazikToken = {
      token,
      expiresAt: now + expiresInMs,
    };

    return token;
  } catch (err: any) {
    console.error("[Bazik getBazikAccessToken Error]", err?.message || err);
    throw new Error("PROVIDER_UNAVAILABLE: Le service de paiement Bazik est temporairement indisponible.");
  }
}

/**
 * Creates a MonCash payment on Bazik in Haitian Gourdes (HTG).
 * Returns the payment token and direct checkout redirect URL.
 */
export async function createBazikPayment(params: {
  amount: number; // in HTG
  orderId: string;
  sourceSite?: SatelliteSite;
  satelliteUserId?: string;
  description?: string;
  returnUrl: string;
  cancelUrl?: string;
  customerEmail?: string;
  customerFullName?: string;
}): Promise<{ paymentToken: string; redirectUrl: string }> {
  try {
    const token = await getBazikAccessToken();

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://pay.bittonik.com").replace(/\/+$/, "");
    const webhookUrl = `${appUrl}/api/webhooks/bazik`;

    // Split customer name into first and last
    const nameParts = (params.customerFullName || "Client BitTonik").trim().split(/\s+/);
    const firstName = nameParts[0] || "Client";
    const lastName = nameParts.slice(1).join(" ") || "BitTonik";

    // Exact payload required by Bazik API /moncash/token
    const payload = {
      gdes: Math.round(params.amount),
      userID: BAZIK_USER_ID,
      referenceId: params.orderId,
      description: params.description || `Paiement ${params.sourceSite || "BWT"}`,
      successUrl: params.returnUrl,
      errorUrl: params.cancelUrl || params.returnUrl,
      webhookUrl: webhookUrl,
      customerFirstName: firstName,
      customerLastName: lastName,
      customerEmail: params.customerEmail || "contact@bittonik.com",
    };

    const response = await fetch(`${BAZIK_BASE_URL}/moncash/token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Bazik Create Payment HTTP Error (${response.status})]`, errorText);
      throw new Error(`PROVIDER_UNAVAILABLE: Erreur d'initialisation Bazik (${response.status})`);
    }

    const data = await response.json();

    if (data.success === false || data.error) {
      console.error("[Bazik Create Payment Error Response]", data);
      throw new Error(`PROVIDER_UNAVAILABLE: ${data.message || data.error || "Échec d'initialisation du paiement Bazik"}`);
    }

    const redirectUrl =
      data.redirectUrl ||
      data.redirect_url ||
      data.paymentUrl ||
      data.url ||
      data.checkoutUrl;

    const paymentToken =
      data.payment?.payment_token?.token ||
      data.orderId ||
      data.referenceId ||
      params.orderId;

    if (!redirectUrl) {
      throw new Error("PROVIDER_UNAVAILABLE: URL de redirection non reçue de Bazik.");
    }

    return {
      paymentToken,
      redirectUrl,
    };
  } catch (err: any) {
    console.error("[createBazikPayment Error]", err?.message || err);
    throw new Error(err?.message || "PROVIDER_UNAVAILABLE: Le paiement MonCash via Bazik est temporairement indisponible.");
  }
}

/**
 * Validates the HMAC signature sent by Bazik on webhooks.
 * Header: X-Bazik-Signature
 */
export function verifyBazikWebhookSignature(
  rawBody: string,
  signatureHeader?: string | null,
  secret?: string
): boolean {
  const secretKey = secret || BAZIK_WEBHOOK_SECRET;
  if (!signatureHeader || !secretKey) return false;

  try {
    const computed = crypto
      .createHmac("sha256", secretKey)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(signatureHeader.replace(/^sha256=/, ""))
    );
  } catch {
    return false;
  }
}
