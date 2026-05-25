"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, ArrowUpFromLine, RefreshCw } from "lucide-react";
import { MaterialService } from "@/lib/firebase/services/material.service";
import type { Material } from "@/types/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { GlassCard } from "@/components/shared/GlassCard";

interface PackingReportRow {
  id?: string;
  date: string;
  shipment: string;
  packagingBreakdown?: Record<string, number>;
}

interface UsageRow {
  materialName: string;
  qty: number;
  unit: string;
  shipment: string;
  date: string;
}

function fmtDate(d: string) {
  if (!d) return "—";
  if (d.includes("/")) return d;
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

function pkgKeyToBomId(key: string): string {
  let clean = key;
  if (clean.toLowerCase().startsWith('qty')) {
    clean = clean.slice(3);
  } else if (clean.toLowerCase().endsWith('qty')) {
    clean = clean.slice(0, -3);
  }
  return `MAT-PKG-${clean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
}

const MONTHS = [
  { value: "All", label: "All Months" },
  { value: "01", label: "January" }, { value: "02", label: "February" },
  { value: "03", label: "March" }, { value: "04", label: "April" },
  { value: "05", label: "May" }, { value: "06", label: "June" },
  { value: "07", label: "July" }, { value: "08", label: "August" },
  { value: "09", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

function getSpecialRolls(name: string, value: number): string | null {
  const n = name.toLowerCase();
  if (n.includes("plastic warp") || n.includes("plastic wrap")) {
    const rolls = Math.round((value / 300) * 100) / 100;
    return `${rolls} ม้วน`;
  }
  if (n.includes("white composite strap")) {
    const rolls = Math.round((value / 16) * 100) / 100;
    return `${rolls} ม้วน`;
  }
  return null;
}

export function RawMaterialUsageTab() {
  const [packingReports, setPackingReports] = useState<PackingReportRow[]>([]);
  const [boms, setBoms] = useState<Material[]>([]);
  const [rawMaterials, setRawMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterJob, setFilterJob] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsSnap, bomData, allMats] = await Promise.all([
        getDocs(collection(db, "packaging_reports")),
        MaterialService.getBOMPackages(),
        MaterialService.getAllMaterials(),
      ]);

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

  const bomById = useMemo(() => {
    const map: Record<string, Material> = {};
    boms.forEach(b => { if (b.id) map[b.id] = b; });
    return map;
  }, [boms]);

  const usageRows = useMemo((): UsageRow[] => {
    const rows: UsageRow[] = [];

    packingReports.forEach(report => {
      if (!report.packagingBreakdown) return;

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

        bom.components.forEach((comp: { quantity: number; materialId: string }) => {
          const usedQty = comp.quantity * pkgQty;
          if (usedQty <= 0) return;

          const mat = rawMaterials.find(m => m.id === comp.materialId);
          const matName = mat ? mat.name : comp.materialId.replace("MAT-RAW-", "");
          const matUnit = mat ? mat.unit : "pc";

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

    rows.sort((a, b) => {
      const da = a.date.includes("/") ? a.date.split("/").reverse().join("-") : a.date;
      const db2 = b.date.includes("/") ? b.date.split("/").reverse().join("-") : b.date;
      return db2.localeCompare(da);
    });

    return rows;
  }, [packingReports, bomById, rawMaterials, filterYear, filterMonth, filterJob, searchValue]);

  const filteredUsageTotals = useMemo(() => {
    const totals: Record<string, { qty: number; unit: string }> = {};
    usageRows.forEach(row => {
      if (!totals[row.materialName]) totals[row.materialName] = { qty: 0, unit: row.unit };
      totals[row.materialName].qty += row.qty;
    });
    return Object.entries(totals)
      .map(([name, info]) => ({ materialName: name, ...info }))
      .sort((a, b) => b.qty - a.qty);
  }, [usageRows]);

  const stats = useMemo(() => {
    let totalOut = 0;
    filteredUsageTotals.forEach(v => { totalOut += v.qty; });
    return {
      totalOut: Math.round(totalOut * 100) / 100
    };
  }, [filteredUsageTotals]);

  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    packingReports.forEach(r => { const y = parseYearFromDate(r.date); if (y) years.add(y); });
    return ["All", ...Array.from(years).sort().reverse()];
  }, [packingReports]);

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
            <div>
              <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Total Usage</p>
              <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">{stats.totalOut.toLocaleString()}</h3>
              <p className="text-xs text-rose-500 mt-1 font-medium">คำนวณอัตโนมัติตาม Pack × BOM</p>
            </div>
            <div className="p-3 bg-rose-100 rounded-xl border border-rose-200/60">
              <ArrowUpFromLine className="w-6 h-6 text-rose-600" />
            </div>
          </GlassCard>
        </div>

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
          </div>
        )}

        <GlassCard className="p-4 bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)]">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1 min-w-[100px]">
              <label className="text-[10px] font-black uppercase tracking-wide text-[#7E5C4A]/80">Year</label>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                className="px-3 py-2 bg-[#FDF6EC] border border-[#E8DCC9] rounded-lg text-sm text-[#7E5C4A] outline-none focus:ring-2 focus:ring-[#D4AA7D]/35">
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-[130px]">
              <label className="text-[10px] font-black uppercase tracking-wide text-[#7E5C4A]/80">Month</label>
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="px-3 py-2 bg-[#FDF6EC] border border-[#E8DCC9] rounded-lg text-sm text-[#7E5C4A] outline-none focus:ring-2 focus:ring-[#D4AA7D]/35">
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-[10px] font-black uppercase tracking-wide text-[#7E5C4A]/80">Shipment</label>
              <input type="text" placeholder="Shipment #" value={filterJob} onChange={e => setFilterJob(e.target.value)}
                className="px-3 py-2 bg-[#FDF6EC] border border-[#E8DCC9] rounded-lg text-sm text-[#7E5C4A] outline-none focus:ring-2 focus:ring-[#D4AA7D]/35" />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-[10px] font-black uppercase tracking-wide text-[#7E5C4A]/80">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7E5C4A]/50" />
                <input type="text" placeholder="ค้นหาวัตถุดิบ..."
                  value={searchValue} onChange={e => setSearchValue(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#FDF6EC] border border-[#E8DCC9] rounded-lg text-sm text-[#7E5C4A] outline-none focus:ring-2 focus:ring-[#D4AA7D]/35" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchAll}
                className="p-2 bg-[#EEF2F6] border border-white/80 rounded-lg text-[#7E5C4A] hover:bg-white transition-colors" title="Refresh">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <div className="mt-3 px-3 py-2 bg-[#EFD09E]/30 border border-[#D4AA7D]/25 rounded-lg text-xs text-[#7E5C4A] flex items-center gap-2">
            <span className="text-[#9ACD32] text-sm">⚡</span>
            ข้อมูลการใช้วัตถุดิบคำนวณ <span className="font-bold">อัตโนมัติ</span> จาก Packing Data × BOM — ไม่ต้องกรอกเอง
          </div>
        </GlassCard>

        {loading ? (
          <GlassCard className="p-12 bg-[#EEF2F6]/95 border border-white/80 text-center">
            <RefreshCw className="w-8 h-8 text-[#D4AA7D] mx-auto animate-spin" />
            <p className="text-[#7E5C4A] mt-3 text-sm">Loading...</p>
          </GlassCard>
        ) : (
          <GlassCard className="overflow-hidden bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)]">
            {filteredUsageTotals.length > 0 && (
              <div className="p-4 bg-white/40 border-b border-[#D4AA7D]/15">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#7E5C4A] mb-3">Usage Summary (Filtered)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredUsageTotals.map(t => (
                    <div key={t.materialName} className="p-3 bg-white/80 rounded-xl border border-white/60 shadow-sm flex flex-col gap-1 items-start">
                      <span className="text-[10px] font-bold text-[#8C9AAA] uppercase line-clamp-1 truncate w-full" title={t.materialName}>
                        {t.materialName}
                      </span>
                      <div className="flex flex-col mt-0.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-black text-rose-600 tabular-nums">
                            {t.qty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-bold text-[#8C9AAA] uppercase">{unitLabel(t.unit)}</span>
                        </div>
                        {getSpecialRolls(t.materialName, t.qty) && (
                          <span className="text-[10px] font-bold text-rose-500 mt-0.5">
                            ({getSpecialRolls(t.materialName, t.qty)})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                        {getSpecialRolls(row.materialName, row.qty) && (
                          <div className="text-[10px] font-medium text-rose-400">({getSpecialRolls(row.materialName, row.qty)})</div>
                        )}
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
        )}
      </div>
    </>
  );
}
