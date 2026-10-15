import Stripe from "stripe";
import { SatelliteSite, TransactionType } from "./types";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-09-30.acacia" as any,
  typescript: true,
});

/**
 * Creates a Stripe Checkout Session for Pay-Hub
 */
export async function createStripeCheckoutSession(params: {
  amount: number; // in unit currency (e.g. 29.99 USD)
  currency: string;
  sourceSite: SatelliteSite;
  type: TransactionType;
  planId?: string;
  description?: string;
  customerEmail: string;
  customerName?: string;
  satelliteUserId: string;
  stripeCustomerId?: string | null;
  returnUrl: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}): Promise<{ sessionId: string; url: string }> {
  const isSubscription = params.type === "SUBSCRIPTION";
  const currency = params.currency.toLowerCase();
  const unitAmountInCents = Math.round(params.amount * 100);

  const successUrl = `${params.returnUrl}${
    params.returnUrl.includes("?") ? "&" : "?"
  }session_id={CHECKOUT_SESSION_ID}&provider=STRIPE`;

  const cancelUrl = params.cancelUrl || params.returnUrl;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    mode: isSubscription ? "subscription" : "payment",
    client_reference_id: `${params.sourceSite}:${params.satelliteUserId}`,
    customer_email: params.stripeCustomerId ? undefined : params.customerEmail,
    customer: params.stripeCustomerId || undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      sourceSite: params.sourceSite,
      satelliteUserId: params.satelliteUserId,
      type: params.type,
      planId: params.planId || "",
      ...params.metadata,
    },
    line_items: [
      isSubscription
        ? {
            price_data: {
              currency,
              product_data: {
                name: params.description || `${params.sourceSite} - Plan ${params.planId || "Pro"}`,
                metadata: {
                  sourceSite: params.sourceSite,
                  planId: params.planId || "",
                },
              },
              unit_amount: unitAmountInCents,
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          }
        : {
            price_data: {
              currency,
              product_data: {
                name: params.description || `Paiement ${params.sourceSite}`,
                metadata: {
                  sourceSite: params.sourceSite,
                },
              },
              unit_amount: unitAmountInCents,
            },
            quantity: 1,
          },
    ],
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error("Stripe failed to return a checkout URL");
  }

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Creates a Stripe Customer Portal session for billing management
 */
export async function createStripePortalSession(params: {
  stripeCustomerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
  });

  return { url: portalSession.url };
}

/**
 * Executes a Stripe Connect Transfer to a connected vendor account (ShopTonik sellers)
 */
export async function executeStripePayout(params: {
  amount: number; // in unit currency e.g. 150.00 USD
  currency: string;
  destinationAccount: string; // Stripe Connected Account ID (acct_...)
  description?: string;
  metadata?: Record<string, string>;
}): Promise<{ transferId: string; status: string }> {
  const amountInCents = Math.round(params.amount * 100);

  const transfer = await stripe.transfers.create({
    amount: amountInCents,
    currency: params.currency.toLowerCase(),
    destination: params.destinationAccount,
    description: params.description || "Reversement ShopTonik vendeur",
    metadata: params.metadata,
  });

  return {
    transferId: transfer.id,
    status: "SUCCEEDED",
  };
}
