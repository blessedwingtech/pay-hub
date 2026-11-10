import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const isAuthenticated = verifyAdminAuth(req);
  return NextResponse.json({
    authenticated: isAuthenticated,
  });
}
