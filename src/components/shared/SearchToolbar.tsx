"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * SearchToolbar Component
 * 
 * แถบเครื่องมือแบบ Combo: Search | Filter (Year) | Primary Button
 * Filter ตั้งค่าปีนี้เป็นค่าเริ่มต้น
 * 
 * @param searchValue - ค่า search
 * @param onSearchChange - callback เมื่อ search เปลี่ยน
 * @param searchPlaceholder - placeholder สำหรับช่อง search
 * @param filterValue - ปีที่เลือก (filter)
 * @param onFilterChange - callback เมื่อ filter เปลี่ยน
 * @param filterOptions - รายการปี (ถ้าไม่กำหนดจะสร้างอัตโนมัติ 5 ปีล่าสุด)
 * @param primaryButton - config สำหรับปุ่มหลัก
 * @param className - additional classes
 */

interface PrimaryButtonConfig {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick: () => void;
}

interface SearchToolbarProps {
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showFilter?: boolean;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: string[];
  primaryButton?: PrimaryButtonConfig;
  className?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode; // New prop for right-aligned actions
}

export function SearchToolbar({
  showSearch = true,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  showFilter = true,
  filterValue,
  onFilterChange,
  filterOptions,
  primaryButton,
  className,
  children,
  actions
}: SearchToolbarProps) {
  const currentYear = new Date().getFullYear().toString();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterOpen]);

  // สร้าง filter options อัตโนมัติ (5 ปีล่าสุด + "All")
  const yearOptions = useMemo(() => {
    if (filterOptions) return filterOptions;
    const years: string[] = ["All"];
    for (let i = 0; i < 5; i++) {
      years.push((new Date().getFullYear() - i).toString());
    }
    return years;
  }, [filterOptions]);

  // Default filter = ปีนี้
  const selectedFilter = filterValue ?? currentYear;

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row gap-4 justify-between items-center bg-[#EEF2F6]/95 p-4 rounded-2xl border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] relative z-20",
        className
      )}
    >
      {/* Left: Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        {/* Search Field */}
        {showSearch && (
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7E5C4A]/70" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#FDF6EC] border border-[#E8DCC9] focus:outline-none focus:ring-2 focus:ring-[#D4AA7D]/35 focus:border-[#D4AA7D]/50 text-[#272727] placeholder-[#7E5C4A]/60 text-sm"
            />
          </div>
        )}

        {/* Filter Dropdown */}
        {showFilter && (
          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-[#FDF6EC] border border-[#E8DCC9] rounded-lg text-sm text-[#7E5C4A] hover:bg-[#F6EDDE] transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>{selectedFilter === "All" ? "All Years" : selectedFilter}</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", isFilterOpen && "rotate-180")} />
            </button>

            {isFilterOpen && (
              <div className="absolute z-[100] mt-1 w-36 bg-[#FDF6EC] border border-[#E8DCC9] rounded-lg shadow-2xl overflow-hidden">
                {yearOptions.map((year) => (
                  <button
                    key={year}
                    onClick={() => {
                      onFilterChange?.(year);
                      setIsFilterOpen(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm text-[#272727] hover:bg-[#F6EDDE]",
                      selectedFilter === year && "bg-[#F2E5D2] text-[#272727] font-semibold"
                    )}
                  >
                    {year === "All" ? "All Years" : year}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Custom Children (Extra Filters) */}
        {children}
      </div>

      {/* Right: Actions + Primary Button */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
        {actions}
        
        {primaryButton && (
          <button
            onClick={primaryButton.onClick}
            className="w-full sm:w-auto px-4 py-2 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg text-sm font-semibold transition-colors shadow-md shadow-[#272727]/20 border border-[#EFD09E]/20 flex items-center justify-center gap-2"
          >
            {primaryButton.icon}
            {primaryButton.label}
          </button>
        )}
      </div>
    </div>
  );
}
