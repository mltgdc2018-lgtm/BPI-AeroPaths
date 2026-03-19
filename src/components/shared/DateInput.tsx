"use client";

import { useRef } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * DateInput Component
 * 
 * Date picker field ที่คลิกที่ไหนก็ได้ในฟิลเพื่อเปิด picker
 * รองรับ HTML5 date input พร้อม Calendar icon
 * 
 * @param value - วันที่ในรูปแบบ YYYY-MM-DD (สำหรับ input type="date")
 * @param onChange - callback เมื่อวันที่เปลี่ยน
 * @param label - ชื่อ label (optional)
 * @param placeholder - placeholder text
 * @param disabled - disable state
 * @param className - additional classes
 */

interface DateInputProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateInput({
  value = "",
  onChange,
  label,
  placeholder = "Select date...",
  disabled = false,
  className,
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // คลิกที่ไหนก็ได้ใน container → เปิด date picker
  const handleContainerClick = () => {
    if (inputRef.current && !disabled) {
      inputRef.current.showPicker?.();
      inputRef.current.focus();
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-xs font-semibold text-slate-500 uppercase">
          {label}
        </label>
      )}
      <div
        onClick={handleContainerClick}
        className={cn(
          "relative flex items-center px-3 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all",
          "hover:border-indigo-300 hover:bg-indigo-50/30",
          "focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400",
          disabled && "opacity-50 cursor-not-allowed bg-slate-50"
        )}
      >
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={cn(
            "flex-1 bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer",
            "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
            !value && "text-slate-400"
          )}
        />
        <Calendar className="w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
