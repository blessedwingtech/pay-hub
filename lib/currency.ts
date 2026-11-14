/**
 * BitTonik Pay-Hub - Currency & Exchange Rates Service
 * Supports:
 * 1. Live BRH/Interbank rates with resilient memory cache
 * 2. Admin Security Margin (%) to absorb processor/withdrawal fees (e.g., Bazik 5%)
 * 3. Manual Rate Override (forced HTG/USD rate set by Admin)
 * 4. Dual persistence: PostgreSQL (SystemSetting) + local fallback
 */

import { prisma } from "./prisma";
import fs from "fs";
import path from "path";

export interface CurrencyConfig {
  manualOverride: boolean;
  manualRate: number;      // e.g. 135.0 (HTG per USD)
  marginPercent: number;   // e.g. 5.0 (adds 5% to live rate)
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_CONFIG: CurrencyConfig = {
  manualOverride: false,
  manualRate: 135.0,
  marginPercent: 5.0, // Default +5% safety buffer for Bazik/Digicel cashout fees
};

const CONFIG_KEY = "currency_config";
const CONFIG_FILE_PATH = path.join(process.cwd(), "data", "currency_config.json");

// In-memory cache
let cachedLiveRate: { rate: number; timestamp: number } | null = null;
let cachedConfig: { config: CurrencyConfig; timestamp: number } | null = null;

const RATE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour for live market API
const CONFIG_CACHE_TTL_MS = 10 * 1000;     // 10 seconds for admin config (realtime responsiveness)
const FALLBACK_USD_TO_HTG = 132.0;

/**
 * Retrieves the current currency configuration (Database -> Local file -> Default).
 */
export async function getCurrencyConfig(): Promise<CurrencyConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.timestamp < CONFIG_CACHE_TTL_MS) {
    return cachedConfig.config;
  }

  // 1. Try reading from PostgreSQL
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: CONFIG_KEY },
    });

    if (setting?.value && typeof setting.value === "object") {
      const val = setting.value as any;
      const config: CurrencyConfig = {
        manualOverride: Boolean(val.manualOverride),
        manualRate: Number(val.manualRate) || DEFAULT_CONFIG.manualRate,
        marginPercent: Number(val.marginPercent) ?? DEFAULT_CONFIG.marginPercent,
        updatedAt: val.updatedAt || setting.updatedAt.toISOString(),
        updatedBy: val.updatedBy || "Admin",
      };
      cachedConfig = { config, timestamp: now };
      return config;
    }
  } catch (err: any) {
    console.warn("[Currency] DB read for config failed, checking file fallback:", err.message);
  }

  // 2. Fallback to local JSON file
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      const config: CurrencyConfig = {
        manualOverride: Boolean(parsed.manualOverride),
        manualRate: Number(parsed.manualRate) || DEFAULT_CONFIG.manualRate,
        marginPercent: Number(parsed.marginPercent) ?? DEFAULT_CONFIG.marginPercent,
        updatedAt: parsed.updatedAt,
        updatedBy: parsed.updatedBy,
      };
      cachedConfig = { config, timestamp: now };
      return config;
    }
  } catch {
    // Ignore and proceed to default
  }

  // 3. Fallback to environment variables or defaults
  const envOverride = process.env.HTG_MANUAL_RATE;
  const envMargin = process.env.HTG_RATE_MARGIN_PERCENT;

  const fallbackConfig: CurrencyConfig = {
    manualOverride: Boolean(envOverride),
    manualRate: envOverride ? Number(envOverride) : DEFAULT_CONFIG.manualRate,
    marginPercent: envMargin ? Number(envMargin) : DEFAULT_CONFIG.marginPercent,
    updatedAt: new Date().toISOString(),
    updatedBy: "System",
  };

  cachedConfig = { config: fallbackConfig, timestamp: now };
  return fallbackConfig;
}

/**
 * Updates the currency configuration and invalidates cache.
 */
