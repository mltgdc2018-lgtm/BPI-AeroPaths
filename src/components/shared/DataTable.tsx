"use client";

import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/formatters";
import { GlassCard } from "./GlassCard";

/**
 * DataTable Component
 * 
 * ตารางข้อมูลมาตรฐานที่:
 * - ❌ ไม่มี Action column
 * - ❌ ไม่มี Footer
 * - ✅ คลิกแถวเพื่อดูรายละเอียด (onRowClick)
 * - ✅ Date columns ใช้ formatDate (dd-MM-yyyy)
 * - ✅ Glassmorphism styling
 * 
 * @param columns - คอลัมน์ของตาราง
 * @param data - ข้อมูล
 * @param onRowClick - callback เมื่อคลิกแถว
 * @param keyField - ฟิลที่ใช้เป็น unique key
 * @param emptyMessage - ข้อความเมื่อไม่มีข้อมูล
 */

export interface Column<T> {
  key: keyof T | string;
  header: string;
  align?: "left" | "center" | "right";
  type?: "text" | "date" | "badge";
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  keyField: keyof T;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends object>({
  columns,
  data,
  onRowClick,
  keyField,
  emptyMessage = "No data available",
  className,
}: DataTableProps<T>) {
  // Helper: Get cell value
  const getCellValue = (row: T, column: Column<T>): React.ReactNode => {
    const rawValue = row[column.key as keyof T];

    // Custom render function
    if (column.render) {
      return column.render(rawValue, row);
    }

    // Date formatting
    if (column.type === "date" && rawValue) {
      if (
        rawValue instanceof Date ||
        typeof rawValue === "string" ||
        typeof rawValue === "number"
      ) {
        return formatDate(rawValue);
      }
      return String(rawValue);
    }

    // Default: return as-is
    if (rawValue === null || rawValue === undefined) {
      return "-";
    }
    if (typeof rawValue === "string" || typeof rawValue === "number") {
      return rawValue;
    }
    if (typeof rawValue === "boolean") {
      return rawValue ? "Yes" : "No";
    }
    return String(rawValue);
  };

  // Helper: Get alignment class
  const getAlignClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  return (
    <GlassCard className={cn("overflow-hidden p-0 bg-[#EEF2F6]/95 border border-[#D4AA7D]/35 shadow-[8px_8px_20px_rgba(166,180,200,0.30),-8px_-8px_20px_rgba(255,255,255,0.95)] rounded-2xl", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-[#272727]">
          {/* Header */}
          <thead className="bg-[#D4AA7D] border-b border-[#7E5C4A]/25 uppercase text-xs tracking-wider font-black text-[#272727]">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn("px-6 py-4", getAlignClass(col.align), col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-[#D4AA7D]/30 bg-[#EEF2F6]/95">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-[#7E5C4A]/80">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={String(row[keyField])}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "transition-colors",
                    onRowClick && "hover:bg-[#272727]/80 cursor-pointer group"
                  )}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        "px-6 py-4 group-hover:text-[#EFD09E]",
                        getAlignClass(col.align),
                        col.className,
                        // First column: highlight on hover
                        colIndex === 0 && onRowClick && "font-medium text-[#7E5C4A]"
                      )}
                    >
                      {getCellValue(row, col)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
