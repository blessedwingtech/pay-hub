import { NextResponse } from "next/server";
import { getUsdToHtgRate } from "@/lib/currency";

export async function GET() {
  const usdToHtg = await getUsdToHtgRate();
  return NextResponse.json({
    base: "USD",
    target: "HTG",
    rate: usdToHtg,
    timestamp: Date.now(),
  });
}
