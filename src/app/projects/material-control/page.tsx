import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  History,
  Package,
  ReceiptText,
  Settings,
  TrendingUp,
} from "lucide-react";

const sections = [
  {
    title: "Inventory",
    description: "View stock levels, materials, and movements.",
    href: "/projects/material-control/inventory",
    icon: Package,
    iconColor: "from-blue-500 to-cyan-500",
  },
  {
    title: "Requisition",
    description: "Create and track requisitions.",
    href: "/projects/material-control/requisition",
    icon: ClipboardList,
    iconColor: "from-purple-500 to-pink-500",
  },
  {
    title: "Receiving",
    description: "Receive materials and record documents.",
    href: "/projects/material-control/receiving",
    icon: ReceiptText,
    iconColor: "from-green-500 to-emerald-500",
  },
  {
    title: "Activity",
    description: "Track all actions and changes history.",
    href: "/projects/material-control/activity",
    icon: History,
    iconColor: "from-rose-500 to-pink-500",
  },
  {
    title: "Reports",
    description: "Operational reports and exports.",
    href: "/projects/material-control/reports",
    icon: TrendingUp,
    iconColor: "from-amber-500 to-orange-500",
  },
  {
    title: "Settings",
    description: "Module configurations and master data.",
    href: "/projects/material-control/settings",
    icon: Settings,
    iconColor: "from-slate-500 to-slate-600",
  },
] as const;

export default function MaterialControlPage() {
  return (
    <div className="min-h-screen pt-20 bg-[#F6EDDE] relative overflow-hidden">
      <div className="absolute top-24 -left-16 w-72 h-72 bg-[#D4AA7D]/15 rounded-full blur-3xl" />
      <div className="absolute bottom-16 -right-16 w-80 h-80 bg-[#EFD09E]/25 rounded-full blur-3xl" />

      <section className="py-12 md:py-16">
        <div className="container-custom relative z-10">
          <div className="text-center mb-12 space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#9ACD32]/15 border border-[#9ACD32]/30">
              <div className="w-2 h-2 rounded-full bg-[#9ACD32] animate-pulse" />
              <span className="text-[10px] font-black text-[#5a7a1a] uppercase tracking-[0.22em]">
                Core Module
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tight">
              <span className="text-[#272727]">Material </span>
              <span className="text-[#7E5C4A]">Control</span>
            </h1>

            <p className="text-[#7E5C4A] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Inventory, requisitions, and receiving in one unified module.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <Link key={s.href} href={s.href} className="block group">
                  <div className="h-full flex flex-col gap-5 p-6 rounded-2xl relative overflow-hidden bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.3),-8px_-8px_18px_rgba(255,255,255,0.92)] transition-all duration-300 hover:-translate-y-1.5 hover:bg-[#272727] hover:shadow-[0_16px_34px_rgba(39,39,39,0.24)]">
                    <div className="absolute inset-0 bg-linear-to-br from-transparent to-transparent group-hover:from-white/5 group-hover:to-black/10 transition-all duration-500" />

                    <div className="relative z-10 flex flex-col gap-4">
                      <div
                        className="w-14 h-14 rounded-xl bg-[#9ACD32] border-2 border-[#EFD09E] flex items-center justify-center transition-transform duration-300 shadow-[4px_4px_10px_rgba(166,180,200,0.22),-2px_-2px_6px_rgba(255,255,255,0.9)] group-hover:scale-105"
                      >
                        <Icon className="w-7 h-7 text-[#272727]" />
                      </div>

                      <div className="space-y-2">
                        <h2 className="text-xl font-black text-[#272727] group-hover:text-[#EFD09E] transition-colors tracking-tight">
                          {s.title}
                        </h2>
                        <p className="text-[#7E5C4A] text-sm leading-relaxed group-hover:text-[#EFD09E]/70 transition-colors">
                          {s.description}
                        </p>
                      </div>
                    </div>

                    <div className="relative z-10 mt-auto pt-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-[#7E5C4A] group-hover:text-[#9ACD32] transition-colors">
                      <span>Access Module</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
