import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { dispatchWebhookToSatellite } from "@/lib/webhook-dispatcher";
import { SubscriptionStatus } from "@/lib/types";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(bodyText, sig, webhookSecret);
    } else {
      console.warn("[Stripe Webhook] Warning: Verifying signature skipped (missing secret or sig)");
      event = JSON.parse(bodyText) as Stripe.Event;
    }
  } catch (err: any) {
    console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Record inbound webhook event
  await prisma.webhookEvent.create({
    data: {
      direction: "INBOUND",
      provider: "STRIPE",
      eventType: event.type,
      payload: event as any,
      status: "DELIVERED",
      attempts: 1,
    },
  }).catch((e) => console.error("[Stripe Webhook] Failed to log event:", e));

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const sourceSite = metadata.sourceSite || "MEMOTONIK";
        const satelliteUserId = metadata.satelliteUserId;
        const transactionId = metadata.transactionId;
        const directWebhookUrl = metadata.webhookUrl || null;
        const type = metadata.type || (session.mode === "subscription" ? "SUBSCRIPTION" : "ONE_TIME");
        const planId = metadata.planId || "";

        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id || null;

        // Update customer with Stripe Customer ID
        if (satelliteUserId) {
          await prisma.customer.upsert({
            where: {
              satelliteUserId_sourceSite: {
                satelliteUserId,
                sourceSite,
              },
            },
            update: {
              stripeCustomerId: stripeCustomerId || undefined,
            },
            create: {
              satelliteUserId,
              sourceSite,
              email: session.customer_details?.email || "unknown@bittonik.com",
              name: session.customer_details?.name || null,
              stripeCustomerId: stripeCustomerId || undefined,
            },
          });
        }

        // Update transaction if exists
        let updatedTransaction = null;
        if (transactionId) {
          updatedTransaction = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
              status: "COMPLETED",
              providerPaymentId: session.id,
            },
          });
        }

        const effectiveWebhookUrl =
          directWebhookUrl || updatedTransaction?.webhookUrl || null;

        // Handle subscription creation
        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;

          const stripeSub = await stripe.subscriptions.retrieve(subId);
          const customer = await prisma.customer.findUnique({
            where: {
              satelliteUserId_sourceSite: {
                satelliteUserId: satelliteUserId || "",
                sourceSite,
              },
            },
          });

          if (customer) {
            await prisma.subscription.upsert({
              where: { providerSubscriptionId: subId },
              update: {
                status: (stripeSub.status.toUpperCase() as SubscriptionStatus) || "ACTIVE",
                currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                planId: planId || "PRO",
                webhookUrl: effectiveWebhookUrl,
              },
              create: {
                customerId: customer.id,
                sourceSite,
                planId: planId || "PRO",
                provider: "STRIPE",
                providerSubscriptionId: subId,
                status: (stripeSub.status.toUpperCase() as SubscriptionStatus) || "ACTIVE",
                currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                webhookUrl: effectiveWebhookUrl,
              },
            });
          }
        }

        // Notify satellite site
        await dispatchWebhookToSatellite({
          eventType: type === "SUBSCRIPTION" ? "subscription.created" : "payment.completed",
          sourceSite,
          targetWebhookUrl: effectiveWebhookUrl,
          data: {
            transactionId: updatedTransaction?.id || session.id,
            satelliteUserId,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency?.toUpperCase() || "USD",
            status: "COMPLETED",
            provider: "STRIPE",
            type: type as any,
            planId,
            metadata: {
              stripeSessionId: session.id,
              stripeCustomerId,
            },
          },
        });

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const status = (sub.status.toUpperCase() as SubscriptionStatus) || "CANCELED";

        const existingSub = await prisma.subscription.findUnique({
          where: { providerSubscriptionId: sub.id },
          include: { customer: true },
        });

        if (existingSub) {
          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
              status,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          });

          await dispatchWebhookToSatellite({
            eventType:
              event.type === "customer.subscription.deleted"
                ? "subscription.canceled"
                : "subscription.updated",
            sourceSite: existingSub.sourceSite,
            targetWebhookUrl: existingSub.webhookUrl || null,
            data: {
              satelliteUserId: existingSub.customer.satelliteUserId,
              status,
              provider: "STRIPE",
              planId: existingSub.planId,
              metadata: {
                stripeSubscriptionId: sub.id,
                cancelAtPeriodEnd: sub.cancel_at_period_end,
              },
            },
          });
        }
        break;
      }

      case "transfer.created": {
        const transfer = event.data.object as Stripe.Transfer;
        const payoutId = transfer.metadata?.payoutId;

        if (payoutId) {
          await prisma.payout.update({
            where: { id: payoutId },
            data: {
              status: "SUCCEEDED",
              providerPayoutId: transfer.id,
            },
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`[Stripe Webhook] Processing failed: ${err.message}`);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
