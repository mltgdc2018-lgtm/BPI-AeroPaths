import type { PackedCase } from "@/lib/services/packing-logic/packing.types";

export interface POCase {
  po: string;
  cases: PackedCase[];
}

export type PlanAdjustmentOp =
  | {
      type: "update_item_qty";
      po: string;
      caseNo: number;
      sku: string;
      qty: number;
    }
  | {
      type: "update_case_note";
      po: string;
      caseNo: number;
      note: string;
    }
  | {
      type: "change_case_package";
      po: string;
      caseNo: number;
      packageName: string;
      caseType: string;
      dims: string;
    }
  | {
      type: "split_case";
      po: string;
      caseNo: number;
      sku: string;
      qty: number;
      packageName: string;
      caseType: string;
      dims: string;
    }
  | {
      type: "merge_cases";
      po: string;
      caseNos: number[];
      packageName: string;
      caseType: string;
      dims: string;
    }
  | {
      type: "add_case";
      po: string;
      packageName: string;
      caseType: string;
      dims: string;
    }
  | {
      type: "delete_case";
      po: string;
      caseNo: number;
    };

export interface PlanAdjustmentRecord {
  id: string;
  at: string;
  actor: string;
  label: string;
  op: PlanAdjustmentOp;
}

export interface AdjustmentValidationResult {
  errors: string[];
  warnings: string[];
}
