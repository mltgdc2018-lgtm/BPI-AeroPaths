// 🏷️ src/types/material.ts

export type MaterialCategory =
  | "raw-material"
  | "packaging"
  | "ingredient"
  | "supplies";

export type Unit = "kg" | "g" | "l" | "ml" | "pcs" | "box" | "bag" | "set";

export interface Material {
  id: string; // MAT-YYYYMMDD-XXXX
  name: string;
  nameEn: string; // English name for exports/reports
  sku: string;
  category: MaterialCategory;

  // Type Check
  type: "single" | "composite"; // composite = BOM/Set

  // Stock Info
  unit: Unit;
  currentStock: number;
  costPerUnit: number;

  // Thresholds & Alerts
  minStock: number; // Reorder Point (Yellow Badge)
  criticalStock: number; // Critical Level (Red Pulse Badge)
  maxStock: number;

  // For Composite Items (BOM)
  components?: {
    materialId: string;
    quantity: number; // Amount needed per 1 set
  }[];

  // Meta
  location: string; // e.g., "Z1-A-01" (Zone-Row-Shelf)
  suppliers: string[];
  barcode?: string;
  imageUrl?: string;
  description?: string;
  lastUpdated: Date;
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
}
