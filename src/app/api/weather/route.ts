import { NextResponse } from "next/server";
import { cacheService, type CacheEntry } from "@/lib/services/cacheService";
import { TARGET_PROVINCES } from "@/lib/data/provinces";
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
  const API_KEY = "a8abc0155da4f214b313e030e0419c0b";
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
    // Explicitly type the getAll result
    const allCache = await cacheService.getAll<WeatherData>(CACHE_COLLECTION);
    
    let nearestCache: WeatherData | null = null;
    let minDist = Infinity;

    Object.values(allCache || {}).forEach((entry: CacheEntry<WeatherData>) => {
        try {
          // Check freshness (5 minutes = 300,000 ms)
          const now = Date.now();
          
          // Check if updatedAt exists and has toMillis method
          // Note: Firestore Timestamp has toMillis(). 
          // If entry comes from JSON/REST, it might look different, but here it's from Firestore SDK.
          if (!entry?.updatedAt?.toMillis) return;
          
          const cachedTime = entry.updatedAt.toMillis();
          
          if (now - cachedTime < 300000) { // Valid Cache
               // Check distance
               if (entry.data?.coord?.lat && entry.data?.coord?.lon) {
                   const d = calculateDistance(
                     userLat, 
                     userLon, 
                     entry.data.coord.lat, 
                     entry.data.coord.lon
                   );
                   if (d < 20 && d < minDist) { // 20km Threshold
                       minDist = d;
                       nearestCache = entry.data;
                   }
               }
          }
        } catch (err) {
          console.error("Cache entry error:", err);
        }
    });

    if (nearestCache) {
        // Explicit cast or check to satisfy TS if needed, but it should be fine
        const safeCache = nearestCache as WeatherData;
        return NextResponse.json({
            ...formatWeatherData(safeCache),
            source: 'cache_spatial',
            city: safeCache.name
        });
    }

    // 2. Fetch API (No nearby fresh cache)
    const URL = `https://api.openweathermap.org/data/2.5/weather?lat=${userLat}&lon=${userLon}&appid=${API_KEY}&units=metric`;
    const res = await fetch(URL, { next: { revalidate: 0 } });
    
    if (!res.ok) throw new Error("Weather API Failed");

    const data: WeatherData = await res.json();
    const cityName = data.name;

    // Check Mapping First
    const cleanCityName = cityName.replace("City", "").trim();
    const mappedProvince = DISTRICT_MAPPING[cityName] || DISTRICT_MAPPING[cleanCityName];
    
    // Determine Target Status and Cache Key
    let isTarget = false;
    let cacheKey = cityName;

    if (mappedProvince) {
        isTarget = true;
        cacheKey = mappedProvince;
        // Logic Update: We DO NOT overwrite data.name with Province Name.
        // We want to show "Bang Pa-in" (Natural Name) but save it under "Phra Nakhon Si Ayutthaya" (Shared Cache).
    } else {
        // Fallback to original list check
        isTarget = TARGET_PROVINCES.some(p => 
          cityName.toLowerCase().includes(p.toLowerCase())
        );
        if (isTarget) {
             cacheKey = cityName;
        }
    }

    if (isTarget) {
        // SAVE to Cache
        const today = new Date().toISOString().split('T')[0];
        
        await cacheService.set(
          CACHE_COLLECTION, 
          { ...data }, // Save original data (with original name e.g. "Bang Pa-in")
          today,    // dateKey
          cacheKey  // docId (Group by Province e.g. "Phra Nakhon Si Ayutthaya")
        );
        
        return NextResponse.json({
            ...formatWeatherData(data),
            source: 'api',
            is_target: true,
            mapped_province: mappedProvince || null
        });
    } else {
        // Not in target list -> Show Real Data but DO NOT Cache
        return NextResponse.json({
             ...formatWeatherData(data),
             source: 'api_nosafe',
             is_target: false
        });
    }

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
      
      // cache is CacheEntry<WeatherData> | null
      if (cache?.updatedAt?.toMillis && (now - cache.updatedAt.toMillis() < 300000)) {
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
        const res = await fetch(URL, { next: { revalidate: 0 } });
        
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
