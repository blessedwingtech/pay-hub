import { prisma } from "@/lib/prisma";
import { BillingCycle, RecurringContractStatus, InvoiceStatus, PaymentProvider } from "@/lib/types";
import { dispatchWebhookToSatellite } from "@/lib/webhook-dispatcher";
import { resolveSatelliteConfig } from "@/lib/types";

/**
 * Calculates the next due date based on the chosen billing cycle.
 */
export function calculateNextDueDate(
  currentDate: Date,
  cycle: BillingCycle,
  customDays?: number | null
): Date {
  const next = new Date(currentDate);

  switch (cycle) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "SEMIANNUAL":
      next.setMonth(next.getMonth() + 6);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "CUSTOM_DAYS":
      next.setDate(next.getDate() + (customDays && customDays > 0 ? customDays : 30));
      break;
    default:
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return next;
}

/**
 * Cleans phone number for WhatsApp wa.me link.
 * Handles Haiti (+509), North America (+1), Europe, etc.
 */
export function cleanPhoneNumber(rawPhone: string): string {
  if (!rawPhone) return "";
  let digits = rawPhone.replace(/\D/g, "");

  // If local Haiti 8 digits (e.g. 37012345 or 48012345), prefix with 509
  if (digits.length === 8 && (digits.startsWith("3") || digits.startsWith("4") || digits.startsWith("2"))) {
    digits = "509" + digits;
  }

  // If starts with 00, replace with international
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  return digits;
}

export type NotificationMessageType =
  | "SERVICE_START"
  | "RENEWAL_DUE"
  | "GRACE_PERIOD"
  | "PAYMENT_CONFIRMATION";

export interface ClientNotificationData {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceName: string;
  sourceSite: string;
  amount: number | string;
  currency: string;
  startDate?: Date;
  dueDate: Date;
  invoiceNumber: string;
  paymentUrl: string;
  messageType?: NotificationMessageType;
}

/**
 * Builds formatted notification messages (WhatsApp text, Email subject, Email body, mailto link)
 * without any multi-byte surrogate characters that could cause corrupted glyphs ().
 */
