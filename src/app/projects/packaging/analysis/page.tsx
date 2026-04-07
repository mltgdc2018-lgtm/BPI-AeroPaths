"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { MaterialService } from "@/lib/firebase/services/material.service";
import { Material } from "@/types/material";
import { GlassCard } from "@/components/shared/GlassCard";
import { ModuleHeader } from "@/components/projects/material-control/ModuleHeader";
import { BarChart2, Package, RefreshCw, Layers } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PackingReportRow {
  id: string;
  date: string; // "DD/MM/YYYY" or "YYYY-MM-DD"
  shipment?: string;
  customerName?: string;
  consigneeName?: string;
  product?: string;
  packagingBreakdown?: Record<string, number>;
}

interface MaterialUsageRow {
  materialId: string;
  materialName: string;
  totalQty: number;
  unit: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseYear(dateStr: string): number | null {
  if (!dateStr) return null;
  // DD/MM/YYYY
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    return parts.length === 3 ? parseInt(parts[2]) : null;
  }
  // YYYY-MM-DD
  if (dateStr.includes("-")) {
    return parseInt(dateStr.split("-")[0]);
  }
  return null;
}

function parseMonth(dateStr: string): number | null {
  if (!dateStr) return null;
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    return parts.length === 3 ? parseInt(parts[1]) : null;
  }
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    return parts.length >= 2 ? parseInt(parts[1]) : null;
  }
  return null;
}

