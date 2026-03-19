// src/lib/utils/formatters.ts
import { format } from "date-fns";

/**
 * ✅ Date Handling
 * Store: Firestore Timestamp or ISO String
 * Display: 'dd-mm-yyyy' (e.g., 30-01-2026)
 */
export const formatDate = (date: Date | string | number | null | undefined): string => {
  if (!date) return "-";
  let d: Date;
  if (typeof date === "string") {
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
    if (isoMatch) {
      d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    } else {
      const legacyMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date.trim());
      if (legacyMatch) {
        d = new Date(Number(legacyMatch[3]), Number(legacyMatch[2]) - 1, Number(legacyMatch[1]));
      } else {
        d = new Date(date);
      }
    }
  } else if (typeof date === "number") {
    d = new Date(date);
  } else {
    d = date;
  }
  if (Number.isNaN(d.getTime())) return "-";
  return format(d, "dd-MM-yyyy");
};

export const formatDateTime = (date: Date | string | number | null | undefined): string => {
  if (!date) return "-";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "-";
  return format(d, "dd-MM-yyyy HH:mm");
};

/**
 * ✅ Currency Handling
 * Example: 1250.50 → "1,250.50 ฿"
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
};
