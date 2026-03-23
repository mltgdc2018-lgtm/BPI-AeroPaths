/**
 * Shared API utility functions
 * Extracted from duplicate logic across API routes
 */

// ============================================================================
// DATE HELPERS
// ============================================================================

/**
 * Get today's date in YYYY-MM-DD format using Bangkok timezone
 */
export function getBangkokDate(date: Date = new Date()): string {
  const bkk = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const y = bkk.getFullYear();
  const m = String(bkk.getMonth() + 1).padStart(2, '0');
  const d = String(bkk.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get Bangkok time details (hour, minute, day of week)
 */
export function getBangkokTimeInfo(date: Date = new Date()) {
  const bkk = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return {
    hours: bkk.getHours(),
    minutes: bkk.getMinutes(),
    dayOfWeek: bkk.getDay(), // 0 = Sun, 6 = Sat
  };
}

// ============================================================================
// OIL PRICE
// ============================================================================

const OIL_PRICE_URL = "https://oil-price.bangchak.co.th/ApiOilPrice2/th";
const OIL_PRICE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Accept": "application/json",
};

/**
 * Fetch oil prices from Bangchak API
 * @returns Raw oil price data from the API
 * @throws Error if the API request fails
 */
export async function fetchOilPrices(): Promise<unknown> {
  const response = await fetch(OIL_PRICE_URL, {
    headers: OIL_PRICE_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch oil prices: ${response.statusText}`);
  }

  const json = await response.json();
  
  // Normalize Bangchak API structure
  // The API returns an array like [{ OilList: "[...]", ... }]
  if (Array.isArray(json) && json.length > 0 && json[0].OilList) {
    try {
      return JSON.parse(json[0].OilList);
    } catch (e) {
      console.error("Failed to parse OilList string:", e);
      return [];
    }
  }

  return json;
}

// ============================================================================
// EXCHANGE RATES
// ============================================================================

export interface ExchangeRateItem {
  currency_id: string;
  selling: string;
  period: string;
}

export interface ProcessedExchangeRate {
  currency_id: string;
  selling: string;
  period: string;
  prev_selling: string | null;
  change: number;
  trend: 'up' | 'down' | 'flat';
}

export interface ProcessedExchangeRateData {
  last_updated: string;
  data: ProcessedExchangeRate[];
}

/**
 * Fetch and process exchange rates from Bank of Thailand API
 * @returns Processed exchange rate data with trend info, or null if no data
 */
export async function fetchAndProcessExchangeRates(apiKey: string): Promise<ProcessedExchangeRateData | null> {
  // Calculate date range: Today back to 7 days ago
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - 7);
  const startDate = pastDate.toISOString().split('T')[0];

  const apiUrl = `https://gateway.api.bot.or.th/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${startDate}&end_period=${endDate}`;

  const response = await fetch(apiUrl, {
    headers: {
      "Authorization": apiKey,
      "Accept": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from BOT API: ${response.statusText}`);
  }

  const json = await response.json();
  const details = json.result?.data?.data_detail;

  if (!details || !Array.isArray(details)) {
    return null;
  }

  // Group by currency
  const grouped: Record<string, ExchangeRateItem[]> = {};
  details.forEach((item: ExchangeRateItem) => {
    if (!grouped[item.currency_id]) grouped[item.currency_id] = [];
    if (item.selling && item.selling !== "") {
      grouped[item.currency_id].push(item);
    }
  });

  // Process data to find latest and previous for each currency
  const processedData: ProcessedExchangeRate[] = [];
  let lastUpdatedDate = "";

  Object.keys(grouped).forEach(currency => {
    const sorted = grouped[currency].sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime());

    if (sorted.length > 0) {
      const latest = sorted[0];
      const previous = sorted.length > 1 ? sorted[1] : null;

      if (!lastUpdatedDate || new Date(latest.period) > new Date(lastUpdatedDate)) {
        lastUpdatedDate = latest.period;
      }

      const currentRate = parseFloat(latest.selling);
      const prevRate = previous ? parseFloat(previous.selling) : currentRate;
      const change = currentRate - prevRate;

      processedData.push({
        currency_id: currency,
        selling: latest.selling,
        period: latest.period,
        prev_selling: previous ? previous.selling : null,
        change: change,
        trend: change > 0 ? "up" : change < 0 ? "down" : "flat"
      });
    }
  });

  return {
    last_updated: lastUpdatedDate,
    data: processedData,
  };
}
