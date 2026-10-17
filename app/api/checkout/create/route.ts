import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStripeCheckoutSession } from "@/lib/stripe";
import { createPayPalOrder } from "@/lib/paypal";
import { createMonCashPayment } from "@/lib/moncash";
import { PaymentProvider, TransactionType } from "@/lib/types";
import { convertHtgToUsd, convertUsdToHtg } from "@/lib/currency";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawSourceSite = body.sourceSite || body.source_site || "BITTONIK";
    const sourceSite = String(rawSourceSite).toUpperCase().trim();

    const {
      userId,
      email,
      fullName,
      amount,
      currency = "USD",
      provider = "STRIPE",
      type = "ONE_TIME",
      planId,
      description,
      returnUrl,
      cancelUrl,
      siteName,
      accentColor,
      logoText,
      logoUrl,
      metadata = {},
    } = body as {
      userId: string;
      email: string;
      fullName?: string;
      amount: number;
      currency?: string;
      provider: PaymentProvider;
      type?: TransactionType;
      planId?: string;
      description?: string;
      returnUrl: string;
      cancelUrl?: string;
      siteName?: string;
      accentColor?: string;
      logoText?: string;
      logoUrl?: string;
      metadata?: Record<string, any>;
    };

    const webhookUrl = body.webhookUrl || body.webhook_url || metadata?.webhookUrl || null;

    if (!userId || !email || !amount || !sourceSite || !returnUrl) {
      return NextResponse.json(
        { error: "Paramètres manquants (userId, email, amount, sourceSite, returnUrl requis)" },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Montant invalide" },
        { status: 400 }
      );
    }

    // Auto-register or update Satellite metadata in DB if provided
    try {
      await prisma.satellite.upsert({
        where: { code: sourceSite },
        update: {
          ...(siteName && { name: siteName }),
          ...(accentColor && { accentColor }),
          ...(logoText && { logoText }),
          ...(logoUrl && { logoUrl }),
          ...(webhookUrl && { webhookUrl }),
        },
        create: {
          code: sourceSite,
          name: siteName || sourceSite,
          accentColor: accentColor || "#3b82f6",
          logoText: logoText || sourceSite.slice(0, 2).toUpperCase(),
          logoUrl: logoUrl || null,
          webhookUrl: webhookUrl || null,
        },
      });
    } catch (satErr) {
      console.warn("[Checkout Create] Auto-register satellite warning:", satErr);
    }

    // Upsert Customer dynamically
    let customer = await prisma.customer.findUnique({
      where: {
        satelliteUserId_sourceSite: {
          satelliteUserId: userId,
          sourceSite,
        },
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          satelliteUserId: userId,
          sourceSite,
          email,
          name: fullName || null,
        },
      });
    }

    // Pre-create pending transaction
    const transaction = await prisma.transaction.create({
      data: {
        customerId: customer.id,
        satelliteUserId: userId,
        sourceSite,
        amount: numAmount,
        currency: currency.toUpperCase(),
        status: "PENDING",
        provider,
        type,
        description: description || null,
        returnUrl,
        cancelUrl: cancelUrl || returnUrl,
        webhookUrl: webhookUrl || null,
        metadata: {
          planId: planId || null,
          webhookUrl: webhookUrl || null,
          siteName: siteName || null,
          ...metadata,
        },
      },
    });

    let checkoutUrl = "";
    let providerPaymentId = "";

    const isHtg = currency.toUpperCase() === "HTG";
    const intlAmount = isHtg
      ? Math.max(0.5, await convertHtgToUsd(numAmount))
      : numAmount;
    const intlCurrency = isHtg ? "USD" : currency.toUpperCase();

    // 1. Stripe Checkout
    if (provider === "STRIPE") {
      const stripeRes = await createStripeCheckoutSession({
        amount: intlAmount,
        currency: intlCurrency,
        sourceSite,
        type,
        planId,
        description,
        customerEmail: email,
        customerName: fullName,
        satelliteUserId: userId,
        stripeCustomerId: customer.stripeCustomerId,
        returnUrl,
        cancelUrl,
        metadata: {
          transactionId: transaction.id,
          sourceSite,
          webhookUrl: webhookUrl || "",
        },
      });

      checkoutUrl = stripeRes.url;
      providerPaymentId = stripeRes.sessionId;
    }
    // 2. PayPal
    else if (provider === "PAYPAL") {
      const paypalRes = await createPayPalOrder({
        amount: intlAmount,
        currency: intlCurrency,
        sourceSite,
        type,
        description,
        returnUrl,
        cancelUrl,
        satelliteUserId: userId,
      });

      checkoutUrl = paypalRes.approveUrl;
      providerPaymentId = paypalRes.orderId;
    }
    // 3. MonCash (Haiti Gourdes)
    else if (provider === "MONCASH") {
      // Ensure currency is HTG for MonCash using live exchange rate
      const htgAmount = isHtg ? numAmount : await convertUsdToHtg(numAmount);
      const moncashRes = await createMonCashPayment({
        amount: htgAmount,
        orderId: transaction.id,
        sourceSite,
        satelliteUserId: userId,
      });

      checkoutUrl = moncashRes.redirectUrl;
      providerPaymentId = moncashRes.paymentToken;
    } else {
      return NextResponse.json(
        { error: `Moyen de paiement ${provider} non supporté` },
        { status: 400 }
      );
    }

    // Update transaction with provider payment ID
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { providerPaymentId },
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      checkoutUrl,
      provider,
    });
  } catch (error: any) {
    console.error("[API checkout/create] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur interne lors de l'initialisation du paiement" },
      { status: 500 }
    );
  }
}
