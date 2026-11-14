import { NextRequest, NextResponse } from "next/server";
import {
  getCurrencyRateDetails,
  updateCurrencyConfig,
  resetCurrencyConfig,
} from "@/lib/currency";

/**
 * GET /api/admin/currency
 * Returns live market rate, current active config, and effective applied rate.
 */
export async function GET() {
  try {
    const details = await getCurrencyRateDetails();
    return NextResponse.json({
      success: true,
      ...details,
    });
  } catch (error: any) {
    console.error("[GET /api/admin/currency] Error:", error);
    return NextResponse.json(
      { error: "Impossible de récupérer les paramètres de devises" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/currency
 * Updates currency configuration (margin, override, manual rate).
 * Supports action: "reset" to restore default automatic mode.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "reset") {
      const reset = await resetCurrencyConfig(body.adminEmail || "Admin");
      const details = await getCurrencyRateDetails();
      return NextResponse.json({
        success: true,
        message: "Configuration réinitialisée en mode 100% automatique.",
        ...details,
      });
    }

    const { manualOverride, manualRate, marginPercent, adminEmail } = body;

    // Validation
    const updates: any = {};

    if (typeof manualOverride === "boolean") {
      updates.manualOverride = manualOverride;
    }

    if (manualRate !== undefined) {
      const parsedRate = Number(manualRate);
      if (isNaN(parsedRate) || parsedRate <= 0 || parsedRate > 500) {
        return NextResponse.json(
          { error: "Le taux forcé doit être un montant valide en HTG (entre 50 et 500)" },
          { status: 400 }
        );
      }
      updates.manualRate = Number(parsedRate.toFixed(2));
    }

    if (marginPercent !== undefined) {
      const parsedMargin = Number(marginPercent);
      if (isNaN(parsedMargin) || parsedMargin < -10 || parsedMargin > 50) {
        return NextResponse.json(
          { error: "La marge de sécurité doit être comprise entre -10% et +50%" },
          { status: 400 }
        );
      }
      updates.marginPercent = Number(parsedMargin.toFixed(2));
    }

    await updateCurrencyConfig(updates, adminEmail || "Admin BWT");
    const details = await getCurrencyRateDetails();

    return NextResponse.json({
      success: true,
      message: "Paramètres de change mis à jour avec succès.",
      ...details,
    });
  } catch (error: any) {
    console.error("[POST /api/admin/currency] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la mise à jour des paramètres" },
      { status: 500 }
    );
  }
}
