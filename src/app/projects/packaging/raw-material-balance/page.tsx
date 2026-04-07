"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { GlassCard } from "@/components/shared/GlassCard";
import { ModuleHeader } from "@/components/projects/material-control/ModuleHeader";
import { Modal } from "@/components/shared/Modal";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Plus,
  Trash2,
  Search,
  Package,
  RefreshCw,
  Calendar,
} from "lucide-react";
import {
  RawMaterialBalanceService,
  RawMaterialTransaction,
  InventoryBalanceRow,
} from "@/lib/firebase/services/rawMaterialBalance.service";
import { MaterialService } from "@/lib/firebase/services/material.service";
import { Material } from "@/types/material";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = "receiving" | "usage" | "inventory";

interface PackingReportRow {
  id: string;
  date: string;
  shipment?: string;
  packagingBreakdown?: Record<string, number>;
}

interface UsageRow {
  materialName: string;
  qty: number;
  unit: string;
  shipment: string;
  date: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  { value: "All", label: "All Months" },
  { value: "01", label: "January" }, { value: "02", label: "February" },
  { value: "03", label: "March" }, { value: "04", label: "April" },
  { value: "05", label: "May" }, { value: "06", label: "June" },
  { value: "07", label: "July" }, { value: "08", label: "August" },
  { value: "09", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

function fmtDate(d: string) {
  if (!d) return "—";
  if (d.includes("/")) {
    // Already DD/MM/YYYY
    return d;
  }
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function unitLabel(u: string) {
  return u === "m" ? "M" : "Pc";
}

function parseYearFromDate(dateStr: string): string | null {
  if (!dateStr) return null;
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    return parts.length === 3 ? parts[2] : null;
  }
  if (dateStr.includes("-")) return dateStr.split("-")[0];
  return null;
}

function parseMonthFromDate(dateStr: string): string | null {
  if (!dateStr) return null;
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    return parts.length === 3 ? parts[1].padStart(2, "0") : null;
  }
  if (dateStr.includes("-")) return dateStr.split("-")[1];
  return null;
}

// Map pkgBreakdown key → BOM document ID
// qty110x110x115 → MAT-PKG-110X110X115
// returnableQty → MAT-PKG-RETURNABLE
// warpQty → MAT-PKG-WARP
function pkgKeyToBomId(key: string): string {
  let clean = key;
  if (clean.toLowerCase().startsWith('qty')) {
    clean = clean.slice(3);
  } else if (clean.toLowerCase().endsWith('qty')) {
    clean = clean.slice(0, -3);
  }
  return `MAT-PKG-${clean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RawMaterialBalancePage() {
  // ── Data State ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>("receiving");
  const [receivingTx, setReceivingTx] = useState<RawMaterialTransaction[]>([]);
  const [packingReports, setPackingReports] = useState<PackingReportRow[]>([]);
  const [boms, setBoms] = useState<Material[]>([]);
  const [rawMaterials, setRawMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterJob, setFilterJob] = useState("");
  const [searchValue, setSearchValue] = useState("");

  // Add Receiving Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formJobOrder, setFormJobOrder] = useState("");
  const [formMaterial, setFormMaterial] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formUnit, setFormUnit] = useState<"pc" | "m">("pc");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<RawMaterialTransaction | null>(null);

  // Year options
  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    receivingTx.forEach(t => { const y = t.date.slice(0, 4); if (y) years.add(y); });
    packingReports.forEach(r => { const y = parseYearFromDate(r.date); if (y) years.add(y); });
    return ["All", ...Array.from(years).sort().reverse()];
  }, [receivingTx, packingReports]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [txResult, reportsSnap, bomData, allMats] = await Promise.all([
        RawMaterialBalanceService.getTransactions({ type: "receiving" }),
        getDocs(collection(db, "packaging_reports")),
        MaterialService.getBOMPackages(),
        MaterialService.getAllMaterials(),
      ]);

      setReceivingTx(txResult.data);
      setPackingReports(
        reportsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PackingReportRow))
      );
      setBoms(bomData);
      setRawMaterials(allMats.filter(m => m.category === "raw-material"));
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── BOM lookup ────────────────────────────────────────────────────────────
  const bomById = useMemo(() => {
    const map: Record<string, Material> = {};
    boms.forEach(b => { if (b.id) map[b.id] = b; });
    return map;
  }, [boms]);

  // ── Auto-calculate Usage from Packing Data × BOM ──────────────────────────
  const usageRows = useMemo((): UsageRow[] => {
    const rows: UsageRow[] = [];

    packingReports.forEach(report => {
      if (!report.packagingBreakdown) return;

      // Apply year/month/job filters on packing reports
      const reportYear = parseYearFromDate(report.date);
      const reportMonth = parseMonthFromDate(report.date);
      if (filterYear !== "All" && reportYear !== filterYear) return;
      if (filterMonth !== "All" && reportMonth !== filterMonth) return;
      if (filterJob && !(report.shipment || "").toLowerCase().includes(filterJob.toLowerCase())) return;

      Object.entries(report.packagingBreakdown).forEach(([pkgKey, pkgQty]) => {
        if (!pkgQty || pkgQty <= 0) return;
        const bomId = pkgKeyToBomId(pkgKey);
        const bom = bomById[bomId];
        if (!bom?.components) return;

        bom.components.forEach(comp => {
          const usedQty = comp.quantity * pkgQty;
          if (usedQty <= 0) return;

          const mat = rawMaterials.find(m => m.id === comp.materialId);
          const matName = mat ? mat.name : comp.materialId.replace("MAT-RAW-", "");
          const matUnit = mat ? mat.unit : "pc";

          // Apply search filter
          if (searchValue && !matName.toLowerCase().includes(searchValue.toLowerCase())) return;

          rows.push({
            materialName: matName,
            qty: Math.round(usedQty * 100) / 100,
            unit: matUnit,
            shipment: report.shipment || "—",
            date: report.date,
          });
        });
      });
    });

    // Sort by date descending
    rows.sort((a, b) => {
      const da = a.date.includes("/") ? a.date.split("/").reverse().join("-") : a.date;
      const db2 = b.date.includes("/") ? b.date.split("/").reverse().join("-") : b.date;
      return db2.localeCompare(da);
    });

    return rows;
  }, [packingReports, bomById, rawMaterials, filterYear, filterMonth, filterJob, searchValue]);

  // ── Aggregated usage per material (for Inventory) ─────────────────────────
  const usageTotals = useMemo(() => {
    const totals: Record<string, { qty: number; unit: string }> = {};
    // Use ALL packing data (no filter) for inventory balance
    packingReports.forEach(report => {
      if (!report.packagingBreakdown) return;
      Object.entries(report.packagingBreakdown).forEach(([pkgKey, pkgQty]) => {
        if (!pkgQty || pkgQty <= 0) return;
        const bomId = pkgKeyToBomId(pkgKey);
        const bom = bomById[bomId];
        if (!bom?.components) return;
        bom.components.forEach(comp => {
          const usedQty = comp.quantity * pkgQty;
          const mat = rawMaterials.find(m => m.id === comp.materialId);
          const matName = mat ? mat.name : comp.materialId.replace("MAT-RAW-", "");
          const matUnit = mat ? mat.unit : "pc";
          if (!totals[matName]) totals[matName] = { qty: 0, unit: matUnit };
          totals[matName].qty += usedQty;
        });
      });
    });
    return totals;
  }, [packingReports, bomById, rawMaterials]);

  // ── Receiving totals per material ─────────────────────────────────────────
  const receivingTotals = useMemo(() => {
    const totals: Record<string, { qty: number; unit: string; oldestDate: string | null }> = {};
    receivingTx.forEach(tx => {
      if (!totals[tx.materialName]) totals[tx.materialName] = { qty: 0, unit: tx.unit, oldestDate: null };
      totals[tx.materialName].qty += tx.qty;
      if (!totals[tx.materialName].oldestDate || tx.date < totals[tx.materialName].oldestDate!) {
        totals[tx.materialName].oldestDate = tx.date;
      }
    });
    return totals;
  }, [receivingTx]);

  // ── Inventory Balance = Receiving - Usage (from Packing×BOM) ──────────────
  const inventoryBalance = useMemo((): InventoryBalanceRow[] => {
    const allMaterialNames = new Set<string>();
    Object.keys(receivingTotals).forEach(n => allMaterialNames.add(n));
    Object.keys(usageTotals).forEach(n => allMaterialNames.add(n));

    return Array.from(allMaterialNames).map(name => {
      const recvInfo = receivingTotals[name];
      const usageInfo = usageTotals[name];
      const totalIn = recvInfo ? Math.round(recvInfo.qty * 100) / 100 : 0;
      const totalOut = usageInfo ? Math.round(usageInfo.qty * 100) / 100 : 0;
      const unit = recvInfo?.unit || usageInfo?.unit || "pc";
      return {
        materialName: name,
        unit,
        totalIn,
        totalOut,
        balance: Math.round((totalIn - totalOut) * 100) / 100,
        oldestLotDate: recvInfo?.oldestDate || null,
      };
    }).sort((a, b) => a.materialName.localeCompare(b.materialName));
  }, [receivingTotals, usageTotals]);

  // ── Statistics ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalIn = 0, totalOut = 0;
    Object.values(receivingTotals).forEach(v => { totalIn += v.qty; });
    Object.values(usageTotals).forEach(v => { totalOut += v.qty; });
    return {
      totalIn: Math.round(totalIn * 100) / 100,
      totalOut: Math.round(totalOut * 100) / 100,
      balance: Math.round((totalIn - totalOut) * 100) / 100,
    };
  }, [receivingTotals, usageTotals]);

  // ── Filtered Receiving ────────────────────────────────────────────────────
  const filteredReceiving = useMemo(() => {
    return receivingTx.filter(t => {
      const q = searchValue.toLowerCase();
      if (q && !t.materialName.toLowerCase().includes(q)) return false;
      if (filterYear !== "All" && !t.date.startsWith(filterYear)) return false;
      if (filterMonth !== "All" && t.date.slice(5, 7) !== filterMonth) return false;
      if (filterJob && !(t.jobOrder || "").toLowerCase().includes(filterJob.toLowerCase())) return false;
      return true;
    });
  }, [receivingTx, searchValue, filterYear, filterMonth, filterJob]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!formMaterial || !formQty) return;
    setSaving(true);
    await RawMaterialBalanceService.addReceiving({
      date: formDate,
      jobOrder: formJobOrder,
      materialName: formMaterial,
      qty: parseFloat(formQty),
      unit: formUnit,
      createdBy: "admin",
    });
    setSaving(false);
    setShowAddModal(false);
    resetForm();
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await RawMaterialBalanceService.deleteTransaction(deleteTarget.id);
    setDeleteTarget(null);
    fetchAll();
  };

  const resetForm = () => {
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormJobOrder("");
    setFormMaterial("");
    setFormQty("");
    setFormUnit("pc");
  };

  // ── Tab Config ────────────────────────────────────────────────────────────
  const TABS: { key: TabKey; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "receiving", label: "Receiving (รับเข้า)", icon: <ArrowDownToLine className="w-4 h-4" />, count: filteredReceiving.length },
    { key: "usage", label: "Usage (ใช้ไป)", icon: <ArrowUpFromLine className="w-4 h-4" />, count: usageRows.length },
    { key: "inventory", label: "Inventory (คงเหลือ)", icon: <Boxes className="w-4 h-4" />, count: inventoryBalance.length },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-20 bg-[#F6EDDE] relative overflow-hidden">
      <div className="absolute top-24 -left-16 w-72 h-72 bg-[#D4AA7D]/15 rounded-full blur-3xl" />
      <div className="absolute bottom-16 -right-16 w-80 h-80 bg-[#EFD09E]/25 rounded-full blur-3xl" />
      <section className="py-12 md:py-16">
        <div className="container-custom relative z-10">
          <ModuleHeader
            title="Raw Material Balance"
            description="จัดการวัตถุดิบ — รับเข้า (Manual), ใช้ไป (Auto จาก Packing × BOM), คงเหลือ"
          >
            <div className="space-y-6 mt-8">
              {/* ─── Summary Cards ──────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Total Receiving</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">{stats.totalIn.toLocaleString()}</h3>
                    <p className="text-xs text-emerald-600 mt-1 font-medium">รับเข้าทั้งหมด</p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-xl border border-emerald-200/60">
                    <ArrowDownToLine className="w-6 h-6 text-emerald-700" />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Total Usage</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">{stats.totalOut.toLocaleString()}</h3>
                    <p className="text-xs text-rose-500 mt-1 font-medium">ใช้ไปทั้งหมด (Auto จาก Packing×BOM)</p>
                  </div>
                  <div className="p-3 bg-rose-100 rounded-xl border border-rose-200/60">
                    <ArrowUpFromLine className="w-6 h-6 text-rose-600" />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Balance</p>
                    <h3 className={`text-2xl font-bold mt-1 group-hover:text-[#EFD09E] ${stats.balance >= 0 ? "text-[#272727]" : "text-rose-600"}`}>{stats.balance.toLocaleString()}</h3>
                    <p className="text-xs text-blue-500 mt-1 font-medium">คงเหลือ = รับเข้า − ใช้ไป</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <Package className="w-6 h-6 text-[#272727]" />
                  </div>
                </GlassCard>
              </div>

              {/* ─── Data Status Banner ──────────────────────────── */}
              {!loading && (
                <div className={`rounded-xl px-4 py-3 border flex flex-wrap items-center gap-3 text-sm ${
                  boms.length > 0 && packingReports.length > 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}>
                  <span className="text-base">{boms.length > 0 && packingReports.length > 0 ? "✅" : "⚠️"}</span>
                  <span className="font-semibold">Data Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${boms.length > 0 ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"}`}>
                    BOM: {boms.length} packages
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${packingReports.length > 0 ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"}`}>
                    Packing Reports: {packingReports.length} shipments
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${usageRows.length > 0 ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"}`}>
                    Usage Rows (Auto): {usageRows.length}
                  </span>
                  {(boms.length === 0 || packingReports.length === 0) && (
                    <span className="ml-auto text-xs text-amber-700">
                      {boms.length === 0 && (
                        <a href="/projects/packaging/database" className="underline font-semibold hover:text-amber-900">
                          → นำเข้า BOM ที่ Global Database
                        </a>
                      )}
                      {packingReports.length === 0 && boms.length > 0 && (
                        <a href="/projects/packaging/reports" className="underline font-semibold hover:text-amber-900">
                          → เพิ่ม Packing Report
                        </a>
                      )}
                    </span>
                  )}
                </div>
              )}

              <div className="flex border-b border-[#D4AA7D]/30">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${
                      activeTab === tab.key
                        ? "border-[#9ACD32] text-[#272727] bg-[#EFD09E]/30"
                        : "border-transparent text-[#7E5C4A]/70 hover:text-[#272727] hover:bg-[#EEF2F6]/60"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      activeTab === tab.key ? "bg-[#272727] text-[#EFD09E]" : "bg-[#D4AA7D]/30 text-[#7E5C4A]"
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* ─── Filter Bar ────────────────────────────────────── */}
              <GlassCard className="p-4 bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)]">
                <div className="flex flex-wrap items-end gap-4">
                  {/* Year */}
                  <div className="flex flex-col gap-1 min-w-[100px]">
                    <label className="text-[10px] font-black uppercase tracking-wide text-[#7E5C4A]/80">Year</label>
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                      className="px-3 py-2 bg-[#FDF6EC] border border-[#E8DCC9] rounded-lg text-sm text-[#7E5C4A] outline-none focus:ring-2 focus:ring-[#D4AA7D]/35">
                      {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  {/* Month */}
                  <div className="flex flex-col gap-1 min-w-[130px]">
                    <label className="text-[10px] font-black uppercase tracking-wide text-[#7E5C4A]/80">Month</label>
                    <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                      className="px-3 py-2 bg-[#FDF6EC] border border-[#E8DCC9] rounded-lg text-sm text-[#7E5C4A] outline-none focus:ring-2 focus:ring-[#D4AA7D]/35">
                      {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  {/* Job / Shipment */}
                  {activeTab !== "inventory" && (
                    <div className="flex flex-col gap-1 min-w-[140px]">
                      <label className="text-[10px] font-black uppercase tracking-wide text-[#7E5C4A]/80">
                        {activeTab === "receiving" ? "Job Order" : "Shipment"}
                      </label>
                      <input type="text"
                        placeholder={activeTab === "receiving" ? "Job #" : "Shipment #"}
                        value={filterJob} onChange={e => setFilterJob(e.target.value)}
                        className="px-3 py-2 bg-[#FDF6EC] border border-[#E8DCC9] rounded-lg text-sm text-[#7E5C4A] outline-none focus:ring-2 focus:ring-[#D4AA7D]/35" />
                    </div>
                  )}
                  {/* Search */}
                  <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                    <label className="text-[10px] font-black uppercase tracking-wide text-[#7E5C4A]/80">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7E5C4A]/50" />
                      <input type="text" placeholder="ค้นหาวัตถุดิบ..."
                        value={searchValue} onChange={e => setSearchValue(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#FDF6EC] border border-[#E8DCC9] rounded-lg text-sm text-[#7E5C4A] outline-none focus:ring-2 focus:ring-[#D4AA7D]/35" />
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={fetchAll}
                      className="p-2 bg-[#EEF2F6] border border-white/80 rounded-lg text-[#7E5C4A] hover:bg-white transition-colors" title="Refresh">
                      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                    {activeTab === "receiving" && (
                      <button onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="px-4 py-2 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg text-sm font-semibold transition-colors shadow-md shadow-[#272727]/20 border border-[#EFD09E]/20 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Receiving
                      </button>
                    )}
                  </div>
                </div>
                {/* Auto-calculation notice for Usage tab */}
                {activeTab === "usage" && (
                  <div className="mt-3 px-3 py-2 bg-[#EFD09E]/30 border border-[#D4AA7D]/25 rounded-lg text-xs text-[#7E5C4A] flex items-center gap-2">
                    <span className="text-[#9ACD32] text-sm">⚡</span>
                    ข้อมูลการใช้วัตถุดิบคำนวณ <span className="font-bold">อัตโนมัติ</span> จาก Packing Data × BOM — ไม่ต้องกรอกเอง
                  </div>
                )}
              </GlassCard>

              {/* ─── Data Table ─────────────────────────────────────── */}
              {loading ? (
                <GlassCard className="p-12 bg-[#EEF2F6]/95 border border-white/80 text-center">
                  <RefreshCw className="w-8 h-8 text-[#D4AA7D] mx-auto animate-spin" />
                  <p className="text-[#7E5C4A] mt-3 text-sm">Loading...</p>
                </GlassCard>
              ) : activeTab === "receiving" ? (
                /* ─── RECEIVING TAB ──────────────────────────── */
                <GlassCard className="overflow-hidden bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#D4AA7D] text-[#272727] border-b border-[#7E5C4A]/25">
                        <tr>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider">#</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider">Job Order</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider">Description</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-right">QTY</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-center">Unit</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-center w-14"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReceiving.length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-12 text-center text-[#7E5C4A]/60">ไม่พบข้อมูลรับเข้า — กดปุ่ม &quot;Add Receiving&quot; เพื่อเริ่มต้น</td></tr>
                        ) : filteredReceiving.map((row, idx) => (
                          <tr key={row.id} className="border-b border-[#EEF2F6] last:border-0 hover:bg-[#272727] group transition-colors">
                            <td className="px-4 py-3 text-[#8C9AAA] text-xs font-bold group-hover:text-[#EFD09E]/60">{idx + 1}</td>
                            <td className="px-4 py-3 text-[#34495E] font-medium group-hover:text-[#EFD09E]">{fmtDate(row.date)}</td>
                            <td className="px-4 py-3 group-hover:text-[#EFD09E]">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#EFD09E]/50 text-[#272727] border border-[#D4AA7D]/30 group-hover:bg-[#EFD09E]/25 group-hover:text-[#EFD09E]">
                                {row.jobOrder || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-[#34495E] group-hover:text-[#EFD09E]">{row.materialName}</td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-600 group-hover:text-emerald-400">
                              +{row.qty.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-[10px] font-bold text-[#8C9AAA] uppercase group-hover:text-[#EFD09E]/60">{unitLabel(row.unit)}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => setDeleteTarget(row)}
                                className="p-1.5 rounded-lg text-[#8C9AAA] hover:bg-rose-100 hover:text-rose-600 transition-colors group-hover:text-rose-400">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 bg-[#EEF2F6]/50 border-t border-[#D4AA7D]/15 text-xs text-[#7E5C4A]/60">
                    {filteredReceiving.length} records
                  </div>
                </GlassCard>
              ) : activeTab === "usage" ? (
                /* ─── USAGE TAB (Auto from Packing×BOM) ──────── */
                <GlassCard className="overflow-hidden bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#D4AA7D] text-[#272727] border-b border-[#7E5C4A]/25">
                        <tr>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider">#</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider">Shipment</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider">Description</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-right">QTY</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-center">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageRows.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-12 text-center text-[#7E5C4A]/60">ไม่พบข้อมูลการใช้ — ตรวจสอบว่ามี Packing Data และ BOM ในระบบ</td></tr>
                        ) : usageRows.map((row, idx) => (
                          <tr key={`${row.shipment}-${row.materialName}-${idx}`} className="border-b border-[#EEF2F6] last:border-0 hover:bg-[#272727] group transition-colors">
                            <td className="px-4 py-3 text-[#8C9AAA] text-xs font-bold group-hover:text-[#EFD09E]/60">{idx + 1}</td>
                            <td className="px-4 py-3 text-[#34495E] font-medium group-hover:text-[#EFD09E]">{fmtDate(row.date)}</td>
                            <td className="px-4 py-3 group-hover:text-[#EFD09E]">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100 group-hover:bg-rose-500/20 group-hover:text-rose-300">
                                {row.shipment}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-[#34495E] group-hover:text-[#EFD09E]">{row.materialName}</td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums text-rose-500 group-hover:text-rose-400">
                              -{row.qty.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-[10px] font-bold text-[#8C9AAA] uppercase group-hover:text-[#EFD09E]/60">{unitLabel(row.unit)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 bg-[#EEF2F6]/50 border-t border-[#D4AA7D]/15 text-xs text-[#7E5C4A]/60">
                    {usageRows.length} records (auto-calculated from Packing × BOM)
                  </div>
                </GlassCard>
              ) : (
                /* ─── INVENTORY TAB ──────────────────────────── */
                <GlassCard className="overflow-hidden bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#D4AA7D] text-[#272727] border-b border-[#7E5C4A]/25">
                        <tr>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider">#</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider">Description</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-right">Total In</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-right">Total Out</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-right">Balance</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-center">Unit</th>
                          <th className="px-4 py-3 font-black text-xs uppercase tracking-wider text-center">Oldest Lot</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryBalance.length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-12 text-center text-[#7E5C4A]/60">ยังไม่มีข้อมูลวัตถุดิบ</td></tr>
                        ) : inventoryBalance
                          .filter(row => !searchValue || row.materialName.toLowerCase().includes(searchValue.toLowerCase()))
                          .map((row, idx) => (
                          <tr key={row.materialName} className="border-b border-[#EEF2F6] last:border-0 hover:bg-[#272727] group transition-colors">
                            <td className="px-4 py-3 text-[#8C9AAA] text-xs font-bold group-hover:text-[#EFD09E]/60">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-[#34495E] group-hover:text-[#EFD09E]">{row.materialName}</td>
                            <td className="px-4 py-3 text-right text-emerald-600 font-bold tabular-nums group-hover:text-emerald-400">
                              +{row.totalIn.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-rose-500 font-bold tabular-nums group-hover:text-rose-400">
                              -{row.totalOut.toLocaleString()}
                            </td>
                            <td className={`px-4 py-3 text-right font-black tabular-nums text-lg group-hover:text-[#EFD09E] ${row.balance >= 0 ? "text-[#272727]" : "text-rose-600"}`}>
                              {row.balance.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#EFD09E]/60 text-[#272727] border border-[#D4AA7D]/35 uppercase group-hover:bg-[#EFD09E]/30 group-hover:text-[#EFD09E]">
                                {unitLabel(row.unit)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-[#7E5C4A] group-hover:text-[#EFD09E]/70">
                              {row.oldestLotDate ? (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {fmtDate(row.oldestLotDate)}
                                </span>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 bg-[#EEF2F6]/50 border-t border-[#D4AA7D]/15 text-xs text-[#7E5C4A]/60">
                    {inventoryBalance.length} materials • Balance = Receiving (manual) − Usage (auto from Packing×BOM)
                  </div>
                </GlassCard>
              )}
            </div>
          </ModuleHeader>

          {/* ─── Add Receiving Modal ──────────────────────────────── */}
          <Modal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            title="Add Receiving Record (รับเข้า)"
            className="md:max-w-lg"
          >
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#7E5C4A] uppercase">Date</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#EEF2F6]/80 border border-white/80 rounded-lg text-sm text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#7E5C4A] uppercase">Job Order</label>
                <input type="text" placeholder="e.g. JOB-2026-001" value={formJobOrder} onChange={e => setFormJobOrder(e.target.value)}
                  className="w-full px-3 py-2 bg-[#EEF2F6]/80 border border-white/80 rounded-lg text-sm text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#7E5C4A] uppercase">Description (Raw Material)</label>
                {rawMaterials.length > 0 ? (
                  <select value={formMaterial}
                    onChange={e => {
                      setFormMaterial(e.target.value);
                      const mat = rawMaterials.find(m => m.name === e.target.value);
                      if (mat) setFormUnit(mat.unit === "m" ? "m" : "pc");
                    }}
                    className="w-full px-3 py-2 bg-[#EEF2F6]/80 border border-white/80 rounded-lg text-sm text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/20">
                    <option value="">Select Material...</option>
                    {rawMaterials.map(m => (
                      <option key={m.id} value={m.name}>{m.name} ({unitLabel(m.unit)})</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" placeholder="Material Name" value={formMaterial} onChange={e => setFormMaterial(e.target.value)}
                    className="w-full px-3 py-2 bg-[#EEF2F6]/80 border border-white/80 rounded-lg text-sm text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/20" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#7E5C4A] uppercase">QTY</label>
                  <input type="number" step="0.01" min="0" placeholder="0" value={formQty} onChange={e => setFormQty(e.target.value)}
                    className="w-full px-3 py-2 bg-[#EEF2F6]/80 border border-white/80 rounded-lg text-sm text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#7E5C4A] uppercase">Unit</label>
                  <select value={formUnit} onChange={e => setFormUnit(e.target.value as "pc" | "m")}
                    className="w-full px-3 py-2 bg-[#EEF2F6]/80 border border-white/80 rounded-lg text-sm text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/20">
                    <option value="pc">Pc</option>
                    <option value="m">M (Meter)</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 border-t border-[#D4AA7D]/25 flex gap-3">
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-[#EEF2F6] border border-white/80 text-[#7E5C4A] hover:bg-white rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button onClick={handleAdd} disabled={saving || !formMaterial || !formQty}
                  className="flex-1 py-2.5 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg font-medium transition-colors shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20 disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </Modal>

          {/* ─── Delete Confirmation ──────────────────────────────── */}
          <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete" className="md:max-w-sm">
            <div className="space-y-4">
              <p className="text-sm text-[#7E5C4A]">
                ต้องการลบรายการ <span className="font-bold text-[#272727]">{deleteTarget?.materialName}</span>{" "}
                จำนวน <span className="font-bold text-[#272727]">{deleteTarget?.qty}</span> หรือไม่?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 bg-[#EEF2F6] border border-white/80 text-[#7E5C4A] hover:bg-white rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors shadow-lg">
                  Delete
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </section>
    </div>
  );
}
