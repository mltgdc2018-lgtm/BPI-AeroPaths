"use client";

import { useState } from "react";
import { ModuleHeader } from "@/components/projects/material-control/ModuleHeader";
import { MasterDataView } from "@/components/projects/material-control/MasterDataView";
import { RawMaterialBalanceView } from "@/components/projects/material-control/RawMaterialBalanceView";
import { Copyleft as Database, Activity } from "lucide-react";

export default function InventoryContainerPage() {
  const [parentTab, setParentTab] = useState<"master" | "raw-balance">("master");

  return (
    <div className="min-h-screen pt-20 bg-[#F6EDDE] relative overflow-hidden">
      <div className="absolute top-24 -left-16 w-72 h-72 bg-[#D4AA7D]/15 rounded-full blur-3xl" />
      <div className="absolute bottom-16 -right-16 w-80 h-80 bg-[#EFD09E]/25 rounded-full blur-3xl" />
      <section className="py-12 md:py-16">
        <div className="container-custom relative z-10">
          <ModuleHeader
            title="Inventory & Raw Material Balance"
            description="ศูนย์รวมข้อมูลสินค้าคงคลัง ข้อมูลพื้นฐานสินค้ารวมถึงจัดการ Raw Material แบบ FIFO (รับเข้า/ใช้ไป/คงเหลือ)"
          >
            <div className="space-y-6 mt-8">
              
              {/* ─── Top Level Tabs ──────────────────────────────────── */}
              <div className="flex border-b border-[#D4AA7D]/30 mb-6">
                <button
                  onClick={() => setParentTab("master")}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
                    parentTab === "master"
                      ? "border-[#9ACD32] text-[#272727] bg-[#EFD09E]/30"
                      : "border-transparent text-[#7E5C4A]/70 hover:text-[#272727] hover:bg-[#EEF2F6]/60"
                  }`}
                >
                  <Database className="w-4 h-4" />
                  Master Data
                </button>
                <button
                  onClick={() => setParentTab("raw-balance")}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
                    parentTab === "raw-balance"
                      ? "border-[#9ACD32] text-[#272727] bg-[#EFD09E]/30"
                      : "border-transparent text-[#7E5C4A]/70 hover:text-[#272727] hover:bg-[#EEF2F6]/60"
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Raw Material Balance (Receiving / Usage)
                </button>
              </div>

              {/* ─── Content Area ────────────────────────────────────── */}
              {parentTab === "master" ? <MasterDataView /> : <RawMaterialBalanceView />}

            </div>
          </ModuleHeader>
        </div>
      </section>
    </div>
  );
}
