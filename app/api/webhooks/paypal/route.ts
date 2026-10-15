import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturePayPalOrder } from "@/lib/paypal";
import { dispatchWebhookToSatellite } from "@/lib/webhook-dispatcher";

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();

    // Log inbound event
    await prisma.webhookEvent.create({
      data: {
        direction: "INBOUND",
        provider: "PAYPAL",
        eventType: event.event_type || "UNKNOWN",
        payload: event,
        status: "DELIVERED",
        attempts: 1,
      },
    }).catch((e) => console.error("[PayPal Webhook] Failed to log event:", e));

    const eventType = event.event_type;
    const resource = event.resource;

    switch (eventType) {
      case "CHECKOUT.ORDER.APPROVED": {
        const orderId = resource.id;
        const captureResult = await capturePayPalOrder(orderId);

        const transaction = await prisma.transaction.findFirst({
          where: { providerPaymentId: orderId },
        });

        if (transaction) {
          const updated = await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: "COMPLETED",
            },
          });

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
        }
        break;
      }

      case "PAYMENT.CAPTURE.COMPLETED": {
        const customId = resource.custom_id;
        const orderId = resource.supplementary_data?.related_ids?.order_id;

        const transaction = await prisma.transaction.findFirst({
          where: {
            OR: [
              ...(orderId ? [{ providerPaymentId: orderId }] : []),
              ...(customId ? [{ id: customId }] : []),
            ],
          },
        });

        if (transaction && transaction.status !== "COMPLETED") {
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: "COMPLETED" },
          });

          await dispatchWebhookToSatellite({
            eventType: "payment.completed",
            sourceSite: transaction.sourceSite,
            targetWebhookUrl: transaction.webhookUrl || null,
            data: {
              transactionId: transaction.id,
              satelliteUserId: transaction.satelliteUserId,
              amount: Number(transaction.amount),
              currency: transaction.currency,
              status: "COMPLETED",
              provider: "PAYPAL",
              type: transaction.type,
            },
          });
        }
        break;
      }

      case "PAYMENT.PAYOUTSBATCH.SUCCESS":
      case "PAYMENT.PAYOUTS-ITEM.SUCCEEDED": {
        const payoutBatchId =
          resource.payout_batch_id || resource.batch_header?.payout_batch_id;

        if (payoutBatchId) {
          const payout = await prisma.payout.findFirst({
            where: { providerPayoutId: payoutBatchId },
          });

          if (payout) {
            await prisma.payout.update({
              where: { id: payout.id },
              data: { status: "SUCCEEDED" },
            });

            await dispatchWebhookToSatellite({
              eventType: "payout.succeeded",
              sourceSite: payout.sourceSite,
              data: {
                payoutId: payout.id,
                sellerId: payout.sellerId,
                amount: Number(payout.amount),
                currency: payout.currency,
                status: "SUCCEEDED",
                provider: "PAYPAL",
                destination: payout.destination,
              },
            });
          }
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[PayPal Webhook] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
