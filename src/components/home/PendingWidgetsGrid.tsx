"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Coins,
  Droplet,
  GlobeLock,
  Moon,
  Sun,
  TrendingUp,
} from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

interface WeatherData {
  temp: number;
  condition: string;
  description: string;
  humidity: number;
  high: number;
  low: number;
  city: string;
  icon_code: string;
  is_mock?: boolean;
}

interface OilPrice {
  OilName: string;
  PriceToday: number;
  PriceYesterday: number | null;
  change: number;
  trend: "up" | "down" | "flat";
}

interface ExchangeRate {
  currency_id: string;
  selling: string;
  period: string;
  change: number;
  trend: "up" | "down" | "flat";
}

type FlagCode = "US" | "EU" | "JP" | "GB" | "CN" | "SG" | "TH";

const CURRENCY_FLAG_CODES: Record<string, FlagCode> = {
  USD: "US",
  EUR: "EU",
  JPY: "JP",
  GBP: "GB",
  CNY: "CN",
  SGD: "SG",
};

const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  JPY: "Japanese Yen",
  GBP: "British Pound",
  CNY: "Chinese Yuan",
  SGD: "Singapore Dollar",
};

const TARGET_CURRENCIES = ["USD", "EUR", "JPY", "GBP", "CNY", "SGD"];
const TIME_ZONE_CITIES: Array<{ name: string; tz: string; flagCode: FlagCode }> = [
  { name: "Bangkok", tz: "Asia/Bangkok", flagCode: "TH" },
  { name: "Tokyo", tz: "Asia/Tokyo", flagCode: "JP" },
  { name: "London", tz: "Europe/London", flagCode: "GB" },
  { name: "New York", tz: "America/New_York", flagCode: "US" },
];

function FlagIcon({ code, className = "h-6 w-8" }: { code: FlagCode; className?: string }) {
  const baseClassName = `${className} overflow-hidden rounded-[6px] border border-[#D4AA7D]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]`;

  switch (code) {
    case "US":
      return (
        <svg viewBox="0 0 28 20" className={baseClassName} aria-hidden="true">
          <rect width="28" height="20" fill="#fff" />
          {[0, 2.86, 5.72, 8.58, 11.44, 14.3, 17.16].map((y) => (
            <rect key={y} y={y} width="28" height="1.44" fill="#C43C35" />
          ))}
          <rect width="12" height="10" fill="#22408C" />
        </svg>
      );
    case "EU":
      return (
        <svg viewBox="0 0 28 20" className={baseClassName} aria-hidden="true">
          <rect width="28" height="20" fill="#1B4EA1" />
          <circle cx="14" cy="5" r="1" fill="#F3C93B" />
          <circle cx="18.5" cy="6.5" r="1" fill="#F3C93B" />
          <circle cx="20" cy="10" r="1" fill="#F3C93B" />
          <circle cx="18.5" cy="13.5" r="1" fill="#F3C93B" />
          <circle cx="14" cy="15" r="1" fill="#F3C93B" />
          <circle cx="9.5" cy="13.5" r="1" fill="#F3C93B" />
          <circle cx="8" cy="10" r="1" fill="#F3C93B" />
          <circle cx="9.5" cy="6.5" r="1" fill="#F3C93B" />
        </svg>
      );
    case "JP":
      return (
        <svg viewBox="0 0 28 20" className={baseClassName} aria-hidden="true">
          <rect width="28" height="20" fill="#fff" />
          <circle cx="14" cy="10" r="5" fill="#C93C45" />
        </svg>
      );
    case "GB":
      return (
        <svg viewBox="0 0 28 20" className={baseClassName} aria-hidden="true">
          <rect width="28" height="20" fill="#22408C" />
          <path d="M0 0 L3 0 L28 17.5 L28 20 L25 20 L0 2.5 Z" fill="#fff" />
          <path d="M28 0 L25 0 L0 17.5 L0 20 L3 20 L28 2.5 Z" fill="#fff" />
          <path d="M0 0 L1.6 0 L28 18.7 L28 20 L26.4 20 L0 1.3 Z" fill="#C43C35" />
          <path d="M28 0 L26.4 0 L0 18.7 L0 20 L1.6 20 L28 1.3 Z" fill="#C43C35" />
          <rect x="10" width="8" height="20" fill="#fff" />
          <rect y="6" width="28" height="8" fill="#fff" />
          <rect x="11.5" width="5" height="20" fill="#C43C35" />
          <rect y="7.5" width="28" height="5" fill="#C43C35" />
        </svg>
      );
    case "CN":
      return (
        <svg viewBox="0 0 28 20" className={baseClassName} aria-hidden="true">
          <rect width="28" height="20" fill="#D64033" />
          <polygon points="6,3 7,5.6 9.8,5.6 7.5,7.2 8.4,9.8 6,8.2 3.6,9.8 4.5,7.2 2.2,5.6 5,5.6" fill="#F3C93B" />
        </svg>
      );
    case "SG":
      return (
        <svg viewBox="0 0 28 20" className={baseClassName} aria-hidden="true">
          <rect width="28" height="10" fill="#D64033" />
          <rect y="10" width="28" height="10" fill="#fff" />
          <circle cx="7" cy="5" r="3.2" fill="#fff" />
          <circle cx="8.2" cy="5" r="2.4" fill="#D64033" />
        </svg>
      );
    case "TH":
      return (
        <svg viewBox="0 0 28 20" className={baseClassName} aria-hidden="true">
          <rect width="28" height="20" fill="#C43C35" />
          <rect y="3" width="28" height="3" fill="#fff" />
          <rect y="6" width="28" height="8" fill="#22408C" />
          <rect y="14" width="28" height="3" fill="#fff" />
        </svg>
      );
  }
}

