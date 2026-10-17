import { SatelliteSite, TransactionType } from "./types";

const clientId = process.env.PAYPAL_CLIENT_ID || "";
const clientSecret = process.env.PAYPAL_CLIENT_SECRET || "";
const environment = process.env.PAYPAL_ENVIRONMENT || "sandbox";

const PAYPAL_API_BASE =
  environment === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Retrieves a valid OAuth2 bearer token from PayPal REST API.
 */
export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal Auth Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Creates a PayPal Order for checkout.
 */
export async function createPayPalOrder(params: {
  amount: number;
  currency: string;
  sourceSite: SatelliteSite;
  type: TransactionType;
  description?: string;
  returnUrl: string;
  cancelUrl?: string;
  satelliteUserId: string;
}): Promise<{ orderId: string; approveUrl: string }> {
  const token = await getPayPalAccessToken();

  const formattedAmount = params.amount.toFixed(2);
  const currency = params.currency.toUpperCase();

  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: `${params.sourceSite}:${params.satelliteUserId}`,
        description: params.description || `Paiement ${params.sourceSite}`,
        amount: {
          currency_code: currency,
          value: formattedAmount,
        },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: `BitTonik Pay - ${params.sourceSite}`,
          locale: "fr-FR",
          landing_page: "GUEST_CHECKOUT",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          return_url: `${params.returnUrl}${
            params.returnUrl.includes("?") ? "&" : "?"
          }provider=PAYPAL`,
          cancel_url: params.cancelUrl || params.returnUrl,
        },
      },
    },
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal Create Order Failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const approveLink = data.links?.find((link: any) => link.rel === "approve");

  if (!approveLink || !approveLink.href) {
    throw new Error("PayPal did not return an approval link");
  }

  return {
    orderId: data.id,
    approveUrl: approveLink.href,
  };
}

/**
 * Captures an approved PayPal Order.
 */
export async function capturePayPalOrder(orderId: string): Promise<{
  id: string;
  status: string;
  captureId?: string;
}> {
  const token = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal Capture Failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id;

  return {
    id: data.id,
    status: data.status,
    captureId,
  };
}

/**
 * Executes a PayPal Payout to a seller or affiliate using the PayPal Payouts API.
 */
export async function executePayPalPayout(params: {
  amount: number;
  currency: string;
  recipientEmail: string;
  sellerId: string;
  note?: string;
}): Promise<{ payoutBatchId: string; status: string }> {
  const token = await getPayPalAccessToken();

  const senderBatchId = `batch_${params.sellerId}_${Date.now()}`;
  const body = {
    sender_batch_header: {
      sender_batch_id: senderBatchId,
      email_subject: "Vous avez reçu un reversement de BitTonik Pay-Hub",
      email_message: params.note || "Merci pour vos ventes sur le réseau BitTonik.",
    },
    items: [
      {
        recipient_type: "EMAIL",
        amount: {
          value: params.amount.toFixed(2),
          currency: params.currency.toUpperCase(),
        },
        receiver: params.recipientEmail,
        note: params.note || "Reversement vendeur",
        sender_item_id: `item_${params.sellerId}_${Date.now()}`,
      },
    ],
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal Payout Failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    payoutBatchId: data.batch_header.payout_batch_id,
    status: data.batch_header.batch_status || "PENDING",
  };
}
