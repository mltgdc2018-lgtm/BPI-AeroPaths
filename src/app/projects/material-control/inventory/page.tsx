"use client";

import { useState } from "react";
import { ModuleHeader } from "@/components/projects/material-control/ModuleHeader";
import { GlassCard } from "@/components/shared/GlassCard";
import { Modal } from "@/components/shared/Modal";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Package, AlertTriangle, ArrowRightLeft, ReceiptText, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";
import { InventoryService } from "@/lib/firebase/services/inventory.service";
import type { InventoryItem } from "@/lib/firebase/services/inventory.service";
import { useEffect } from "react";

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");
  const [searchValue, setSearchValue] = useState("");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  async function fetchInventory() {
    const { data } = await InventoryService.getAll();
    setInventoryItems(data || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInventory();
  }, []);

  // Table Columns
  const columns: Column<InventoryItem>[] = [
    { key: "partNo", header: "Part No." },
    { key: "description", header: "Description" },
    { 
      key: "category", 
      header: "Category", 
      align: "center",
      render: (val) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFD09E]/70 text-[#272727] border border-[#D4AA7D]/40">
          {val as React.ReactNode}
        </span>
      )
    },
    { key: "stock", header: "Stock", align: "center", className: "font-semibold" },
    { key: "unit", header: "Unit", align: "center" },
    { key: "lastUpdated", header: "Last Updated", align: "center", type: "date" },
  ];

  // Filter data
  const filteredData = inventoryItems.filter((item) => {
    const matchesSearch = 
      item.partNo.toLowerCase().includes(searchValue.toLowerCase()) ||
      item.description.toLowerCase().includes(searchValue.toLowerCase());
    
    // We will need to check item.updatedAt for date-based filter
    const lastUpdateDate = item.updatedAt ? new Date(item.updatedAt as unknown as string).toISOString() : "";
    const matchesYear = filterYear === "All" || lastUpdateDate.startsWith(filterYear);
    return matchesSearch && matchesYear;
  });

  return (
    <div className="min-h-screen pt-20 bg-[#F6EDDE] relative overflow-hidden">
      <div className="absolute top-24 -left-16 w-72 h-72 bg-[#D4AA7D]/15 rounded-full blur-3xl" />
      <div className="absolute bottom-16 -right-16 w-80 h-80 bg-[#EFD09E]/25 rounded-full blur-3xl" />
      <section className="py-12 md:py-16">
        <div className="container-custom relative z-10">
          <ModuleHeader
            title="Inventory"
            description="Materials master data, stock levels, and movements."
          >
            <div className="space-y-6 mt-8">
              {/* Summary Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Total Items</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">{inventoryItems.length}</h3>
                    <p className="text-xs text-[#7E5C4A]/70 mt-1 group-hover:text-[#EFD09E]/60">Products mapped</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <Package className="w-6 h-6 text-[#272727]" />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Low Stock</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">
                      {inventoryItems.filter(item => item.minStock !== undefined && item.stock <= item.minStock).length}
                    </h3>
                    <p className="text-xs text-red-500 mt-1 font-medium">Reorder needed</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl border border-red-200/60">
                    <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Recent Activity</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">24</h3>
                    <p className="text-xs text-emerald-600 mt-1 font-medium">+12 from yesterday</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <ArrowRightLeft className="w-6 h-6 text-[#272727]" />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Total Value</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">฿2.4M</h3>
                    <p className="text-xs text-[#7E5C4A]/70 mt-1 group-hover:text-[#EFD09E]/60">Estimated cost</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <ReceiptText className="w-6 h-6 text-[#272727]" />
                  </div>
                </GlassCard>
              </div>

              {/* Search Toolbar */}
              <SearchToolbar
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder="Search materials..."
                filterValue={filterYear}
                onFilterChange={setFilterYear}
                primaryButton={{
                  label: "Add Material",
                  icon: <Plus className="w-4 h-4" />,
                  onClick: () => console.log("Add material"),
                }}
              />

              {/* Data Table */}
              <DataTable
                columns={columns}
                data={filteredData}
                keyField="id"
                onRowClick={(row) => {
                  setSelectedItem(row);
                  setActiveTab("overview");
                }}
                emptyMessage="No materials found"
              />
            </div>
          </ModuleHeader>

          {/* Item Details Modal */}
          <Modal
            isOpen={!!selectedItem}
            onClose={() => setSelectedItem(null)}
            title="Material Details"
            className="md:max-w-2xl"
          >
            {selectedItem && (
              <div className="space-y-6">
                {/* Tabs */}
                <div className="grid grid-cols-2 border-b border-[#D4AA7D]/25 -mx-6 -mt-6 mb-6">
                  <button 
                    onClick={() => setActiveTab("overview")}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center ${
                      activeTab === 'overview' 
                      ? 'border-[#9ACD32] text-[#272727] bg-[#EFD09E]/45' 
                      : 'border-transparent text-[#7E5C4A] hover:text-[#272727] hover:bg-[#EEF2F6]/60'
                    }`}
                  >
                    Overview
                  </button>
                  <button 
                    onClick={() => setActiveTab("history")}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center ${
                      activeTab === 'history' 
                      ? 'border-[#9ACD32] text-[#272727] bg-[#EFD09E]/45' 
                      : 'border-transparent text-[#7E5C4A] hover:text-[#272727] hover:bg-[#EEF2F6]/60'
                    }`}
                  >
                    History
                  </button>
                </div>

                <div className="h-[480px]">
                  {activeTab === "overview" ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col h-full">
                      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-[#EEF2F6]/80 rounded-lg border border-white/80">
                            <p className="text-xs text-[#7E5C4A] uppercase">Part Number</p>
                            <p className="font-bold text-[#272727] text-lg">{selectedItem.partNo}</p>
                          </div>
                          <div className="p-3 bg-[#EEF2F6]/80 rounded-lg border border-white/80">
                            <p className="text-xs text-[#7E5C4A] uppercase">Category</p>
                            <p className="font-medium text-[#7E5C4A]">{selectedItem.category}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-[#7E5C4A] uppercase mb-1">Description</p>
                          <p className="text-[#272727] bg-[#EEF2F6]/60 p-3 rounded-lg border border-white/80">
                            {selectedItem.description}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 border border-[#D4AA7D]/25 rounded-lg bg-white/50">
                            <p className="text-xs text-[#7E5C4A]">Stock</p>
                            <p className="font-bold text-emerald-600 text-xl">{selectedItem.stock}</p>
                          </div>
                          <div className="text-center p-3 border border-[#D4AA7D]/25 rounded-lg bg-white/50">
                            <p className="text-xs text-[#7E5C4A]">Unit</p>
                            <p className="font-medium text-[#272727]">{selectedItem.unit}</p>
                          </div>
                          <div className="text-center p-3 border border-[#D4AA7D]/25 rounded-lg bg-white/50">
                            <p className="text-xs text-[#7E5C4A]">Location</p>
                            <p className="font-medium text-[#272727]">{selectedItem.location}</p>
                          </div>
                        </div>

                        <div className="p-3 bg-[#EEF2F6]/80 rounded-lg border border-white/80">
                          <p className="text-xs text-[#7E5C4A] uppercase">Last Updated</p>
                          <p className="font-medium text-[#272727]">
                            {selectedItem.updatedAt ? formatDate(selectedItem.updatedAt as unknown as Date) : "-"}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-4 border-t border-[#D4AA7D]/25 flex gap-3 mt-auto">
                        <button className="flex-1 py-2.5 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg font-medium transition-colors border border-[#EFD09E]/20">
                          Edit Material
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300 flex flex-col h-full">
                      <div className="flex justify-between items-center shrink-0">
                        <h4 className="text-sm font-semibold text-[#272727]">Recent Movements</h4>
                        <button className="text-xs text-[#7E5C4A] hover:underline">View All</button>
                      </div>
                      <div className="border border-[#D4AA7D]/20 rounded-xl overflow-hidden flex-1 overflow-y-auto bg-transparent shadow-[6px_6px_14px_rgba(166,180,200,0.28),-6px_-6px_14px_rgba(255,255,255,0.92)]">
                        <table className="w-full text-sm text-left relative">
                          <thead className="bg-[#D4AA7D] text-[#272727] border-b border-[#7E5C4A]/25 sticky top-0 z-10 uppercase text-xs font-black tracking-wider">
                            <tr>
                              <th className="px-4 py-2">Date</th>
                              <th className="px-4 py-2">Type</th>
                              <th className="px-4 py-2 text-right">Qty</th>
                              <th className="px-4 py-2">By</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#D4AA7D]/15 bg-transparent">
                            {[1,2,3,4,5,6,7,8].map((j) => (
                              <tr key={j} className="hover:bg-[#272727] group transition-colors">
                                <td className="px-4 py-2 text-[#7E5C4A] group-hover:text-[#EFD09E]/80">{formatDate("2026-01-30")}</td>
                                <td className="px-4 py-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${j % 2 === 0 ? 'bg-green-100 text-green-700 group-hover:bg-[#9ACD32]/25 group-hover:text-[#9ACD32]' : 'bg-red-100 text-red-700 group-hover:bg-rose-500/20 group-hover:text-rose-300'}`}>
                                    {j % 2 === 0 ? 'IN' : 'OUT'}
                                  </span>
                                </td>
                                <td className={`px-4 py-2 text-right font-medium ${j % 2 === 0 ? 'text-green-600 group-hover:text-[#9ACD32]' : 'text-red-600 group-hover:text-rose-300'}`}>
                                  {j % 2 === 0 ? '+' : '-'}{10 * j}
                                </td>
                                <td className="px-4 py-2 text-[#7E5C4A]/70 text-xs group-hover:text-[#EFD09E]/60">Admin</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="pt-4 border-t border-[#D4AA7D]/25 mt-auto shrink-0">
                        <button className="w-full py-2.5 bg-[#EEF2F6] text-[#7E5C4A] hover:bg-white rounded-lg font-medium transition-colors border border-white/80">
                          Export History
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Modal>
        </div>
      </section>
    </div>
  );
}