export async function updateCurrencyConfig(
  updates: Partial<CurrencyConfig>,
  updatedBy: string = "Admin"
): Promise<CurrencyConfig> {
  const current = await getCurrencyConfig();
  const nextConfig: CurrencyConfig = {
    manualOverride: updates.manualOverride !== undefined ? Boolean(updates.manualOverride) : current.manualOverride,
    manualRate: updates.manualRate !== undefined ? Number(updates.manualRate) : current.manualRate,
    marginPercent: updates.marginPercent !== undefined ? Number(updates.marginPercent) : current.marginPercent,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  // 1. Save to DB
  try {
    await prisma.systemSetting.upsert({
      where: { key: CONFIG_KEY },
      create: {
        key: CONFIG_KEY,
        value: nextConfig as any,
      },
      update: {
        value: nextConfig as any,
      },
    });
  } catch (err: any) {
    console.warn("[Currency] DB write for config failed, writing to file fallback:", err.message);
  }

  // 2. Save to local file backup
  try {
    const dir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(nextConfig, null, 2), "utf-8");
  } catch (fileErr) {
    console.warn("[Currency] File write backup error:", fileErr);
  }

  // Invalidate cache immediately
  cachedConfig = { config: nextConfig, timestamp: Date.now() };
  return nextConfig;
}

/**
 * Resets currency config to default live mode (+5% margin, override disabled).
 */
export async function resetCurrencyConfig(updatedBy: string = "Admin"): Promise<CurrencyConfig> {
  return await updateCurrencyConfig(DEFAULT_CONFIG, updatedBy);
}

/**
 * Fetches the raw live USD to HTG exchange rate from external market API.
 */
export async function getLiveUsdToHtgRate(): Promise<number> {
  const now = Date.now();

  if (cachedLiveRate && now - cachedLiveRate.timestamp < RATE_CACHE_TTL_MS) {
    return cachedLiveRate.rate;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000), // 4s max
    });

    if (res.ok) {
      const data = await res.json();
      const liveRate = data?.rates?.HTG;

      if (typeof liveRate === "number" && liveRate > 50 && liveRate < 350) {
        cachedLiveRate = {
          rate: Number(liveRate.toFixed(2)),
          timestamp: now,
        };
        return cachedLiveRate.rate;
      }
    }
  } catch (err: any) {
    console.warn("[Currency] Failed to fetch live exchange rate from API, using fallback:", err.message);
  }

  return cachedLiveRate?.rate || FALLBACK_USD_TO_HTG;
}

/**
 * Returns the effective rate taking into account manual override and safety margin.
 */
export async function getUsdToHtgRate(): Promise<number> {
  const config = await getCurrencyConfig();

  // 1. If manual override is active, use the exact manual rate
  if (config.manualOverride && config.manualRate > 0) {
    return Number(config.manualRate.toFixed(2));
  }

  // 2. Otherwise use live rate + security margin
  const liveRate = await getLiveUsdToHtgRate();
  const marginMultiplier = 1 + (config.marginPercent / 100);
  const effective = liveRate * marginMultiplier;

  return Number(effective.toFixed(2));
}

/**
 * Returns complete rate details for the Admin UI and diagnostics.
 */
export async function getCurrencyRateDetails() {
  const config = await getCurrencyConfig();
  const liveRate = await getLiveUsdToHtgRate();
  const effectiveRate = await getUsdToHtgRate();

  return {
    liveRate,
    effectiveRate,
    config,
    calculatedMarginAmount: Number((effectiveRate - liveRate).toFixed(2)),
  };
}

/**
 * Converts USD to HTG using the effective exchange rate.
 */
export async function convertUsdToHtg(usdAmount: number): Promise<number> {
  const rate = await getUsdToHtgRate();
  return Math.round(usdAmount * rate);
}

/**
 * Converts HTG to USD using the effective exchange rate.
 */
export async function convertHtgToUsd(htgAmount: number): Promise<number> {
  const rate = await getUsdToHtgRate();
  return Number((htgAmount / rate).toFixed(2));
}
