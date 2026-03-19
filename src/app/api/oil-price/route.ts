import { NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cacheService";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    const now = new Date();
    // Helper to format date as YYYY-MM-DD in local time (Bangkok)
    const getBangkokDate = (date: Date) => {
      const bkk = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
      const y = bkk.getFullYear();
      const m = String(bkk.getMonth() + 1).padStart(2, '0');
      const d = String(bkk.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const todayDate = getBangkokDate(now);
    
    const CACHE_KEY = "oil_prices";
    const cached = await cacheService.get(CACHE_KEY);

    // If cache exists and is fresh (from today's 06:00 AM fetch), return it
    if (cached && cached.dateKey === todayDate) {
      // Ensure updatedAt is serialized correctly
      const lastUpdated = cached.updatedAt?.toMillis 
        ? new Date(cached.updatedAt.toMillis()).toISOString() 
        : new Date().toISOString();

      return NextResponse.json({
        data: cached.data,
        source: 'cache',
        cached_date: cached.dateKey,
        fetched_at: lastUpdated
      });
    }

    // fallback: if cache is missing or old, try direct fetch
    const response = await fetch("https://oil-price.bangchak.co.th/ApiOilPrice2/th", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch oil prices: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Save to Cache (Safety sync)
    await cacheService.set(CACHE_KEY, data, todayDate, 'latest');

    return NextResponse.json({
      data: data,
      source: 'api',
      fetched_at: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error("Oil Price Proxy Error:", error);
    
    // Fallback to cache if API fails
    const cached = await cacheService.get("oil_prices");
    if (cached) {
       return NextResponse.json({
        data: cached.data, // consistent structure
        source: 'cache_fallback',
        warning: 'API failed, using cached data'
      });
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch oil prices", details: errorMessage },
      { status: 500 }
    );
  }
}
