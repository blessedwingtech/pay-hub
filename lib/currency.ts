/**
 * Real-time currency exchange rates service with in-memory caching.
 * Primary pair: USD <-> HTG (Haitian Gourdes).
 */

interface CachedRates {
  usdToHtg: number;
  timestamp: number;
}

let cachedRate: CachedRates | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 heure de cache
const FALLBACK_USD_TO_HTG = 132.0;

/**
 * Fetches the current live USD to HTG exchange rate from free open API.
 * Uses 1-hour cache and safe fallback if offline.
 */
export async function getUsdToHtgRate(): Promise<number> {
  const now = Date.now();

  if (cachedRate && now - cachedRate.timestamp < CACHE_TTL_MS) {
    return cachedRate.usdToHtg;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000), // 4s timeout max
    });

    if (res.ok) {
      const data = await res.json();
      const liveRate = data?.rates?.HTG;

      if (typeof liveRate === "number" && liveRate > 50 && liveRate < 300) {
        cachedRate = {
          usdToHtg: Number(liveRate.toFixed(2)),
          timestamp: now,
        };
        return cachedRate.usdToHtg;
      }
    }
  } catch (err: any) {
    console.warn("[Currency] Failed to fetch live exchange rate, using fallback:", err.message);
  }

  // Fallback to previous cache or default safe rate
  return cachedRate?.usdToHtg || FALLBACK_USD_TO_HTG;
}

/**
 * Converts USD to HTG using the live exchange rate.
 */
export async function convertUsdToHtg(usdAmount: number): Promise<number> {
  const rate = await getUsdToHtgRate();
  return Math.round(usdAmount * rate);
}

/**
 * Converts HTG to USD using the live exchange rate.
 */
export async function convertHtgToUsd(htgAmount: number): Promise<number> {
  const rate = await getUsdToHtgRate();
  return Number((htgAmount / rate).toFixed(2));
}
