import { NextRequest } from "next/server";
import crypto from "crypto";

export const ADMIN_COOKIE_NAME = "payhub_admin_token";

/**
 * Returns the configured master admin key from env (with fallback to webhook secret).
 */
export function getAdminKey(): string {
  return (
    process.env.PAYHUB_ADMIN_KEY?.trim() ||
    process.env.PAY_HUB_WEBHOOK_SECRET?.trim() ||
    ""
  );
}

/**
 * Creates a deterministic SHA-256 hash of the admin key to serve as session token.
 */
export function getAdminSessionToken(): string {
  const masterKey = getAdminKey();
  if (!masterKey) return "";
  return crypto.createHash("sha256").update(`payhub_admin_${masterKey}`).digest("hex");
}

/**
 * Validates admin authentication from NextRequest.
 * Supports:
 * 1. Authorization header (Bearer <PAYHUB_ADMIN_KEY> or Bearer <PAY_HUB_WEBHOOK_SECRET>)
 * 2. x-admin-key header
 * 3. Cookie (payhub_admin_token)
 */
export function verifyAdminAuth(req: NextRequest): boolean {
  const masterKey = getAdminKey();
  if (!masterKey) {
    console.error("[Auth] No PAYHUB_ADMIN_KEY or PAY_HUB_WEBHOOK_SECRET configured.");
    return false;
  }

  // 1. Check Authorization: Bearer <key>
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    if (token === masterKey || token === process.env.PAY_HUB_WEBHOOK_SECRET?.trim()) {
      return true;
    }
  }

  // 2. Check x-admin-key header
  const xAdminKey = req.headers.get("x-admin-key");
  if (xAdminKey && xAdminKey.trim() === masterKey) {
    return true;
  }

  // 3. Check Admin session cookie
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME);
  if (cookie?.value) {
    const validSessionToken = getAdminSessionToken();
    if (cookie.value === validSessionToken) {
      return true;
    }
  }

  return false;
}
