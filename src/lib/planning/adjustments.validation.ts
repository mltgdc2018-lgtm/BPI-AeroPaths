import type { AdjustmentValidationResult, POCase } from "./adjustments.types";

function parseQty(raw: string): number {
  const qty = Number(raw.replace(/,/g, "").trim());
  return Number.isFinite(qty) ? qty : 0;
}

export function buildExpectedQtyMap(rawData: string): Map<string, number> {
  const map = new Map<string, number>();

  rawData
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.split(/[\t,]+/);
      if (parts.length < 3) return;

      const po = parts[0].trim();
      const sku = parts[1].trim();
      const qty = parseQty(parts[2]);
      if (!po || !sku || qty <= 0) return;

      const key = `${po}|${sku}`;
      map.set(key, (map.get(key) || 0) + qty);
    });

  return map;
}

function buildActualQtyMap(result: POCase[]): Map<string, number> {
  const map = new Map<string, number>();

  result.forEach((poCase) => {
    poCase.cases.forEach((c) => {
      c.items.forEach((item) => {
        const key = `${poCase.po}|${item.sku}`;
        map.set(key, (map.get(key) || 0) + item.qty);
      });
    });
  });

  return map;
}

export function validateAdjustedResult(result: POCase[], expectedQtyByPoSku: Map<string, number>): AdjustmentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const actual = buildActualQtyMap(result);

  if (expectedQtyByPoSku.size > 0) {
    expectedQtyByPoSku.forEach((expectedQty, key) => {
      const actualQty = actual.get(key) || 0;
      if (actualQty !== expectedQty) {
        const [po, sku] = key.split("|");
        errors.push(`PO ${po} / SKU ${sku}: expected ${expectedQty}, found ${actualQty}`);
      }
    });

    actual.forEach((actualQty, key) => {
      if (expectedQtyByPoSku.has(key)) return;
      const [po, sku] = key.split("|");
      errors.push(`PO ${po} / SKU ${sku}: extra qty ${actualQty} not found in input`);
    });
  } else if (result.length > 0) {
    warnings.push("Cannot verify PO+SKU totals because raw input is not available.");
  }

  result.forEach((poCase) => {
    const seen = new Set<number>();

    poCase.cases.forEach((c) => {
      if (seen.has(c.caseNo)) {
        errors.push(`PO ${poCase.po}: duplicate case #${c.caseNo}`);
      }
      seen.add(c.caseNo);

      if (c.items.length === 0) {
        warnings.push(`PO ${poCase.po} case #${c.caseNo}: empty case`);
      }

      c.items.forEach((item) => {
        if (item.qty <= 0) {
          errors.push(`PO ${poCase.po} case #${c.caseNo} (${item.sku}): qty must be > 0`);
        }
      });
    });
  });

  return { errors, warnings };
}
