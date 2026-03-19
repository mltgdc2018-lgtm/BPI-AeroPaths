import { NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cacheService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  // 🔐 Basic Auth for Cron (Vercel Cron Header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Time Logic (Bangkok)
    const now = new Date();
    const bangkokTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    
    const year = bangkokTime.getFullYear();
    const month = String(bangkokTime.getMonth() + 1).padStart(2, '0');
    const day = String(bangkokTime.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;

    // --- OIL PRICE FETCH ---
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
    
    // Save to Firestore (Latest & Daily History)
    await cacheService.set("oil_prices", data, todayDate, 'latest');
    await cacheService.set("oil_prices", data, todayDate, todayDate);

    return NextResponse.json({
      success: true,
      date: todayDate,
      oil_price_status: "updated"
    });

  } catch (error: unknown) {
    console.error("Oil Price Cron Fetch Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
