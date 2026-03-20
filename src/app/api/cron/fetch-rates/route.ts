import { NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cacheService";
import { getBangkokDate, fetchAndProcessExchangeRates } from "@/lib/utils/apiHelpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  // 🔐 Basic Auth for Cron (Vercel Cron Header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const CACHE_KEY = "exchange_rates";
    const todayDate = getBangkokDate();

    const apiKey = process.env.BOT_API_KEY;
    if (!apiKey) {
      throw new Error("BOT_API_KEY is missing");
    }

    const finalData = await fetchAndProcessExchangeRates(apiKey);

    if (!finalData) {
      return NextResponse.json({ success: true, message: "No data received from BOT" });
    }

    const finalDataWithTimestamp = {
      ...finalData,
      fetched_at: new Date().toISOString()
    };

    // --- FIREBASE SAVING ---
    // Update Cache (Latest)
    await cacheService.set(CACHE_KEY, finalDataWithTimestamp, todayDate, 'latest');
    
    // Save to History (Using date as document ID)
    await cacheService.set(CACHE_KEY, finalDataWithTimestamp, todayDate, todayDate);

    return NextResponse.json({
        success: true,
        date: todayDate,
        currency_count: finalData.data.length
    });

  } catch (error: unknown) {
    console.error("Cron Fetch Rates Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
