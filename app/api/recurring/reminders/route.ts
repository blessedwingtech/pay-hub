import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildInvoiceCheckoutUrl,
  generateWhatsAppReminderUrl,
} from "@/lib/recurring";
import { verifyAdminAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAuth(req)) {
      return NextResponse.json(
        { error: "Accès refusé. Clé d'administration requise." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { invoiceId, channel = "WHATSAPP" } = body as {
      invoiceId: string;
      channel?: "WHATSAPP" | "EMAIL";
    };

    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId requis" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { contract: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }

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

    if (channel === "WHATSAPP") {
      if (!invoice.clientPhone) {
        return NextResponse.json(
          { error: "Numéro de téléphone manquant pour ce client." },
          { status: 400 }
        );
      }

      const whatsappUrl = generateWhatsAppReminderUrl({
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
      });

      // Increment click tracker
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          whatsappClickCount: { increment: 1 },
          lastReminderAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        channel: "WHATSAPP",
        whatsappUrl,
        invoiceNumber: invoice.invoiceNumber,
      });
    }

    if (channel === "EMAIL") {
      // In production, can dispatch via Resend / SendGrid / NodeMailer
      // Increment counter
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          reminderSentCount: { increment: 1 },
          lastReminderAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        channel: "EMAIL",
        message: `Rappel par email consigné pour ${invoice.clientEmail}`,
      });
    }

    return NextResponse.json({ error: "Canal non supporté" }, { status: 400 });
  } catch (error: any) {
    console.error("[API recurring/reminders] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
