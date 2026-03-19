import { NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cacheService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export async function GET(request: Request) {
  // 🔐 Basic Auth for Cron (Vercel Cron Header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const CACHE_KEY = "exchange_rates";
    
    // Time Logic (Bangkok)
    const now = new Date();
    const bangkokTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    
    const year = bangkokTime.getFullYear();
    const month = String(bangkokTime.getMonth() + 1).padStart(2, '0');
    const day = String(bangkokTime.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;

    // --- FETCH LOGIC ---
    // Calculate date range: Today back to 7 days ago
    const pastDate = new Date();
    pastDate.setDate(bangkokTime.getDate() - 7);
    const startDate = pastDate.toISOString().split('T')[0];
    const endDate = bangkokTime.toISOString().split('T')[0];

    const apiUrl = `https://gateway.api.bot.or.th/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${startDate}&end_period=${endDate}`;
    const apiKey = process.env.BOT_API_KEY;

    if (!apiKey) {
      throw new Error("BOT_API_KEY is missing");
    }

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
        return NextResponse.json({ success: true, message: "No data received from BOT" });
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
        data: processedData,
        fetched_at: new Date().toISOString()
    };

    // --- FIREBASE SAVING ---
    // Update Cache (Latest)
    await cacheService.set(CACHE_KEY, finalData, todayDate, 'latest');
    
    // Save to History (Using date as document ID)
    await cacheService.set(CACHE_KEY, finalData, todayDate, todayDate);

    return NextResponse.json({
        success: true,
        date: todayDate,
        currency_count: processedData.length
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