export function buildClientNotificationMessage(params: ClientNotificationData) {
  const config = resolveSatelliteConfig({ sourceSite: params.sourceSite });
  const siteName = config.displayName;
  const type: NotificationMessageType = params.messageType || "RENEWAL_DUE";

  const formattedDueDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(params.dueDate));

  const formattedStartDate = params.startDate
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(params.startDate))
    : formattedDueDate;

  let whatsappText = "";
  let emailSubject = "";
  let emailBody = "";

  if (type === "SERVICE_START") {
    emailSubject = `[${params.sourceSite}] Activation de votre service ${params.serviceName} - Facture ${params.invoiceNumber}`;
    whatsappText =
      `*Bienvenue - Activation de Service*\n` +
      `*${siteName}*\n\n` +
      `Bonjour *${params.clientName}*,\n\n` +
      `Nous vous informons que votre service *${params.serviceName}* chez *${siteName}* a débuté le *${formattedStartDate}*.\n\n` +
      `• Service : *${params.serviceName}*\n` +
      `• Facture : *${params.invoiceNumber}*\n` +
      `• Montant : *${params.amount} ${params.currency}*\n\n` +
      `Pour régler et valider votre première période en toute sécurité en 1 clic :\n` +
      `${params.paymentUrl}\n\n` +
      `_Modes de paiement acceptés : MonCash (Haïti HTG), Carte Bancaire, Apple Pay, Google Pay, PayPal._\n\n` +
      `Nous vous remercions pour votre confiance.\n` +
      `*L'équipe ${siteName}*`;

    emailBody =
      `Bonjour ${params.clientName},\n\n` +
      `Nous avons le plaisir de vous informer que votre service "${params.serviceName}" auprès de ${siteName} a débuté le ${formattedStartDate}.\n\n` +
      `DÉTAILS DU SERVICE & FACTURATION :\n` +
      `- Service : ${params.serviceName}\n` +
      `- Prestataire : ${siteName}\n` +
      `- Facture N° : ${params.invoiceNumber}\n` +
      `- Montant : ${params.amount} ${params.currency}\n` +
      `- Date limite : ${formattedDueDate}\n\n` +
      `Pour procéder au règlement sécurisé en ligne, veuillez utiliser le lien suivant :\n` +
      `${params.paymentUrl}\n\n` +
      `Modes de paiement disponibles :\n` +
      `- MonCash (Haïti - Gourdes HTG)\n` +
      `- Carte Bancaire (Visa, Mastercard, Amex, Apple Pay, Google Pay)\n` +
      `- PayPal (Compte PayPal ou CB)\n\n` +
      `Nous restons à votre entière disposition pour tout renseignement ou assistance.\n\n` +
      `Bien cordialement,\n` +
      `L'équipe ${siteName}\n` +
      `Portail : https://pay.bittonik.com`;
  } else if (type === "GRACE_PERIOD") {
    emailSubject = `[URGENT] Période de grâce - Facture ${params.invoiceNumber} (${params.serviceName})`;
    whatsappText =
      `*Rappel Urgent - Échéance Dépassée*\n` +
      `*${siteName}*\n\n` +
      `Bonjour *${params.clientName}*,\n\n` +
      `Votre facture *${params.invoiceNumber}* pour le service *${params.serviceName}* (${siteName}) était due le *${formattedDueDate}*.\n\n` +
      `• Montant : *${params.amount} ${params.currency}*\n\n` +
      `Votre service est actuellement en *période de grâce*. Afin d'éviter toute interruption technique, merci de régulariser votre règlement via ce lien sécurisé :\n` +
      `${params.paymentUrl}\n\n` +
      `_Paiement immédiat par MonCash, Carte Bancaire ou PayPal._\n\n` +
      `Si vous avez déjà effectué votre paiement, merci d'ignorer ce message.\n\n` +
      `*L'équipe ${siteName}*`;

    emailBody =
      `Bonjour ${params.clientName},\n\n` +
      `Votre facture ${params.invoiceNumber} concernant le service "${params.serviceName}" chez ${siteName} est arrivée à échéance le ${formattedDueDate}.\n\n` +
      `Le service est actuellement en période de grâce. Pour éviter toute suspension technique, merci d'effectuer la régularisation en ligne :\n\n` +
      `${params.paymentUrl}\n\n` +
      `- Montant dû : ${params.amount} ${params.currency}\n` +
      `- Modes acceptés : MonCash (HTG), Carte Bancaire, Apple Pay, PayPal\n\n` +
      `Si votre virement ou règlement a déjà été effectué, veuillez ne pas tenir compte de ce rappel.\n\n` +
      `Cordialement,\n` +
      `L'équipe ${siteName}`;
  } else if (type === "PAYMENT_CONFIRMATION") {
    emailSubject = `[${params.sourceSite}] Confirmation de règlement - Facture ${params.invoiceNumber} (${params.serviceName})`;
    whatsappText =
      `*Confirmation de Règlement - ${siteName}*\n\n` +
      `Bonjour *${params.clientName}*,\n\n` +
      `Nous vous confirmons la bonne réception de votre paiement pour le service *${params.serviceName}*.\n\n` +
      `• Facture : *${params.invoiceNumber}*\n` +
      `• Montant réglé : *${params.amount} ${params.currency}*\n` +
      `• Statut : *Réglé & Actif*\n` +
      `• Prochaine échéance : *${formattedDueDate}*\n\n` +
      `Votre abonnement est renouvelé avec succès sans aucune interruption.\n\n` +
      `Merci pour votre confiance et fidélité !\n` +
      `*L'équipe ${siteName}*`;

    emailBody =
      `Bonjour ${params.clientName},\n\n` +
      `Nous vous confirmons la bonne réception de votre règlement de ${params.amount} ${params.currency} concernant le service "${params.serviceName}" auprès de ${siteName}.\n\n` +
      `RÉCAPITULATIF DU RENOUVELLEMENT :\n` +
      `- Service : ${params.serviceName}\n` +
      `- Facture N° : ${params.invoiceNumber}\n` +
      `- Montant réglé : ${params.amount} ${params.currency}\n` +
      `- Mode d'encaissement : Règlement direct / Cash (Enregistré)\n` +
      `- Statut du contrat : ACTIF\n` +
      `- Prochaine échéance : ${formattedDueDate}\n\n` +
      `Votre service est désormais renouvelé avec succès et demeure pleinement opérationnel sans aucune coupure.\n\n` +
      `Nous vous remercions sincèrement pour votre confiance et demeurons à votre disposition pour toute question technique.\n\n` +
      `Bien cordialement,\n` +
      `L'équipe ${siteName}\n` +
      `Portail : https://pay.bittonik.com`;
  } else {
    // RENEWAL_DUE
    emailSubject = `[${params.sourceSite}] Rappel de renouvellement - ${params.serviceName} (Facture ${params.invoiceNumber})`;
    whatsappText =
      `*Rappel de Renouvellement - ${siteName}*\n\n` +
      `Bonjour *${params.clientName}*,\n\n` +
      `Votre abonnement / service *${params.serviceName}* arrive à échéance le *${formattedDueDate}*.\n\n` +
      `• Facture : *${params.invoiceNumber}*\n` +
      `• Montant à régler : *${params.amount} ${params.currency}*\n\n` +
      `Vous pouvez effectuer votre renouvellement en toute sécurité en 1 clic via le lien suivant :\n` +
      `${params.paymentUrl}\n\n` +
      `_Modes de paiement acceptés : MonCash (Haïti HTG), Carte Bancaire, Apple Pay, PayPal._\n\n` +
      `Merci pour votre confiance,\n` +
      `*L'équipe ${siteName}*`;

    emailBody =
      `Bonjour ${params.clientName},\n\n` +
      `Votre service "${params.serviceName}" auprès de ${siteName} arrive à échéance le ${formattedDueDate}.\n\n` +
      `RÉSUMÉ DU RENOUVELLEMENT :\n` +
      `- Facture : ${params.invoiceNumber}\n` +
      `- Montant : ${params.amount} ${params.currency}\n` +
      `- Date d'échéance : ${formattedDueDate}\n\n` +
      `Pour renouveler votre service sans interruption, veuillez procéder au règlement via notre lien sécurisé :\n` +
      `${params.paymentUrl}\n\n` +
      `Modes de règlement acceptés : MonCash, Carte Bancaire, Apple Pay, Google Pay, PayPal.\n\n` +
      `Merci pour votre fidélité,\n` +
      `L'équipe ${siteName}\n` +
      `https://pay.bittonik.com`;
  }

  const cleanPhone = params.clientPhone ? cleanPhoneNumber(params.clientPhone) : "";
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`
    : "";

  const mailtoUrl = params.clientEmail
    ? `mailto:${encodeURIComponent(params.clientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    : "";

  return {
    whatsappText,
    whatsappUrl,
    emailSubject,
    emailBody,
    mailtoUrl,
  };
}

/**
 * Generates an Option-A WhatsApp "Click-to-Chat" link (100% Free, Zero Meta API cost).
 * Backward-compatible wrapper over buildClientNotificationMessage.
 */
export function generateWhatsAppReminderUrl(params: {
  clientName: string;
  clientPhone: string;
  serviceName: string;
  sourceSite: string;
  amount: number | string;
  currency: string;
  dueDate: Date;
  startDate?: Date;
  invoiceNumber: string;
  paymentUrl: string;
  isGracePeriod?: boolean;
  messageType?: NotificationMessageType;
}): string {
  const result = buildClientNotificationMessage({
    clientName: params.clientName,
    clientPhone: params.clientPhone,
    serviceName: params.serviceName,
    sourceSite: params.sourceSite,
    amount: params.amount,
    currency: params.currency,
    dueDate: params.dueDate,
    startDate: params.startDate,
    invoiceNumber: params.invoiceNumber,
    paymentUrl: params.paymentUrl,
    messageType: params.messageType || (params.isGracePeriod ? "GRACE_PERIOD" : "RENEWAL_DUE"),
  });
  return result.whatsappUrl;
}

/**
 * Builds the direct Pay-Hub checkout link for an invoice.
 */
export function buildInvoiceCheckoutUrl(params: {
  invoiceId: string;
  invoiceNumber: string;
  clientEmail: string;
  clientName: string;
  amount: number;
  currency: string;
  sourceSite: string;
  serviceName: string;
  returnUrl?: string;
}): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://pay.bittonik.com").replace(/\/+$/, "");
  const url = new URL(`${appUrl}/checkout`);

  url.searchParams.set("invoice_id", params.invoiceId);
  url.searchParams.set("invoice_num", params.invoiceNumber);
  url.searchParams.set("user_id", `client_${params.clientEmail}`);
  url.searchParams.set("email", params.clientEmail);
  url.searchParams.set("full_name", params.clientName);
  url.searchParams.set("amount", params.amount.toString());
  url.searchParams.set("currency", params.currency.toUpperCase());
  url.searchParams.set("source_site", params.sourceSite.toUpperCase());
  url.searchParams.set("type", "SUBSCRIPTION");
  url.searchParams.set("description", `${params.serviceName} (Facture ${params.invoiceNumber})`);
  url.searchParams.set("return_url", params.returnUrl || `${appUrl}/success?invoice_id=${params.invoiceId}`);

  return url.toString();
}

