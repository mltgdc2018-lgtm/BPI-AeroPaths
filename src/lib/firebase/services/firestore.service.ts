import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  QueryConstraint,
  DocumentData,
  WhereFilterOp,
  OrderByDirection,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ActivityService } from './activity.service';

// ------------------------------------------------------------------
// 🔧 Types
// ------------------------------------------------------------------

export interface QueryFilter {
  field: string;
  operator: WhereFilterOp;
  value: unknown;
}

export interface QueryOrder {
  field: string;
  direction?: OrderByDirection;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  orderBy?: QueryOrder;
  limit?: number;
}

// ------------------------------------------------------------------
// 🔥 Firestore Service (Generic CRUD with Activity Logging)
// ------------------------------------------------------------------

export const FirestoreService = {
  
  // ✅ Create Document
  create: async <T extends DocumentData>(
    collectionName: string, 
    data: T,
    userId?: string
  ): Promise<{ id: string; error: Error | null }> => {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Log Activity
      if (userId) {
        await ActivityService.log({
          action: 'Create',
          module: getModuleFromCollection(collectionName),
          targetId: docRef.id,
          targetName: data.name || data.partNo || data.id || 'New Record',
          user: userId,
        });
      }

      return { id: docRef.id, error: null };
    } catch (error: Error | unknown) {
      console.error('Firestore Create Error:', error);
      return { id: '', error: error as Error };
    }
  },

  // ✅ Get Single Document by ID
  getById: async <T>(
    collectionName: string, 
    id: string
  ): Promise<{ data: T | null; error: Error | null }> => {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { data: { id: docSnap.id, ...docSnap.data() } as T, error: null };
      }
      return { data: null, error: null };
    } catch (error: Error | unknown) {
      console.error('Firestore GetById Error:', error);
      return { data: null, error: error as Error };
    }
  },

  // ✅ Get All Documents (with optional query)
  getAll: async <T>(
    collectionName: string,
    options?: QueryOptions
  ): Promise<{ data: T[]; error: Error | null }> => {
    try {
      const constraints: QueryConstraint[] = [];

      if (options?.filters) {
        options.filters.forEach((f) => {
          constraints.push(where(f.field, f.operator, f.value));
        });
      }

      if (options?.orderBy) {
        constraints.push(orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
      }

      if (options?.limit) {
        constraints.push(limit(options.limit));
      }

      const q = query(collection(db, collectionName), ...constraints);
      const querySnapshot = await getDocs(q);

      const data: T[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as T);
      });

      return { data, error: null };
    } catch (error: Error | unknown) {
      console.error('Firestore GetAll Error:', error);
      return { data: [], error: error as Error };
    }
  },

  // ✅ Update Document (with Activity logging for changes)
  update: async <T extends DocumentData>(
    collectionName: string,
    id: string,
    data: Partial<T>,
    userId?: string,
    originalData?: Partial<T>
  ): Promise<{ success: boolean; error: Error | null }> => {
    try {
      const docRef = doc(db, collectionName, id);
      
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });

      // Log Activity with changes
      if (userId) {
        const changes = originalData ? computeChanges(originalData, data) : undefined;
        
        await ActivityService.log({
          action: 'Update',
          module: getModuleFromCollection(collectionName),
          targetId: id,
          targetName: data.name || data.partNo || id,
          user: userId,
          changes,
        });
      }

      return { success: true, error: null };
    } catch (error: Error | unknown) {
      console.error('Firestore Update Error:', error);
      return { success: false, error: error as Error };
    }
  },

  // ✅ Delete Document
  delete: async (
    collectionName: string,
    id: string,
    targetName: string,
    userId?: string
  ): Promise<{ success: boolean; error: Error | null }> => {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);

      // Log Activity
      if (userId) {
        await ActivityService.log({
          action: 'Delete',
          module: getModuleFromCollection(collectionName),
          targetId: id,
          targetName,
          user: userId,
        });
      }

      return { success: true, error: null };
    } catch (error: Error | unknown) {
      console.error('Firestore Delete Error:', error);
      return { success: false, error: error as Error };
    }
  },
};

// ------------------------------------------------------------------
// 🔧 Private Helpers
// ------------------------------------------------------------------

function getModuleFromCollection(collectionName: string): string {
  const mapping: Record<string, string> = {
    'inventory': 'Inventory',
    'requisitions': 'Requisition',
    'receiving': 'Receiving',
    'activities': 'Activity',
    'settings': 'Settings',
    'reports': 'Reports',
  };
  return mapping[collectionName] || collectionName;
}

function computeChanges(original: Record<string, unknown>, updated: Record<string, unknown>): { field: string; before: string; after: string }[] {
  const changes: { field: string; before: string; after: string }[] = [];
  
  Object.keys(updated).forEach((key) => {
    if (key === 'updatedAt') return; // Skip timestamp
    
    const before = original[key];
    const after = updated[key];
    
    if (before !== after && before !== undefined) {
      changes.push({
        field: key,
        before: String(before),
        after: String(after),
      });
    }
  });
  
  return changes;
}
