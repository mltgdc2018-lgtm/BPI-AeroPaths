"use client";

import Link from "next/link";
import {
    ChevronRight, 
    Zap,
    Battery,
    CircuitBoard,
    Cpu,
} from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import { ModuleHeader } from "@/components/projects/material-control/ModuleHeader";

const categories = [
  {
    id: "inverters",
    title: "Inverters",
    description: "Hybrid, String, and Micro inverters specifications.",
    icon: Zap,
    color: "bg-[#D4AA7D] text-[#272727]",
    count: 1842
  },
  {
    id: "batteries",
    title: "Battery Modules",
    description: "Lithium-ion packs, BMS, and capacity specs.",
    icon: Battery,
    color: "bg-[#9ACD32] text-[#272727]",
    count: 420
  },
  {
    id: "mounting",
    title: "Mounting Systems",
    description: "Rails, clamps, and structural components.",
    icon: CircuitBoard,
    color: "bg-[#272727] text-[#EFD09E]",
    count: 215
  },
  {
    id: "cables",
    title: "Cables & Connectors",
    description: "MC4, DC/AC cables, and distribution parts.",
    icon: Cpu,
    color: "bg-[#7E5C4A] text-[#EFD09E]",
    count: 85
  }
];

export default function PackagingSpecsPage() {
  return (
    <div className="min-h-screen bg-[#F6EDDE] pt-20">
      <section className="py-12 md:py-16">
        <div className="container-custom">
          
          <ModuleHeader
            title="Data Specifications"
            description="Select a product category to manage dimensions, weights, and packing standards in Packaging Console."
            backHref="/projects/packaging"
            backLabel="Packaging Console"
          >
            <div className="mt-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Link key={cat.id} href={`/projects/packaging/specs/${cat.id}`} className="block group">
                      <GlassCard
                        className="h-full flex flex-col gap-5 p-6 relative overflow-hidden bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] transition-all duration-300 hover:bg-[#272727] hover:shadow-[0_18px_34px_rgba(39,39,39,0.25)] hover:-translate-y-1"
                      >
                        {/* Hover Gradient Background */}
                        <div className="absolute inset-0 bg-linear-to-br from-transparent to-transparent opacity-0 group-hover:opacity-100 group-hover:from-white/5 group-hover:to-black/10 transition-opacity duration-300 pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col gap-4">
                          {/* Icon Container */}
                          <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                            <Icon className="w-7 h-7" />
                          </div>
                          
                          <div className="space-y-2 text-left">
                            <h2 className="text-xl font-bold text-[#272727] group-hover:text-[#EFD09E] transition-colors">
                              {cat.title}
                            </h2>
                            <p className="text-[#7E5C4A] group-hover:text-[#EFD09E]/70 text-xs leading-relaxed">
                              {cat.description}
                            </p>
                            <div className="pt-2 flex items-center gap-2">
                              <span className="px-2.5 py-0.5 bg-[#EFD09E]/70 text-[#7E5C4A] border border-[#D4AA7D]/35 rounded-full text-[10px] font-black uppercase tracking-wider block w-fit group-hover:bg-[#9ACD32] group-hover:text-[#272727] group-hover:border-transparent">
                                {cat.count} Items
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Access Indicator */}
                        <div className="mt-auto pt-2 flex items-center text-[#7E5C4A] group-hover:text-[#9ACD32] text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 relative z-10">
                          View Specs <ChevronRight className="ml-1 w-3 h-3" />
                        </div>
                      </GlassCard>
                    </Link>
                  );
                })}
              </div>
            </div>
          </ModuleHeader>

        </div>
      </section>
    </div>
  );
}
