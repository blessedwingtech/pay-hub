import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executeStripePayout } from "@/lib/stripe";
import { executePayPalPayout } from "@/lib/paypal";
import { executeMonCashPayout } from "@/lib/moncash";
import { dispatchWebhookToSatellite } from "@/lib/webhook-dispatcher";
import { SatelliteSite, PayoutChannel, PayoutRequestParams } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    // Security check: verify Bearer Token / Webhook secret
    const authHeader = req.headers.get("authorization");
    const secret = process.env.PAY_HUB_WEBHOOK_SECRET;

    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json(
        { error: "Non autorisé: Clé secrète Pay-Hub invalide ou manquante" },
        { status: 401 }
      );
    }

    const body: PayoutRequestParams = await req.json();
    const { sellerId, sourceSite, amount, currency = "USD", channel, destination, metadata } = body;

    if (!sellerId || !sourceSite || !amount || !channel || !destination) {
      return NextResponse.json(
        { error: "Champs requis manquants: sellerId, sourceSite, amount, channel, destination" },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Montant de retrait invalide" }, { status: 400 });
    }

    // Create pending payout record
    const payout = await prisma.payout.create({
      data: {
        sellerId,
        sourceSite: sourceSite as SatelliteSite,
        amount: numAmount,
        currency: currency.toUpperCase(),
        channel: channel as PayoutChannel,
        destination,
        status: "PROCESSING",
        metadata: metadata as any,
      },
    });

    let providerPayoutId: string | null = null;
    let payoutStatus: "SUCCEEDED" | "PROCESSING" | "FAILED" = "PROCESSING";
    let failureReason: string | null = null;

    try {
      if (channel === "STRIPE") {
        const stripeRes = await executeStripePayout({
          amount: numAmount,
          currency,
          destinationAccount: destination,
          description: `Retrait ShopTonik Vendeur ${sellerId}`,
          metadata: { payoutId: payout.id, sellerId },
        });
        providerPayoutId = stripeRes.transferId;
        payoutStatus = "SUCCEEDED";
      } else if (channel === "PAYPAL") {
        const paypalRes = await executePayPalPayout({
          amount: numAmount,
          currency,
          recipientEmail: destination,
          sellerId,
          note: `Reversement ShopTonik - ${sellerId}`,
        });
        providerPayoutId = paypalRes.payoutBatchId;
        payoutStatus = "PROCESSING"; // PayPal batch starts in PENDING/PROCESSING
      } else if (channel === "MONCASH") {
        const moncashRes = await executeMonCashPayout({
          amount: currency.toUpperCase() === "HTG" ? numAmount : numAmount * 132,
          phoneNumber: destination,
          sellerId,
        });
        providerPayoutId = moncashRes.disbursementId;
        payoutStatus = "SUCCEEDED";
      } else {
        throw new Error(`Canal de reversement non supporté: ${channel}`);
      }
    } catch (execErr: any) {
      payoutStatus = "FAILED";
      failureReason = execErr?.message || "Erreur lors de l'exécution du reversement";
      console.error("[Payout Execute] Error:", execErr);
    }

    // Update payout status in database
    const updatedPayout = await prisma.payout.update({
      where: { id: payout.id },
      data: {
        status: payoutStatus,
        providerPayoutId,
        failureReason,
      },
    });

    // Notify satellite asynchronously via signed webhook
    await dispatchWebhookToSatellite({
      eventType: payoutStatus === "SUCCEEDED" ? "payout.succeeded" : "payout.failed",
      sourceSite: sourceSite,
      targetWebhookUrl: body.webhookUrl || null,
      data: {
        payoutId: updatedPayout.id,
        sellerId,
        amount: numAmount,
        currency,
        status: payoutStatus,
        provider: channel,
        destination,
        metadata: {
          failureReason,
          providerPayoutId,
        },
      },
    });

    if (payoutStatus === "FAILED") {
      return NextResponse.json(
        {
          success: false,
          payoutId: payout.id,
          error: failureReason,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      payoutId: payout.id,
      status: payoutStatus,
      providerPayoutId,
    });
  } catch (error: any) {
    console.error("[API payouts/create] Uncaught Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur interne du serveur lors du retrait" },
      { status: 500 }
    );
  }
}
