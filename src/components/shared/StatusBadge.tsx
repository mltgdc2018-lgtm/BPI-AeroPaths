import { cn } from "@/lib/utils/cn";

/**
 * StatusBadge Component
 * 
 * Badge สำหรับแสดงสถานะต่างๆ พร้อมสีและ animation ที่เหมาะสม
 * - normal: สีฟ้า (ปกติ)
 * - success: สีเขียว (สำเร็จ)
 * - warning: สีเหลือง/ส้ม (คำเตือน)
 * - critical: สีแดง + pulse animation (เร่งด่วน)
 * - info: สีฟ้าอ่อน (ข้อมูล)
 */

type BadgeStatus = "normal" | "warning" | "critical" | "success" | "info";

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  showDot = true,
  className,
}: StatusBadgeProps) {
  // กำหนดสีและ style สำหรับแต่ละ status (Light Theme)
  const styles: Record<BadgeStatus, string> = {
    normal: "bg-[#EFD09E]/65 text-[#272727] border-[#7E5C4A]/30",
    success: "bg-[#9ACD32]/20 text-[#272727] border-[#9ACD32]/70",
    warning: "bg-[#D4AA7D]/35 text-[#272727] border-[#7E5C4A]/40",
    critical: "bg-[#272727]/90 text-[#EFD09E] border-[#272727] animate-pulse",
    info: "bg-[#7E5C4A]/18 text-[#272727] border-[#7E5C4A]/35",
  };

  return (
    <span
      className={cn(
        "px-3 py-1 rounded-full border text-xs font-semibold backdrop-blur-sm flex items-center gap-2 w-fit whitespace-nowrap",
        styles[status],
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "w-2 h-2 rounded-full bg-current",
            status === "critical" && "animate-ping"
          )}
        />
      )}
      {label || status.toUpperCase()}
    </span>
  );
}
