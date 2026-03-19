import type {
  BuildSheetEntriesResult,
  FlattenedPlanCase,
  PackingDetailSheetEntry,
  PackingDetailsExportOptions,
  PoNoSummary,
  PlanResultForExport,
} from "@/lib/packing-details/export.types";

interface ParsedNoSelection {
  selectedNos: number[];
  errors: string[];
}

export const flattenPlanCases = (planResult: PlanResultForExport): FlattenedPlanCase[] => {
  let runningNo = 1;
  const rows: FlattenedPlanCase[] = [];

  planResult.forEach((poGroup) => {
    poGroup.cases.forEach((caseData) => {
      rows.push({
        no: runningNo,
        po: poGroup.po,
        originalCaseNo: caseData.caseNo,
        caseData,
      });
      runningNo += 1;
    });
  });

  return rows;
};

export const summarizePoNos = (planResult: PlanResultForExport): PoNoSummary[] =>
  planResult.map((poGroup) => ({
    po: poGroup.po,
    totalNos: poGroup.cases.length,
  }));

const toInt = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

export const parseNoSelection = (input: string): ParsedNoSelection => {
  const cleaned = input.replace(/\s+/g, "");
  if (!cleaned) {
    return { selectedNos: [], errors: ["No. range is required for Custom mode."] };
  }

  const tokens = cleaned.split(",");
  const picked = new Set<number>();
  const errors: string[] = [];

  tokens.forEach((token) => {
    if (!token) {
      errors.push("No. range contains an empty token.");
      return;
    }

    if (token.includes("-")) {
      const [startRaw, endRaw, ...rest] = token.split("-");
      if (rest.length > 0 || !startRaw || !endRaw) {
        errors.push(`Invalid range token: "${token}"`);
        return;
      }
      const start = toInt(startRaw);
      const end = toInt(endRaw);
      if (start === null || end === null) {
        errors.push(`Invalid range token: "${token}"`);
        return;
      }
      if (start > end) {
        errors.push(`Invalid range "${token}" (start must be <= end).`);
        return;
      }
      for (let i = start; i <= end; i += 1) picked.add(i);
      return;
    }

    const single = toInt(token);
    if (single === null) {
      errors.push(`Invalid No. token: "${token}"`);
      return;
    }
    picked.add(single);
  });

  return {
    selectedNos: Array.from(picked).sort((a, b) => a - b),
    errors,
  };
};

export const buildPackingDetailSheetEntries = (
  planResult: PlanResultForExport,
  options: PackingDetailsExportOptions
): BuildSheetEntriesResult => {
  const flattened = flattenPlanCases(planResult);
  const totalNoCount = flattened.length;

  if (totalNoCount === 0) {
    return {
      entries: [],
      errors: ["No plan rows available for export."],
      totalNoCount,
    };
  }

  const availablePoSet = new Set(planResult.map((group) => group.po));
  const selectedPos = Array.from(
    new Set(options.selectedPos.map((po) => po.trim()).filter((po) => po.length > 0))
  ).filter((po) => availablePoSet.has(po));

  if (selectedPos.length === 0) {
    return {
      entries: [],
      errors: ["Please select at least one PO."],
      totalNoCount,
    };
  }

  if (!Number.isFinite(options.startCaseNo) || options.startCaseNo <= 0) {
    return {
      entries: [],
      errors: ["Start Case no. must be a positive number."],
      totalNoCount,
    };
  }

  const shipment = options.shipment.trim();
  if (!shipment) {
    return {
      entries: [],
      errors: ["Shipment is required."],
      totalNoCount,
    };
  }

  const rowsByPo = new Map<string, FlattenedPlanCase[]>();
  flattened.forEach((row) => {
    const rows = rowsByPo.get(row.po) || [];
    rows.push(row);
    rowsByPo.set(row.po, rows);
  });

  const selectedRows: FlattenedPlanCase[] = [];
  const errors: string[] = [];

  planResult.forEach((poGroup) => {
    if (!selectedPos.includes(poGroup.po)) return;
    const po = poGroup.po;
    const rows = rowsByPo.get(po) || [];
    if (rows.length === 0) return;

    if (options.selectionMode === "all") {
      selectedRows.push(...rows);
      return;
    }

    const rangeInput = (options.poNoRangeMap[po] || "").trim();
    const parsed = parseNoSelection(rangeInput);
    if (parsed.errors.length > 0) {
      parsed.errors.forEach((error) => errors.push(`PO ${po}: ${error}`));
      return;
    }
    if (parsed.selectedNos.length === 0) {
      errors.push(`PO ${po}: No. range is required for Custom mode.`);
      return;
    }

    const outOfRange = parsed.selectedNos.filter((no) => no < 1 || no > rows.length);
    if (outOfRange.length > 0) {
      outOfRange.forEach((no) => {
        errors.push(`PO ${po}: Range includes No. ${no} but this PO has only ${rows.length}.`);
      });
      return;
    }

    parsed.selectedNos.forEach((noInPo) => {
      const row = rows[noInPo - 1];
      if (row) selectedRows.push(row);
    });
  });

  if (errors.length > 0) {
    return { entries: [], errors, totalNoCount };
  }
  if (selectedRows.length === 0) {
    return {
      entries: [],
      errors: ["No rows selected. Please select at least one PO/No."],
      totalNoCount,
    };
  }

  const entries: PackingDetailSheetEntry[] = selectedRows.map((row, idx) => {
    const mappedCaseNo = options.startCaseNo + idx;
    const totalQty = row.caseData.items.reduce((sum, item) => sum + item.qty, 0);

    return {
      sourceNo: row.no,
      po: row.po,
      originalCaseNo: row.originalCaseNo,
      mappedCaseNo,
      palletNo: String(mappedCaseNo),
      shipment,
      shipBy: options.shipBy,
      product: options.product,
      caseData: row.caseData,
      totalQty,
    };
  });

  return { entries, errors: [], totalNoCount };
};
