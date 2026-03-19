import { 
  collection, 
  doc, 
  writeBatch, 
  getDocs, 
  getDoc,
  query, 
  where, 
  serverTimestamp,
  orderBy,
  limit,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// We'll define the type here locally if not exported, or better, move types to a shared location later.
// For now, I'll redefine a compatible interface to avoid circular dependency issues if the page one isn't exported well.
export interface IActivityChange {
  field: string;
  before: string | number;
  after: string | number;
}

export interface IActivityLog {
  id?: string;
  timestamp: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  project: string; // e.g. "Smart Packaging"
  action: 'Create' | 'Read' | 'Update' | 'Delete' | 'Import' | 'Export';
  category: string;
  targetId: string;
  targetName: string;
  user: string;
  changes?: IActivityChange[];
  details?: string;
}

export interface PackagingProductDTO {
  id?: string;
  sku: string;
  name: string;
  category: string;
  width: number;
  length: number;
  height: number;
  nw: number;
  gw: number;
  cbm: number;
  productType: string;
  unit?: string; // e.g. PCS, SET
  stackingLimit: number;
  sideBoxWeight: string;
  lastUpdated: string;
  packingRules: Record<string, unknown>;
}

function buildPackingPlanFingerprint(planData: {
  customer: { id: string; name: string; region: string };
  poList: string[];
  effectiveData?: string;
  data: string;
}): string {
  const source = JSON.stringify({
    customer: planData.customer,
    poList: [...planData.poList].sort(),
    effectiveData: planData.effectiveData || planData.data,
  });

  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }

  return `pack_${hash.toString(16)}`;
}

export const PackagingService = {
  // Bulk Import with Batch Writes (Upsert by SKU)
  importItems: async (items: PackagingProductDTO[]) => {
    const batchSize = 500; // Firestore limit
    const chunks = [];
    
    // Chunk items
    for (let i = 0; i < items.length; i += batchSize) {
      chunks.push(items.slice(i, i + batchSize));
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process chunks
    for (const chunk of chunks) {
      try {
        const batch = writeBatch(db);
        
        chunk.forEach(item => {
          // Use SKU as the Document ID for easy upsert
          const docRef = doc(db, 'packaging_specs', item.sku); // Collection: packaging_specs
          
          const payload = {
            ...item,
            updatedAt: serverTimestamp(),
            // If it's new, createdAt will be set if we used set with merge: true? 
            // merge: true preserves existing fields.
            // We might want to set createdAt only if it doesn't exist, but set() with merge doesn't support "setOnInsert" easily.
            // For now, just setting the data is fine.
          };
          
          batch.set(docRef, payload, { merge: true });
        });

        await batch.commit();
        successCount += chunk.length;
      } catch (err: unknown) {
        console.error("Batch commit failed:", err);
        errorCount += chunk.length;
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    return { successCount, errorCount, errors };
  },

  // Update Item (Partial Update - Replaces nested objects if passed)
  updateItem: async (sku: string, data: Partial<PackagingProductDTO>) => {
    try {
      const docRef = doc(db, 'packaging_specs', sku);
      // updateDoc will replace the fields provided in data.
      // If data.packingRules is provided, it will REPLACE the existing packingRules map,
      // which is exactly what we want for deleting keys.
      await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
       console.error(`Error updating item ${sku}:`, error);
       throw error;
    }
  },

  // Get items by category
  getByCategory: async (category: string) => {
    try {
      const q = query(collection(db, 'packaging_specs'), where('category', '==', category));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagingProductDTO));
    } catch (error) {
      console.error("Error fetching specs:", error);
      return [];
    }
  },

  // Log Activity
  logActivity: async (log: Omit<IActivityLog, 'timestamp'>) => {
    try {
      const batch = writeBatch(db);
      const docRef = doc(collection(db, 'packaging_activities'));
      batch.set(docRef, {
        ...log,
        timestamp: serverTimestamp()
      });
      await batch.commit();
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  },

  // Get activities
  getActivities: async (category?: string) => {
    try {
      let q = query(collection(db, 'packaging_activities'));
      if (category) {
        q = query(q, where('category', '==', category));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IActivityLog));
    } catch (error) {
      console.error("Error fetching activities:", error);
      return [];
    }
  },

  // Save Packing Plan
  savePackingPlan: async (planData: {
    customer: { id: string; name: string; region: string };
    summary: { totalPallets: number; totalBoxes: number; totalWarps: number; totalItems: number };
    poList: string[];
    data: string; // JSON string
    baseData?: string;
    effectiveData?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adjustments?: any[];
    hasManualAdjustment?: boolean;
    adjustmentCount?: number;
    activityUser?: string;
  }) => {
    try {
      const fingerprint = buildPackingPlanFingerprint(planData);
      const duplicateQuery = query(
        collection(db, 'packing_plans'),
        where('fingerprint', '==', fingerprint),
        limit(1)
      );
      const duplicateSnapshot = await getDocs(duplicateQuery);
      if (!duplicateSnapshot.empty) {
        return { success: false, duplicate: true, id: duplicateSnapshot.docs[0]?.id };
      }

      const batch = writeBatch(db);
      
      // 1. Create Plan Document
      const planRef = doc(collection(db, 'packing_plans'));
      batch.set(planRef, {
        ...planData,
        fingerprint,
        createdAt: serverTimestamp()
      });

      // 2. Log Activity
      const activityRef = doc(collection(db, 'packaging_activities'));
      batch.set(activityRef, {
        timestamp: serverTimestamp(),
        project: "Smart Packaging",
        action: 'Create',
        category: 'Planning',
        targetId: planRef.id,
        targetName: `Plan for ${planData.customer.name}`,
        user: planData.activityUser || 'System',
        details: `Created packing plan with ${planData.summary.totalPallets} pallets and ${planData.summary.totalBoxes} boxes. Adjusted: ${planData.hasManualAdjustment ? "Yes" : "No"} (${planData.adjustmentCount || 0})`
      });

      await batch.commit();
      return { success: true, id: planRef.id };
    } catch (error) {
      console.error("Error saving packing plan:", error);
      return { success: false, error };
    }
  },

  // Get Recent Packing Plans
  getRecentPackingPlans: async (limitCount: number = 3) => {
    try {
      const q = query(
        collection(db, 'packing_plans'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (error) {
       console.error("Error getting recent plans:", error);
       return [];
    }
  },

  // Get single product spec by SKU
  getProductSpec: async (sku: string): Promise<PackagingProductDTO | null> => {
    try {
      const docRef = doc(db, 'packaging_specs', sku);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as PackagingProductDTO;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching spec for ${sku}:`, error);
      return null;
    }
  },

  // Get unique consignee list from packing reports where Product contains "Inverter"
  getInverterConsigneeOptions: async (): Promise<string[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'packaging_reports'));
      const options = new Set<string>();

      snapshot.docs.forEach((rowDoc) => {
        const data = rowDoc.data() as Record<string, unknown>;
        const product = String(data.product || '').toLowerCase();
        if (!product.includes('inverter')) return;

        const consignee = String(data.consigneeName || data.shipment || '').trim();
        if (!consignee || consignee === '-') return;
        options.add(consignee);
      });

      return Array.from(options).sort((a, b) => a.localeCompare(b));
    } catch (error) {
      console.error('Error fetching inverter consignee options:', error);
      return [];
    }
  }
};
