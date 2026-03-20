import { NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cacheService";
import { getBangkokDate, fetchOilPrices } from "@/lib/utils/apiHelpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    const todayDate = getBangkokDate();
    const CACHE_KEY = "oil_prices";
    const cached = await cacheService.get(CACHE_KEY);

    // If cache exists and is fresh (from today's 06:00 AM fetch), return it
    if (cached && cached.dateKey === todayDate) {
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
    const data = await fetchOilPrices();
    
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
        data: cached.data,
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