/**
 * Generates the next sequential invoice number (e.g. INV-2026-0001).
 */
export async function getNextInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.invoice.count();
  const seq = String(count + 1).padStart(4, "0");
  return `INV-${currentYear}-${seq}`;
}

/**
 * Generates the next sequential contract number (e.g. CTR-2026-0001).
 */
export async function getNextContractNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.recurringContract.count();
  const seq = String(count + 1).padStart(4, "0");
  return `CTR-${currentYear}-${seq}`;
}

/**
 * Creates or retrieves a Customer in Pay-Hub and binds it to a recurring contract.
 */
export async function createRecurringContract(data: {
  serviceName: string;
  serviceDescription?: string;
  sourceSite: string;
  providerPayoutDestination?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  amount: number;
  currency?: string;
  billingCycle?: BillingCycle;
  customDays?: number;
  startDate?: Date;
  gracePeriodDays?: number;
  autoDebit?: boolean;
  preferredProvider?: PaymentProvider;
  webhookUrl?: string;
  metadata?: Record<string, any>;
}) {
  const contractNumber = await getNextContractNumber();
  const startDate = data.startDate || new Date();
  const billingCycle = data.billingCycle || "MONTHLY";
  const nextDueDate = calculateNextDueDate(startDate, billingCycle, data.customDays);

  // Link or create Customer
  const customer = await prisma.customer.upsert({
    where: {
      satelliteUserId_sourceSite: {
        satelliteUserId: `usr_${data.clientEmail.toLowerCase().trim()}`,
        sourceSite: data.sourceSite.toUpperCase().trim(),
      },
    },
    update: {
      name: data.clientName,
      phone: data.clientPhone || undefined,
    },
    create: {
      satelliteUserId: `usr_${data.clientEmail.toLowerCase().trim()}`,
      sourceSite: data.sourceSite.toUpperCase().trim(),
      email: data.clientEmail.toLowerCase().trim(),
      name: data.clientName,
      phone: data.clientPhone || null,
    },
  });

  const contract = await prisma.recurringContract.create({
    data: {
      contractNumber,
      serviceName: data.serviceName,
      serviceDescription: data.serviceDescription || null,
      sourceSite: data.sourceSite.toUpperCase().trim(),
      providerPayoutDestination: data.providerPayoutDestination || null,
      customerId: customer.id,
      clientName: data.clientName,
      clientEmail: data.clientEmail.toLowerCase().trim(),
      clientPhone: data.clientPhone || null,
      amount: data.amount,
      currency: (data.currency || "USD").toUpperCase(),
      billingCycle,
      customDays: data.customDays || null,
      startDate,
      nextDueDate,
      status: "ACTIVE",
      gracePeriodDays: data.gracePeriodDays ?? 3,
      autoDebit: data.autoDebit ?? false,
      preferredProvider: data.preferredProvider || null,
      webhookUrl: data.webhookUrl || null,
      metadata: data.metadata ? (data.metadata as any) : undefined,
    },
  });

  // Automatically generate the initial invoice so the payment link is immediately ready
  try {
    await createInvoiceForContract(contract.id, nextDueDate);
  } catch (invErr) {
    console.warn("[createRecurringContract] Warning: Initial invoice auto-creation:", invErr);
  }

  return contract;
}

