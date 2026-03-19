import { useState } from "react";
import { createPortal } from "react-dom";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { PackedCase } from "@/lib/services/packing-logic/packing.types";

interface PackageOption {
  name: string;
  category: "Box" | "Pallet";
}

interface SkuDimension {
  width: number;
  length: number;
  height: number;
}

interface EditableCaseRowProps {
  po: string;
  caseData: PackedCase;
  skuDimensions: Record<string, SkuDimension>;
  isEditMode: boolean;
  packageOptions: PackageOption[];
  selected: boolean;
  onToggleSelected: (po: string, caseNo: number, selected: boolean) => void;
  onUpdateQty: (po: string, caseNo: number, sku: string, qty: number) => void;
  onUpdateNote: (po: string, caseNo: number, note: string) => void;
  onChangePackage: (po: string, caseNo: number, packageName: string) => void;
  onOpenSplit: (po: string, caseNo: number) => void;
}

interface TooltipState {
  sku: string;
  x: number;
  y: number;
}

function toDisplayTypeLabel(type: string): string {
  const normalized = type.trim().replace(/\bwarp\b/gi, "Wrap");
  const exactMap: Record<string, string> = {
    "Manual Merge Pallet": "M.Merge Pallet",
    "Manual Merge Box": "M.Merge Box",
    "Manual Split Pallet": "M.Split Pallet",
    "Manual Split Box": "M.Split Box",
    "Manual Pallet": "M.Pallet",
    "Manual Box": "M.Box",
  };

  if (exactMap[normalized]) return exactMap[normalized];

  return normalized
    .replace(/^Manual\s+/i, "M.")
    .replace(/\s+Pallet$/i, " Pallet")
    .replace(/\s+Box$/i, " Box");
}

export function EditableCaseRow({
  po,
  caseData,
  skuDimensions,
  isEditMode,
  packageOptions,
  selected,
  onToggleSelected,
  onUpdateQty,
  onUpdateNote,
  onChangePackage,
  onOpenSplit,
}: EditableCaseRowProps) {
  const currentPackage = packageOptions.find((pkg) => pkg.name === caseData.dims);
  const displayType = toDisplayTypeLabel(caseData.type);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleSkuPointerMove = (event: ReactMouseEvent<HTMLSpanElement>, sku: string) => {
    setTooltip({
      sku,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleSkuPointerLeave = () => {
    setTooltip(null);
  };

  return (
    <>
      <tr className="hover:bg-[#272727] group transition-colors">
        {isEditMode ? (
          <td className="px-4 py-3 text-center text-xs text-[#7E5C4A] group-hover:text-[#EFD09E]">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onToggleSelected(po, caseData.caseNo, e.target.checked)}
            />
          </td>
        ) : null}
        <td className="px-4 py-3 text-center font-mono text-[#7E5C4A] group-hover:text-[#EFD09E]">#{caseData.caseNo}</td>
        <td className="px-4 py-3 text-center">
        <span
          title={caseData.type.replace(/\bwarp\b/gi, "Wrap")}
          className="inline-block max-w-[140px] rounded-md border border-[#D4AA7D]/45 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#7E5C4A] whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-[#EFD09E] group-hover:border-[#EFD09E]/45"
        >
            {displayType}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="space-y-2">
            {caseData.items.map((item) => (
              <div key={`${item.sku}-${item.qty}`} className="flex items-center justify-between gap-2 text-xs">
                <span
                  onMouseEnter={(event) => handleSkuPointerMove(event, item.sku)}
                  onMouseMove={(event) => handleSkuPointerMove(event, item.sku)}
                  onMouseLeave={handleSkuPointerLeave}
                  className="cursor-help font-medium text-[#272727] underline decoration-[#D4AA7D]/55 decoration-dotted underline-offset-2 group-hover:text-[#EFD09E]"
                >
                  {item.sku}
                </span>
                {isEditMode ? (
                  <input
                    type="number"
                    min={0}
                    defaultValue={item.qty}
                    onBlur={(e) => onUpdateQty(po, caseData.caseNo, item.sku, Number(e.target.value || 0))}
                    className="w-24 rounded-md border border-[#D4AA7D]/45 bg-[#F8EEDB]/70 px-2 py-1 text-right text-[#272727]"
                  />
                ) : (
                  <span className="font-bold text-[#7E5C4A] group-hover:text-[#EFD09E]">x{item.qty}</span>
                )}
              </div>
            ))}
            {caseData.items.length === 0 ? <span className="text-[11px] text-[#7E5C4A]">Empty case</span> : null}
          </div>
        </td>
        <td className="px-4 py-3 text-center text-xs text-[#7E5C4A] group-hover:text-[#EFD09E]">
          {isEditMode ? (
            <select
              value={currentPackage?.name || "__custom__"}
              onChange={(e) => onChangePackage(po, caseData.caseNo, e.target.value)}
              className="rounded-md border border-[#D4AA7D]/45 bg-[#F8EEDB]/70 px-2 py-1 text-xs text-[#272727]"
            >
              <option value="__custom__" disabled>
                {caseData.dims || "Custom"}
              </option>
              {packageOptions.map((pkg) => (
                <option key={pkg.name} value={pkg.name}>
                  {pkg.name}
                </option>
              ))}
            </select>
          ) : (
            caseData.dims
          )}
        </td>
        <td className="px-4 py-3 text-xs text-[#7E5C4A]">
          {isEditMode ? (
            <input
              type="text"
              defaultValue={caseData.note || ""}
              onBlur={(e) => onUpdateNote(po, caseData.caseNo, e.target.value)}
              className="w-full rounded-md border border-[#D4AA7D]/45 bg-[#F8EEDB]/70 px-2 py-1 text-xs text-[#272727]"
              placeholder="Add note"
            />
          ) : (
            <span className="group-hover:text-[#EFD09E]/70">{caseData.note || "-"}</span>
          )}
        </td>
        {isEditMode ? (
          <td className="px-4 py-3">
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => onOpenSplit(po, caseData.caseNo)}
                className="rounded-md border border-[#D4AA7D]/45 bg-[#EFD09E]/60 px-2 py-1 text-[11px] font-bold text-[#7E5C4A] transition-all duration-200 group-hover:bg-white group-hover:text-[#272727] group-hover:border-white group-hover:-translate-y-0.5 group-hover:shadow-sm hover:bg-white hover:text-[#272727] hover:border-white hover:-translate-y-0.5"
              >
                Split
              </button>
            </div>
          </td>
        ) : null}
      </tr>
      {tooltip && skuDimensions[tooltip.sku] && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[9999] rounded-full border border-[#D4AA7D]/35 bg-[#FFF8EA]/96 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#272727] shadow-[12px_14px_26px_rgba(39,38,53,0.18)]"
              style={{
                left: tooltip.x + 10,
                top: tooltip.y - 36,
              }}
            >
              DIMENSIONS {skuDimensions[tooltip.sku].width} x {skuDimensions[tooltip.sku].length} x{" "}
              {skuDimensions[tooltip.sku].height}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
