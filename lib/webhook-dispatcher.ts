import crypto from "crypto";
import { prisma } from "./prisma";
import { PayHubWebhookPayload, SatelliteSite } from "./types";

/**
 * Generates an HMAC-SHA256 signature for outgoing webhook payloads.
 */
export function generateWebhookSignature(payloadString: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payloadString).digest("hex");
}

/**
 * Resolves the destination webhook URL dynamically:
 * Priority 1: Explicit targetWebhookUrl passed directly (from transaction or checkout call)
 * Priority 2: Database record in Satellite table (if registered)
 * Priority 3: Environment variable (e.g. `${SITE}_WEBHOOK_URL`)
 */
export async function resolveSatelliteWebhookUrl(
  site: SatelliteSite,
  explicitUrl?: string | null
): Promise<{ url: string | null; secret: string }> {
  const defaultSecret = process.env.PAY_HUB_WEBHOOK_SECRET || "default_pay_hub_secret";

  if (explicitUrl && explicitUrl.trim().length > 0) {
    return { url: explicitUrl.trim(), secret: defaultSecret };
  }

  const cleanSite = site.toUpperCase().trim();

  // Check Database for registered Satellite
  try {
    const registered = await prisma.satellite.findUnique({
      where: { code: cleanSite },
    });
    if (registered && registered.isActive && registered.webhookUrl) {
      return {
        url: registered.webhookUrl,
        secret: registered.secretKey || defaultSecret,
      };
    }
  } catch (err) {
    console.warn(`[Webhook Dispatcher] Failed to query Satellite table for ${cleanSite}:`, err);
  }

  // Fallback to environment variable (e.g. PRESSTONIK_WEBHOOK_URL or MEMOTONIK_WEBHOOK_URL)
  const envKey = `${cleanSite}_WEBHOOK_URL`;
  const envUrl = process.env[envKey] || null;

  return { url: envUrl, secret: defaultSecret };
}

/**
 * Dispatches an outbound webhook event to the appropriate satellite application
 * with an HMAC-SHA256 signature header for cryptographic verification.
 * Standardizes payload with both eventType and event.
 */
export async function dispatchWebhookToSatellite(params: {
  eventType: string;
  sourceSite: SatelliteSite;
  targetWebhookUrl?: string | null;
  data: PayHubWebhookPayload["data"];
}): Promise<{ delivered: boolean; statusCode?: number; error?: string }> {
  const { url: targetUrl, secret } = await resolveSatelliteWebhookUrl(
    params.sourceSite,
    params.targetWebhookUrl
  );

  const normalizedEventType = params.eventType;

  // Standardized normalized payload
  const payload: PayHubWebhookPayload = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    eventType: normalizedEventType,
    event: normalizedEventType, // Dual support for satellite convenience
    timestamp: new Date().toISOString(),
    sourceSite: params.sourceSite,
    data: params.data,
  };

  const payloadString = JSON.stringify(payload);
  const signature = generateWebhookSignature(payloadString, secret);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Create audit log record in database
  let webhookLogId: string | null = null;
  try {
    const log = await prisma.webhookEvent.create({
      data: {
        direction: "OUTBOUND",
        provider: params.sourceSite,
        sourceSite: params.sourceSite,
        eventType: normalizedEventType,
        payload: payload as any,
        status: "PENDING",
        attempts: 1,
      },
    });
    webhookLogId = log.id;
  } catch (dbErr) {
    console.error("[Webhook Dispatcher] Failed to save initial webhookEvent:", dbErr);
  }

  if (!targetUrl) {
    console.warn(`[Webhook Dispatcher] No webhook URL configured or passed for site "${params.sourceSite}"`);
    if (webhookLogId) {
      await prisma.webhookEvent.update({
        where: { id: webhookLogId },
        data: {
          status: "FAILED",
          lastError: `No webhook URL found for satellite "${params.sourceSite}". Pass webhook_url during checkout or register it.`,
        },
      }).catch(() => {});
    }
    return { delivered: false, error: `No destination webhook URL for ${params.sourceSite}` };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BitTonik-PayHub/1.0",
        "X-PayHub-Signature": `sha256=${signature}`,
        "X-PayHub-Timestamp": timestamp,
        "X-PayHub-Event": normalizedEventType,
        "X-PayHub-Site": params.sourceSite,
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const isOk = response.ok;
    const responseStatus = response.status;
    let responseText = "";
    try {
      responseText = await response.text();
    } catch {
      // ignore
    }

    if (webhookLogId) {
      await prisma.webhookEvent.update({
        where: { id: webhookLogId },
        data: {
          status: isOk ? "DELIVERED" : "FAILED",
          responseStatus,
          lastError: isOk ? null : `HTTP ${responseStatus}: ${responseText.slice(0, 300)}`,
        },
      }).catch(() => {});
    }

    return { delivered: isOk, statusCode: responseStatus };
  } catch (fetchErr: any) {
    console.error(`[Webhook Dispatcher] Delivery failed for ${targetUrl}:`, fetchErr);

    if (webhookLogId) {
      await prisma.webhookEvent.update({
        where: { id: webhookLogId },
        data: {
          status: "FAILED",
          lastError: fetchErr?.message || "Network / Timeout Error",
        },
      }).catch(() => {});
    }

    return { delivered: false, error: fetchErr?.message || "Delivery failed" };
  }
}
