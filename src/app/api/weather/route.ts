import { NextResponse } from "next/server";
import { cacheService, type CacheEntry } from "@/lib/services/cacheService";
import { DISTRICT_MAPPING } from "@/lib/data/provinceMapping";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

// Type definitions
interface WeatherData {
  main: { 
    temp: number; 
    humidity: number; 
    temp_max: number; 
    temp_min: number 
  };
  weather: Array<{ 
    main: string; 
    description: string; 
    icon: string 
  }>;
  name: string;
  coord?: {
    lat: number;
    lon: number;
  };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export async function GET(request: Request) {
  const API_KEY = process.env.WEATHER_API_KEY || "a8abc0155da4f214b313e030e0419c0b";
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');

  // Default to Bangkok if no coordinates provided
  if (!latParam || !lonParam) {
     return getBangkokWeather(API_KEY);
  }

  const userLat = parseFloat(latParam);
  const userLon = parseFloat(lonParam);

  try {
    // 1. Spatial Cache Check
    const CACHE_COLLECTION = "weather_cache";
    const allCache = await cacheService.getAll<WeatherData>(CACHE_COLLECTION);
    
    let nearestCache: WeatherData | null = null;
    let minDist = Infinity;
    const now = Date.now();

    Object.values(allCache || {}).forEach((entry: CacheEntry<WeatherData>) => {
        try {
          // Check freshness (10 minutes = 600,000 ms)
          if (!entry?.updatedAt?.toMillis) return;
          const cachedTime = entry.updatedAt.toMillis();
          
          if (now - cachedTime < 600000) { // Valid Cache (10 min)
               if (entry.data?.coord?.lat && entry.data?.coord?.lon) {
                   const d = calculateDistance(
                     userLat, 
                     userLon, 
                     entry.data.coord.lat, 
                     entry.data.coord.lon
                   );
                   if (d < 15 && d < minDist) { // 15km Threshold
                       minDist = d;
                       nearestCache = entry.data;
                   }
               }
          }
        } catch (err) {
          console.error("Cache entry processing error:", err);
        }
    });

    if (nearestCache) {
        // Ensure nearestCache is treated as WeatherData
        const weather = nearestCache as WeatherData;
        return NextResponse.json({
            ...formatWeatherData(weather),
            source: 'cache_spatial',
            city: weather.name
        });
    }

    // 2. Fetch API
    const URL = `https://api.openweathermap.org/data/2.5/weather?lat=${userLat}&lon=${userLon}&appid=${API_KEY}&units=metric`;
    const res = await fetch(URL, { cache: "no-store" });
    
    if (!res.ok) throw new Error("Weather API Failed");

    const data: WeatherData = await res.json();
    
    // 3. Save to Firebase (Cache all successful fetches)
    const today = new Date().toISOString().split('T')[0];
    
    // Determine Cache Key: Use mapped province or city name
    const cleanCityName = (data.name || "").replace("City", "").trim();
    const mappedProvince = DISTRICT_MAPPING[data.name] || DISTRICT_MAPPING[cleanCityName];
    const cacheDocId = mappedProvince || data.name || `latlon_${userLat.toFixed(1)}_${userLon.toFixed(1)}`;

    await cacheService.set(
      CACHE_COLLECTION, 
      { ...data }, 
      today,
      cacheDocId
    );
    
    return NextResponse.json({
        ...formatWeatherData(data),
        source: 'api',
        is_cached: true
    });

  } catch (error) {
    console.error("Weather Proxy Error:", error);
    return getBangkokWeather(API_KEY, "Fallback due to error");
  }
}

async function getBangkokWeather(apiKey: string, warning?: string) {
    try {
      // Try Cache First for Bangkok
      const cache = await cacheService.get<WeatherData>("weather_cache", "Bangkok");
      const now = Date.now();
      
      if (cache?.updatedAt?.toMillis && (now - cache.updatedAt.toMillis() < 600000)) {
           return NextResponse.json({
              ...formatWeatherData(cache.data),
              source: 'cache_bangkok',
              warning
          });
      }
    } catch (err) {
      console.error("Bangkok cache error:", err);
    }

    // Fetch Fresh Bangkok
    try {
        const URL = `https://api.openweathermap.org/data/2.5/weather?q=Bangkok&appid=${apiKey}&units=metric`;
        const res = await fetch(URL, { cache: "no-store" });
        
        if (!res.ok) throw new Error("Bangkok API failed");
        
        const data: WeatherData = await res.json();
        const today = new Date().toISOString().split('T')[0];
        
        await cacheService.set("weather_cache", data, today, "Bangkok");
        
        return NextResponse.json({
             ...formatWeatherData(data),
             source: 'api_bangkok',
             warning
        });
    } catch (err) {
        console.error("Bangkok fetch error:", err);
        // Final Mock Fallback
        return NextResponse.json({
            temp: 33, 
            condition: "Partly Cloudy", 
            description: "partly cloudy", 
            humidity: 60, 
            high: 35, 
            low: 29, 
            city: "Bangkok", 
            icon_code: "02d", 
            is_mock: true, 
            warning: "System Failure"
        });
    }
}

function formatWeatherData(data: WeatherData) {
    return {
      temp: Math.round(data.main?.temp || 0),
      condition: data.weather?.[0]?.main || "Unknown",
      description: data.weather?.[0]?.description || "Unknown",
      humidity: data.main?.humidity || 0,
      high: Math.round(data.main?.temp_max || 0),
      low: Math.round(data.main?.temp_min || 0),
      city: data.name || "Unknown",
      icon_code: data.weather?.[0]?.icon || "01d",
      is_mock: false
    };
}
