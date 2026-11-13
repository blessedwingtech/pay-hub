import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBazikWebhookSignature } from "@/lib/bazik";
import { dispatchWebhookToSatellite } from "@/lib/webhook-dispatcher";
import { settleInvoicePayment } from "@/lib/recurring";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-bazik-signature") ||
      req.headers.get("X-Bazik-Signature");

    // Verify signature if secret is set and header present
    const secret = process.env.BAZIK_WEBHOOK_SECRET;
    if (secret && signature) {
      const isValid = verifyBazikWebhookSignature(rawBody, signature, secret);
      if (!isValid) {
        console.warn("[Bazik Webhook] Invalid signature rejected.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = {};
    }

    // Log inbound webhook event
    await prisma.webhookEvent
      .create({
        data: {
          direction: "INBOUND",
          provider: "MONCASH",
          eventType: payload.event || payload.type || "bazik.payment",
          payload,
          status: "DELIVERED",
          attempts: 1,
        },
      })
      .catch((e) => console.error("[Bazik Webhook] Failed to log event:", e));

    const orderId =
      payload.orderId ||
      payload.order_id ||
      payload.data?.orderId ||
      payload.data?.order_id ||
      payload.transactionId ||
      payload.id;

    const statusStr = String(
      payload.status || payload.data?.status || payload.state || ""
    ).toUpperCase();

    const isSuccess =
      statusStr === "COMPLETED" ||
      statusStr === "SUCCESS" ||
      statusStr === "SUCCESSFUL" ||
      statusStr === "PAID" ||
      payload.event === "payment.succeeded";

    if (!orderId) {
      return NextResponse.json({ received: true, note: "No orderId" });
    }

    // Locate matching Transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { id: orderId },
          { providerPaymentId: orderId },
          { id: payload.data?.transactionId || "" },
        ],
      },
    });

    if (transaction) {
      const updated = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: isSuccess ? "COMPLETED" : "FAILED",
        },
      });

      // Settle invoice if linked
      if (isSuccess && transaction.invoiceId) {
        await settleInvoicePayment({
          invoiceId: transaction.invoiceId,
          provider: "MONCASH",
          transactionId: updated.id,
          notes: "Règlement MonCash via Bazik Gateway",
        }).catch((err) => console.error("[Bazik Webhook] Settle invoice error:", err));
      }

      // Dispatch webhook to satellite (BWT, etc.)
      await dispatchWebhookToSatellite({
        eventType: isSuccess ? "payment.completed" : "payment.failed",
        sourceSite: transaction.sourceSite,
        targetWebhookUrl: transaction.webhookUrl || null,
        data: {
          transactionId: updated.id,
          satelliteUserId: transaction.satelliteUserId,
          amount: Number(transaction.amount),
          currency: transaction.currency,
          status: updated.status,
          provider: "MONCASH",
          type: transaction.type,
          metadata: {
            bazikOrderId: orderId,
            processor: "BAZIK",
          },
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Bazik Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
