// src/types/index.ts
export * from "./user";
export * from "./material";
export * from "./transaction";

// Requisition
export type RequisitionStatus = "pending" | "approved" | "rejected" | "completed";
export type Priority = "low" | "normal" | "high" | "urgent";

import { Unit } from "./material";

export interface RequisitionItem {
  materialId: string;
  materialName: string;
  requestedQty: number;
  approvedQty?: number;
  issuedQty?: number;
  unit: Unit;
}

export interface Requisition {
  id: string; // RQ-YYYYMMDD-XXXX
  reqNumber: string;
  requestedBy: string;
  department: string;
  items: RequisitionItem[];
  status: RequisitionStatus;
  priority: Priority;
  notes?: string;
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  completedAt?: Date;
}
