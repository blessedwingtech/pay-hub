import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturePayPalOrder } from "@/lib/paypal";
import { dispatchWebhookToSatellite } from "@/lib/webhook-dispatcher";

export async function POST(req: NextRequest) {
  try {
    const { orderId, provider = "PAYPAL" } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "orderId requis" }, { status: 400 });
    }

    if (provider === "PAYPAL") {
      // 1. Capture order on PayPal if not yet captured
      const captureResult: { id: string; status: string; captureId?: string } =
        await capturePayPalOrder(orderId).catch((err) => {
          console.warn("[Checkout Capture] PayPal capture warning:", err.message);
          return { id: orderId, status: "ALREADY_HANDLED", captureId: undefined };
        });

      // 2. Locate matching transaction
      const transaction = await prisma.transaction.findFirst({
        where: { providerPaymentId: orderId },
      });

      if (transaction && transaction.status !== "COMPLETED") {
        const updated = await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "COMPLETED" },
        });

        // 3. Dispatch webhook to satellite
        await dispatchWebhookToSatellite({
          eventType: "payment.completed",
          sourceSite: transaction.sourceSite,
          targetWebhookUrl: transaction.webhookUrl || null,
          data: {
            transactionId: updated.id,
            satelliteUserId: transaction.satelliteUserId,
            amount: Number(transaction.amount),
            currency: transaction.currency,
            status: "COMPLETED",
            provider: "PAYPAL",
            type: transaction.type,
            metadata: {
              paypalOrderId: orderId,
              captureId: captureResult.captureId,
            },
          },
        });

        return NextResponse.json({ success: true, status: "COMPLETED", transactionId: updated.id });
      }

      return NextResponse.json({ success: true, status: transaction?.status || "COMPLETED" });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Checkout Capture] Error:", err);
    return NextResponse.json({ error: err.message || "Erreur de capture" }, { status: 500 });
  }
}