/**
 * Updates an existing recurring contract.
 */
export async function updateRecurringContract(
  contractId: string,
  data: {
    serviceName?: string;
    serviceDescription?: string | null;
    amount?: number;
    currency?: string;
    billingCycle?: BillingCycle;
    customDays?: number | null;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string | null;
    nextDueDate?: Date;
    status?: RecurringContractStatus;
    gracePeriodDays?: number;
  }
) {
  return await prisma.recurringContract.update({
    where: { id: contractId },
    data: {
      ...(data.serviceName && { serviceName: data.serviceName }),
      ...(data.serviceDescription !== undefined && { serviceDescription: data.serviceDescription }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.currency && { currency: data.currency.toUpperCase() }),
      ...(data.billingCycle && { billingCycle: data.billingCycle }),
      ...(data.customDays !== undefined && { customDays: data.customDays }),
      ...(data.clientName && { clientName: data.clientName }),
      ...(data.clientEmail && { clientEmail: data.clientEmail.toLowerCase().trim() }),
      ...(data.clientPhone !== undefined && { clientPhone: data.clientPhone }),
      ...(data.nextDueDate && { nextDueDate: data.nextDueDate }),
      ...(data.status && { status: data.status }),
      ...(data.gracePeriodDays !== undefined && { gracePeriodDays: data.gracePeriodDays }),
    },
  });
}

