import { NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cacheService";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

interface ExchangeRateItem {
  currency_id: string;
  selling: string;
  period: string;
}

interface ProcessedExchangeRate {
  currency_id: string;
  selling: string;
  period: string;
  prev_selling: string | null;
  change: number;
  trend: 'up' | 'down' | 'flat';
}

export async function GET() {
  try {
    const CACHE_KEY = "exchange_rates";
    
    // Time Logic (Bangkok)
    const now = new Date();
    const bangkokTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    
    const currentHour = bangkokTime.getHours();
    const currentMinute = bangkokTime.getMinutes();
    const currentDay = bangkokTime.getDay(); // 0 = Sun, 6 = Sat
    
    const isWeekend = currentDay === 0 || currentDay === 6;
    // Check if it is past 18:30
    const isPastUpdate = currentHour > 18 || (currentHour === 18 && currentMinute >= 30);
    
    // Helper: Get YYYY-MM-DD
    const getStrictBangkokDate = () => {
         const d = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
         const dateObj = new Date(d);
         const year = dateObj.getFullYear();
         const month = String(dateObj.getMonth() + 1).padStart(2, '0');
         const day = String(dateObj.getDate()).padStart(2, '0');
         return `${year}-${month}-${day}`;
    }

    const todayDate = getStrictBangkokDate();

    // Check Cache
    const cached = await cacheService.get(CACHE_KEY);

    // Rule:
    // 1. If Weekend: DO NOT FETCH NEW. Use Cache.
    // 2. If Mon-Fri AND NOT Past 18:30: DO NOT FETCH NEW. Use Cache (likely yesterday's).
    // 3. If Mon-Fri AND Past 18:30: Check if Cache has today's data. If diff, FETCH.
    
    let shouldFetchFresh = false;

    if (!isWeekend && isPastUpdate) {
        // It's a weekday evening. We expect today's data.
        if (cached?.dateKey !== todayDate) {
            shouldFetchFresh = true;
        }
    }
    
    // Safety check: if cache is totally empty, we must fetch regardless of rules
    if (!cached) {
        shouldFetchFresh = true;
    }

    if (!shouldFetchFresh && cached && typeof cached.data === 'object' && cached.data !== null) {
      return NextResponse.json({
        ...cached.data,
        source: 'cache',
        cached_date: cached.dateKey
      });
    }

    // --- FETCH LOGIC ---
    // Calculate date range: Today back to 7 days ago
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 7);
    const startDate = pastDate.toISOString().split('T')[0];

    const apiUrl = `https://gateway.api.bot.or.th/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${startDate}&end_period=${endDate}`;
    const apiKey = process.env.BOT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Configuration Error", details: "BOT_API_KEY is missing" },
        { status: 500 }
      );
    }

    const response = await fetch(apiUrl, {
      headers: {
        "Authorization": apiKey,
        "Accept": "application/json",
      },
      next: { revalidate: 0 },
    });
    
    if (!response.ok) {
        const errorText = await response.text();
         // Fallback to cache if exists
        if (cached && typeof cached.data === 'object' && cached.data !== null) {
             return NextResponse.json({
                ...cached.data,
                source: 'cache_fallback',
                warning: 'API failed, using cached data'
            });
        }
        return NextResponse.json(
          { error: "Failed to fetch exchange rates", details: errorText },
          { status: response.status }
        );
    }

    const json = await response.json();
    const details = json.result?.data?.data_detail;

    if (!details || !Array.isArray(details)) {
        return NextResponse.json({ result: { data: { data_detail: [] } } });
    }

    // Process data to find latest and previous for each currency
    const grouped: Record<string, ExchangeRateItem[]> = {};
    details.forEach((item: ExchangeRateItem) => {
        if (!grouped[item.currency_id]) grouped[item.currency_id] = [];
        if (item.selling && item.selling !== "") {
            grouped[item.currency_id].push(item);
        }
    });

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
    
    const finalData = {
        last_updated: lastUpdatedDate,
        data: processedData
    };

    // Update Cache
    await cacheService.set(CACHE_KEY, finalData, todayDate);

    return NextResponse.json({
        ...finalData,
        source: 'api',
        fetched_at: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error("Exchange Rate Proxy Error:", error);
    
    // Fallback
    const cached = await cacheService.get("exchange_rates");
    if (cached && typeof cached.data === 'object' && cached.data !== null) {
      return NextResponse.json({...cached.data, source: 'cache_fallback'});
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}
