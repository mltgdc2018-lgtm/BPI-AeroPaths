import { NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cacheService";
import { getBangkokDate, getBangkokTimeInfo, fetchAndProcessExchangeRates } from "@/lib/utils/apiHelpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    const CACHE_KEY = "exchange_rates";
    const todayDate = getBangkokDate();
    const { hours: currentHour, minutes: currentMinute, dayOfWeek: currentDay } = getBangkokTimeInfo();
    
    const isWeekend = currentDay === 0 || currentDay === 6;
    // Check if it is past 18:30
    const isPastUpdate = currentHour > 18 || (currentHour === 18 && currentMinute >= 30);

    // Check Cache
    const cached = await cacheService.get(CACHE_KEY);

    // Rule:
    // 1. If Weekend: DO NOT FETCH NEW. Use Cache.
    // 2. If Mon-Fri AND NOT Past 18:30: DO NOT FETCH NEW. Use Cache (likely yesterday's).
    // 3. If Mon-Fri AND Past 18:30: Check if Cache has today's data. If diff, FETCH.
    
    let shouldFetchFresh = false;

    if (!isWeekend && isPastUpdate) {
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
    const apiKey = process.env.BOT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Configuration Error", details: "BOT_API_KEY is missing" },
        { status: 500 }
      );
    }

    const finalData = await fetchAndProcessExchangeRates(apiKey);

    if (!finalData) {
      return NextResponse.json({ result: { data: { data_detail: [] } } });
    }

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
