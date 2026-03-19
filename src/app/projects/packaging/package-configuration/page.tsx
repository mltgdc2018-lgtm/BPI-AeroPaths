"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  X, 
  Save, 
  Trash2, 
  ArrowLeft,
  LayoutGrid
} from "lucide-react";
import { CUSTOMER_PACK_TYPE_MAPPING, PACKAGE_MASTER_DATA, PackageDef } from "@/lib/config/packagingData";

// Types
interface CustomerMapping {
    code: string;
    type: string;
}

export default function PackagingCustomersPage() {
  const router = useRouter();
  const customers: CustomerMapping[] = Object.entries(CUSTOMER_PACK_TYPE_MAPPING).map(([code, type]) => ({ code, type }));
  
  const [packages, setPackages] = useState<PackageDef[]>(PACKAGE_MASTER_DATA);

  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageDef | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string | null>(null);

  const [pkgForm, setPkgForm] = useState<PackageDef>({ 
      name: "", 
      outer: { w: 0, l: 0, h: 0 },
      inner: { w: 0, l: 0, h: 0 },
      m3: 0, 
      types: ["E"],
      category: 'Box'
  });

  // --- Helpers ---
  const getMappedCustomers = (pkgTypes: string[]) => {
      // Find customers whose type is included in this package's allowed types
      return customers.filter(c => pkgTypes.includes(c.type));
  };

  // --- Handlers: Package ---
  const openPackageModal = (pkg?: PackageDef) => {
      if (pkg) {
          setEditingPackage(pkg);
          setPkgForm(JSON.parse(JSON.stringify(pkg))); // Deep copy
      } else {
          setEditingPackage(null);
          setPkgForm({ 
              name: "", 
              outer: { w: 0, l: 0, h: 0 },
              inner: { w: 0, l: 0, h: 0 },
              m3: 0, 
              types: ["E"],
              category: 'Box'
          });
      }
      setIsPackageModalOpen(true);
  };

  const savePackage = () => {
      if (!pkgForm.name) return;

      if (editingPackage) {
           setPackages(prev => prev.map(p => p.name === editingPackage.name ? pkgForm : p));
      } else {
           setPackages(prev => [...prev, pkgForm]);
      }
      setIsPackageModalOpen(false);
  };
  
  const requestDeletePackage = (name: string) => {
      setDeleteTargetName(name);
  };

  const confirmDeletePackage = () => {
      if (!deleteTargetName) return;
      setPackages(prev => prev.filter(p => p.name !== deleteTargetName));
      setDeleteTargetName(null);
      setIsPackageModalOpen(false);
  };

  const togglePkgType = (t: string) => {
      setPkgForm(prev => {
          const exists = prev.types.includes(t);
          return {
              ...prev,
              types: exists ? prev.types.filter(x => x !== t) : [...prev.types, t]
          };
      });
  };

  return (
    <div className="min-h-screen bg-[#F6EDDE] pt-20">
      <section className="py-12">
        <div className="container-custom">
          
          <div className="relative flex items-center justify-center pt-2 mb-12">
            <button 
              onClick={() => router.back()} 
              className="absolute left-0 inline-flex items-center gap-2 text-[#7E5C4A] hover:text-[#272727] transition-colors text-sm md:text-base group"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline font-medium">Packaging Console</span>
            </button>
            
            <div className="text-center space-y-4">
                <h1 className="text-3xl md:text-5xl font-bold flex flex-col items-center leading-tight">
                <span className="text-[#272727]">
                    Package Configuration
                </span>
                </h1>
                <p className="text-[#7E5C4A] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Manage package dimensions and their allowed customer mappings.
                </p>
            </div>
          </div>

          {/* Package Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 px-1">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#EFD09E]/30 bg-[#272635] text-[#9ACD32] shadow-[0_6px_14px_rgba(39,38,53,0.25)]">
                  <LayoutGrid className="h-4.5 w-4.5" />
                </span>
                <h2 className="text-base font-black uppercase tracking-[0.08em] text-[#272635]">
                  Defined Packages
                </h2>
              </div>
              <button 
                  onClick={() => openPackageModal()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#272727] text-[#EFD09E] font-bold rounded-lg hover:bg-[#1f1f1f] transition shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20"
              >
                  <Plus className="w-4 h-4" />
                  <span>New Package</span>
              </button>
            </div>

            <div className="overflow-hidden rounded-[1.7rem] border border-white/80 bg-[#EEF2F6]/95 shadow-[10px_10px_24px_rgba(166,180,200,0.3),-10px_-10px_24px_rgba(255,255,255,0.92)]">
                <div className="overflow-hidden">
                    <table className="w-full table-fixed text-sm text-left">
                        <colgroup>
                            <col style={{ width: "22%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "18%" }} />
                            <col style={{ width: "12%" }} />
                            <col style={{ width: "14%" }} />
                            <col style={{ width: "24%" }} />
                        </colgroup>
                        <thead className="bg-[#D4AA7D] border-b border-[#7E5C4A]/25 text-xs font-black text-[#272727] uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Package Name / Outer</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Dimensions (Inner)</th>
                                <th className="px-6 py-4 text-right">M3 Capacity</th>
                                <th className="px-6 py-4">Allowed Types</th>
                                <th className="px-6 py-4">Assigned Customers</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D4AA7D]/35 bg-transparent">
                            {packages.map((pkg, idx) => {
                                const mappedCustomers = getMappedCustomers(pkg.types);
                                return (
                                    <tr 
                                        key={idx} 
                                        onClick={() => openPackageModal(pkg)}
                                        className="hover:bg-[#272635] transition-colors group cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[#272727] group-hover:text-[#EFD09E] break-words">{pkg.name}</div>
                                            <div className="text-xs text-[#7E5C4A] font-mono group-hover:text-[#EFD09E]/70">
                                                Outer: {pkg.outer.w}x{pkg.outer.l}x{pkg.outer.h} cm
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wide ${
                                                pkg.category === 'Pallet' ? 'bg-[#D4AA7D]/35 text-[#7E5C4A] group-hover:bg-[#EFD09E]/20 group-hover:text-[#EFD09E]' : 'bg-[#EEF2F6] text-[#7E5C4A] group-hover:bg-[#EFD09E]/20 group-hover:text-[#EFD09E]'
                                            }`}>
                                                {pkg.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-[#5a7a1a] font-bold group-hover:text-[#9ACD32]">
                                            {pkg.inner.w}x{pkg.inner.l}x{pkg.inner.h} <span className="text-[#9ACD32]">cm</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-[#5a7a1a] font-bold group-hover:text-[#9ACD32]">
                                            {pkg.m3}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1">
                                                {pkg.types.map(t => (
                                                    <span key={t} className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold transition-colors ${
                                                        t === 'A' ? 'bg-[#9ACD32]/20 text-[#5a7a1a] border border-[#9ACD32]/35 group-hover:bg-[#9ACD32]/15 group-hover:text-[#EFD09E] group-hover:border-[#EFD09E]/40' :
                                                        t === 'E' ? 'bg-[#272727]/10 text-[#272727] border border-[#272727]/20 group-hover:bg-[#EFD09E]/12 group-hover:text-[#EFD09E] group-hover:border-[#EFD09E]/40' :
                                                        'bg-[#D4AA7D]/30 text-[#7E5C4A] border border-[#D4AA7D]/45 group-hover:bg-[#EFD09E]/12 group-hover:text-[#EFD09E] group-hover:border-[#EFD09E]/40'
                                                    }`}>
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {mappedCustomers.length > 0 ? (
                                                    mappedCustomers.map(c => (
                                                        <span key={c.code} className="px-2 py-0.5 bg-[#EEF2F6] text-[#7E5C4A] text-[10px] rounded border border-[#D4AA7D]/35 group-hover:border-[#EFD09E]/35 group-hover:bg-[#EFD09E]/8 group-hover:text-[#EFD09E]">
                                                            {c.code}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[#7E5C4A]/60 italic text-xs">None</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>

        </div>
      </section>

      {/* Package Modal (Detail / Edit / New) */}
      {isPackageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#272727]/45 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsPackageModalOpen(false)}
        >
           <div
             onClick={(event) => event.stopPropagation()}
             className="w-full max-w-4xl rounded-[1.8rem] border border-white/80 bg-[#EEF2F6]/95 p-6 shadow-[14px_14px_30px_rgba(39,38,53,0.22),-10px_-10px_24px_rgba(255,255,255,0.9)] relative"
           >
              <button 
                  onClick={() => setIsPackageModalOpen(false)}
                  className="absolute right-4 top-4 text-[#7E5C4A] hover:text-[#272727]"
              >
                  <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center justify-between mb-6 pr-8">
                  <h3 className="text-xl font-bold text-[#272727]">
                      {editingPackage ? 'Package Details' : 'New Package'}
                  </h3>
                  {editingPackage && (
                      <div className="flex gap-2">
                           <button 
                              onClick={() => requestDeletePackage(editingPackage.name)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-1.5 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50"
                              title="Delete Package"
                           >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                           </button>
                      </div>
                  )}
              </div>

              <div className="space-y-4 px-1">
                  <div>
                      <label className="block text-sm font-bold text-[#7E5C4A] mb-1">Package Name</label>
                      <input 
                          type="text" 
                          value={pkgForm.name}
                          onChange={e => setPkgForm({...pkgForm, name: e.target.value})}
                          className="w-full px-3 py-2 border border-[#D4AA7D]/40 bg-[#EFD09E]/45 rounded-xl text-[#272727] outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                          placeholder="e.g. 110x110x110"
                          disabled={!!editingPackage} // Name is ID, usually immutable or requires special handling. Let's keep it editable only for New for now, or use a separate ID. 
                                                     // Actually user asked to "Edit" form to be usable. If they edit name, it's like a new package or rename.
                                                     // For simplicity in this array-based mock, let's allow editing name but we must handle "rename" logic in save.
                                                     // Wait, savePackage uses `editingPackage.name` to find index. If we change form name, we still have reference.
                                                     // So we can allow editing.
                          // Correction: If we allow editing Name, we need to ensure we don't duplicate keys. For now let's allow it.
                      />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="p-3 bg-[#EFD09E]/45 rounded-lg border border-[#D4AA7D]/35">
                        <div className="text-xs font-bold text-[#7E5C4A] mb-2 uppercase">Outer Dimensions (cm)</div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                               <label className="block text-xs font-bold text-[#7E5C4A]/80 mb-1">W</label>
                               <input type="number" value={pkgForm.outer.w} onChange={e => setPkgForm({ ...pkgForm, outer: { ...pkgForm.outer, w: Number(e.target.value) } })} className="w-full px-2 py-1.5 border border-[#D4AA7D]/40 rounded text-center bg-[#F6EDDE]" />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-[#7E5C4A]/80 mb-1">L</label>
                               <input type="number" value={pkgForm.outer.l} onChange={e => setPkgForm({ ...pkgForm, outer: { ...pkgForm.outer, l: Number(e.target.value) } })} className="w-full px-2 py-1.5 border border-[#D4AA7D]/40 rounded text-center bg-[#F6EDDE]" />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-[#7E5C4A]/80 mb-1">H</label>
                               <input type="number" value={pkgForm.outer.h} onChange={e => setPkgForm({ ...pkgForm, outer: { ...pkgForm.outer, h: Number(e.target.value) } })} className="w-full px-2 py-1.5 border border-[#D4AA7D]/40 rounded text-center bg-[#F6EDDE]" />
                            </div>
                        </div>
                    </div>

                    <div className="p-3 bg-[#9ACD32]/10 rounded-lg border border-[#9ACD32]/30">
                        <div className="text-xs font-bold text-[#5a7a1a] mb-2 uppercase flex justify-between">
                            <span>Inner Dimensions (cm)</span>
                            <span>Uses for Calcs</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                               <label className="block text-xs font-bold text-[#5a7a1a]/80 mb-1">W</label>
                               <input type="number" value={pkgForm.inner.w} onChange={e => setPkgForm({ ...pkgForm, inner: { ...pkgForm.inner, w: Number(e.target.value) } })} className="w-full px-2 py-1.5 border border-[#9ACD32]/35 rounded text-center bg-[#F6EDDE] focus:ring-[#9ACD32]" />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-[#5a7a1a]/80 mb-1">L</label>
                               <input type="number" value={pkgForm.inner.l} onChange={e => setPkgForm({ ...pkgForm, inner: { ...pkgForm.inner, l: Number(e.target.value) } })} className="w-full px-2 py-1.5 border border-[#9ACD32]/35 rounded text-center bg-[#F6EDDE] focus:ring-[#9ACD32]" />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-[#5a7a1a]/80 mb-1">H</label>
                               <input type="number" value={pkgForm.inner.h} onChange={e => setPkgForm({ ...pkgForm, inner: { ...pkgForm.inner, h: Number(e.target.value) } })} className="w-full px-2 py-1.5 border border-[#9ACD32]/35 rounded text-center bg-[#F6EDDE] focus:ring-[#9ACD32]" />
                            </div>
                        </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                       <div>
                          <label className="block text-sm font-bold text-[#7E5C4A] mb-1">M3 Capacity</label>
                          <input type="number" step="0.0001" value={pkgForm.m3} onChange={e => setPkgForm({...pkgForm, m3: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-[#D4AA7D]/40 bg-[#EFD09E]/45 rounded-xl outline-none focus:ring-2 focus:ring-[#9ACD32]/30" />
                       </div>
                       <div>
                          <label className="block text-sm font-bold text-[#7E5C4A] mb-1">Category</label>
                          <select 
                              value={pkgForm.category}
                              onChange={e => setPkgForm({...pkgForm, category: e.target.value as 'Box' | 'Pallet'})}
                              className="w-full px-3 py-2 border border-[#D4AA7D]/40 bg-[#EFD09E]/45 rounded-xl outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                          >
                              <option value="Box">Box</option>
                              <option value="Pallet">Pallet</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-sm font-bold text-[#7E5C4A] mb-2">Allowed Types</label>
                          <div className="flex h-[42px] items-center gap-3 rounded-xl border border-[#D4AA7D]/35 bg-[#EFD09E]/45 px-3 py-2">
                              {['A', 'E', 'R'].map(type => (
                                   <label key={type} className="flex items-center gap-2 cursor-pointer leading-none">
                                       <input 
                                         type="checkbox" 
                                         checked={pkgForm.types.includes(type)}
                                         onChange={() => togglePkgType(type)}
                                         className="w-4 h-4 text-[#9ACD32] rounded focus:ring-[#9ACD32]" 
                                      />
                                      <span className="font-bold text-[#7E5C4A] leading-none">{type}</span>
                                   </label>
                              ))}
                          </div>
                       </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                      <button 
                          onClick={savePackage}
                          className="flex-1 py-3 bg-[#272727] text-[#EFD09E] font-bold rounded-xl hover:bg-[#1f1f1f] shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20 flex items-center justify-center gap-2"
                      >
                          <Save className="w-4 h-4" /> Save
                      </button>
                  </div>
              </div>
           </div>
        </div>
      )}

      {deleteTargetName && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#272727]/45 backdrop-blur-sm animate-fade-in"
          onClick={() => setDeleteTargetName(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-[1.6rem] border border-white/80 bg-[#EEF2F6]/95 p-6 shadow-[14px_14px_30px_rgba(39,38,53,0.22),-10px_-10px_24px_rgba(255,255,255,0.9)]"
          >
            <h4 className="text-lg font-black text-[#272635]">Confirm Delete</h4>
            <p className="mt-2 text-sm text-[#7E5C4A]">
              Delete package <span className="font-bold text-[#272635]">{deleteTargetName}</span>? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTargetName(null)}
                className="rounded-lg border border-[#D4AA7D]/45 bg-[#EFD09E]/45 px-4 py-2 text-sm font-bold text-[#7E5C4A] transition hover:bg-[#EFD09E]/70"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePackage}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
