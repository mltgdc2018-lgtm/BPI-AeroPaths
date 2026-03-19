import type { PackedCase } from "@/lib/services/packing-logic/packing.types";
import type { POCase, PlanAdjustmentOp, PlanAdjustmentRecord } from "./adjustments.types";

type AdjustmentSortHint = "split_after" | "merge_anchor";

type AdjustedPackedCase = PackedCase & {
  _sortHint?: AdjustmentSortHint;
  _sortAnchorCaseNo?: number;
};

function describeOp(op: PlanAdjustmentOp): string {
  switch (op.type) {
    case "update_item_qty":
      return `Adjust qty ${op.po} #${op.caseNo} ${op.sku} -> ${op.qty}`;
    case "update_case_note":
      return `Update note ${op.po} #${op.caseNo}`;
    case "change_case_package":
      return `Change package ${op.po} #${op.caseNo} -> ${op.packageName}`;
    case "split_case":
      return `Split case ${op.po} #${op.caseNo} (${op.sku} ${op.qty})`;
    case "merge_cases":
      return `Merge cases ${op.po} [${op.caseNos.join(", ")}]`;
    case "add_case":
      return `Add case ${op.po} (${op.packageName})`;
    case "delete_case":
      return `Delete case ${op.po} #${op.caseNo}`;
    default:
      return "Manual adjustment";
  }
}

export function cloneCase(input: PackedCase): PackedCase {
  return {
    ...input,
    items: input.items.map((item) => ({ ...item })),
  };
}

export function clonePlanResult(planResult: POCase[]): POCase[] {
  return planResult.map((poGroup) => ({
    po: poGroup.po,
    cases: poGroup.cases.map(cloneCase),
  }));
}

function isPalletCase(input: Pick<PackedCase, "type" | "dims">): boolean {
  const type = input.type.trim().toLowerCase();
  const dims = input.dims.trim().toLowerCase();
  return type.includes("pallet") || dims.includes("110") || dims.includes("120") || dims === "rtn";
}

function isBoxCase(input: Pick<PackedCase, "type" | "dims">): boolean {
  const type = input.type.trim().toLowerCase();
  const dims = input.dims.trim().toLowerCase();
  return type.includes("box") || (dims.includes("x") && !isPalletCase(input) && dims !== "wrap");
}

function getCaseSortPriority(input: Pick<PackedCase, "type" | "note" | "dims">): number {
  const type = input.type.trim().toLowerCase();
  const note = (input.note || "").toLowerCase();
  const isSame = type.includes("same");
  const isPallet = isPalletCase(input);
  const isBox = isBoxCase(input);

  if (isPallet && note.includes("overflow")) return 1;
  if (isSame && isPallet && note.includes("same dim group")) return 2;
  if (isPallet) return 3;
  if (isSame && isBox) return 4;
  if (isBox) return 5;
  if (type.includes("warp") || type.includes("wrap")) return 6;
  if (type.includes("unknown")) return 7;
  return 8;
}

export function createAdjustmentRecord(op: PlanAdjustmentOp, actor = "Planner"): PlanAdjustmentRecord {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    actor,
    label: describeOp(op),
    op,
  };
}

export function normalizeCaseNumbers(planResult: POCase[]): POCase[] {
  return planResult.map((poGroup) => {
    const workingCases = poGroup.cases.map((c) => cloneCase(c) as AdjustedPackedCase);
    const anchoredSplits = workingCases
      .filter((c) => c._sortHint === "split_after" && Number.isFinite(c._sortAnchorCaseNo))
      .sort((a, b) => {
        const anchorDiff = (a._sortAnchorCaseNo || 0) - (b._sortAnchorCaseNo || 0);
        if (anchorDiff !== 0) return anchorDiff;
        return a.caseNo - b.caseNo;
      });
    const regularCases = workingCases.filter((c) => c._sortHint !== "split_after" || !Number.isFinite(c._sortAnchorCaseNo));

    const sortedRegular = [...regularCases].sort((a, b) => {
      const priorityDiff = getCaseSortPriority(a) - getCaseSortPriority(b);
      if (priorityDiff !== 0) return priorityDiff;

      const anchorA = a._sortHint === "merge_anchor" && Number.isFinite(a._sortAnchorCaseNo) ? a._sortAnchorCaseNo || a.caseNo : a.caseNo;
      const anchorB = b._sortHint === "merge_anchor" && Number.isFinite(b._sortAnchorCaseNo) ? b._sortAnchorCaseNo || b.caseNo : b.caseNo;
      if (anchorA !== anchorB) return anchorA - anchorB;

      return a.caseNo - b.caseNo;
    });

    const oldToNew = new Map<number, number>();
    const sorted: AdjustedPackedCase[] = [];

    sortedRegular.forEach((currentCase) => {
      sorted.push(currentCase);

      const matchingSplits = anchoredSplits.filter((splitCase) => splitCase._sortAnchorCaseNo === currentCase.caseNo);
      if (matchingSplits.length > 0) {
        sorted.push(...matchingSplits);
      }
    });

    const orphanSplits = anchoredSplits.filter(
      (splitCase) => !sortedRegular.some((currentCase) => currentCase.caseNo === splitCase._sortAnchorCaseNo)
    );
    if (orphanSplits.length > 0) {
      sorted.push(...orphanSplits);
    }

    sorted.forEach((c, idx) => {
      oldToNew.set(c.caseNo, idx + 1);
    });

    return {
      po: poGroup.po,
      cases: sorted.map((c, idx) => {
        const nextCase = cloneCase(c) as AdjustedPackedCase;
        const currentAnchor = c._sortAnchorCaseNo;
        if (Number.isFinite(currentAnchor)) {
          nextCase._sortAnchorCaseNo = oldToNew.get(currentAnchor as number) ?? currentAnchor;
        }
        nextCase.caseNo = idx + 1;
        return nextCase;
      }),
    };
  });
}

export function getNextCaseNo(cases: PackedCase[]): number {
  if (cases.length === 0) return 1;
  return Math.max(...cases.map((c) => c.caseNo)) + 1;
}

export function summarizePlan(planResult: POCase[]): {
  totalPallets: number;
  totalBoxes: number;
  totalWarps: number;
  totalM3: number;
  totalItems: number;
} {
  let totalPallets = 0;
  let totalBoxes = 0;
  let totalWarps = 0;
  let totalItems = 0;

  planResult.forEach((poGroup) => {
    poGroup.cases.forEach((c) => {
      if (c.type.includes("Warp") || c.type.includes("Wrap")) totalWarps += 1;
      else if (c.type.includes("Pallet")) totalPallets += 1;
      else if (c.type.includes("Box")) totalBoxes += 1;

      totalItems += c.items.reduce((sum, item) => sum + item.qty, 0);
    });
  });

  return {
    totalPallets,
    totalBoxes,
    totalWarps,
    totalItems,
    totalM3: 0,
  };
}
