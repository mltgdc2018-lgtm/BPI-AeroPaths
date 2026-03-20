"use client";

import { Database } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

export default function PackagingDatabasePage() {
  return (
    <div className="min-h-screen bg-[#F6EDDE] pt-20">
      <section className="py-12">
        <div className="container-custom">
          
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-[#272727] mb-2">Global Database</h1>
            <p className="text-[#7E5C4A]">Master database for pallets, boxes, and BOM integration rules.</p>
          </div>

          <GlassCard className="p-8 flex flex-col items-center justify-center min-h-[400px] bg-[#EEF2F6]/95 border border-white/80 shadow-[10px_10px_22px_rgba(166,180,200,0.28),-10px_-10px_22px_rgba(255,255,255,0.92)] text-[#7E5C4A]">
             <Database className="w-16 h-16 mb-4 opacity-10" />
             <p className="font-medium">Master database for packing resources will be configured here.</p>
          </GlassCard>

        </div>
      </section>
    </div>
  );
}
