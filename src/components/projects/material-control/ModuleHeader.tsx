import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { GlassCard } from "@/components/shared/GlassCard";

interface ModuleHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  backLinkVariant?: "default" | "packaging";
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function ModuleHeader({
  title,
  description,
  backHref = "/projects/material-control",
  backLabel = "Material Control",
  backLinkVariant = "default",
  action,
  children,
}: ModuleHeaderProps) {
  const isPackagingBackLink =
    backLinkVariant === "packaging" ||
    (backHref === "/projects/packaging" && backLabel === "Packaging Console");

  return (
    <div className="space-y-6">
      <div className="relative flex items-center justify-center pt-2">
        {/* Back Link - Positioned Absolute Left */}
        <Link
          href={backHref}
          className={
            isPackagingBackLink
              ? "absolute left-0 inline-flex items-center gap-2 text-[#7E5C4A] hover:text-[#272727] transition-colors text-sm md:text-base group"
              : "absolute left-0 inline-flex items-center gap-2 text-[#7E5C4A]/80 hover:text-[#272727] transition-colors text-sm md:text-base font-semibold"
          }
        >
          <ArrowLeft
            className={
              isPackagingBackLink
                ? "w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform"
                : "w-4 h-4 md:w-5 md:h-5"
            }
          />
          <span className={isPackagingBackLink ? "hidden sm:inline font-medium" : "hidden sm:inline"}>
            {backLabel}
          </span>
        </Link>
        
        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-center">
          <span className="text-[#272727]">{title}</span>
        </h1>

        {/* Action Button - Positioned Absolute Right */}
        {action && (
          <div className="absolute right-0">
            {action}
          </div>
        )}
      </div>

      {description ? (
        <p className="text-[#7E5C4A] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed text-center -mt-2">
          {description}
        </p>
      ) : null}

      {children ? children : (
        <GlassCard className="text-center py-10 bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.3),-8px_-8px_18px_rgba(255,255,255,0.92)]">
          <p className="text-[#7E5C4A] text-base">Module is under construction</p>
        </GlassCard>
      )}
    </div>
  );
}
