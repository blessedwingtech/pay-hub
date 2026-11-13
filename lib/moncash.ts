import { SatelliteSite } from "./types";
import { isBazikConfigured, createBazikPayment } from "./bazik";

const clientId = process.env.MONCASH_CLIENT_ID || "";
const clientSecret = process.env.MONCASH_CLIENT_SECRET || "";
const mode = process.env.MONCASH_MODE || "sandbox";

const MONCASH_BASE_URL =
  mode === "production"
    ? "https://moncashbutton.digicelgroup.com/Api"
    : "https://sandbox.moncashbutton.digicelgroup.com/Api";

const MONCASH_GATEWAY_URL =
  mode === "production"
    ? "https://moncashbutton.digicelgroup.com/Moncash-middleware/Payment/Redirect"
    : "https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware/Payment/Redirect";

export function isMonCashConfigured(): boolean {
  if (isBazikConfigured()) return true;
  return Boolean(
    clientId &&
    clientSecret &&
    !clientId.includes("placeholder") &&
    !clientSecret.includes("placeholder")
  );
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Retrieves a valid OAuth token from MonCash API.
 */
export async function getMonCashAccessToken(): Promise<string> {
  if (!isMonCashConfigured()) {
    throw new Error("PROVIDER_UNAVAILABLE: Le paiement MonCash est temporairement indisponible.");
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  try {
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch(`${MONCASH_BASE_URL}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MonCash Auth Error (${response.status})]`, errorText);
      throw new Error(`PROVIDER_UNAVAILABLE: Erreur d'authentification MonCash (${response.status})`);
    }

    const data = await response.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in || 3600) * 1000,
    };

    return data.access_token;
  } catch (err: any) {
    console.error("[MonCash getMonCashAccessToken Error]", err?.message || err);
    throw new Error("PROVIDER_UNAVAILABLE: Le service MonCash est temporairement indisponible.");
  }
}

/**
 * Creates a MonCash Payment in Haitian Gourdes (HTG).
 */
export async function createMonCashPayment(params: {
  amount: number; // in HTG
  orderId: string;
  sourceSite: SatelliteSite;
  satelliteUserId: string;
  description?: string;
  returnUrl?: string;
  customerEmail?: string;
  customerFullName?: string;
}): Promise<{ paymentToken: string; redirectUrl: string }> {
  // 1. If Bazik (approved partner gateway) is configured, prioritize Bazik
  if (isBazikConfigured()) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://pay.bittonik.com").replace(/\/+$/, "");
    return await createBazikPayment({
      amount: params.amount,
      orderId: params.orderId,
      sourceSite: params.sourceSite,
      satelliteUserId: params.satelliteUserId,
      description: params.description,
      returnUrl: params.returnUrl || `${appUrl}/success?order_id=${params.orderId}`,
      customerEmail: params.customerEmail,
      customerFullName: params.customerFullName,
    });
  }

  // 2. Direct fallback to Digicel MonCash if legacy credentials present
  try {
    const token = await getMonCashAccessToken();

    const body = {
      amount: Math.round(params.amount),
      orderId: params.orderId,
    };

    const response = await fetch(`${MONCASH_BASE_URL}/v1/CreatePayment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MonCash Create Payment Error (${response.status})]`, errorText);
      throw new Error(`PROVIDER_UNAVAILABLE: Erreur MonCash (${response.status})`);
    }

    const data = await response.json();
    const paymentToken = data.payment_token?.token || data.token;

    if (!paymentToken) {
      throw new Error("PROVIDER_UNAVAILABLE: Jeton MonCash non reçu.");
    }

    return {
      paymentToken,
      redirectUrl: `${MONCASH_GATEWAY_URL}?token=${paymentToken}`,
    };
  } catch (err: any) {
    console.error("[createMonCashPayment Error]", err?.message || err);
    throw new Error("PROVIDER_UNAVAILABLE: Le service MonCash est temporairement indisponible.");
  }
}

/**
 * Verifies and retrieves MonCash payment status by transaction ID or Order ID.
 */
export async function verifyMonCashPayment(transactionId: string): Promise<{
  status: string;
  amount?: number;
  message?: string;
  reference?: string;
}> {
  const token = await getMonCashAccessToken();

  const response = await fetch(`${MONCASH_BASE_URL}/v1/RetrieveTransactionPayment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ transactionId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MonCash Verify Transaction Failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const payment = data.payment;

  return {
    status: payment ? "COMPLETED" : "FAILED",
    amount: payment?.amount,
    message: payment?.message,
    reference: payment?.reference,
  };
}

/**
 * Executes a B2C disbursement (Cash-out / Payout) to a Haitian phone number via MonCash.
 */
export async function executeMonCashPayout(params: {
  amount: number; // in HTG
  phoneNumber: string; // 8 digits (e.g. 509xxxxxxxx or 3xxxxxxx)
  sellerId: string;
}): Promise<{ disbursementId: string; status: string }> {
  const token = await getMonCashAccessToken();

  // Clean phone number (standard format for Digicel MonCash Haiti)
  let phone = params.phoneNumber.replace(/\D/g, "");
  if (phone.startsWith("509")) {
    phone = phone.substring(3);
  }

  const referenceId = `mc_disb_${params.sellerId}_${Date.now()}`;
  const body = {
    amount: Math.round(params.amount),
    receiver: phone,
    reference: referenceId,
  };

  const response = await fetch(`${MONCASH_BASE_URL}/v1/Disbursement`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MonCash Payout / Disbursement Failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    disbursementId: data.transaction_id || referenceId,
    status: "SUCCEEDED",
  };
}
