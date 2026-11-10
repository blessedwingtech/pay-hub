import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createRecurringContract,
  buildInvoiceCheckoutUrl,
  generateWhatsAppReminderUrl,
} from "@/lib/recurring";
import { BillingCycle, PaymentProvider } from "@/lib/types";
import { verifyAdminAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminAuth(req)) {
      return NextResponse.json(
        { error: "Accès refusé. Clé d'administration requise." },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(req.url);
    const sourceSite = searchParams.get("sourceSite") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const search = searchParams.get("search") || undefined;

    const contracts = await prisma.recurringContract.findMany({
      where: {
        ...(sourceSite ? { sourceSite: sourceSite.toUpperCase() } : {}),
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { clientName: { contains: search, mode: "insensitive" } },
                { clientEmail: { contains: search, mode: "insensitive" } },
                { serviceName: { contains: search, mode: "insensitive" } },
                { contractNumber: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { nextDueDate: "asc" },
    });

    // Enrich contracts with latest unpaid invoice & pre-generated WhatsApp URL
    const enriched = contracts.map((contract) => {
      const latestUnpaidInvoice = contract.invoices.find((inv) => inv.status === "UNPAID");

      let whatsappUrl = "";
      let paymentUrl = "";

      if (latestUnpaidInvoice) {
        paymentUrl = buildInvoiceCheckoutUrl({
          invoiceId: latestUnpaidInvoice.id,
          invoiceNumber: latestUnpaidInvoice.invoiceNumber,
          clientEmail: latestUnpaidInvoice.clientEmail,
          clientName: latestUnpaidInvoice.clientName,
          amount: Number(latestUnpaidInvoice.amount),
          currency: latestUnpaidInvoice.currency,
          sourceSite: latestUnpaidInvoice.sourceSite,
          serviceName: latestUnpaidInvoice.serviceName,
        });

        if (latestUnpaidInvoice.clientPhone) {
          whatsappUrl = generateWhatsAppReminderUrl({
            clientName: latestUnpaidInvoice.clientName,
            clientPhone: latestUnpaidInvoice.clientPhone,
            serviceName: latestUnpaidInvoice.serviceName,
            sourceSite: latestUnpaidInvoice.sourceSite,
            amount: Number(latestUnpaidInvoice.amount),
            currency: latestUnpaidInvoice.currency,
            dueDate: latestUnpaidInvoice.dueDate,
            invoiceNumber: latestUnpaidInvoice.invoiceNumber,
            paymentUrl,
            isGracePeriod: contract.status === "GRACE_PERIOD",
          });
        }
      }

      return {
        ...contract,
        amount: Number(contract.amount),
        latestUnpaidInvoice: latestUnpaidInvoice
          ? {
              ...latestUnpaidInvoice,
              amount: Number(latestUnpaidInvoice.amount),
              paymentUrl,
              whatsappUrl,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, contracts: enriched });
  } catch (error: any) {
    console.error("[API recurring/services GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAuth(req)) {
      return NextResponse.json(
        { error: "Accès refusé. Clé d'administration requise." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      serviceName,
      serviceDescription,
      sourceSite,
      providerPayoutDestination,
      clientName,
      clientEmail,
      clientPhone,
      amount,
      currency = "USD",
      billingCycle = "MONTHLY",
      customDays,
      startDate,
      gracePeriodDays = 3,
      autoDebit = false,
      preferredProvider,
      webhookUrl,
      metadata,
    } = body as {
      serviceName: string;
      serviceDescription?: string;
      sourceSite: string;
      providerPayoutDestination?: string;
      clientName: string;
      clientEmail: string;
      clientPhone?: string;
      amount: number | string;
      currency?: string;
      billingCycle?: BillingCycle;
      customDays?: number;
      startDate?: string;
      gracePeriodDays?: number;
      autoDebit?: boolean;
      preferredProvider?: PaymentProvider;
      webhookUrl?: string;
      metadata?: Record<string, any>;
    };

    if (!serviceName || !sourceSite || !clientName || !clientEmail || !amount) {
      return NextResponse.json(
        { error: "Champs requis manquants: serviceName, sourceSite, clientName, clientEmail, amount" },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(String(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const contract = await createRecurringContract({
      serviceName,
      serviceDescription,
      sourceSite,
      providerPayoutDestination,
      clientName,
      clientEmail,
      clientPhone,
      amount: numAmount,
      currency,
      billingCycle,
      customDays,
      startDate: startDate ? new Date(startDate) : undefined,
      gracePeriodDays,
      autoDebit,
      preferredProvider,
      webhookUrl,
      metadata,
    });

    return NextResponse.json({
      success: true,
      contract: {
        ...contract,
        amount: Number(contract.amount),
      },
    });
  } catch (error: any) {
    console.error("[API recurring/services POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
