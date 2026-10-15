import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStripePortalSession } from "@/lib/stripe";
import { SatelliteSite } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { userId, sourceSite = "MEMOTONIK", returnUrl } = await req.json();

    if (!userId || !returnUrl) {
      return NextResponse.json(
        { error: "userId et returnUrl sont requis" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: {
        satelliteUserId_sourceSite: {
          satelliteUserId: userId,
          sourceSite: sourceSite as SatelliteSite,
        },
      },
    });

    if (!customer || !customer.stripeCustomerId) {
      return NextResponse.json(
        { error: "Aucun compte client Stripe actif trouvé pour cet utilisateur" },
        { status: 404 }
      );
    }

    const session = await createStripePortalSession({
      stripeCustomerId: customer.stripeCustomerId,
      returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[API portal/session] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur interne lors de l'accès au portail de facturation" },
      { status: 500 }
    );
  }
}