function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeather(lat?: number, lon?: number) {
      try {
        const query = lat && lon ? `?lat=${lat}&lon=${lon}` : "";
        const res = await fetch(`/api/weather${query}`);
        const data = await res.json();
        setWeather(data);
        if (data.fetched_at || data.cached_date) {
            setLastUpdated(data.fetched_at || data.cached_date);
        }
        setSource(data.source || "");
      } catch (err) {
        console.error("Failed to load weather", err);
      } finally {
        setLoading(false);
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
        () => fetchWeather()
      );
    } else {
      fetchWeather();
    }
  }, []);

  const getWeatherIcon = (code: string) => {
    const isNight = code.endsWith("n");
    if (code.startsWith("01")) return isNight ? <Moon className="w-14 h-14 text-indigo-200" /> : <Sun className="w-14 h-14 text-yellow-500" />;
    if (code.startsWith("02")) return <CloudSun className="w-14 h-14 text-yellow-500" />;
    if (code.startsWith("03") || code.startsWith("04")) return <Cloud className="w-14 h-14 text-slate-400" />;
    if (code.startsWith("09") || code.startsWith("10")) return <CloudRain className="w-14 h-14 text-blue-400" />;
    if (code.startsWith("11")) return <CloudLightning className="w-14 h-14 text-purple-500" />;
    if (code.startsWith("50")) return <CloudFog className="w-14 h-14 text-slate-300" />;
    return <CloudSun className="w-14 h-14 text-yellow-500" />;
  };

  const getWeatherImage = (code: string) => {
    switch (code) {
      case "01d":
        return "01d Clear sky.png";
      case "01n":
        return "01n Clear sky (Night).png";
      case "02d":
        return "02d Few clouds.png";
      case "02n":
      case "03n":
        return "02n _ 03n Few _ Scattered clouds (Night).png";
      case "03d":
        return "03d Scattered clouds.png";
      case "04d":
        return "04d Broken _ Overcast clouds.png";
      case "04n":
        return "04n_Overcast clouds (Night).png";
      case "09d":
      case "09n":
        return "09d Shower rain _ Drizzle.png";
      case "10d":
      case "10n":
        return "10d Rain.png";
      case "11d":
      case "11n":
        return "11d Thunderstorm.png";
      case "50d":
      case "50n":
        return "50d Mist _ Haze _ Fog.png";
      default:
        return "01d Clear sky.png";
    }
  };

  if (loading) {
    return (
      <GlassCard className="h-full p-6 flex items-center justify-center bg-[#F6EDDE]/40 border-[#D4AA7D]/15">
        <div className="w-8 h-8 border-4 border-[#7E5C4A] border-t-transparent rounded-full animate-spin" />
      </GlassCard>
    );
  }

  const data = weather || {
    temp: 32,
    condition: "Partly Cloudy",
    description: "partly cloudy",
    humidity: 65,
    high: 34,
    low: 28,
    city: "Bangkok",
    icon_code: "02d",
  };

  return (
    <GlassCard className="h-full p-6 flex flex-col justify-between relative overflow-hidden bg-[#F6EDDE]/40 border-[#D4AA7D]/15">
      <div className="absolute top-0 right-0 w-28 h-28 bg-[#D4AA7D]/18 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none z-0" />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="relative w-[220px] h-[220px] opacity-90 drop-shadow-2xl">
          <Image
            src={`/icons/icon-weather/${getWeatherImage(data.icon_code)}`}
            alt={data.description}
            fill
            className="object-contain"
          />
        </div>
      </div>

      <div className="flex justify-between items-start relative z-10">
        <div>
          <h3 className="text-[#7E5C4A] text-sm font-medium uppercase tracking-wider">{data.city}</h3>
          <p className="text-xs text-[#D4AA7D] mt-1 capitalize">
            {data.description}
            {source && (
                 <span className="ml-2 opacity-50 text-[10px]">
                    ({source.includes('cache') ? 'Cached' : 'Live'})
                 </span>
            )}
          </p>
        </div>
        <div className="-mt-1 -mr-1 opacity-80 scale-90">{getWeatherIcon(data.icon_code)}</div>
      </div>

      <div className="mt-6 relative z-10 flex items-end justify-between gap-4">
        <div className="flex flex-col items-end">
          <div className="flex gap-3 text-[10px] text-[#7E5C4A] font-medium mb-1 opacity-70">
            <span>H: {data.high}°</span>
            <span>L: {data.low}°</span>
          </div>
          <h2 className="text-4xl font-bold text-[#272727] text-right leading-none">{data.temp}°C</h2>
          {lastUpdated && (
            <span className="text-[9px] text-[#7E5C4A] opacity-40 mt-1">
              Updated: {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function OilPriceWidget() {
  const [prices, setPrices] = useState<OilPrice[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOilPrices() {
      try {
        const res = await fetch("/api/oil-price");
        const json = await res.json();
        const data = json.data || json;
        
        if (json.fetched_at || json.cached_date) {
            setLastUpdated(json.fetched_at || json.cached_date);
        }

        if (json.success !== false) {
          const fuelData = Array.isArray(data) ? data : [];
          let rawList: any[] = [];

          if (fuelData.length > 0 && fuelData[0].OilList) {
            const oilListStr = fuelData[0].OilList;
            rawList = typeof oilListStr === 'string' ? JSON.parse(oilListStr) : oilListStr;
          } else if (fuelData.length > 0 && fuelData[0].OilName) {
            rawList = fuelData;
          }
          
          const allFuels: OilPrice[] = rawList
            .filter((item: Record<string, unknown>) => item?.OilName)
            .map((item: Record<string, unknown>) => {
              const priceToday = parseFloat(String(item.PriceToday)) || 0;
              const priceYesterday = item.PriceYesterday ? parseFloat(String(item.PriceYesterday)) : priceToday;
              const change = priceToday - priceYesterday;
              const trend: OilPrice["trend"] = change > 0 ? "up" : change < 0 ? "down" : "flat";

              return {
                OilName: String(item.OilName),
                PriceToday: priceToday,
                PriceYesterday: priceYesterday,
                change,
                trend,
              };
            });
          setPrices(allFuels);
        }
      } catch (err) {
        console.error("Failed to load oil prices", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOilPrices();
  }, []);

  return (
    <GlassCard className="h-full flex flex-col px-6 pb-6 pt-3 bg-[#F6EDDE]/40 border-[#D4AA7D]/15">
      <div className="flex flex-col items-center gap-1 mb-4 pb-3 border-b border-[#D4AA7D]/30 shrink-0">
        <div className="relative w-full h-12">
          <Image src="/images/Logo bangchak horizontal.svg" alt="Bangchak" fill className="object-contain object-center" />
        </div>
        <div className="flex items-center gap-1.5 text-[#7E5C4A]">
          <Droplet className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold tracking-wider uppercase">Oil Prices</span>
          {lastUpdated && (
            <span className="text-[9px] opacity-60 ml-auto">
              {new Date(lastUpdated).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {loading
          ? [1, 2, 3, 4, 5].map((i) => <div key={i} className="h-9 bg-slate-100/50 rounded-lg animate-pulse" />)
          : prices.map((fuel, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm p-2.5 bg-[#EFD09E]/25 rounded-xl border border-[#D4AA7D]/15">
                <span className="text-[#272727] font-medium text-xs">{fuel.OilName}</span>
                <div className="flex items-center justify-end gap-2">
                  <div
                    className={`flex items-center justify-end gap-0.5 text-[10px] font-medium ${
                      fuel.trend === "up" ? "text-emerald-500" : fuel.trend === "down" ? "text-rose-500" : "text-slate-400"
                    }`}
                  >
                    {fuel.trend === "up" && <TrendingUp className="w-3 h-3" />}
                    {fuel.trend === "down" && <TrendingUp className="w-3 h-3 rotate-180" />}
                    <span>{Math.abs(fuel.change).toFixed(2)}</span>
                  </div>
                  <span className="block font-bold text-[#272727] bg-[#EFD09E] px-2 py-0.5 rounded-lg text-[11px] border border-[#D4AA7D]/20">
                    {fuel.PriceToday.toFixed(2)} ฿
                  </span>
                </div>
              </div>
            ))}
      </div>
    </GlassCard>
  );
}

function CurrencyWidget() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch("/api/exchange-rates");
        const json = await res.json();
        const data = json.data || [];
        
        if (json.last_updated) {
            setLastUpdated(json.last_updated);
        }

        const filtered = data.filter((item: ExchangeRate) => TARGET_CURRENCIES.includes(item.currency_id));
        setRates(filtered);
      } catch (err) {
        console.error("Failed to fetch rates:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRates();
  }, []);

  return (
    <GlassCard className="h-full px-6 pb-6 pt-3 flex flex-col bg-[#F6EDDE]/40 border-[#D4AA7D]/15">
      <div className="flex flex-col items-center gap-1 mb-4 pb-3 border-b border-[#D4AA7D]/30 shrink-0">
        <div className="relative w-full h-12 mb-1">
          <Image src="/images/BOT_logo_1.png" alt="Bank of Thailand" fill className="object-contain object-center" />
        </div>
        <div className="flex items-center gap-1.5 text-[#7E5C4A]">
          <Coins className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold tracking-wider uppercase">Exchange Rates</span>
          {lastUpdated && (
            <span className="text-[9px] opacity-60 ml-auto">
              Updated: {lastUpdated}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-3">
        {loading
          ? [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-12 bg-slate-100/50 rounded-xl animate-pulse" />)
          : rates.map((rate) => (
              <div key={rate.currency_id} className="flex items-center justify-between bg-[#EFD09E]/25 px-3 py-3 rounded-xl border border-[#D4AA7D]/15">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FlagIcon code={CURRENCY_FLAG_CODES[rate.currency_id] || "US"} className="h-6 w-8 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-[#272727] text-sm block leading-tight">{rate.currency_id}</span>
                    <span className="text-[10px] text-[#7E5C4A] block truncate">
                      {CURRENCY_NAMES[rate.currency_id] || "Currency"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-bold text-[#272727] leading-none mb-1">{parseFloat(rate.selling).toFixed(2)}</span>
                  <div className={`flex items-center justify-end gap-0.5 text-[10px] font-medium ${rate.trend === "up" ? "text-emerald-500" : rate.trend === "down" ? "text-rose-500" : "text-slate-400"}`}>
                    {rate.trend === "up" && <TrendingUp className="w-3 h-3" />}
                    {rate.trend === "down" && <TrendingUp className="w-3 h-3 rotate-180" />}
                    <span>{Math.abs(rate.change).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </GlassCard>
  );
}

function TimeZoneWidget() {
  const [times, setTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      const newTimes: Record<string, string> = {};
      TIME_ZONE_CITIES.forEach((city) => {
        newTimes[city.name] = now.toLocaleTimeString("en-US", {
          timeZone: city.tz,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      });
      setTimes(newTimes);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <GlassCard className="h-full p-6 flex flex-col bg-[#F6EDDE]/40 border-[#D4AA7D]/15">
      <div className="flex items-center gap-2 mb-6 pb-3 border-b border-[#D4AA7D]/30 shrink-0">
        <GlobeLock className="w-5 h-5 text-[#7E5C4A]" />
        <span className="text-sm font-bold tracking-wider uppercase text-[#7E5C4A]">Global Time Zones</span>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4">
        {TIME_ZONE_CITIES.map((city) => (
          <div key={city.name} className="flex flex-col p-3 bg-[#EFD09E]/25 rounded-2xl border border-[#D4AA7D]/10">
            <div className="flex items-center gap-2 mb-1">
              <FlagIcon code={city.flagCode} className="h-5 w-7 shrink-0" />
              <span className="text-[11px] font-bold text-[#7E5C4A] uppercase tracking-tight">{city.name}</span>
            </div>
            <div className="text-2xl font-black text-[#272727] font-mono tracking-tighter">{times[city.name] || "--:--"}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export function PendingWidgetsGrid() {
  return (
    <div className="mt-6 md:mt-8 lg:mt-10 w-full max-w-7xl animate-slide-up delay-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 lg:gap-6">
        <div className="order-2 lg:order-1 lg:col-span-7 lg:min-h-[340px]">
          <CurrencyWidget />
        </div>
        <div className="order-3 lg:order-2 lg:col-span-5 lg:min-h-[340px]">
          <OilPriceWidget />
        </div>
        <div className="order-4 lg:order-3 lg:col-span-5 lg:min-h-[300px]">
          <TimeZoneWidget />
        </div>
        <div className="order-1 lg:order-4 lg:col-span-7 lg:min-h-[300px]">
          <WeatherWidget />
        </div>
      </div>
    </div>
  );
}