/**
 * Deletes an existing recurring contract and its unpaid invoices.
 */
export async function deleteRecurringContract(contractId: string) {
  // First delete unpaid invoices linked to this contract
  await prisma.invoice.deleteMany({
    where: {
      contractId,
      status: "UNPAID",
    },
  });

  // If there are paid invoices, unlink the contractId rather than failing
  await prisma.invoice.updateMany({
    where: { contractId },
    data: { contractId: null as any },
  }).catch(() => null);

  return await prisma.recurringContract.delete({
    where: { id: contractId },
  });
}

/**
 * Creates an invoice for a contract.
 */
export async function createInvoiceForContract(contractId: string, customDueDate?: Date) {
  const contract = await prisma.recurringContract.findUnique({
    where: { id: contractId },
  });

  if (!contract) {
    throw new Error(`Contrat récurrent ${contractId} introuvable.`);
  }

  const invoiceNumber = await getNextInvoiceNumber();
  const dueDate = customDueDate || contract.nextDueDate;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      contractId: contract.id,
      customerId: contract.customerId,
      sourceSite: contract.sourceSite,
      clientName: contract.clientName,
      clientEmail: contract.clientEmail,
      clientPhone: contract.clientPhone,
      serviceName: contract.serviceName,
      description: contract.serviceDescription || `Renouvellement ${contract.serviceName} (${contract.billingCycle})`,
      amount: contract.amount,
      currency: contract.currency,
      dueDate,
      status: "UNPAID",
      metadata: {
        billingCycle: contract.billingCycle,
        contractNumber: contract.contractNumber,
      },
    },
  });

  return invoice;
}

/**
 * Marks an invoice as PAID, updates the parent contract's next due date,
 * sets status back to ACTIVE, and dispatches webhook to the satellite.
 */
