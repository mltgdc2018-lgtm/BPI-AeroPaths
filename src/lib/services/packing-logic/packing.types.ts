// ========================================
// PACKING LOGIC - TYPE DEFINITIONS
// ========================================

export interface ProcessedItem {
  po: string;
  sku: string;
  qty: number;
  spec?: {
    name: string;
    width: number;
    length: number;
    height: number;
    m3: number;
    packingRules?: {
      warp?: boolean;
      boxes?: Record<string, number>;
      pallets?: Record<string, number>;
    };
  };
  m3Total?: number;
  maxPackage?: string;
  dimsKey?: string;
}

export interface ProcessedItemWithDensity extends ProcessedItem {
  density: number;
  maxCapacity: number;
}

export interface PackedCase {
  caseNo: number;
  type: string;
  items: { sku: string; name: string; qty: number }[];
  dims: string;
  note?: string;
}

export interface POData {
  po: string;
  items: ProcessedItem[];
  uniqueDims: string[];
  packingType: "same" | "mixed" | "pending";
  sameItems: ProcessedItem[];
  mixedItems: ProcessedItem[];
  remainder: ProcessedItem[];
}

export interface POResult {
  po: string;
  warpCases: PackedCase[];
  unknownCases: PackedCase[];
  monoCases: PackedCase[];
  sameCases: PackedCase[];
  mixedCases: PackedCase[];
  status: "processing" | "complete";
}

export interface PackingConfig {
  region: "A" | "E" | "R";
  m3Threshold?: number; // Default: 0.15
  palletEfficiencyThreshold?: number; // Default: 0.75
  densityThreshold?: number; // Default: 60
}

export interface PackingInput {
  rawData: string; // Tab/comma separated: PO, SKU, QTY
  config: PackingConfig;
}

export interface PackingOutput {
  results: Map<string, POResult>;
  summary: {
    totalPOs: number;
    totalCases: number;
    warpCount: number;
    unknownCount: number;
    monoCount: number;
    sameCount: number;
    mixedCount: number;
  };
}

export interface StepResult {
  step: string;
  description: string;
  items?: ProcessedItem[];
  poData?: Map<string, POData>;
  results?: Map<string, POResult>;
}
export interface PackingPlanResult {
  po: string;
  cases: PackedCase[];
  summary: {
    totalPallets: number;
    totalBoxes: number;
    totalItems: number;
  };
}
