// 🏷️ src/types/transaction.ts
import { Unit } from "./material";

export type TransactionType =
  | "receive"
  | "issue"
  | "adjust"
  | "loss"
  | "transfer";

export interface Transaction {
  id: string; // TRX-TYPE-YYYYMMDD-XXXX
  type: TransactionType;
  materialId: string;
  quantity: number;
  unit: Unit;
  fromLocation?: string;
  toLocation?: string;
  reference: string; // เลขที่เอกสารอ้างอิง (PO, RQ, etc.)
  notes?: string;
  userId: string;
  userName: string;
  timestamp: Date;
  costPerUnit?: number;
  totalCost?: number;
}
