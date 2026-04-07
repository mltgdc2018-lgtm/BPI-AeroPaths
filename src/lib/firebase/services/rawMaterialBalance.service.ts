import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawMaterialTransaction {
  id?: string;
  type: 'receiving' | 'usage';
  date: string;          // "YYYY-MM-DD"
  jobOrder?: string;     // For receiving
  shipment?: string;     // For usage
  materialName: string;
  qty: number;
  unit: 'pc' | 'm';
  lotId?: string;        // Links usage → receiving lot (FIFO)
  createdAt?: Timestamp | Date;
  createdBy?: string;
}

export interface InventoryBalanceRow {
  materialName: string;
  unit: string;
  totalIn: number;
  totalOut: number;
  balance: number;
  oldestLotDate: string | null;  // FIFO indicator
}

interface FifoLot {
  id: string;
  date: string;
  jobOrder: string;
  remaining: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLLECTION = 'rawMaterialTransactions';

// ─── Service ──────────────────────────────────────────────────────────────────

export const RawMaterialBalanceService = {

  // ✅ Add Receiving Record
  addReceiving: async (data: Omit<RawMaterialTransaction, 'id' | 'type' | 'createdAt'>) => {
    try {
      const docRef = await addDoc(collection(db, COLLECTION), {
        ...data,
        type: 'receiving',
        createdAt: serverTimestamp(),
      });
      return { success: true, id: docRef.id, error: null };
    } catch (error) {
      console.error('Add Receiving Error:', error);
      return { success: false, id: null, error: error as Error };
    }
  },

  // ✅ Add Usage Record with FIFO auto-deduction
  addUsage: async (data: Omit<RawMaterialTransaction, 'id' | 'type' | 'createdAt' | 'lotId'>) => {
    try {
      // 1. Get all receiving lots for this material, then sort locally (FIFO)
      const lotsQuery = query(
        collection(db, COLLECTION),
        where('type', '==', 'receiving'),
        where('materialName', '==', data.materialName)
      );
      const lotsSnap = await getDocs(lotsQuery);
      const receivingLots: { id: string; date: string; jobOrder: string; qty: number }[] = [];
      lotsSnap.forEach(d => {
        const lot = d.data();
        receivingLots.push({ id: d.id, date: lot.date, jobOrder: lot.jobOrder || '', qty: lot.qty });
      });
      // Sort locally by date ascending
      receivingLots.sort((a, b) => a.date.localeCompare(b.date));

      // 2. Get all existing usage for this material
      const usageQuery = query(
        collection(db, COLLECTION),
        where('type', '==', 'usage'),
        where('materialName', '==', data.materialName),
      );
      const usageSnap = await getDocs(usageQuery);
      const usageLotMap: Record<string, number> = {};
      usageSnap.forEach(d => {
        const u = d.data();
        if (u.lotId) {
          usageLotMap[u.lotId] = (usageLotMap[u.lotId] || 0) + u.qty;
        }
      });

      // 3. Calculate remaining per lot
      const fifoLots: FifoLot[] = receivingLots.map(lot => ({
        ...lot,
        remaining: lot.qty - (usageLotMap[lot.id] || 0),
      })).filter(lot => lot.remaining > 0);

      // 4. Distribute the usage across lots (FIFO)
      let remainingToDeduct = data.qty;
      const usageRecords: { lotId: string; qty: number }[] = [];

      for (const lot of fifoLots) {
        if (remainingToDeduct <= 0) break;
        const deduct = Math.min(lot.remaining, remainingToDeduct);
        usageRecords.push({ lotId: lot.id, qty: deduct });
        remainingToDeduct -= deduct;
      }

      // 5. If not enough stock, still record but with no lot assignment
      if (remainingToDeduct > 0) {
        usageRecords.push({ lotId: 'OVER_USAGE', qty: remainingToDeduct });
      }

      // 6. Write all usage records in a batch
      const batch = writeBatch(db);
      for (const rec of usageRecords) {
        const newRef = doc(collection(db, COLLECTION));
        batch.set(newRef, {
          ...data,
          type: 'usage',
          lotId: rec.lotId,
          qty: rec.qty,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();

      return { success: true, error: null, overUsage: remainingToDeduct > 0 ? remainingToDeduct : 0 };
    } catch (error) {
      console.error('Add Usage Error:', error);
      return { success: false, error: error as Error, overUsage: 0 };
    }
  },

  // ✅ Get all transactions (with optional filters)
  getTransactions: async (filters?: {
    type?: 'receiving' | 'usage';
    year?: string;
    month?: string;
    materialName?: string;
  }) => {
    try {
      let q = query(collection(db, COLLECTION));

      if (filters?.type) {
        q = query(q, where('type', '==', filters.type));
      }

      const snap = await getDocs(q);
      let data: RawMaterialTransaction[] = [];

      snap.forEach(d => {
        const raw = d.data();
        data.push({
          id: d.id,
          type: raw.type,
          date: raw.date,
          jobOrder: raw.jobOrder || '',
          shipment: raw.shipment || '',
          materialName: raw.materialName,
          qty: raw.qty,
          unit: raw.unit || 'pc',
          lotId: raw.lotId || '',
          createdAt: raw.createdAt,
          createdBy: raw.createdBy || '',
        });
      });

      // Client-side filtering for year/month (Firestore string queries)
      if (filters?.year && filters.year !== 'All') {
        data = data.filter(d => d.date.startsWith(filters.year!));
      }
      if (filters?.month && filters.month !== 'All') {
        data = data.filter(d => d.date.slice(5, 7) === filters.month);
      }
      if (filters?.materialName) {
        data = data.filter(d =>
          d.materialName.toLowerCase().includes(filters.materialName!.toLowerCase())
        );
      }

      // Local sort by date descending to avoid requiring a composite index in Firestore
      data.sort((a, b) => b.date.localeCompare(a.date));

      return { data, error: null };
    } catch (error) {
      console.error('Get Transactions Error:', error);
      return { data: [], error: error as Error };
    }
  },

  // ✅ Calculate Inventory Balance per material
  getInventoryBalance: async (): Promise<{ data: InventoryBalanceRow[]; error: Error | null }> => {
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      const matMap: Record<string, { unit: string; totalIn: number; totalOut: number; oldestLotDate: string | null; oldestLotRemaining: number }> = {};

      // Pass 1: Aggregate receiving
      const receivingByLot: Record<string, { materialName: string; date: string; qty: number }> = {};
      const usageByLot: Record<string, number> = {};

      snap.forEach(d => {
        const raw = d.data();
        const name = raw.materialName as string;
        const unit = (raw.unit || 'pc') as string;

        if (!matMap[name]) {
          matMap[name] = { unit, totalIn: 0, totalOut: 0, oldestLotDate: null, oldestLotRemaining: 0 };
        }

        if (raw.type === 'receiving') {
          matMap[name].totalIn += raw.qty;
          receivingByLot[d.id] = { materialName: name, date: raw.date, qty: raw.qty };
        } else if (raw.type === 'usage') {
          matMap[name].totalOut += raw.qty;
          if (raw.lotId && raw.lotId !== 'OVER_USAGE') {
            usageByLot[raw.lotId] = (usageByLot[raw.lotId] || 0) + raw.qty;
          }
        }
      });

      // Pass 2: Determine oldest lot with remaining stock
      const lotsByMat: Record<string, { date: string; remaining: number }[]> = {};
      for (const [lotId, lot] of Object.entries(receivingByLot)) {
        const used = usageByLot[lotId] || 0;
        const remaining = lot.qty - used;
        if (remaining > 0) {
          if (!lotsByMat[lot.materialName]) lotsByMat[lot.materialName] = [];
          lotsByMat[lot.materialName].push({ date: lot.date, remaining });
        }
      }

      for (const [name, lots] of Object.entries(lotsByMat)) {
        lots.sort((a, b) => a.date.localeCompare(b.date));
        if (lots.length > 0 && matMap[name]) {
          matMap[name].oldestLotDate = lots[0].date;
        }
      }

      const data: InventoryBalanceRow[] = Object.entries(matMap)
        .map(([materialName, info]) => ({
          materialName,
          unit: info.unit,
          totalIn: Math.round(info.totalIn * 100) / 100,
          totalOut: Math.round(info.totalOut * 100) / 100,
          balance: Math.round((info.totalIn - info.totalOut) * 100) / 100,
          oldestLotDate: info.oldestLotDate,
        }))
        .sort((a, b) => a.materialName.localeCompare(b.materialName));

      return { data, error: null };
    } catch (error) {
      console.error('Get Inventory Balance Error:', error);
      return { data: [], error: error as Error };
    }
  },

  // ✅ Delete a transaction
  deleteTransaction: async (id: string) => {
    try {
      const { deleteDoc: delDoc, doc: docRef } = await import('firebase/firestore');
      await delDoc(docRef(db, COLLECTION, id));
      return { success: true };
    } catch (error) {
      console.error('Delete Transaction Error:', error);
      return { success: false, error };
    }
  },
};
