"use client";

import { useState } from "react";
import { ModuleHeader } from "@/components/projects/material-control/ModuleHeader";
import { GlassCard } from "@/components/shared/GlassCard";
import { Modal } from "@/components/shared/Modal";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { DateInput } from "@/components/shared/DateInput";
import { SelectField } from "@/components/shared/SelectField";
import { Clock, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";

// Types
interface Requisition {
  id: string;
  date: string;
  requester: string;
  department: string;
  items: number;
  priority: "High" | "Normal";
  status: "Pending" | "Approved" | "Completed" | "Rejected";
}

export default function RequisitionPage() {
  // Mock Data
  const [requisitions] = useState<Requisition[]>([
    { id: "REQ-2026-001", date: "2026-01-30", requester: "John Doe", department: "Production", items: 3, priority: "High", status: "Pending" },
    { id: "REQ-2026-002", date: "2026-01-28", requester: "Jane Smith", department: "Maintenance", items: 1, priority: "Normal", status: "Approved" },
    { id: "REQ-2026-003", date: "2026-01-25", requester: "Mike Johnson", department: "Assembly", items: 5, priority: "Normal", status: "Completed" },
    { id: "REQ-2026-004", date: "2026-01-20", requester: "Sarah Wilson", department: "Logistics", items: 2, priority: "High", status: "Rejected" },
    { id: "REQ-2025-015", date: "2025-12-15", requester: "Tom Brown", department: "Production", items: 4, priority: "Normal", status: "Completed" },
    { id: "REQ-2025-014", date: "2025-11-28", requester: "Lisa Chen", department: "QC", items: 2, priority: "High", status: "Completed" },
    { id: "REQ-2025-013", date: "2025-10-10", requester: "James Lee", department: "Maintenance", items: 6, priority: "Normal", status: "Completed" },
    { id: "REQ-2025-012", date: "2025-08-05", requester: "Emma Davis", department: "Assembly", items: 3, priority: "High", status: "Completed" },
  ]);

  // State
  const [searchValue, setSearchValue] = useState("");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [isNewReqModalOpen, setIsNewReqModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);

  // Form State for New Requisition
  const [requiredDate, setRequiredDate] = useState("");
  const [departments, setDepartments] = useState(["Production", "Maintenance", "Logistics", "Assembly"]);
  const [selectedDepartment, setSelectedDepartment] = useState("");

  // Table Columns
  const columns: Column<Requisition>[] = [
    { key: "id", header: "Req ID" },
    { key: "date", header: "Date", type: "date" },
    { key: "requester", header: "Requester" },
    { 
      key: "department", 
      header: "Department", 
      align: "center",
      render: (val) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFD09E]/70 text-[#272727] border border-[#D4AA7D]/35">
          {val as React.ReactNode}
        </span>
      )
    },
    { key: "items", header: "Items", align: "center" },
    { 
      key: "priority", 
      header: "Priority", 
      align: "center",
      render: (val) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          val === "High" ? "bg-red-50 text-red-700 border border-red-100" : "bg-blue-50 text-blue-700 border border-blue-100"
        }`}>
          {val as React.ReactNode}
        </span>
      )
    },
    { 
      key: "status", 
      header: "Status", 
      align: "center",
      render: (val) => {
        const strVal = String(val);
        const styles: Record<string, string> = {
          Pending: "bg-[#EFD09E]/60 text-[#7E5C4A] border-[#D4AA7D]/35",
          Approved: "bg-[#9ACD32]/20 text-[#5a7a1a] border-[#9ACD32]/35",
          Completed: "bg-[#EEF2F6] text-[#7E5C4A] border-[#D4AA7D]/30",
          Rejected: "bg-rose-50 text-rose-700 border-rose-100",
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[strVal] || ""}`}>
            {strVal}
          </span>
        );
      }
    },
  ];

  // Filter data by year
  const filteredData = requisitions.filter((req) => {
    const matchesSearch = 
      req.id.toLowerCase().includes(searchValue.toLowerCase()) ||
      req.requester.toLowerCase().includes(searchValue.toLowerCase());
    const matchesYear = filterYear === "All" || req.date.startsWith(filterYear);
    return matchesSearch && matchesYear;
  });

  return (
    <div className="min-h-screen pt-20 bg-[#F6EDDE] relative overflow-hidden">
      <div className="absolute top-24 -left-16 w-72 h-72 bg-[#D4AA7D]/15 rounded-full blur-3xl" />
      <div className="absolute bottom-16 -right-16 w-80 h-80 bg-[#EFD09E]/25 rounded-full blur-3xl" />
      <section className="py-12 md:py-16">
        <div className="container-custom relative z-10">
          <ModuleHeader
            title="Material Requisition"
            description="Manage material requests and approvals."
          >
            <div className="space-y-6 mt-8">
              {/* Stats Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Pending Approval</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">5</h3>
                    <p className="text-xs text-amber-500 mt-1 font-medium">Action required</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Approved Today</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">12</h3>
                    <p className="text-xs text-emerald-600 mt-1 font-medium">Items released</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <CheckCircle2 className="w-6 h-6 text-[#272727]" />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Urgent Requests</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">2</h3>
                    <p className="text-xs text-red-500 mt-1 font-medium">High priority</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-red-600 animate-pulse" />
                  </div>
                </GlassCard>
              </div>

              {/* Search Toolbar */}
              <SearchToolbar
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder="Search requisitions..."
                filterValue={filterYear}
                onFilterChange={setFilterYear}
                primaryButton={{
                  label: "New Requisition",
                  icon: <Plus className="w-4 h-4" />,
                  onClick: () => setIsNewReqModalOpen(true),
                }}
              />

              {/* Data Table */}
              <DataTable
                columns={columns}
                data={filteredData}
                keyField="id"
                onRowClick={(row) => setSelectedReq(row)}
                emptyMessage="No requisitions found"
              />
            </div>
          </ModuleHeader>

          {/* New Requisition Modal */}
          <Modal
            isOpen={isNewReqModalOpen}
            onClose={() => setIsNewReqModalOpen(false)}
            title="New Requisition"
            className="md:max-w-2xl"
          >
            <div className="h-[480px] flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {/* Requester Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#7E5C4A] uppercase">Requester</label>
                    <input type="text" defaultValue="Admin User" className="w-full px-3 py-2 bg-[#EEF2F6]/80 border border-white/80 rounded-lg text-sm text-[#272727]" disabled />
                  </div>
                  <SelectField
                    label="Department"
                    value={selectedDepartment}
                    options={departments}
                    onChange={setSelectedDepartment}
                    onOptionsChange={setDepartments}
                    allowManage={true}
                    placeholder="Select department..."
                  />
                </div>

                {/* Request Details */}
                <div className="grid grid-cols-2 gap-4">
                  <DateInput
                    label="Required Date"
                    value={requiredDate}
                    onChange={setRequiredDate}
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#7E5C4A] uppercase">Priority</label>
                    <div className="flex gap-4 pt-2">
                      <label className="flex items-center gap-2 text-sm text-[#7E5C4A] cursor-pointer">
                        <input type="radio" name="priority" className="text-[#272727] focus:ring-[#9ACD32]" defaultChecked />
                        Normal
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[#7E5C4A] cursor-pointer">
                        <input type="radio" name="priority" className="text-red-600 focus:ring-red-500" />
                        <span className="text-red-600 font-medium">Urgent</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-[#7E5C4A] uppercase">Items to Request</label>
                    <button className="text-xs text-[#7E5C4A] font-medium hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>
                  
                  <div className="border border-[#D4AA7D]/25 rounded-xl overflow-hidden bg-transparent shadow-[6px_6px_14px_rgba(166,180,200,0.28),-6px_-6px_14px_rgba(255,255,255,0.92)]">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#D4AA7D] text-[#272727] text-xs uppercase font-black tracking-wider border-b border-[#7E5C4A]/25">
                        <tr>
                          <th className="px-3 py-2">Item</th>
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
                      <p className="text-xs text-[#7E5C4A]/70 italic">Add items to request</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#7E5C4A] uppercase">Reason / Remarks</label>
                  <textarea className="w-full px-3 py-2 bg-[#EEF2F6]/70 border border-white/80 rounded-lg text-sm text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/20 h-20 resize-none" placeholder="Explain why these items are needed..."></textarea>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-[#D4AA7D]/25 mt-auto flex gap-3">
                <button 
                  onClick={() => setIsNewReqModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#EEF2F6] border border-white/80 text-[#7E5C4A] hover:bg-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button className="flex-1 py-2.5 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg font-medium transition-colors shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20">
                  Submit Request
                </button>
              </div>
            </div>
          </Modal>

          {/* Details Modal */}
          <Modal
            isOpen={!!selectedReq}
            onClose={() => setSelectedReq(null)}
            title={`Requisition Details: ${selectedReq?.id}`}
            className="md:max-w-2xl"
          >
            <div className="h-[480px] flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {/* Header Info */}
                <div className="flex justify-between items-start bg-[#EEF2F6]/80 p-4 rounded-lg border border-white/80">
                  <div>
                    <p className="text-xs text-[#7E5C4A] uppercase mb-1">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium border ${
                      selectedReq?.status === "Pending" ? "bg-[#EFD09E]/60 text-[#7E5C4A] border-[#D4AA7D]/35" :
                      selectedReq?.status === "Approved" ? "bg-[#9ACD32]/20 text-[#5a7a1a] border-[#9ACD32]/35" :
                      selectedReq?.status === "Rejected" ? "bg-rose-50 text-rose-700 border-rose-100" :
                      "bg-[#EEF2F6] text-[#7E5C4A] border-[#D4AA7D]/30"
                    }`}>
                      {selectedReq?.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#7E5C4A] uppercase mb-1">Date</p>
                    <p className="font-semibold text-[#272727]">{selectedReq ? formatDate(selectedReq.date) : ""}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#7E5C4A] uppercase mb-1">Requester</p>
                    <p className="font-medium text-[#272727]">{selectedReq?.requester}</p>
                    <p className="text-xs text-[#7E5C4A]">{selectedReq?.department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7E5C4A] uppercase mb-1">Priority</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      selectedReq?.priority === "High" ? "bg-red-50 text-red-700 border border-red-100" : "bg-[#EEF2F6] text-[#7E5C4A] border border-[#D4AA7D]/25"
                    }`}>
                      {selectedReq?.priority}
                    </span>
                  </div>
                </div>

                {/* Mock Items List */}
                <div>
                  <h4 className="text-sm font-semibold text-[#272727] mb-3">Requested Items</h4>
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
                        {[1, 2].map((i) => (
                          <tr key={i} className="hover:bg-[#272727] group transition-colors">
                            <td className="px-4 py-2 text-[#272727] group-hover:text-[#EFD09E]">Detailed Spec Material #{i}</td>
                            <td className="px-4 py-2 text-right font-medium group-hover:text-[#EFD09E]">10</td>
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
                {selectedReq?.status === "Pending" && (
                  <>
                    <button className="flex-1 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100 rounded-lg font-medium transition-colors">
                      Reject
                    </button>
                    <button className="flex-1 py-2.5 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg font-medium transition-colors shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20">
                      Approve Request
                    </button>
                  </>
                )}
                {selectedReq?.status !== "Pending" && (
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
