import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMonCashPayment } from "@/lib/moncash";
import { dispatchWebhookToSatellite } from "@/lib/webhook-dispatcher";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log inbound event
    await prisma.webhookEvent.create({
      data: {
        direction: "INBOUND",
        provider: "MONCASH",
        eventType: "moncash.ipn",
        payload: body,
        status: "DELIVERED",
        attempts: 1,
      },
    }).catch((e) => console.error("[MonCash Webhook] Failed to log event:", e));

    const transactionId = body.transactionId || body.transaction_id || body.reference;

    if (!transactionId) {
      return NextResponse.json({ error: "No transactionId provided" }, { status: 400 });
    }

    // Verify status with MonCash
    let verification;
    try {
      verification = await verifyMonCashPayment(transactionId);
    } catch (verifyErr) {
      console.warn("[MonCash Webhook] Direct verification failed, evaluating body params:", verifyErr);
      verification = {
        status: body.status === "200" || body.status === "SUCCESS" ? "COMPLETED" : "FAILED",
        amount: body.amount,
      };
    }

    // Find transaction either by id or providerPaymentId
    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { id: transactionId },
          { providerPaymentId: transactionId },
          { id: body.orderId || "" },
        ],
      },
    });

    if (transaction) {
      const isSuccess = verification.status === "COMPLETED";

      const updated = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: isSuccess ? "COMPLETED" : "FAILED",
        },
      });

      // Dispatch event to satellite
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
            moncashTransactionId: transactionId,
          },
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[MonCash Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
