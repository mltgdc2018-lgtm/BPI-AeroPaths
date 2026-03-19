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
      return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
        .toISOString()
        .split('T')[0];
    };

    const todayDate = getBangkokDate(now);
    
    // Check current time in Bangkok
    const bangkokTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const currentHour = bangkokTime.getHours();

    const CACHE_KEY = "oil_prices";
    const cached = await cacheService.get(CACHE_KEY);

    // Rule: Update after 06:00 AM daily
    const shouldFetchFresh = currentHour >= 6 && cached?.dateKey !== todayDate;

    if (!shouldFetchFresh && cached) {
      // Return cached data if it exists and we don't need to refresh yet
      return NextResponse.json({
        data: cached.data,
        source: 'cache',
        cached_date: cached.dateKey
      });
    }

    // Fetch Fresh Data
    const response = await fetch("https://oil-price.bangchak.co.th/ApiOilPrice2/th", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 0 }, // No internal Next.js cache, rely on our logic
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch oil prices: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Save to Cache
    await cacheService.set(CACHE_KEY, data, todayDate);

    return NextResponse.json({
      data: data, // Keep the array intact under 'data' key
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
