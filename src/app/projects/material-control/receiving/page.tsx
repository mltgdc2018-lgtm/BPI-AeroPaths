"use client";

import { useState } from "react";
import { ModuleHeader } from "@/components/projects/material-control/ModuleHeader";
import { GlassCard } from "@/components/shared/GlassCard";
import { Modal } from "@/components/shared/Modal";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { DateInput } from "@/components/shared/DateInput";
import { SelectField } from "@/components/shared/SelectField";
import { Truck, CheckCircle2, Clock, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";
import { ReceivingService } from "@/lib/firebase/services/receiving.service";
import type { ReceivingNote } from "@/lib/firebase/services/receiving.service";
import { useEffect } from "react";
export default function ReceivingPage() {
  const [receivingNotes, setReceivingNotes] = useState<ReceivingNote[]>([]);

  // State
  const [searchValue, setSearchValue] = useState("");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [isNewReceivingModalOpen, setIsNewReceivingModalOpen] = useState(false);
  const [selectedReceiving, setSelectedReceiving] = useState<ReceivingNote | null>(null);

  // Form State
  const [receiveDate, setReceiveDate] = useState("");
  const [suppliers, setSuppliers] = useState(["ABC Metals Co.", "Thai Steel Ltd.", "Global Supplies", "Premium Parts"]);
  const [selectedSupplier, setSelectedSupplier] = useState("");

  async function fetchReceivingNotes() {
    const { data } = await ReceivingService.getAll();
    setReceivingNotes(data || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReceivingNotes();
  }, []);

  // Table Columns
  const columns: Column<ReceivingNote>[] = [
    { key: "receivingNo", header: "RN No.", render: (val, row) => row.receivingNo || row.id },
    { key: "date", header: "Date", type: "date" },
    { key: "poNumber", header: "PO Number" },
    { key: "supplier", header: "Supplier" },
    { key: "items", header: "Items", align: "center", render: (val, row) => (row.items ? row.items.length : 0) },
    { 
      key: "status", 
      header: "Status", 
      align: "center",
      render: (val) => {
        const styles: Record<string, string> = {
          Pending: "bg-[#EFD09E]/60 text-[#7E5C4A] border-[#D4AA7D]/35",
          Verified: "bg-[#EEF2F6] text-[#7E5C4A] border-[#D4AA7D]/30",
          Completed: "bg-[#9ACD32]/20 text-[#5a7a1a] border-[#9ACD32]/35",
        };
        const stringVal = String(val);
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[stringVal] || ""}`}>
            {stringVal}
          </span>
        );
      }
    },
    { key: "receivedBy", header: "Received By" },
  ];

  // Filter data
  const filteredData = receivingNotes.filter((note) => {
    const idString = note.receivingNo || note.id || "";
    const matchesSearch = 
      idString.toLowerCase().includes(searchValue.toLowerCase()) ||
      note.poNumber.toLowerCase().includes(searchValue.toLowerCase()) ||
      note.supplier.toLowerCase().includes(searchValue.toLowerCase());
    const matchesYear = filterYear === "All" || (note.date && note.date.startsWith(filterYear));
    return matchesSearch && matchesYear;
  });

  return (
    <div className="min-h-screen pt-20 bg-[#F6EDDE] relative overflow-hidden">
      <div className="absolute top-24 -left-16 w-72 h-72 bg-[#D4AA7D]/15 rounded-full blur-3xl" />
      <div className="absolute bottom-16 -right-16 w-80 h-80 bg-[#EFD09E]/25 rounded-full blur-3xl" />
      <section className="py-12 md:py-16">
        <div className="container-custom relative z-10">
          <ModuleHeader
            title="Receiving"
            description="Receive materials, attach documents, and create receiving notes."
          >
            <div className="space-y-6 mt-8">
              {/* Stats Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Pending Verification</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">3</h3>
                    <p className="text-xs text-amber-500 mt-1 font-medium">Awaiting check</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Received Today</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">8</h3>
                    <p className="text-xs text-emerald-600 mt-1 font-medium">Items checked in</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <CheckCircle2 className="w-6 h-6 text-[#272727]" />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Expected Deliveries</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">5</h3>
                    <p className="text-xs text-blue-500 mt-1 font-medium">This week</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <Truck className="w-6 h-6 text-[#272727]" />
                  </div>
                </GlassCard>
              </div>

              {/* Search Toolbar */}
              <SearchToolbar
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder="Search receiving notes..."
                filterValue={filterYear}
                onFilterChange={setFilterYear}
                primaryButton={{
                  label: "New Receiving",
                  icon: <Plus className="w-4 h-4" />,
                  onClick: () => setIsNewReceivingModalOpen(true),
                }}
              />

              {/* Data Table */}
              <DataTable
                columns={columns}
                data={filteredData}
                keyField="id"
                onRowClick={(row) => setSelectedReceiving(row)}
                emptyMessage="No receiving notes found"
              />
            </div>
          </ModuleHeader>

          {/* New Receiving Modal */}
          <Modal
            isOpen={isNewReceivingModalOpen}
            onClose={() => setIsNewReceivingModalOpen(false)}
            title="New Receiving Note"
            className="md:max-w-2xl"
          >
            <div className="h-[480px] flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <DateInput
                    label="Receive Date"
                    value={receiveDate}
                    onChange={setReceiveDate}
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#7E5C4A] uppercase">PO Number</label>
                    <input type="text" placeholder="Enter PO number..." className="w-full px-3 py-2 bg-[#EEF2F6]/70 border border-white/80 rounded-lg text-sm text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/20" />
                  </div>
                </div>

                <SelectField
                  label="Supplier"
                  value={selectedSupplier}
                  options={suppliers}
                  onChange={setSelectedSupplier}
                  onOptionsChange={setSuppliers}
                  allowManage={true}
                  placeholder="Select supplier..."
                />

                {/* Items List */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-[#7E5C4A] uppercase">Items Received</label>
                    <button className="text-xs text-[#7E5C4A] font-medium hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>
                  
                  <div className="border border-[#D4AA7D]/25 rounded-xl overflow-hidden bg-transparent shadow-[6px_6px_14px_rgba(166,180,200,0.28),-6px_-6px_14px_rgba(255,255,255,0.92)]">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#D4AA7D] text-[#272727] text-xs uppercase font-black tracking-wider border-b border-[#7E5C4A]/25">
                        <tr>
                          <th className="px-3 py-2">Material</th>
                          <th className="px-3 py-2 w-20 text-center">Qty</th>
                          <th className="px-3 py-2 w-24">Unit</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D4AA7D]/15 bg-transparent">
                        <tr>
                          <td className="p-2">
                            <select className="w-full bg-transparent text-sm text-[#272727] focus:outline-none">
                              <option>Select Material...</option>
                              <option>Aluminum Sheet Grade 1000</option>
                              <option>Steel Rod 10mm</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input type="number" defaultValue={1} className="w-full text-center bg-[#EEF2F6] rounded border border-white/80 py-1 text-sm text-[#272727]" />
                          </td>
                          <td className="p-2 text-[#7E5C4A] text-xs">Sheet</td>
                          <td className="p-2 text-center text-[#7E5C4A]/50 hover:text-red-500 cursor-pointer">×</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="p-2 bg-[#EEF2F6] text-center">
                      <p className="text-xs text-[#7E5C4A]/70 italic">Add items received</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#7E5C4A] uppercase">Notes</label>
                  <textarea className="w-full px-3 py-2 bg-[#EEF2F6]/70 border border-white/80 rounded-lg text-sm text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/20 h-20 resize-none" placeholder="Additional notes..."></textarea>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-[#D4AA7D]/25 mt-auto flex gap-3">
                <button 
                  onClick={() => setIsNewReceivingModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#EEF2F6] border border-white/80 text-[#7E5C4A] hover:bg-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button className="flex-1 py-2.5 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg font-medium transition-colors shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20">
                  Create Note
                </button>
              </div>
            </div>
          </Modal>

          {/* Details Modal */}
          <Modal
            isOpen={!!selectedReceiving}
            onClose={() => setSelectedReceiving(null)}
            title={`Receiving Details: ${selectedReceiving?.receivingNo || selectedReceiving?.id}`}
            className="md:max-w-2xl"
          >
            <div className="h-[480px] flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {/* Header Info */}
                <div className="flex justify-between items-start bg-[#EEF2F6]/80 p-4 rounded-lg border border-white/80">
                  <div>
                    <p className="text-xs text-[#7E5C4A] uppercase mb-1">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium border ${
                      selectedReceiving?.status === "Pending" ? "bg-[#EFD09E]/60 text-[#7E5C4A] border-[#D4AA7D]/35" :
                      selectedReceiving?.status === "Verified" ? "bg-[#EEF2F6] text-[#7E5C4A] border-[#D4AA7D]/30" :
                      "bg-[#9ACD32]/20 text-[#5a7a1a] border-[#9ACD32]/35"
                    }`}>
                      {selectedReceiving?.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#7E5C4A] uppercase mb-1">Date</p>
                    <p className="font-semibold text-[#272727]">{selectedReceiving ? formatDate(selectedReceiving.date) : ""}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#7E5C4A] uppercase mb-1">PO Number</p>
                    <p className="font-medium text-[#272727]">{selectedReceiving?.poNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7E5C4A] uppercase mb-1">Supplier</p>
                    <p className="font-medium text-[#272727]">{selectedReceiving?.supplier}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-[#7E5C4A] uppercase mb-1">Received By</p>
                  <p className="font-medium text-[#272727]">{selectedReceiving?.receivedBy}</p>
                </div>

                {/* Mock Items List */}
                <div>
                  <h4 className="text-sm font-semibold text-[#272727] mb-3">Items Received</h4>
                  <div className="border border-[#D4AA7D]/25 rounded-xl overflow-hidden bg-transparent shadow-[6px_6px_14px_rgba(166,180,200,0.28),-6px_-6px_14px_rgba(255,255,255,0.92)]">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#D4AA7D] text-[#272727] text-xs uppercase font-black tracking-wider border-b border-[#7E5C4A]/25">
                        <tr>
                          <th className="px-4 py-2">Item</th>
                          <th className="px-4 py-2 text-right">Qty</th>
                          <th className="px-4 py-2">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D4AA7D]/15 bg-transparent">
                        {[1, 2, 3].map((i) => (
                          <tr key={i} className="hover:bg-[#272727] group transition-colors">
                            <td className="px-4 py-2 text-[#272727] group-hover:text-[#EFD09E]">Material Item #{i}</td>
                            <td className="px-4 py-2 text-right font-medium group-hover:text-[#EFD09E]">{i * 10}</td>
                            <td className="px-4 py-2 text-[#7E5C4A] text-xs group-hover:text-[#EFD09E]/70">Pcs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-[#D4AA7D]/25 mt-auto flex gap-3">
                {selectedReceiving?.status === "Pending" && (
                  <button className="flex-1 py-2.5 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg font-medium transition-colors shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20">
                    Verify Items
                  </button>
                )}
                {selectedReceiving?.status === "Verified" && (
                  <button className="flex-1 py-2.5 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg font-medium transition-colors shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20">
                    Complete Receiving
                  </button>
                )}
                {selectedReceiving?.status === "Completed" && (
                  <button className="flex-1 py-2.5 bg-[#EEF2F6] text-[#7E5C4A] hover:bg-white rounded-lg font-medium transition-colors border border-white/80">
                    Print / Export
                  </button>
                )}
              </div>
            </div>
          </Modal>
        </div>
      </section>
    </div>
  );
}
