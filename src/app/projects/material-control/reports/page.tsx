"use client";

import { useState, useMemo } from "react";
import { ModuleHeader } from "@/components/projects/material-control/ModuleHeader";
import { GlassCard } from "@/components/shared/GlassCard";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { DateInput } from "@/components/shared/DateInput";
import { SelectField } from "@/components/shared/SelectField";
import { BarChart3, TrendingUp, FileText, Download, Calendar } from "lucide-react";

// Types
interface ReportSummary {
  id: string;
  name: string;
  type: string;
  lastGenerated: string;
  records: number;
  status: "Ready" | "Generating" | "Scheduled";
}

export default function ReportsPage() {
  // Mock Data
  const [reports] = useState<ReportSummary[]>([
    { id: "RPT-001", name: "Monthly Stock Summary", type: "Inventory", lastGenerated: "2026-01-30", records: 1248, status: "Ready" },
    { id: "RPT-002", name: "Requisition Analysis", type: "Requisition", lastGenerated: "2026-01-28", records: 156, status: "Ready" },
    { id: "RPT-003", name: "Movement History", type: "Inventory", lastGenerated: "2026-01-25", records: 432, status: "Ready" },
    { id: "RPT-004", name: "Low Stock Alert", type: "Inventory", lastGenerated: "2026-01-30", records: 15, status: "Generating" },
    { id: "RPT-005", name: "Supplier Performance", type: "Receiving", lastGenerated: "2025-12-15", records: 28, status: "Ready" },
    { id: "RPT-006", name: "Annual Inventory Report", type: "Inventory", lastGenerated: "2025-11-30", records: 5420, status: "Ready" },
    { id: "RPT-007", name: "Q3 Requisition Summary", type: "Requisition", lastGenerated: "2025-10-01", records: 342, status: "Ready" },
    { id: "RPT-008", name: "Material Cost Analysis", type: "Analytics", lastGenerated: "2025-08-15", records: 890, status: "Scheduled" },
  ]);

  // State
  const [searchValue, setSearchValue] = useState("");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterJob, setFilterJob] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportTypes] = useState(["Activity", "Analytics", "Inventory", "Receiving", "Requisition"]);
  const [selectedReportType, setSelectedReportType] = useState("");
  
  const monthOptions = [
    { value: "All", label: "All Months" },
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Simulated usage data based on filters
  const usageStats = useMemo(() => {
    // Determine a random seed based on filters to make it feel "real"
    const seed = (parseInt(filterYear) || 2026) + (filterMonth === "All" ? 0 : parseInt(filterMonth)) + (filterJob.length * 7);
    const totalQty = (seed % 5000) + 1200;
    const itemsCount = (seed % 50) + 10;
    return {
      totalQty,
      itemsCount,
      topMaterial: totalQty > 3000 ? "Aluminum Sheet" : "Steel Rod"
    };
  }, [filterYear, filterMonth, filterJob]);

  // Table Columns
  const columns: Column<ReportSummary>[] = [
    { key: "name", header: "Report Name" },
    { 
      key: "type", 
      header: "Type", 
      align: "center",
      render: (val) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFD09E]/70 text-[#272727] border border-[#D4AA7D]/35">
          {val as React.ReactNode}
        </span>
      )
    },
    { key: "lastGenerated", header: "Last Generated", type: "date", align: "center" },
    { key: "records", header: "Records", align: "center" },
    { 
      key: "status", 
      header: "Status", 
      align: "center",
      render: (val) => {
        const strVal = String(val);
        const styles: Record<string, string> = {
          Ready: "bg-[#9ACD32]/20 text-[#5a7a1a] border-[#9ACD32]/35",
          Generating: "bg-[#EEF2F6] text-[#7E5C4A] border-[#D4AA7D]/30 animate-pulse",
          Scheduled: "bg-[#EFD09E]/60 text-[#7E5C4A] border-[#D4AA7D]/35",
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[strVal] || ""}`}>
            {strVal}
          </span>
        );
      }
    },
  ];

  // Filter data
  const filteredData = reports.filter((report) => {
    const month = report.lastGenerated.slice(5, 7);
    const matchesSearch =
      report.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      report.type.toLowerCase().includes(searchValue.toLowerCase()) ||
      (filterJob && report.name.toLowerCase().includes(filterJob.toLowerCase()));
    const matchesYear = filterYear === "All" || report.lastGenerated.startsWith(filterYear);
    const matchesMonth = filterMonth === "All" || month === filterMonth;
    return matchesSearch && matchesYear && matchesMonth;
  });

  return (
    <div className="min-h-screen pt-20 bg-[#F6EDDE] relative overflow-hidden">
      <div className="absolute top-24 -left-16 w-72 h-72 bg-[#D4AA7D]/15 rounded-full blur-3xl" />
      <div className="absolute bottom-16 -right-16 w-80 h-80 bg-[#EFD09E]/25 rounded-full blur-3xl" />
      <section className="py-12 md:py-16">
        <div className="container-custom relative z-10">
          <ModuleHeader
            title="Reports"
            description="Stock, movements, requisitions, and operational analytics."
          >
            <div className="space-y-6 mt-8">
              {/* Stats Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Total Usage (Qty)</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">{usageStats.totalQty.toLocaleString()}</h3>
                    <p className="text-xs text-[#7E5C4A]/70 mt-1 group-hover:text-[#EFD09E]/60">Units consumed</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <FileText className="w-6 h-6 text-[#272727]" />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Top Material</p>
                    <h3 className="text-xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E] truncate max-w-[150px]">{usageStats.topMaterial}</h3>
                    <p className="text-xs text-emerald-600 mt-1 font-medium">Most requested</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <BarChart3 className="w-6 h-6 text-[#272727]" />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Material Types</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">{usageStats.itemsCount}</h3>
                    <p className="text-xs text-blue-500 mt-1 font-medium">Different SKU used</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <Calendar className="w-6 h-6 text-[#272727]" />
                  </div>
                </GlassCard>
              </div>

              {/* Date Range Filter */}
              <GlassCard className="p-4 relative z-30 bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)]">
                <h4 className="text-sm font-semibold text-[#272727] mb-4">Quick Report Generator</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <SelectField
                    label="Report Type"
                    value={selectedReportType}
                    options={reportTypes}
                    onChange={setSelectedReportType}
                    placeholder="Select type..."
                  />
                  <DateInput
                    label="From Date"
                    value={dateFrom}
                    onChange={setDateFrom}
                  />
                  <DateInput
                    label="To Date"
                    value={dateTo}
                    onChange={setDateTo}
                  />
                  <div className="flex items-end">
                    <button className="w-full px-4 py-2 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg text-sm font-semibold transition-colors shadow-md shadow-[#272727]/20 border border-[#EFD09E]/20 flex items-center justify-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Generate Report
                    </button>
                  </div>
                </div>
              </GlassCard>

              {/* Search Toolbar */}
              <SearchToolbar
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder="Search reports / Job..."
                filterValue={filterYear}
                onFilterChange={setFilterYear}
                primaryButton={{
                  label: "Export All",
                  icon: <Download className="w-4 h-4" />,
                  onClick: () => console.log("Export all"),
                }}
              >
                <div className="flex gap-4">
                  <div className="flex min-w-[150px] flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-wide text-[#7E5C4A]/80">
                      Month
                    </label>
                    <select
                      value={filterMonth}
                      onChange={(event) => setFilterMonth(event.target.value)}
                      className="px-4 py-2 bg-[#FDF6EC] border border-[#E8DCC9] rounded-lg text-sm text-[#7E5C4A] hover:bg-[#F6EDDE] transition-colors outline-none focus:ring-2 focus:ring-[#D4AA7D]/35 focus:border-[#D4AA7D]/50"
                    >
                      {monthOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex min-w-[150px] flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-wide text-[#7E5C4A]/80">
                      Job / Shipment
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Job #"
                      value={filterJob}
                      onChange={(e) => setFilterJob(e.target.value)}
                      className="px-4 py-2 bg-[#FDF6EC] border border-[#E8DCC9] rounded-lg text-sm text-[#7E5C4A] hover:bg-[#F6EDDE] transition-colors outline-none focus:ring-2 focus:ring-[#D4AA7D]/35 focus:border-[#D4AA7D]/50"
                    />
                  </div>
                </div>
              </SearchToolbar>

              {/* Data Table */}
              <DataTable
                columns={columns}
                data={filteredData}
                keyField="id"
                onRowClick={(row) => console.log("View report", row)}
                emptyMessage="No reports found"
              />
            </div>
          </ModuleHeader>
        </div>
      </section>
    </div>
  );
}
