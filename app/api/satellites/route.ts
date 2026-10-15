import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SATELLITE_CONFIGS } from "@/lib/types";

/**
 * GET /api/satellites
 * Lists all known satellites (built-in presets merged with dynamic database satellites)
 */
export async function GET() {
  try {
    const dbSatellites = await prisma.satellite.findMany({
      orderBy: { createdAt: "desc" },
    });

    const mergedMap = new Map<string, any>();

    // Add built-in presets
    Object.keys(SATELLITE_CONFIGS).forEach((key) => {
      const p = SATELLITE_CONFIGS[key];
      mergedMap.set(key, {
        code: p.name,
        name: p.displayName,
        description: p.description,
        accentColor: p.accentColor,
        logoText: p.logoText,
        logoUrl: p.logoUrl || null,
        webhookUrl: p.webhookUrl || process.env[p.webhookUrlEnv || ""] || null,
        isPreset: true,
        isActive: true,
      });
    });

    // Add or override with DB satellites
    dbSatellites.forEach((sat) => {
      mergedMap.set(sat.code, {
        id: sat.id,
        code: sat.code,
        name: sat.name,
        description: sat.description,
        accentColor: sat.accentColor,
        logoText: sat.logoText,
        logoUrl: sat.logoUrl,
        webhookUrl: sat.webhookUrl,
        isActive: sat.isActive,
        createdAt: sat.createdAt,
        updatedAt: sat.updatedAt,
        isPreset: false,
      });
    });

    return NextResponse.json({
      success: true,
      count: mergedMap.size,
      satellites: Array.from(mergedMap.values()),
    });
  } catch (error: any) {
    console.error("[API satellites GET] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch satellites" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/satellites
 * Registers or updates a satellite dynamically with authentication
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const secret = process.env.PAY_HUB_WEBHOOK_SECRET;

    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json(
        { error: "Non autorisé: Secret Pay-Hub invalide" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      code,
      name,
      description,
      accentColor = "#3b82f6",
      logoText,
      logoUrl,
      webhookUrl,
      secretKey,
      metadata,
    } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: "code et name sont obligatoires (ex: code: 'PRESSTONIK', name: 'PressTonik')" },
        { status: 400 }
      );
    }

    const normalizedCode = String(code).toUpperCase().trim();

    const satellite = await prisma.satellite.upsert({
      where: { code: normalizedCode },
      update: {
        name,
        description: description || null,
        accentColor: accentColor || null,
        logoText: logoText || normalizedCode.slice(0, 2).toUpperCase(),
        logoUrl: logoUrl || null,
        webhookUrl: webhookUrl || null,
        secretKey: secretKey || null,
        metadata: metadata || undefined,
        isActive: true,
      },
      create: {
        code: normalizedCode,
        name,
        description: description || null,
        accentColor: accentColor || "#3b82f6",
        logoText: logoText || normalizedCode.slice(0, 2).toUpperCase(),
        logoUrl: logoUrl || null,
        webhookUrl: webhookUrl || null,
        secretKey: secretKey || null,
        metadata: metadata || undefined,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      satellite,
    });
  } catch (error: any) {
    console.error("[API satellites POST] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to register satellite" },
      { status: 500 }
    );
  }
}
