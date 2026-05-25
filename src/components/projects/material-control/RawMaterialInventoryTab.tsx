"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, Package, RefreshCw, Calendar } from "lucide-react";
import { RawMaterialBalanceService } from "@/lib/firebase/services/rawMaterialBalance.service";
import type { RawMaterialTransaction } from "@/lib/firebase/services/rawMaterialBalance.service";
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

interface InventoryBalanceRow {
  materialName: string;
  unit: string;
  totalIn: number;
  totalOut: number;
  balance: number;
  oldestLotDate: string | null;
  minStock: number;
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

function pkgKeyToBomId(key: string): string {
  let clean = key;
  if (clean.toLowerCase().startsWith('qty')) {
    clean = clean.slice(3);
  } else if (clean.toLowerCase().endsWith('qty')) {
    clean = clean.slice(0, -3);
  }
  return `MAT-PKG-${clean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
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

export function RawMaterialInventoryTab() {
  const [receivingTx, setReceivingTx] = useState<RawMaterialTransaction[]>([]);
  const [packingReports, setPackingReports] = useState<PackingReportRow[]>([]);
  const [boms, setBoms] = useState<Material[]>([]);
  const [rawMaterials, setRawMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState("All");
  const [lowStockOnly, setLowStockOnly] = useState(false);

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

  const bomById = useMemo(() => {
    const map: Record<string, Material> = {};
    boms.forEach(b => { if (b.id) map[b.id] = b; });
    return map;
  }, [boms]);

  const usageTotals = useMemo(() => {
    const totals: Record<string, { qty: number; unit: string }> = {};
    packingReports.forEach(report => {
      const year = parseYearFromDate(report.date);
      const month = parseMonthFromDate(report.date);
      if (filterYear !== "All" && year !== filterYear) return;
      if (filterMonth !== "All" && month !== filterMonth) return;

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
  }, [packingReports, bomById, rawMaterials, filterYear, filterMonth]);

  const receivingTotals = useMemo(() => {
    const totals: Record<string, { qty: number; unit: string; oldestDate: string | null }> = {};
    receivingTx.forEach(tx => {
      const year = parseYearFromDate(tx.date);
      const month = parseMonthFromDate(tx.date);
      if (filterYear !== "All" && year !== filterYear) return;
      if (filterMonth !== "All" && month !== filterMonth) return;

      if (!totals[tx.materialName]) totals[tx.materialName] = { qty: 0, unit: tx.unit, oldestDate: null };
      totals[tx.materialName].qty += tx.qty;
      if (!totals[tx.materialName].oldestDate || tx.date < totals[tx.materialName].oldestDate!) {
        totals[tx.materialName].oldestDate = tx.date;
      }
    });
    return totals;
  }, [receivingTx, filterYear, filterMonth]);

  const inventoryBalance = useMemo((): InventoryBalanceRow[] => {
    const allMaterialNames = new Set<string>();
    Object.keys(receivingTotals).forEach(n => allMaterialNames.add(n));
    Object.keys(usageTotals).forEach(n => allMaterialNames.add(n));

    return Array.from(allMaterialNames).map(name => {
      const recvInfo = receivingTotals[name];
      const usageInfo = usageTotals[name];
      const mat = rawMaterials.find(m => m.name === name);
      const minStock = mat ? (mat.minStock || 0) : 0;
      const totalIn = recvInfo ? Math.round(recvInfo.qty * 100) / 100 : 0;
      const totalOut = usageInfo ? Math.round(usageInfo.qty * 100) / 100 : 0;
      const unit = recvInfo?.unit || usageInfo?.unit || mat?.unit || "pc";
      return {
        materialName: name,
        unit,
        totalIn,
        totalOut,
        balance: Math.round((totalIn - totalOut) * 100) / 100,
        oldestLotDate: recvInfo?.oldestDate || null,
        minStock,
      };
    }).sort((a, b) => a.materialName.localeCompare(b.materialName));
  }, [receivingTotals, usageTotals, rawMaterials]);

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

  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    receivingTx.forEach(t => { const y = parseYearFromDate(t.date); if (y) years.add(y); });
    packingReports.forEach(r => { const y = parseYearFromDate(r.date); if (y) years.add(y); });
    return ["All", ...Array.from(years).sort().reverse()];
  }, [receivingTx, packingReports]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-[10px] font-black uppercase tracking-wide text-[#7E5C4A]/80">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7E5C4A]/50" />
              <input type="text" placeholder="ค้นหาวัตถุดิบ..."
                value={searchValue} onChange={e => setSearchValue(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FDF6EC] border border-[#E8DCC9] rounded-lg text-sm text-[#7E5C4A] outline-none focus:ring-2 focus:ring-[#D4AA7D]/35" />
            </div>
          </div>
          <div className="flex items-center gap-2 px-2 pb-2">
            <input type="checkbox" id="lowStock" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} className="rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
            <label htmlFor="lowStock" className="text-sm font-semibold text-rose-600 uppercase tracking-wide cursor-pointer flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              &lt; Safety Stock
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchAll}
              className="p-2 bg-[#EEF2F6] border border-white/80 rounded-lg text-[#7E5C4A] hover:bg-white transition-colors" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </GlassCard>

      {loading ? (
        <GlassCard className="p-12 bg-[#EEF2F6]/95 border border-white/80 text-center">
          <RefreshCw className="w-8 h-8 text-[#D4AA7D] mx-auto animate-spin" />
          <p className="text-[#7E5C4A] mt-3 text-sm">Loading...</p>
        </GlassCard>
      ) : (
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
                  .filter(row => !lowStockOnly || row.balance <= row.minStock)
                  .map((row) => {
                    const isLow = row.balance <= row.minStock;
                    return (
                  <tr key={row.materialName} className="border-b border-[#EEF2F6] last:border-0 hover:bg-[#272727] group transition-colors">
                    <td className="px-4 py-3 text-[#8C9AAA] text-xs font-bold group-hover:text-[#EFD09E]/60 text-center">
                      {isLow && <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-2 animate-pulse" title="Below Safety Stock"></span>}
                      —
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#34495E] group-hover:text-[#EFD09E]">{row.materialName}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-bold tabular-nums group-hover:text-emerald-400">
                      +{row.totalIn.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-500 font-bold tabular-nums group-hover:text-rose-400">
                      -{row.totalOut.toLocaleString()}
                      {getSpecialRolls(row.materialName, row.totalOut) && (
                        <div className="text-[10px] text-rose-400 font-medium">({getSpecialRolls(row.materialName, row.totalOut)})</div>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-black tabular-nums text-lg group-hover:text-[#EFD09E] ${row.balance >= 0 ? "text-[#272727]" : "text-rose-600"}`}>
                      {row.balance.toLocaleString()}
                      {getSpecialRolls(row.materialName, row.balance) && (
                        <div className={`text-[10px] font-bold ${row.balance >= 0 ? "text-[#7E5C4A]/70" : "text-rose-400"}`}>
                          ({getSpecialRolls(row.materialName, row.balance)})
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#EFD09E]/60 text-[#272727] border border-[#D4AA7D]/35 uppercase group-hover:bg-[#EFD09E]/30 group-hover:text-[#EFD09E]">
                        {(row.materialName.toLowerCase().includes("plastic warp") || 
                          row.materialName.toLowerCase().includes("plastic wrap") || 
                          row.materialName.toLowerCase().includes("white composite strap")) 
                          ? "PC" 
                          : unitLabel(row.unit)}
                      </span>
                      {isLow && (
                        <div className="text-[10px] text-rose-500 font-bold mt-1">Min: {row.minStock}</div>
                      )}
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
                )})}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-[#EEF2F6]/50 border-t border-[#D4AA7D]/15 text-xs text-[#7E5C4A]/60">
            {inventoryBalance.length} materials • Balance = Receiving (manual) − Usage (auto from Packing×BOM)
          </div>
        </GlassCard>
      )}
    </div>
  );
}
