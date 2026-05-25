"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, Plus, Trash2, ArrowDownToLine, RefreshCw } from "lucide-react";
import { RawMaterialBalanceService } from "@/lib/firebase/services/rawMaterialBalance.service";
import type { RawMaterialTransaction } from "@/lib/firebase/services/rawMaterialBalance.service";
import { MaterialService } from "@/lib/firebase/services/material.service";
import type { Material } from "@/types/material";
import { GlassCard } from "@/components/shared/GlassCard";
import { Modal } from "@/components/shared/Modal";

function fmtDate(d: string) {
  if (!d) return "—";
  if (d.includes("/")) return d;
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function unitLabel(u: string) {
  return u === "m" ? "M" : "Pc";
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

export function RawMaterialReceivingTab() {
  const [receivingTx, setReceivingTx] = useState<RawMaterialTransaction[]>([]);
  const [rawMaterials, setRawMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterJob, setFilterJob] = useState("");
  const [searchValue, setSearchValue] = useState("");

  // Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formJobOrder, setFormJobOrder] = useState("");
  const [formQuantities, setFormQuantities] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showPaste, setShowPaste] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<RawMaterialTransaction | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [txResult, allMats] = await Promise.all([
        RawMaterialBalanceService.getTransactions({ type: "receiving" }),
        MaterialService.getAllMaterials(),
      ]);
      setReceivingTx(txResult.data);
      setRawMaterials(allMats.filter(m => m.category === "raw-material"));
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    receivingTx.forEach(t => { const y = t.date.slice(0, 4); if (y) years.add(y); });
    return ["All", ...Array.from(years).sort().reverse()];
  }, [receivingTx]);

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

  const stats = useMemo(() => {
    let totalIn = 0;
    receivingTx.forEach(tx => { totalIn += tx.qty; });
    return {
      totalIn: Math.round(totalIn * 100) / 100
    };
  }, [receivingTx]);

  const handleAdd = async () => {
    const itemsToSave = Object.entries(formQuantities)
      .filter(([, qtyStr]) => parseFloat(qtyStr) > 0)
      .map(([name, qtyStr]) => {
        const mat = rawMaterials.find(m => m.name === name);
        return {
          materialName: name,
          qty: parseFloat(qtyStr),
          unit: mat?.unit === "m" ? "m" : "pc" as "pc" | "m",
        };
      });

    if (itemsToSave.length === 0) return;

    setSaving(true);
    await Promise.all(itemsToSave.map(item => 
      RawMaterialBalanceService.addReceiving({
        date: formDate,
        jobOrder: formJobOrder,
        materialName: item.materialName,
        qty: item.qty,
        unit: item.unit,
        createdBy: "admin",
      })
    ));

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
    setFormQuantities({});
    setShowPaste(false);
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (!text) return;
    const lines = text.split(/\r?\n/);
    const newQuantities = { ...formQuantities };
    let matchCount = 0;

    lines.forEach(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const matName = parts[0].trim();
        const qtyStr = parts[1].trim().replace(/,/g, '');
        const qty = parseFloat(qtyStr);

        if (!isNaN(qty) && qty > 0) {
          const matchedMat = rawMaterials.find(m => m.name.toLowerCase() === matName.toLowerCase());
          if (matchedMat) {
            newQuantities[matchedMat.name] = qty.toString();
            matchCount++;
          }
        }
      }
    });

    if (matchCount > 0) setFormQuantities(newQuantities);
    e.target.value = '';
    setShowPaste(false);
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
            <div>
              <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Total Receiving</p>
              <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">{stats.totalIn.toLocaleString()}</h3>
              <p className="text-xs text-emerald-600 mt-1 font-medium">รับเข้าทั้งหมด (Manual)</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl border border-emerald-200/60">
              <ArrowDownToLine className="w-6 h-6 text-emerald-700" />
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
            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-[10px] font-black uppercase tracking-wide text-[#7E5C4A]/80">Job Order</label>
              <input type="text" placeholder="Job #" value={filterJob} onChange={e => setFilterJob(e.target.value)}
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
              <button onClick={() => { resetForm(); setShowAddModal(true); }}
                className="px-4 py-2 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg text-sm font-semibold transition-colors shadow-md shadow-[#272727]/20 border border-[#EFD09E]/20 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Receiving
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
        )}
      </div>

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
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#7E5C4A] uppercase">Raw Materials</label>
              <button onClick={() => setShowPaste(!showPaste)}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {showPaste ? "Cancel Paste" : "📋 Paste from Excel"}
              </button>
            </div>
            {showPaste && (
              <textarea placeholder="Paste Excel columns here (Material Name followed by Qty)..." 
                onChange={handlePaste}
                className="w-full text-xs p-3 bg-blue-50/50 border border-blue-200 rounded-lg text-[#272727] focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y min-h-[80px]" />
            )}
            <div className={`overflow-y-auto border border-[#E8DCC9] rounded-lg ${showPaste ? "max-h-40" : "max-h-60"}`}>
              <table className="w-full text-sm text-left">
                <thead className="bg-[#EEF2F6] sticky top-0 border-b border-[#E8DCC9] z-10">
                  <tr>
                    <th className="px-3 py-2 font-bold text-xs text-[#7E5C4A]">Material</th>
                    <th className="px-3 py-2 font-bold text-xs text-[#7E5C4A] text-right w-28">QTY</th>
                    <th className="px-3 py-2 font-bold text-xs text-[#7E5C4A] text-center w-16">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {rawMaterials.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-8 text-center text-[#7E5C4A]/60">No materials found</td></tr>
                  ) : rawMaterials.map(m => (
                    <tr key={m.id} className="border-b border-[#E8DCC9]/50 last:border-0 hover:bg-[#FDF6EC]">
                      <td className="px-3 py-2 text-[#272727] font-medium">{m.name}</td>
                      <td className="px-3 py-1.5">
                        <input type="number" step="0.01" min="0" placeholder="0" 
                          value={formQuantities[m.name] || ""} 
                          onChange={e => setFormQuantities(prev => ({ ...prev, [m.name]: e.target.value }))}
                          className="w-full px-2 py-1 bg-white border border-[#D4AA7D]/50 rounded text-right text-[#272727] focus:outline-none focus:ring-1 focus:ring-[#9ACD32]" />
                      </td>
                      <td className="px-3 py-2 text-center text-[10px] font-bold text-[#8C9AAA] uppercase">{unitLabel(m.unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="pt-4 border-t border-[#D4AA7D]/25 flex gap-3">
            <button onClick={() => setShowAddModal(false)}
              className="flex-1 py-2.5 bg-[#EEF2F6] border border-white/80 text-[#7E5C4A] hover:bg-white rounded-lg font-medium transition-colors">
              Cancel
            </button>
            <button onClick={handleAdd} disabled={saving || Object.values(formQuantities).every(q => !parseFloat(q))}
              className="flex-1 py-2.5 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg font-medium transition-colors shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>

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
    </>
  );
}
