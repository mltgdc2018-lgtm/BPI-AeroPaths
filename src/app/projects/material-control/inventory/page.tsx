"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { ModuleHeader } from "@/components/projects/material-control/ModuleHeader";
import { RawMaterialInventoryTab } from "@/components/projects/material-control/RawMaterialInventoryTab";
import { RawMaterialReceivingTab } from "@/components/projects/material-control/RawMaterialReceivingTab";
import { RawMaterialUsageTab } from "@/components/projects/material-control/RawMaterialUsageTab";

type TabType = "inventory" | "receiving" | "usage";

export default function InventoryContainerPage() {
  const [activeTab, setActiveTab] = useState<TabType>("inventory");

  const tabs = [
    { id: "inventory", label: "Balance (คงเหลือ)", icon: <Package className="w-4 h-4" /> },
    { id: "receiving", label: "Receiving (รับเข้า)", icon: <ArrowDownToLine className="w-4 h-4" /> },
    { id: "usage", label: "Usage (ใช้ไป)", icon: <ArrowUpFromLine className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen pt-20 bg-[#F6EDDE] relative overflow-hidden">
      {/* Decorative blurry backgrounds */}
      <div className="absolute top-24 -left-16 w-72 h-72 bg-[#D4AA7D]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-16 -right-16 w-80 h-80 bg-[#EFD09E]/25 rounded-full blur-3xl pointer-events-none" />
      
      <section className="py-12 md:py-16">
        <div className="container-custom relative z-10">
          <ModuleHeader
            title="Inventory"
            description="ศูนย์รวมข้อมูลจัดการ Raw Material คงเหลือ การรับเข้า และการเบิกใช้"
          >
            <div className="mt-10 space-y-8">
              {/* Tab Navigation */}
              <div className="flex justify-center">
                <div className="inline-flex p-1.5 bg-[#EEF2F6]/80 backdrop-blur-md border border-white/50 rounded-2xl shadow-[8px_8px_20px_rgba(166,180,200,0.25)]">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`
                        relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                        ${activeTab === tab.id 
                          ? "text-[#272727]" 
                          : "text-[#7E5C4A]/60 hover:text-[#7E5C4A]"}
                      `}
                    >
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-[#EFD09E] rounded-xl shadow-sm border border-[#D4AA7D]/30"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        {tab.icon}
                        {tab.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="relative min-h-[500px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {activeTab === "inventory" && <RawMaterialInventoryTab />}
                    {activeTab === "receiving" && <RawMaterialReceivingTab />}
                    {activeTab === "usage" && <RawMaterialUsageTab />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </ModuleHeader>
        </div>
      </section>
    </div>
  );
}
