import type { PackedCase } from "@/lib/services/packing-logic/packing.types";
import type { POCase, PlanAdjustmentOp } from "./adjustments.types";
import { cloneCase, clonePlanResult, getNextCaseNo, normalizeCaseNumbers } from "./adjustments.helpers";

type AdjustedPackedCase = PackedCase & {
  _sortHint?: "split_after" | "merge_anchor";
  _sortAnchorCaseNo?: number;
};

function aggregateItems(cases: PackedCase[]): PackedCase["items"] {
  const bucket = new Map<string, { sku: string; name: string; qty: number }>();

  for (const c of cases) {
    for (const item of c.items) {
      const key = `${item.sku}|${item.name || item.sku}`;
      const curr = bucket.get(key);
      if (curr) {
        curr.qty += item.qty;
      } else {
        bucket.set(key, { sku: item.sku, name: item.name || item.sku, qty: item.qty });
      }
    }
  }

  return Array.from(bucket.values()).filter((i) => i.qty > 0);
}

function mutatePOCase(poCase: POCase, op: PlanAdjustmentOp): POCase {
  if (poCase.po !== op.po) return poCase;

  const nextCases = poCase.cases.map(cloneCase);

  switch (op.type) {
    case "update_item_qty": {
      const target = nextCases.find((c) => c.caseNo === op.caseNo);
      if (!target) return poCase;

      target.items = target.items
        .map((item) => (item.sku === op.sku ? { ...item, qty: Math.max(0, Math.floor(op.qty)) } : item))
        .filter((item) => item.qty > 0);

      return { ...poCase, cases: nextCases };
    }

    case "update_case_note": {
      const target = nextCases.find((c) => c.caseNo === op.caseNo);
      if (!target) return poCase;
      target.note = op.note;
      return { ...poCase, cases: nextCases };
    }

    case "change_case_package": {
      const target = nextCases.find((c) => c.caseNo === op.caseNo);
      if (!target) return poCase;
      target.dims = op.dims;
      target.type = op.caseType;
      target.note = target.note ? `${target.note} | pkg:${op.packageName}` : `pkg:${op.packageName}`;
      return { ...poCase, cases: nextCases };
    }

    case "split_case": {
      const source = nextCases.find((c) => c.caseNo === op.caseNo);
      if (!source) return poCase;

      const sourceItem = source.items.find((item) => item.sku === op.sku);
      if (!sourceItem) return poCase;

      const splitQty = Math.max(1, Math.floor(op.qty));
      if (splitQty > sourceItem.qty) return poCase;

      source.items = source.items.map((item) => {
        if (item.sku !== op.sku) return item;
        return { ...item, qty: item.qty - splitQty };
      }).filter((item) => item.qty > 0);

      const nextNo = getNextCaseNo(nextCases);
      nextCases.push({
        caseNo: nextNo,
        type: op.caseType,
        dims: op.dims,
        note: `Split from #${op.caseNo}`,
        items: [
          {
            sku: sourceItem.sku,
            name: sourceItem.name,
            qty: splitQty,
          },
        ],
        _sortHint: "split_after",
        _sortAnchorCaseNo: op.caseNo,
      } as AdjustedPackedCase);

      return { ...poCase, cases: nextCases };
    }

    case "merge_cases": {
      const mergedCases = nextCases.filter((c) => op.caseNos.includes(c.caseNo));
      if (mergedCases.length < 2) return poCase;

      const aggregated = aggregateItems(mergedCases);
      const keepCaseNo = Math.min(...op.caseNos);
      const others = nextCases.filter((c) => !op.caseNos.includes(c.caseNo));

      others.push({
        caseNo: keepCaseNo,
        type: op.caseType,
        dims: op.dims,
        note: `Merged from [${op.caseNos.join(",")}]`,
        items: aggregated,
        _sortHint: "merge_anchor",
        _sortAnchorCaseNo: keepCaseNo,
      } as AdjustedPackedCase);

      return { ...poCase, cases: others };
    }

    case "add_case": {
      nextCases.push({
        caseNo: getNextCaseNo(nextCases),
        type: op.caseType,
        dims: op.dims,
        note: "Manual empty case",
        items: [],
      });
      return { ...poCase, cases: nextCases };
    }

    case "delete_case": {
      const target = nextCases.find((c) => c.caseNo === op.caseNo);
      if (!target) return poCase;

      if (target.items.length > 0) {
        return poCase;
      }

      return {
        ...poCase,
        cases: nextCases.filter((c) => c.caseNo !== op.caseNo),
      };
    }

    default:
      return poCase;
  }
}

export function applyAdjustment(base: POCase[], op: PlanAdjustmentOp): POCase[] {
  const cloned = clonePlanResult(base);
  const next = cloned.map((poCase) => mutatePOCase(poCase, op));
  return normalizeCaseNumbers(next);
}

export function applyAdjustments(base: POCase[], ops: PlanAdjustmentOp[]): POCase[] {
  return ops.reduce((acc, op) => applyAdjustment(acc, op), clonePlanResult(base));
}
