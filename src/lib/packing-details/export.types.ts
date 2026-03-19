import type { PackedCase } from "@/lib/services/packing-logic/packing.types";
import type { POCase } from "@/lib/planning/adjustments.types";

export type ShipByOption = "Air" | "Sea" | "Courier";
export type ProductOption = "Inverter" | "TC";
export type NoSelectionMode = "all" | "custom";

export interface PackingDetailsExportOptions {
  selectionMode: NoSelectionMode;
  selectedPos: string[];
  poNoRangeMap: Record<string, string>;
  startCaseNo: number;
  shipment: string;
  shipBy: ShipByOption;
  product: ProductOption;
}

export interface FlattenedPlanCase {
  no: number;
  po: string;
  originalCaseNo: number;
  caseData: PackedCase;
}

export interface PackingDetailSheetEntry {
  sourceNo: number;
  po: string;
  originalCaseNo: number;
  mappedCaseNo: number;
  palletNo: string;
  shipment: string;
  shipBy: ShipByOption;
  product: ProductOption;
  caseData: PackedCase;
  totalQty: number;
}

export interface BuildSheetEntriesResult {
  entries: PackingDetailSheetEntry[];
  errors: string[];
  totalNoCount: number;
}

export interface PoNoSummary {
  po: string;
  totalNos: number;
}

export type PlanResultForExport = POCase[];
