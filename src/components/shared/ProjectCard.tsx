import Link from "next/link";
import { LucideIcon, ArrowUpRight } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

/**
 * ProjectCard Component
 * 
 * Card สำหรับแสดงแต่ละโปรเจค/โมดูล
 * - Icon และชื่อโปรเจค
 * - คำอธิบาย
 * - Status badge (optional)
 * - Hover effect พร้อมการเปลี่ยนสี
 */

interface ProjectCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  status?: "active" | "coming-soon" | "beta";
  iconColor?: string;
  tone?: "raisin" | "buff" | "sunset" | "creamy";
}

export function ProjectCard({
  title,
  description,
  icon: Icon,
  href,
  status,
  tone = "creamy",
}: ProjectCardProps) {
  const statusMap = {
    active: { label: "Active", type: "success" as const },
    "coming-soon": { label: "Coming Soon", type: "info" as const },
    beta: { label: "Beta", type: "warning" as const },
  };

  const toneMap = {
    raisin: {
      card: "bg-[#EEF2F6]/95 border border-white/80 shadow-[6px_6px_14px_rgba(166,180,200,0.28),-6px_-6px_14px_rgba(255,255,255,0.92)] hover:bg-[#272727] hover:border-[#EFD09E]/20 hover:shadow-[0_16px_40px_rgba(39,39,39,0.3)] hover:-translate-y-2 transition-all duration-300",
      icon: "bg-[#272727] border-2 border-[#EFD09E]/40 group-hover:bg-[#EFD09E]/20",
      iconColor: "text-[#EFD09E] group-hover:text-[#EFD09E]",
      title: "!text-[#272727] group-hover:!text-[#EFD09E]",
      description: "!text-[#7E5C4A] group-hover:!text-[#EFD09E]/70",
      badge: "!bg-[#9ACD32] !text-[#272727] !border-transparent",
      arrow: "text-[#272727] bg-[#EFD09E]/30 group-hover:bg-[#9ACD32] group-hover:text-[#272727]",
      divider: "border-[#EFD09E]/20",
    },
    buff: {
      card: "bg-[#EEF2F6]/95 border border-white/80 shadow-[6px_6px_14px_rgba(166,180,200,0.28),-6px_-6px_14px_rgba(255,255,255,0.92)] hover:bg-[#272727] hover:border-[#D4AA7D]/30 hover:shadow-[0_16px_40px_rgba(39,39,39,0.3)] hover:-translate-y-2 transition-all duration-300",
      icon: "bg-[#D4AA7D] border-2 border-white/50 group-hover:bg-[#D4AA7D]/80",
      iconColor: "text-[#272727] group-hover:text-[#272727]",
      title: "!text-[#272727] group-hover:!text-[#EFD09E]",
      description: "!text-[#7E5C4A] group-hover:!text-[#EFD09E]/70",
      badge: "!bg-[#D4AA7D] !text-[#272727] !border-transparent",
      arrow: "text-[#7E5C4A] bg-[#D4AA7D]/20 group-hover:bg-[#D4AA7D] group-hover:text-[#272727]",
      divider: "border-[#D4AA7D]/30",
    },
    sunset: {
      card: "bg-[#EEF2F6]/95 border border-white/80 shadow-[6px_6px_14px_rgba(166,180,200,0.28),-6px_-6px_14px_rgba(255,255,255,0.92)] hover:bg-[#272727] hover:border-[#9ACD32]/30 hover:shadow-[0_16px_40px_rgba(39,39,39,0.3)] hover:-translate-y-2 transition-all duration-300",
      icon: "bg-[#9ACD32] border-2 border-white/50 group-hover:bg-[#9ACD32]",
      iconColor: "text-[#272727] group-hover:text-[#272727]",
      title: "!text-[#272727] group-hover:!text-[#EFD09E]",
      description: "!text-[#7E5C4A] group-hover:!text-[#EFD09E]/70",
      badge: "!bg-[#9ACD32] !text-[#272727] !border-transparent",
      arrow: "text-[#5a7a1a] bg-[#9ACD32]/20 group-hover:bg-[#9ACD32] group-hover:text-[#272727]",
      divider: "border-[#9ACD32]/30",
    },
    creamy: {
      card: "bg-[#EEF2F6]/95 border border-white/80 shadow-[6px_6px_14px_rgba(166,180,200,0.28),-6px_-6px_14px_rgba(255,255,255,0.92)] hover:bg-[#272727] hover:border-[#9ACD32]/30 hover:shadow-[0_16px_40px_rgba(39,39,39,0.3)] hover:-translate-y-2 transition-all duration-300",
      icon: "bg-[#9ACD32] border-2 border-white/50 group-hover:bg-[#9ACD32]",
      iconColor: "text-[#272727] group-hover:text-[#272727]",
      title: "!text-[#272727] group-hover:!text-[#EFD09E]",
      description: "!text-[#7E5C4A] group-hover:!text-[#EFD09E]/70",
      badge: "!bg-[#9ACD32] !text-[#272727] !border-transparent",
      arrow: "text-[#5a7a1a] bg-[#9ACD32]/20 group-hover:bg-[#9ACD32] group-hover:text-[#272727]",
      divider: "border-[#9ACD32]/30",
    },
  };

  const cardTone = toneMap[tone];

  return (
    <Link href={href} className="block h-full">
      <div className={`group relative h-full flex flex-col rounded-2xl p-5 cursor-pointer hover:scale-[1.08] ${cardTone.card}`}>

        {/* Top row: Icon + arrow */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-[4px_4px_10px_rgba(166,180,200,0.22),-2px_-2px_6px_rgba(255,255,255,0.9)] flex-shrink-0 transition-all duration-300 ${cardTone.icon}`}>
            <Icon className={`w-8 h-8 ${cardTone.iconColor}`} />
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${cardTone.arrow}`}>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* Title */}
        <h3 className={`text-base font-bold leading-tight mb-1 ${cardTone.title}`}>
          {title}
        </h3>

        {/* Description */}
        <p className={`text-xs leading-relaxed flex-1 ${cardTone.description}`}>
          {description}
        </p>

        {/* Bottom: Status badge */}
        {status && (
          <div className={`mt-3 pt-3 border-t ${cardTone.divider}`}>
            <StatusBadge
              status={statusMap[status].type}
              label={statusMap[status].label}
              showDot={status === "active"}
              className={cardTone.badge}
            />
          </div>
        )}
      </div>
    </Link>
  );
}
