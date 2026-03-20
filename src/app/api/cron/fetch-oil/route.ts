import { NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cacheService";
import { getBangkokDate, fetchOilPrices } from "@/lib/utils/apiHelpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  // 🔐 Basic Auth for Cron (Vercel Cron Header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const todayDate = getBangkokDate();

    // --- OIL PRICE FETCH ---
    const data = await fetchOilPrices();
    
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
