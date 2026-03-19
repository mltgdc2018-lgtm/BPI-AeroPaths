"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { parseNoSelection } from "@/lib/packing-details/export.helpers";
import type {
  NoSelectionMode,
  PackingDetailsExportOptions,
  PoNoSummary,
  ProductOption,
  ShipByOption,
} from "@/lib/packing-details/export.types";

interface PackingDetailsExportDialogProps {
  open: boolean;
  poSummaries: PoNoSummary[];
  shipmentOptions: string[];
  defaultShipment?: string;
  onClose: () => void;
  onSubmit: (options: PackingDetailsExportOptions) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function PackingDetailsExportDialog({
  open,
  poSummaries,
  shipmentOptions,
  defaultShipment,
  onClose,
  onSubmit,
  isSubmitting = false,
}: PackingDetailsExportDialogProps) {
  const [poSearch, setPoSearch] = useState("");
  const [selectionMode, setSelectionMode] = useState<NoSelectionMode>("all");
  const [selectedPos, setSelectedPos] = useState<string[]>(() => poSummaries.map((row) => row.po));
  const [poNoRangeMap, setPoNoRangeMap] = useState<Record<string, string>>({});
  const [startCaseNoInput, setStartCaseNoInput] = useState("");
  const [shipment, setShipment] = useState(() => defaultShipment?.trim() || shipmentOptions[0] || "");
  const [shipBy, setShipBy] = useState<ShipByOption>("Sea");
  const [product, setProduct] = useState<ProductOption>("Inverter");

  const poNoCountMap = useMemo(
    () =>
      poSummaries.reduce<Record<string, number>>((acc, row) => {
        acc[row.po] = row.totalNos;
        return acc;
      }, {}),
    [poSummaries]
  );

  const totalNo = useMemo(
    () => poSummaries.reduce((sum, row) => sum + row.totalNos, 0),
    [poSummaries]
  );

  const filteredPoSummaries = useMemo(() => {
    const keyword = poSearch.trim().toLowerCase();
    if (!keyword) return poSummaries;
    return poSummaries.filter((row) => row.po.toLowerCase().includes(keyword));
  }, [poSearch, poSummaries]);

  const selectedNoPreview = useMemo(() => {
    if (selectionMode === "all") {
      return selectedPos.reduce((sum, po) => sum + (poNoCountMap[po] || 0), 0);
    }

    let count = 0;
    selectedPos.forEach((po) => {
      const totalNos = poNoCountMap[po] || 0;
      const rangeInput = poNoRangeMap[po] || "";
      const parsed = parseNoSelection(rangeInput);
      if (parsed.errors.length > 0) return;
      const validSelected = parsed.selectedNos.filter((no) => no >= 1 && no <= totalNos);
      count += validSelected.length;
    });
    return count;
  }, [poNoCountMap, poNoRangeMap, selectedPos, selectionMode]);

  const togglePo = (po: string) => {
    setSelectedPos((prev) => (prev.includes(po) ? prev.filter((item) => item !== po) : [...prev, po]));
  };

  const selectAllFilteredPo = () => {
    if (filteredPoSummaries.length === 0) return;
    setSelectedPos((prev) => {
      const next = new Set(prev);
      filteredPoSummaries.forEach((row) => next.add(row.po));
      return Array.from(next);
    });
  };

  const clearFilteredPo = () => {
    if (filteredPoSummaries.length === 0) return;
    const filteredSet = new Set(filteredPoSummaries.map((row) => row.po));
    setSelectedPos((prev) => prev.filter((po) => !filteredSet.has(po)));
  };

  if (!open) return null;

  const handleSubmit = async () => {
    const startCaseNo = Number(startCaseNoInput);
    if (!Number.isFinite(startCaseNo) || startCaseNo <= 0) {
      alert("Start Case no. must be a positive number.");
      return;
    }

    if (!selectedPos.length) {
      alert("Please select at least one PO.");
      return;
    }

    if (!shipment.trim()) {
      alert("Shipment is required.");
      return;
    }

    if (selectionMode === "custom") {
      for (const po of selectedPos) {
        const totalNos = poNoCountMap[po] || 0;
        const rangeInput = (poNoRangeMap[po] || "").trim();
        const parsed = parseNoSelection(rangeInput);

        if (parsed.errors.length > 0) {
          alert(`PO ${po}: ${parsed.errors[0]}`);
          return;
        }
        if (parsed.selectedNos.length === 0) {
          alert(`PO ${po}: No. range is required for Custom mode.`);
          return;
        }

        const outOfRange = parsed.selectedNos.find((no) => no < 1 || no > totalNos);
        if (outOfRange) {
          alert(`PO ${po}: Range includes No. ${outOfRange} but this PO has only ${totalNos}.`);
          return;
        }
      }
    }

    await onSubmit({
      selectionMode,
      selectedPos,
      poNoRangeMap,
      startCaseNo: Math.floor(startCaseNo),
      shipment,
      shipBy,
      product,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#272727]/45 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-2xl border border-white/80 bg-[#EEF2F6]/95 p-6 shadow-2xl">
        <h3 className="text-xl font-black text-[#272727]">Export Packing Details</h3>
        <p className="mt-1 text-sm text-[#7E5C4A]">1 No. = 1 sheet, map to running Case no. before export</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-[#D4AA7D]/35 bg-white/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-[#7E5C4A]">Step 1: Select PO</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllFilteredPo}
                    className="rounded-lg border border-[#D4AA7D]/45 px-2.5 py-1 text-xs font-bold text-[#7E5C4A] hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E] transition-colors"
                  >
                    Select Filtered
                  </button>
                  <button
                    type="button"
                    onClick={clearFilteredPo}
                    className="rounded-lg border border-[#D4AA7D]/45 px-2.5 py-1 text-xs font-bold text-[#7E5C4A] hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E] transition-colors"
                  >
                    Clear Filtered
                  </button>
                </div>
              </div>

              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#7E5C4A]/75" />
                <input
                  value={poSearch}
                  onChange={(e) => setPoSearch(e.target.value)}
                  placeholder="Search PO..."
                  className="w-full rounded-lg border border-[#D4AA7D]/45 bg-white px-9 py-2 text-sm text-[#272727] outline-none focus:border-[#7E5C4A]/60"
                />
              </div>

              <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-lg border border-[#D4AA7D]/25 bg-[#EEF2F6]/65 p-3">
                {filteredPoSummaries.length === 0 ? (
                  <p className="text-sm text-[#7E5C4A]">No PO matched search.</p>
                ) : (
                  filteredPoSummaries.map((row) => {
                    const checked = selectedPos.includes(row.po);
                    return (
                      <label
                        key={row.po}
                        className="flex cursor-pointer items-center justify-between rounded-lg border border-[#D4AA7D]/25 bg-white/75 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePo(row.po)}
                            className="h-4 w-4 rounded border-[#D4AA7D]"
                          />
                          <span className="text-sm font-semibold text-[#272727]">{row.po}</span>
                        </div>
                        <span className="text-xs font-bold text-[#7E5C4A]">{row.totalNos} No.</span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="mt-2 text-xs text-[#7E5C4A]">
                Selected PO: {selectedPos.length} / {poSummaries.length}
              </p>
            </div>

            <div className="rounded-xl border border-[#D4AA7D]/35 bg-white/70 p-4">
              <label className="block text-xs font-bold text-[#7E5C4A]">Step 2: Select No. in each PO</label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectionMode("all")}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                    selectionMode === "all"
                      ? "border-[#D4AA7D]/55 bg-[#F8E3C0]/85 text-[#7E5C4A] hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E]"
                      : "border-[#D4AA7D]/40 text-[#7E5C4A] hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E]"
                  }`}
                >
                  All No. from selected PO
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode("custom")}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                    selectionMode === "custom"
                      ? "border-[#D4AA7D]/55 bg-[#F8E3C0]/85 text-[#7E5C4A] hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E]"
                      : "border-[#D4AA7D]/40 text-[#7E5C4A] hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E]"
                  }`}
                >
                  Custom No. by PO
                </button>
              </div>

              {selectionMode === "custom" ? (
                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-lg border border-[#D4AA7D]/25 bg-[#EEF2F6]/65 p-3">
                  {selectedPos.length === 0 ? (
                    <p className="text-sm text-[#7E5C4A]">Select PO first.</p>
                  ) : (
                    selectedPos.map((po) => (
                      <div key={po} className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-center">
                        <div className="text-sm font-semibold text-[#272727]">
                          {po}
                          <span className="ml-1 text-xs text-[#7E5C4A]">({poNoCountMap[po] || 0} No.)</span>
                        </div>
                        <input
                          value={poNoRangeMap[po] || ""}
                          onChange={(e) =>
                            setPoNoRangeMap((prev) => ({ ...prev, [po]: e.target.value }))
                          }
                          placeholder="เช่น 1-4,7,10"
                          className="w-full rounded-lg border border-[#D4AA7D]/45 bg-white px-3 py-2 text-sm text-[#272727] outline-none focus:border-[#7E5C4A]/60"
                        />
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-[#D4AA7D]/25 bg-[#EEF2F6]/65 px-3 py-2 text-sm text-[#7E5C4A]">
                  System will export all No. in selected PO.
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-[#D4AA7D]/35 bg-white/70 p-4">
              <label className="block text-xs font-bold text-[#7E5C4A]">Step 3: Export Settings</label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-[#7E5C4A]">Shipment</label>
                  <select
                    value={shipment}
                    onChange={(e) => setShipment(e.target.value)}
                    className="w-full rounded-lg border border-[#D4AA7D]/45 bg-white px-3 py-2 text-sm text-[#272727] outline-none focus:border-[#7E5C4A]/60"
                  >
                    <option value="" disabled>
                      Select shipment...
                    </option>
                    {shipmentOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#7E5C4A]">Start Case no.</label>
                  <input
                    type="number"
                    min={1}
                    value={startCaseNoInput}
                    onChange={(e) => setStartCaseNoInput(e.target.value)}
                    placeholder="เช่น 4427"
                    className="h-10 w-full appearance-none rounded-lg border border-[#D4AA7D]/45 bg-white px-3 py-2 text-sm text-[#272727] outline-none focus:border-[#7E5C4A]/60"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#7E5C4A]">Ship by</label>
                  <select
                    value={shipBy}
                    onChange={(e) => setShipBy(e.target.value as ShipByOption)}
                    className="h-10 w-full rounded-lg border border-[#D4AA7D]/45 bg-white px-3 py-2 text-sm text-[#272727] outline-none focus:border-[#7E5C4A]/60"
                  >
                    <option value="Air">Air</option>
                    <option value="Sea">Sea</option>
                    <option value="Courier">Courier</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-[#7E5C4A]">Product</label>
                  <select
                    value={product}
                    onChange={(e) => setProduct(e.target.value as ProductOption)}
                    className="w-full rounded-lg border border-[#D4AA7D]/45 bg-white px-3 py-2 text-sm text-[#272727] outline-none focus:border-[#7E5C4A]/60"
                  >
                    <option value="Inverter">Inverter</option>
                    <option value="TC">TC</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#9ACD32]/40 bg-[#9ACD32]/10 p-4">
              <div className="text-xs font-bold text-[#5a7a1a]">Export Summary</div>
              <p className="mt-1 text-sm text-[#3d5b0f]">
                {selectedNoPreview} / {totalNo} sheet(s) will be generated
              </p>
              <p className="mt-1 text-xs text-[#5a7a1a]/85">
                Case no. mapping starts at {startCaseNoInput || "-"} and runs sequentially.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg border border-[#D4AA7D]/45 text-[#7E5C4A] font-bold text-sm hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg border border-[#D4AA7D]/55 bg-[#F8E3C0]/85 text-[#7E5C4A] font-bold text-sm hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Generating..." : "Generate PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
