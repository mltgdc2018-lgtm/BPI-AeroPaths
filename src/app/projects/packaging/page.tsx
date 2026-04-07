"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Archive,
  History,
  TrendingUp,
  Database,
  LayoutGrid,
  FlaskConical,
  PieChart,
  Boxes,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

const sections = [
  {
    title: "Packing Planning",
    description: "Select customer and product details to create intelligent packing plans and draft lists.",
    href: "/projects/packaging/planning",
    icon: LayoutGrid,
  },
  {
    title: "Packing Reports",
    description: "Generate reports for list output, cycle history, and performance insights.",
    href: "/projects/packaging/reports",
    icon: TrendingUp,
  },
  {
    title: "Package Configuration",
    description: "Manage package dimensions and their allowed customer mappings.",
    href: "/projects/packaging/package-configuration",
    icon: Users,
  },
  {
    title: "Product Specs",
    description: "Maintain product dimensions and requirements used by every packing scenario.",
    href: "/projects/packaging/specs",
    icon: Archive,
  },
  {
    title: "Activity Log",
    description: "Track historical operations, audits, and module-level activity across teams.",
    href: "/projects/packaging/activity",
    icon: History,
  },
  {
    title: "Global Database",
    description: "Configure master data for pallets, box definitions, and BOM planning references.",
    href: "/projects/packaging/database",
    icon: Database,
  },
  {
    title: "Material Usage Analysis",
    description: "View total raw material consumption per job, month, or year based on actual packaging records and BOM.",
    href: "/projects/packaging/analysis",
    icon: PieChart,
  },
  {
    title: "Raw Material Balance",
    description: "จัดการวัตถุดิบ — รับเข้า, ใช้ไป, คงเหลือ พร้อมระบบ FIFO",
    href: "/projects/packaging/raw-material-balance",
    icon: Boxes,
  },
  {
    title: "Logic Process",
    description: "Visualize and debug algorithm decisions with a step-by-step process view.",
    href: "/projects/packaging/logic-process",
    icon: FlaskConical,
  },
] as const;

const tiltClasses = [
  "md:-rotate-[0.9deg]",
  "md:rotate-[0.7deg]",
  "md:-rotate-[0.5deg]",
  "md:rotate-[1deg]",
  "md:-rotate-[0.6deg]",
  "md:rotate-[0.8deg]",
  "md:-rotate-[0.7deg]",
  "md:rotate-[0.6deg]",
  "md:-rotate-[0.8deg]",
] as const;

export default function PackagingDashboard() {
  const [isConsoleAutoHover, setIsConsoleAutoHover] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsConsoleAutoHover((prev) => !prev);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F6EDDE] pt-20">
      <div className="pointer-events-none absolute -top-20 -left-16 h-72 w-72 rounded-full bg-[#D4AA7D]/35 blur-3xl" />
      <div className="pointer-events-none absolute top-16 right-0 h-80 w-80 rounded-full bg-[#9ACD32]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#7E5C4A]/15 blur-3xl" />

      <section className="relative py-10 md:py-16">
        <div className="container-custom space-y-10 md:space-y-14">
          <header className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
            <motion.h1
              animate={{ y: [0, -3, 0], boxShadow: ["8px 8px 20px rgba(166,180,200,0.28),-8px -8px 20px rgba(255,255,255,0.92)", "12px 14px 28px rgba(39,38,53,0.22),-8px -8px 20px rgba(255,255,255,0.86)", "8px 8px 20px rgba(166,180,200,0.28),-8px -8px 20px rgba(255,255,255,0.92)"] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.04, y: -6 }}
              className={cn(
                "inline-block cursor-default whitespace-nowrap rounded-[1.7rem] border px-8 py-4 text-2xl font-black uppercase tracking-[0.14em] transition-colors duration-500 sm:px-10 sm:py-5 sm:text-4xl md:px-12 md:py-6 md:text-6xl",
                isConsoleAutoHover
                  ? "border-[#EFD09E]/70 bg-[#272635] text-[#EFD09E]"
                  : "border-white/90 bg-[#EEF2F6]/95 text-[#272727]"
              )}
            >
              Packaging Console
            </motion.h1>
            <p className="max-w-2xl text-sm font-semibold leading-relaxed text-[#7E5C4A] md:text-base">
              A unified workspace for planning, validating, and tracking packaging operations with speed and clarity.
            </p>
          </header>

          <div className="flex flex-col gap-5 md:gap-7">
            {sections.map((section, index) => {
              const Icon = section.icon;
              const isRight = index % 2 !== 0;

              return (
                <Link
                  key={section.href}
                  href={section.href}
                  className={cn(
                    "group block w-full max-w-4xl transition-transform duration-300",
                    isRight ? "md:ml-auto" : "md:mr-auto"
                  )}
                >
                  <motion.article
                    initial={{ opacity: 0, x: isRight ? 120 : -120, scale: 0.98 }}
                    whileInView={{ opacity: 1, x: 0, scale: 1 }}
                    whileHover={{
                      scale: 1.06,
                      y: -10,
                      rotate: isRight ? -1.6 : 1.6,
                      boxShadow: "0 30px 46px rgba(39,39,39,0.34)",
                    }}
                    whileTap={{ scale: 0.9, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 340, damping: 12, mass: 0.7, delay: index * 0.04 }}
                    className={cn(
                      "relative overflow-hidden rounded-[1.7rem] border border-white/80 bg-[#EEF2F6]/95 px-4 py-4 shadow-[10px_10px_22px_rgba(166,180,200,0.3),-10px_-10px_22px_rgba(255,255,255,0.93)] transition-all duration-300 group-hover:-translate-y-1 group-hover:rotate-0 group-hover:bg-[#272727] group-hover:shadow-[0_22px_40px_rgba(39,39,39,0.26)] md:px-5 md:py-4",
                      tiltClasses[index % tiltClasses.length],
                      isRight ? "md:pr-24" : "md:pl-24"
                    )}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-transparent to-transparent group-hover:from-white/5 group-hover:to-black/10 transition-all duration-500" />

                    <div
                      className={cn(
                        "absolute top-1/2 z-20 hidden h-[4.6rem] w-[4.6rem] -translate-y-1/2 items-center justify-center rounded-full border-[5px] border-[#EFD09E]/45 bg-[#272727] text-[2rem] font-black text-[#EFD09E] shadow-[0_10px_18px_rgba(39,39,39,0.2)] md:flex",
                        isRight ? "-right-4" : "-left-4"
                      )}
                    >
                      {index + 1}
                    </div>

                    <div
                      className={cn(
                        "relative z-10 flex items-start gap-4 md:gap-6",
                        isRight && "md:flex-row-reverse md:text-right"
                      )}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-[#D4AA7D]/35 shadow-inner shadow-[#7E5C4A]/10 transition-all duration-300 group-hover:border-[#EFD09E]/40 group-hover:bg-[#9ACD32] group-hover:scale-125 group-hover:shadow-[0_6px_18px_rgba(39,39,39,0.35)]">
                        <Icon className="h-5 w-5 text-[#272727] transition-all duration-300 group-hover:text-[#272727] group-hover:scale-110" strokeWidth={2.3} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 md:hidden">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#272727] text-xs font-black text-[#EFD09E]">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#7E5C4A] group-hover:text-[#EFD09E]/70">Module</span>
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-[0.06em] text-[#272727] group-hover:text-[#EFD09E] md:text-[1.35rem]">{section.title}</h2>
                        <p className="text-[13px] font-medium leading-relaxed text-[#7E5C4A] group-hover:text-[#EFD09E]/70 md:text-sm">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </motion.article>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
