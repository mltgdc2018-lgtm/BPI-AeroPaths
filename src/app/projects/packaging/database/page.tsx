"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Database, Upload, FileText, CheckCircle, Package, ArrowRight,
  LayoutGrid, Pencil, Trash2, AlertTriangle, X, Save
} from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import { MaterialService } from "@/lib/firebase/services/material.service";
import { Material } from "@/types/material";
import { ModuleHeader } from "@/components/projects/material-control/ModuleHeader";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DuplicateSummary {
  newItems: Material[];
  duplicates: { incoming: Material; existing: Material }[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PackagingDatabasePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Material[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [boms, setBoms] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Duplicate warning state
  const [duplicateSummary, setDuplicateSummary] = useState<DuplicateSummary | null>(null);

  // Edit modal state
  const [editingBom, setEditingBom] = useState<Material | null>(null);
  const [editComponents, setEditComponents] = useState<{ materialId: string; quantity: number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirm state
  const [deletingBom, setDeletingBom] = useState<Material | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBOMs = useCallback(async () => {
    setIsLoading(true);
    const data = await MaterialService.getBOMPackages();
    setBoms(data);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchBOMs(); }, [fetchBOMs]);

  // ── CSV Parser ──────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.trim());
      const rawMaterialsNames = headers.slice(2).filter(h => h);
      const materialsToImport: Material[] = [];

      // Raw Materials
      rawMaterialsNames.forEach(name => {
        const idStr = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        // Detect unit from name: Plastic Warp/Composite Strap or "(m)" suffix → meter, default → pc
        const lowerName = name.toLowerCase();
        const resolvedUnit = (lowerName.includes('plastic warp') || lowerName.includes('composite strap') || lowerName.endsWith('(m)')) ? 'm' : 'pc';
        materialsToImport.push({
          id: `MAT-RAW-${idStr}`, sku: `RAW-${idStr}`, name, nameEn: name,
          category: 'raw-material', type: 'single',
          unit: resolvedUnit as Material['unit'],
          currentStock: 0, costPerUnit: 0, minStock: 0, criticalStock: 0, maxStock: 0,
          location: '', suppliers: [], isActive: true,
          lastUpdated: new Date(), createdAt: new Date(), createdBy: 'System'
        });
      });

      // BOM Packages
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cells = line.split(',');
        const desc = cells[0]?.trim();
        const typeStr = cells[1]?.trim() || 'Package';
        if (!desc) continue;

        const components: { materialId: string; quantity: number }[] = [];
        for (let j = 2; j < cells.length; j++) {
          const qty = parseFloat(cells[j]);
          if (!isNaN(qty) && qty > 0) {
            const rawName = headers[j];
            if (rawName) {
              const rawIdStr = rawName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
              components.push({ materialId: `MAT-RAW-${rawIdStr}`, quantity: qty });
            }
          }
        }

        const idStr = desc.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        materialsToImport.push({
          id: `MAT-PKG-${idStr}`, sku: `PKG-${idStr}`, name: desc, nameEn: desc,
          category: 'packaging', type: 'composite',
          unit: typeStr.toLowerCase().includes('box') ? 'box' : typeStr.toLowerCase().includes('pallet') ? 'set' : 'pcs',
          currentStock: 0, costPerUnit: 0, minStock: 0, criticalStock: 0, maxStock: 0,
          location: '', suppliers: [], components, isActive: true,
          lastUpdated: new Date(), createdAt: new Date(), createdBy: 'System'
        });
      }

      setPreviewData(materialsToImport);
      setImportError(null);
      setImportSuccess(false);
      setDuplicateSummary(null);

      // Check duplicates against existing BOMs
      const incomingPackages = materialsToImport.filter(m => m.type === 'composite');
      const existingIds = new Set(boms.map(b => b.id));
      const dups = incomingPackages.filter(m => existingIds.has(m.id));
      const newOnes = incomingPackages.filter(m => !existingIds.has(m.id));

      if (dups.length > 0) {
        setDuplicateSummary({
          newItems: newOnes,
          duplicates: dups.map(d => ({ incoming: d, existing: boms.find(b => b.id === d.id)! }))
        });
      }
    };
    reader.onerror = () => setImportError("Failed to read file");
    reader.readAsText(f);
  };

  // ── Import handlers ─────────────────────────────────────────────────────────

  const doImport = async (items: Material[]) => {
    if (!items.length) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const result = await MaterialService.importBOMData(items);
      if (result.errors.length > 0) {
        setImportError(`Import completed with ${result.errorCount} errors. ${result.errors[0]}`);
      } else {
        setImportSuccess(true);
        setFile(null); setPreviewData([]); setDuplicateSummary(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchBOMs();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setImportError(`Import failed: ${msg}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Import only new (skip duplicates)
  const importSkipDuplicates = () => {
    if (!duplicateSummary) return;
    const newRawMats = previewData.filter(m => m.type === 'single');
    doImport([...newRawMats, ...duplicateSummary.newItems]);
  };

  // Import all including overwrite
  const importOverwriteAll = () => doImport(previewData);

  // ── Edit BOM ─────────────────────────────────────────────────────────────────

  const openEdit = (bom: Material) => {
    setEditingBom(bom);
    setEditComponents(bom.components?.map(c => ({ ...c })) ?? []);
  };

  const saveEdit = async () => {
    if (!editingBom?.id) return;
    setIsSaving(true);
    await MaterialService.updateMaterial(editingBom.id, { components: editComponents });
    setIsSaving(false);
    setEditingBom(null);
    fetchBOMs();
  };

  // ── Delete BOM ───────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deletingBom?.id) return;
    setIsDeleting(true);
    await MaterialService.deleteMaterial(deletingBom.id);
    setIsDeleting(false);
    setDeletingBom(null);
    fetchBOMs();
  };

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const rawMaterialsPreview = previewData.filter(m => m.category === 'raw-material');
  const bomsPreview = previewData.filter(m => m.type === 'composite');
  const hasDuplicates = (duplicateSummary?.duplicates.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-[#F6EDDE] pt-20 pb-12">
      <section className="py-12">
        <div className="container-custom">

          <ModuleHeader
            title="Global BOM Database"
            description="Manage and Import Bill of Materials (BOM) including pallets, boxes, and raw materials."
            backHref="/projects/packaging"
            backLabel="Packaging Console"
            backLinkVariant="packaging"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">

            {/* ── Import Panel ──────────────────────────────────────────── */}
            <div className="lg:col-span-1 space-y-4">
              <GlassCard className="p-6 bg-white/70 border border-[#D4AA7D]/35">
                <div className="flex items-center gap-2 mb-4 text-[#7E5C4A]">
                  <Database className="w-5 h-5" />
                  <h2 className="text-lg font-bold">Import CSV</h2>
                </div>
                <p className="text-sm text-[#7E5C4A]/80 mb-6">
                  Upload your Raw Material Balance CSV to initialize or update BOM structures.
                </p>

                <div
                  className="border-2 border-dashed border-[#D4AA7D]/50 rounded-xl p-8 text-center cursor-pointer hover:bg-white/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-[#9A7656] mx-auto mb-3" />
                  <p className="text-sm font-semibold text-[#7E5C4A]">{file ? file.name : "Click to select CSV file"}</p>
                  <p className="text-xs text-[#7E5C4A]/60 mt-1">Headers: Description, Type, [Raw Materials...]</p>
                  <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                </div>

                {/* Preview stats */}
                {previewData.length > 0 && !hasDuplicates && (
                  <div className="mt-6 pt-6 border-t border-[#D4AA7D]/20">
                    <h3 className="text-sm font-black uppercase text-[#7E5C4A]/80 mb-3">Preview Stats</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#7E5C4A] flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Raw Materials</span>
                      <span className="text-sm font-bold text-[#34495E]">{rawMaterialsPreview.length}</span>
                    </div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-sm text-[#7E5C4A] flex items-center gap-2"><Package className="w-4 h-4" /> Package Sets</span>
                      <span className="text-sm font-bold text-[#34495E]">{bomsPreview.length}</span>
                    </div>
                    <button
                      onClick={() => doImport(previewData)}
                      disabled={isImporting}
                      className="w-full py-3 bg-[#272727] text-[#EFD09E] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1f1f1f] disabled:opacity-50 transition-colors"
                    >
                      {isImporting ? "Importing..." : "Confirm & Import"}
                      {!isImporting && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {/* Duplicate Warning */}
                {hasDuplicates && (
                  <div className="mt-6 pt-6 border-t border-amber-200">
                    <div className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-amber-700">Duplicates Detected</p>
                        <p className="text-xs text-amber-600/80 mt-0.5">
                          {duplicateSummary!.duplicates.length} existing BOM(s) will be overwritten.
                          {duplicateSummary!.newItems.length > 0 && ` ${duplicateSummary!.newItems.length} new item(s) will be added.`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-1 mb-4 max-h-28 overflow-y-auto">
                      {duplicateSummary!.duplicates.map(d => (
                        <div key={d.incoming.id} className="text-xs bg-amber-50 rounded-lg px-3 py-1.5 flex items-center gap-2">
                          <span className="font-bold text-amber-700">{d.existing.name}</span>
                          <span className="text-amber-500">— will be overwritten</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={importOverwriteAll}
                        disabled={isImporting}
                        className="w-full py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-700 disabled:opacity-50"
                      >
                        {isImporting ? "Importing..." : "Overwrite All & Import"}
                      </button>
                      {duplicateSummary!.newItems.length > 0 && (
                        <button
                          onClick={importSkipDuplicates}
                          disabled={isImporting}
                          className="w-full py-2.5 border border-[#D4AA7D] text-[#7E5C4A] rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#F6EDDE] disabled:opacity-50"
                        >
                          Add New Only (Skip Duplicates)
                        </button>
                      )}
                      <button
                        onClick={() => { setPreviewData([]); setDuplicateSummary(null); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="w-full py-2 text-[#7E5C4A]/70 text-xs underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {importError && <div className="mt-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm border border-rose-200">{importError}</div>}
                {importSuccess && (
                  <div className="mt-4 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm border border-emerald-200 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Import successful!
                  </div>
                )}
              </GlassCard>
            </div>

            {/* ── BOM List ──────────────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <GlassCard className="p-6 bg-white/70 border border-[#D4AA7D]/35 h-full">
                <div className="flex items-center gap-2 mb-6 text-[#7E5C4A]">
                  <FileText className="w-5 h-5" />
                  <h2 className="text-lg font-bold">Standard Configurations (BOM)</h2>
                </div>

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Database className="w-12 h-12 text-[#7E5C4A] animate-pulse mb-3" />
                    <p className="text-[#7E5C4A] text-sm">Loading...</p>
                  </div>
                ) : boms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-[#D4AA7D]/30 rounded-2xl">
                    <p className="text-[#7E5C4A] text-sm font-medium">No BOM structures found.</p>
                    <p className="text-[#7E5C4A]/60 text-xs mt-1">Import from CSV to initialize.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {boms.map((bom) => (
                      <div key={bom.id} className="p-4 rounded-xl border border-[#EEF2F6] bg-[#F8FAFC] shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3 border-b border-[#EEF2F6] pb-3">
                          <div>
                            <p className="text-xs font-black text-[#5D6D7E] uppercase tracking-wider">{bom.sku}</p>
                            <h3 className="text-base font-bold text-[#34495E] mt-0.5">{bom.name}</h3>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-1 bg-[#272727] text-white text-[10px] rounded-md font-bold">{bom.unit.toUpperCase()}</span>
                            <button onClick={() => openEdit(bom)} className="p-1.5 rounded-lg hover:bg-[#EEF2F6] text-[#5D6D7E] transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setDeletingBom(bom)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-400 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <div className="space-y-1.5 h-36 overflow-y-auto pr-2">
                          <p className="text-[10px] font-bold text-[#8C9AAA] uppercase sticky top-0 bg-[#F8FAFC] pb-1">Requires Items</p>
                          {bom.components?.map((comp, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs border-b border-gray-100 last:border-0 pb-1.5">
                              <span className="text-[#5D6D7E] truncate pr-2 max-w-[70%]">{comp.materialId.replace("MAT-RAW-", "")}</span>
                              <span className="font-bold text-[#34495E] whitespace-nowrap">{comp.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
          </div>

        </div>
      </section>

      {/* ── Edit Modal ────────────────────────────────────────────────────────── */}
      {editingBom && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <p className="text-xs font-black text-[#5D6D7E] uppercase">{editingBom.sku}</p>
                <h2 className="text-lg font-black text-[#34495E]">Edit BOM — {editingBom.name}</h2>
              </div>
              <button onClick={() => setEditingBom(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              <p className="text-xs font-black text-[#8C9AAA] uppercase mb-3">Raw Material Quantities</p>
              {editComponents.map((comp, idx) => (
                <div key={idx} className="flex items-center gap-3 py-1.5 border-b border-gray-50">
                  <span className="text-xs text-[#5D6D7E] flex-1 truncate">{comp.materialId.replace("MAT-RAW-", "")}</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={comp.quantity}
                    onChange={e => {
                      const updated = [...editComponents];
                      updated[idx] = { ...comp, quantity: parseFloat(e.target.value) || 0 };
                      setEditComponents(updated);
                    }}
                    className="w-24 text-right font-bold text-sm text-[#34495E] border border-[#D4AA7D]/40 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#D4AA7D]/50"
                  />
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button onClick={() => setEditingBom(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-50">Cancel</button>
              <button
                onClick={saveEdit}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-[#272727] text-[#EFD09E] rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1f1f1f] disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────────────────────── */}
      {deletingBom && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              <h2 className="text-lg font-black text-[#34495E]">Delete BOM?</h2>
              <p className="text-sm text-[#7E5C4A]/80">
                คุณต้องการที่จะลบ <span className="font-black text-[#34495E]">{deletingBom.name}</span> ออกจากฐานข้อมูล? การกระทำนี้ไม่สามารถยกเลิกได้
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletingBom(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl font-bold">Cancel</button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