export async function settleInvoicePayment(params: {
  invoiceId: string;
  provider?: PaymentProvider | null;
  transactionId?: string;
  notes?: string;
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    include: { contract: true },
  });

  if (!invoice) {
    throw new Error(`Facture ${params.invoiceId} introuvable.`);
  }

  if (invoice.status === "PAID") {
    return { invoice, alreadyPaid: true };
  }

  const paidAt = new Date();

  // 1. Update invoice to PAID
  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "PAID",
      paidAt,
      paymentProvider: params.provider || null,
      metadata: {
        ...(typeof invoice.metadata === "object" && invoice.metadata !== null
          ? (invoice.metadata as any)
          : {}),
        manualSettlement: !params.provider,
        paymentMethodNote: params.notes || "Règlement direct",
      },
    },
  });

  // 2. If bound to a contract, advance the next due date and reactivate
  if (invoice.contract) {
    const nextDueDate = calculateNextDueDate(
      invoice.dueDate > paidAt ? invoice.dueDate : paidAt,
      invoice.contract.billingCycle,
      invoice.contract.customDays
    );

    const prevStatus = invoice.contract.status;

    await prisma.recurringContract.update({
      where: { id: invoice.contract.id },
      data: {
        status: "ACTIVE",
        lastBilledDate: paidAt,
        nextDueDate,
      },
    });

    // 3. Dispatch satellite webhook
    const eventType = prevStatus === "SUSPENDED" ? "subscription.reactivated" : "subscription.renewed";

    await dispatchWebhookToSatellite({
      eventType,
      sourceSite: invoice.sourceSite,
      targetWebhookUrl: invoice.contract.webhookUrl || null,
      data: {
        contractId: invoice.contract.id,
        contractNumber: invoice.contract.contractNumber,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        serviceName: invoice.serviceName,
        satelliteUserId: `usr_${invoice.clientEmail}`,
        clientEmail: invoice.clientEmail,
        clientName: invoice.clientName,
        amount: Number(invoice.amount),
        currency: invoice.currency,
        status: "ACTIVE",
        provider: params.provider || "MANUAL_CASH",
        nextDueDate: nextDueDate.toISOString(),
        paidAt: paidAt.toISOString(),
      },
    });
  }

  return { invoice: updatedInvoice, alreadyPaid: false };
}

/**
 * Automated Cron / Job processor:
 * - Scans active recurring contracts.
 * - Generates invoices ahead of time (e.g. 7 days prior).
 * - Flags contracts in GRACE_PERIOD or SUSPENDED.
 * - Dispatches 'subscription.suspended' when past grace period.
 */
export async function runRenewalsAndRemindersCheck() {
  const now = new Date();
  const summary = {
    invoicesGenerated: 0,
    servicesInGracePeriod: 0,
    servicesSuspended: 0,
  };

  // 1. Find active contracts due within 7 days with no unpaid invoice already generated
  const upcomingContracts = await prisma.recurringContract.findMany({
    where: {
      status: { in: ["ACTIVE", "PENDING_RENEWAL"] },
      nextDueDate: {
        lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // due in <= 7 days
      },
    },
    include: {
      invoices: {
        where: {
          status: "UNPAID",
        },
      },
    },
  });

  for (const contract of upcomingContracts) {
    if (contract.invoices.length === 0) {
      await createInvoiceForContract(contract.id);
      summary.invoicesGenerated++;
    }

    // If due date has passed but within grace period
    const graceExpiry = new Date(contract.nextDueDate.getTime() + contract.gracePeriodDays * 24 * 60 * 60 * 1000);

    if (now >= contract.nextDueDate && now < graceExpiry && contract.status !== "GRACE_PERIOD") {
      await prisma.recurringContract.update({
        where: { id: contract.id },
        data: { status: "GRACE_PERIOD" },
      });
      summary.servicesInGracePeriod++;
    }
    // If grace period expired and still unpaid
    else if (now >= graceExpiry && contract.status !== "SUSPENDED") {
      await prisma.recurringContract.update({
        where: { id: contract.id },
        data: { status: "SUSPENDED" },
      });
      summary.servicesSuspended++;

      // Dispatch suspension notification to satellite (e.g. BWT cuts hosting, PressTonik cuts VIP)
      await dispatchWebhookToSatellite({
        eventType: "subscription.suspended",
        sourceSite: contract.sourceSite,
        targetWebhookUrl: contract.webhookUrl || null,
        data: {
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          serviceName: contract.serviceName,
          clientEmail: contract.clientEmail,
          clientName: contract.clientName,
          status: "SUSPENDED",
          reason: "Grace period expired without payment",
          nextDueDate: contract.nextDueDate.toISOString(),
        },
      });
    }
  }

  return summary;
}
