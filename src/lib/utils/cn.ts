import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function สำหรับรวม classnames
 * ใช้ clsx เพื่อจัดการ conditional classes และ twMerge เพื่อ merge Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
