import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createInvoiceForContract,
  buildInvoiceCheckoutUrl,
  generateWhatsAppReminderUrl,
  settleInvoicePayment,
  buildClientNotificationMessage,
} from "@/lib/recurring";
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
    const contractId = searchParams.get("contractId") || undefined;
    const clientEmail = searchParams.get("clientEmail") || undefined;

    const invoices = await prisma.invoice.findMany({
      where: {
        ...(sourceSite ? { sourceSite: sourceSite.toUpperCase() } : {}),
        ...(status ? { status } : {}),
        ...(contractId ? { contractId } : {}),
        ...(clientEmail ? { clientEmail: { equals: clientEmail, mode: "insensitive" } } : {}),
      },
      include: {
        contract: true,
      },
      orderBy: { dueDate: "asc" },
      take: 100,
    });

    const enriched = invoices.map((invoice) => {
      const paymentUrl = buildInvoiceCheckoutUrl({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientEmail: invoice.clientEmail,
        clientName: invoice.clientName,
        amount: Number(invoice.amount),
        currency: invoice.currency,
        sourceSite: invoice.sourceSite,
        serviceName: invoice.serviceName,
      });

      const notifBase = {
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        clientPhone: invoice.clientPhone || undefined,
        serviceName: invoice.serviceName,
        sourceSite: invoice.sourceSite,
        amount: Number(invoice.amount),
        currency: invoice.currency,
        startDate: invoice.contract?.startDate || invoice.createdAt,
        dueDate: invoice.dueDate,
        invoiceNumber: invoice.invoiceNumber,
        paymentUrl,
      };

      const notifications = {
        serviceStart: buildClientNotificationMessage({
          ...notifBase,
          messageType: "SERVICE_START",
        }),
        renewalDue: buildClientNotificationMessage({
          ...notifBase,
          messageType: "RENEWAL_DUE",
        }),
        gracePeriod: buildClientNotificationMessage({
          ...notifBase,
          messageType: "GRACE_PERIOD",
        }),
        paymentConfirmation: buildClientNotificationMessage({
          ...notifBase,
          dueDate: invoice.contract?.nextDueDate || invoice.dueDate,
          messageType: "PAYMENT_CONFIRMATION",
        }),
      };

      const whatsappUrl = invoice.clientPhone
        ? (invoice.status === "PAID"
            ? notifications.paymentConfirmation.whatsappUrl
            : notifications.renewalDue.whatsappUrl)
        : "";

      return {
        ...invoice,
        amount: Number(invoice.amount),
        paymentUrl,
        whatsappUrl,
        notifications,
      };
    });

    return NextResponse.json({ success: true, invoices: enriched });
  } catch (error: any) {
    console.error("[API recurring/invoices GET] Error:", error);
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
    const { contractId, dueDate } = body as { contractId: string; dueDate?: string };

    if (!contractId) {
      return NextResponse.json({ error: "contractId requis" }, { status: 400 });
    }

    const invoice = await createInvoiceForContract(
      contractId,
      dueDate ? new Date(dueDate) : undefined
    );

    const paymentUrl = buildInvoiceCheckoutUrl({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientEmail: invoice.clientEmail,
      clientName: invoice.clientName,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      sourceSite: invoice.sourceSite,
      serviceName: invoice.serviceName,
    });

    const whatsappUrl = invoice.clientPhone
      ? generateWhatsAppReminderUrl({
          clientName: invoice.clientName,
          clientPhone: invoice.clientPhone,
          serviceName: invoice.serviceName,
          sourceSite: invoice.sourceSite,
          amount: Number(invoice.amount),
          currency: invoice.currency,
          dueDate: invoice.dueDate,
          invoiceNumber: invoice.invoiceNumber,
          paymentUrl,
        })
      : "";

    return NextResponse.json({
      success: true,
      invoice: {
        ...invoice,
        amount: Number(invoice.amount),
        paymentUrl,
        whatsappUrl,
      },
    });
  } catch (error: any) {
    console.error("[API recurring/invoices POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!verifyAdminAuth(req)) {
      return NextResponse.json(
        { error: "Accès refusé. Clé d'administration requise." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { invoiceId, action = "MARK_PAID", paymentMethod = "CASH" } = body as {
      invoiceId: string;
      action?: "MARK_PAID" | "CANCEL";
      paymentMethod?: string;
    };

    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId requis" }, { status: 400 });
    }

    if (action === "MARK_PAID") {
      const result = await settleInvoicePayment({
        invoiceId,
        provider: null,
        notes: paymentMethod || "CASH_DIRECT",
      });

      return NextResponse.json({
        success: true,
        message: "Facture marquée comme réglée, abonnement renouvelé et prochaine échéance mise à jour.",
        invoice: {
          ...result.invoice,
          amount: Number(result.invoice.amount),
        },
      });
    }

    if (action === "CANCEL") {
      const updated = await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ success: true, invoice: updated });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (error: any) {
    console.error("[API recurring/invoices PATCH] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
