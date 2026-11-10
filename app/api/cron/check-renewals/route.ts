import { NextRequest, NextResponse } from "next/server";
import { runRenewalsAndRemindersCheck } from "@/lib/recurring";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const urlSecret = new URL(req.url).searchParams.get("secret");
      if (urlSecret !== cronSecret) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
      }
    }

    const summary = await runRenewalsAndRemindersCheck();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error: any) {
    console.error("[CRON check-renewals] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
