import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createInvoiceForContract,
  buildInvoiceCheckoutUrl,
  generateWhatsAppReminderUrl,
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
            isGracePeriod: invoice.status === "OVERDUE",
          })
        : "";

      return {
        ...invoice,
        amount: Number(invoice.amount),
        paymentUrl,
        whatsappUrl,
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