// Map PackagingBreakdown key → BOM document id
// e.g. "qty110x110x115" → "MAT-PKG-110X110X115"
// e.g. "returnableQty" → "MAT-PKG-RETURNABLE"
// e.g. "warpQty" → "MAT-PKG-WARP"
function pkgKeyToBomId(key: string): string {
  // Strip leading 'qty' (case-insensitive) OR trailing 'Qty'
  let clean = key;
  if (clean.toLowerCase().startsWith('qty')) {
    clean = clean.slice(3); // e.g. "qty110x110x115" → "110x110x115"
  } else if (clean.toLowerCase().endsWith('qty')) {
    clean = clean.slice(0, -3); // e.g. "returnableQty" → "returnable"
  }
  return `MAT-PKG-${clean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
}

// Map raw material name-based ID back to display name 
function getRawMaterialData(id: string, rawMaterials: Material[]): { name: string; unit: string } {
  const found = rawMaterials.find(m => m.id === id);
  const rawName = found ? found.name : id.replace("MAT-RAW-", "");
  const unitCode = found ? found.unit : 'pc';
  // Capitalize for UI as per user request (M, Pc)
  const displayUnit = unitCode === 'm' ? 'M' : unitCode === 'pc' ? 'Pc' : unitCode;
  return { name: rawName, unit: displayUnit };
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PackagingAnalysisPage() {
  const [reports, setReports] = useState<PackingReportRow[]>([]);
  const [boms, setBoms] = useState<Material[]>([]);
  const [rawMaterials, setRawMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterJob, setFilterJob] = useState<string>("all");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch reports
      const snap = await getDocs(collection(db, "packaging_reports"));
      const rows: PackingReportRow[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as PackingReportRow));
      setReports(rows);

      // 2. Fetch BOM packages
      const bomData = await MaterialService.getBOMPackages();
      setBoms(bomData);

      // 3. Fetch raw materials
      const allMats = await MaterialService.getAllMaterials();
      setRawMaterials(allMats.filter(m => m.category === "raw-material"));
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Unique values for filters
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    reports.forEach(r => {
      const y = parseYear(r.date);
      if (y) years.add(String(y));
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [reports]);

  const availableJobs = useMemo(() => {
    const jobs = new Set<string>();
    reports.forEach(r => {
      if (r.shipment) jobs.add(r.shipment);
    });
    return Array.from(jobs).sort();
  }, [reports]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return reports.filter(r => {
      if (filterYear !== "all" && String(parseYear(r.date)) !== filterYear) return false;
      if (filterMonth !== "all" && String(parseMonth(r.date)) !== filterMonth) return false;
      if (filterJob !== "all" && r.shipment !== filterJob) return false;
      return true;
    });
  }, [reports, filterYear, filterMonth, filterJob]);

  // Build BOM lookup: { [bomId]: Material }
  const bomById = useMemo(() => {
    const map: Record<string, Material> = {};
    boms.forEach(b => { if (b.id) map[b.id] = b; });
    return map;
  }, [boms]);

  // Compute raw material usage from filtered rows
  const materialUsage = useMemo((): MaterialUsageRow[] => {
    const totals: Record<string, number> = {};

    filteredRows.forEach(row => {
      if (!row.packagingBreakdown) return;

      Object.entries(row.packagingBreakdown).forEach(([pkgKey, pkgQty]) => {
        if (!pkgQty || pkgQty <= 0) return;

        const bomId = pkgKeyToBomId(pkgKey);
        const bom = bomById[bomId];
        if (!bom?.components) return;

        bom.components.forEach(comp => {
          const usedQty = comp.quantity * pkgQty;
          totals[comp.materialId] = (totals[comp.materialId] || 0) + usedQty;
        });
      });
    });

    return Object.entries(totals)
      .map(([materialId, totalQty]) => {
        const { name, unit } = getRawMaterialData(materialId, rawMaterials);
        return {
          materialId,
          materialName: name,
          unit: unit,
          totalQty: Math.round(totalQty * 100) / 100,
        };
      })
      .sort((a, b) => b.totalQty - a.totalQty);
  }, [filteredRows, bomById, rawMaterials]);

  // Summary stats
  const totalItems = materialUsage.reduce((s, r) => s + r.totalQty, 0);
  const topMaterial = materialUsage[0];

  return (
    <div className="min-h-screen bg-[#F6EDDE] pt-20 pb-16">
      <section className="py-12">
        <div className="container-custom">
          <ModuleHeader
            title="Raw Material Usage"
            description="Analyze how much raw material is consumed per shipment, month, or year based on packaging records and BOM data."
            backHref="/projects/packaging"
            backLabel="Packaging Console"
            backLinkVariant="packaging"
          />

          {/* ── Filters ────────────────────────────────────────── */}
          <GlassCard className="p-5 bg-white/70 border border-[#D4AA7D]/35 mt-8 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Year */}
              <div className="flex flex-col gap-1 min-w-[120px]">
                <label className="text-xs font-black uppercase text-[#7E5C4A]/80 tracking-wider">Year</label>
                <select
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  className="rounded-lg border border-[#D4AA7D]/40 bg-white/60 px-3 py-2 text-sm font-semibold text-[#34495E]"
                >
                  <option value="all">All Years</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Month */}
              <div className="flex flex-col gap-1 min-w-[140px]">
                <label className="text-xs font-black uppercase text-[#7E5C4A]/80 tracking-wider">Month</label>
                <select
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                  className="rounded-lg border border-[#D4AA7D]/40 bg-white/60 px-3 py-2 text-sm font-semibold text-[#34495E]"
                >
                  <option value="all">All Months</option>
                  {MONTHS.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                </select>
              </div>

              {/* Job (Shipment) */}
              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className="text-xs font-black uppercase text-[#7E5C4A]/80 tracking-wider">Job / Shipment</label>
                <select
                  value={filterJob}
                  onChange={e => setFilterJob(e.target.value)}
                  className="rounded-lg border border-[#D4AA7D]/40 bg-white/60 px-3 py-2 text-sm font-semibold text-[#34495E]"
                >
                  <option value="all">All Jobs</option>
                  {availableJobs.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>

              {/* Reset */}
              <button
                onClick={() => { setFilterYear("all"); setFilterMonth("all"); setFilterJob("all"); }}
                className="px-4 py-2 rounded-lg border border-[#D4AA7D]/40 text-[#7E5C4A] text-sm font-semibold hover:bg-[#F6EDDE] flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </button>

              <div className="ml-auto text-sm font-semibold text-[#7E5C4A]/70">
                {filteredRows.length} record{filteredRows.length !== 1 ? "s" : ""} matched
              </div>
            </div>
          </GlassCard>

          {/* ── Summary Cards ──────────────────────────────────── */}
          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <GlassCard className="p-5 bg-white/70 border border-[#D4AA7D]/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black uppercase tracking-wider text-[#7E5C4A]/80">Shipments Analyzed</p>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#272727]/10 text-[#272727]"><Layers className="h-4 w-4" /></span>
                </div>
                <p className="text-4xl font-black text-[#34495E]">{filteredRows.length.toLocaleString()}</p>
              </GlassCard>
              <GlassCard className="p-5 bg-white/70 border border-[#D4AA7D]/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black uppercase tracking-wider text-[#7E5C4A]/80">Total Material Used</p>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#9A7656]/20 text-[#9A7656]"><BarChart2 className="h-4 w-4" /></span>
                </div>
                <p className="text-4xl font-black text-[#34495E]">{Math.round(totalItems).toLocaleString()}</p>
                <p className="text-xs text-[#7E5C4A]/60 mt-1">units across {materialUsage.length} materials</p>
              </GlassCard>
              <GlassCard className="p-5 bg-white/70 border border-[#D4AA7D]/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black uppercase tracking-wider text-[#7E5C4A]/80">Most Used Material</p>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#E9C46A]/20 text-[#E9C46A]"><Package className="h-4 w-4" /></span>
                </div>
                {topMaterial ? (
                  <>
                    <p className="text-lg font-black text-[#34495E] leading-tight truncate">{topMaterial.materialName}</p>
                    <p className="text-sm text-[#7E5C4A]/70">{topMaterial.totalQty.toLocaleString()} {topMaterial.unit}</p>
                  </>
                ) : (
                  <p className="text-sm text-[#7E5C4A]/60">—</p>
                )}
              </GlassCard>
            </div>
          )}

          {/* ── Data Table ─────────────────────────────────────── */}
          <GlassCard className="p-6 bg-white/70 border border-[#D4AA7D]/35">
            <div className="flex items-center gap-2 mb-5 text-[#7E5C4A]">
              <BarChart2 className="w-5 h-5" />
              <h2 className="text-lg font-bold">Raw Material Consumption</h2>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 opacity-50">
                <RefreshCw className="w-10 h-10 text-[#7E5C4A] animate-spin mb-3" />
                <p className="text-[#7E5C4A] text-sm">Calculating usage...</p>
              </div>
            ) : materialUsage.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-[#D4AA7D]/30 rounded-2xl">
                <p className="text-[#7E5C4A] text-sm font-medium">No material usage data found.</p>
                <p className="text-[#7E5C4A]/60 text-xs mt-1">Make sure the BOM database is initialized and packaging records have been entered.</p>
              </div>
            ) : (
              <>
                {/* Bar chart visual */}
                <div className="space-y-2.5 mb-6">
                  {materialUsage.slice(0, 15).map(row => {
                    const pct = totalItems > 0 ? (row.totalQty / materialUsage[0].totalQty) * 100 : 0;
                    return (
                      <div key={row.materialId} className="flex items-center gap-3">
                        <span className="text-xs text-[#5D6D7E] w-48 truncate shrink-0">{row.materialName}</span>
                        <div className="flex-1 bg-[#EEF2F6] rounded-full h-4 overflow-hidden">
                          <div
                            className="h-4 rounded-full bg-gradient-to-r from-[#7E5C4A] to-[#D4AA7D] transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-[#34495E] w-24 text-right tabular-nums">
                          {row.totalQty.toLocaleString()} {row.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Full table */}
                <div className="overflow-x-auto rounded-xl border border-[#EEF2F6]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#EEF2F6]">
                        <th className="text-left px-4 py-3 text-xs font-black uppercase text-[#8C9AAA] tracking-wider">#</th>
                        <th className="text-left px-4 py-3 text-xs font-black uppercase text-[#8C9AAA] tracking-wider">Raw Material</th>
                        <th className="text-right px-4 py-3 text-xs font-black uppercase text-[#8C9AAA] tracking-wider">Total Used</th>
                        <th className="text-right px-4 py-3 text-xs font-black uppercase text-[#8C9AAA] tracking-wider">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialUsage.map((row, idx) => {
                        const pct = totalItems > 0 ? (row.totalQty / totalItems) * 100 : 0;
                        return (
                          <tr key={row.materialId} className="border-b border-[#EEF2F6] last:border-0 hover:bg-[#F8FAFC] transition-colors">
                            <td className="px-4 py-3 text-[#8C9AAA] text-xs font-bold">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-[#34495E]">{row.materialName}</td>
                            <td className="px-4 py-3 text-right font-bold text-[#34495E] tabular-nums">
                              {row.totalQty.toLocaleString()} <span className="text-[10px] text-[#8C9AAA] ml-1 uppercase">{row.unit}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-[#7E5C4A] tabular-nums">{pct.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#F8FAFC] border-t-2 border-[#D4AA7D]/30">
                        <td colSpan={2} className="px-4 py-3 font-black text-[#34495E] text-xs uppercase">Total</td>
                        <td className="px-4 py-3 text-right font-black text-[#34495E] tabular-nums">{Math.round(totalItems).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-black text-[#34495E]">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </GlassCard>

        </div>
      </section>
    </div>
  );
}
