import { NextRequest, NextResponse } from "next/server";
import { getAdminKey, getAdminSessionToken, ADMIN_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json();

    const masterKey = getAdminKey();
    if (!masterKey) {
      return NextResponse.json(
        { error: "PAYHUB_ADMIN_KEY non configurée dans le fichier .env" },
        { status: 500 }
      );
    }

    if (!key || key.trim() !== masterKey) {
      return NextResponse.json(
        { error: "Clé d'administration invalide" },
        { status: 401 }
      );
    }

    const sessionToken = getAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      message: "Authentification réussie",
      token: sessionToken,
    });

    // Set secure HTTP-only cookie (lasts 7 days)
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 jours
      path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
