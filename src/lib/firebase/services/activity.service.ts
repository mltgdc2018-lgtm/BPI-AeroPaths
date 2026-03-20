import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// ------------------------------------------------------------------
// 🔧 Types
// ------------------------------------------------------------------

export interface ActivityChange {
  field: string;
  before: string;
  after: string;
}

export interface ActivityLog {
  id?: string;
  timestamp: Timestamp | Date;
  action: 'Create' | 'Update' | 'Delete' | 'Export';
  module: string;
  targetId: string;
  targetName: string;
  user: string;
  changes?: ActivityChange[];
}

export interface LogActivityParams {
  action: 'Create' | 'Update' | 'Delete' | 'Export';
  module: string;
  targetId: string;
  targetName: string;
  user: string;
  changes?: ActivityChange[];
}

// ------------------------------------------------------------------
// 📝 Activity Service
// ------------------------------------------------------------------

export const ActivityService = {
  
  // ✅ Log Activity
  log: async (params: LogActivityParams): Promise<{ success: boolean; error: Error | null }> => {
    try {
      await addDoc(collection(db, 'activities'), {
        ...params,
        timestamp: serverTimestamp(),
      });
      return { success: true, error: null };
    } catch (error: Error | unknown) {
      console.error('Activity Log Error:', error);
      return { success: false, error: error as Error };
    }
  },

  // ✅ Get Recent Activities
  getRecent: async (limitCount: number = 50): Promise<{ data: ActivityLog[]; error: Error | null }> => {
    try {
      const q = query(
        collection(db, 'activities'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const data: ActivityLog[] = [];
      
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          ...docData,
          timestamp: docData.timestamp?.toDate() || new Date(),
        } as ActivityLog);
      });

      return { data, error: null };
    } catch (error: Error | unknown) {
      console.error('Get Activities Error:', error);
      return { data: [], error: error as Error };
    }
  },

  // ✅ Get Activities by Module
  getByModule: async (module: string, limitCount: number = 50): Promise<{ data: ActivityLog[]; error: Error | null }> => {
    try {
      const q = query(
        collection(db, 'activities'),
        where('module', '==', module),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const data: ActivityLog[] = [];
      
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          ...docData,
          timestamp: docData.timestamp?.toDate() || new Date(),
        } as ActivityLog);
      });

      return { data, error: null };
    } catch (error: Error | unknown) {
      console.error('Get Activities by Module Error:', error);
      return { data: [], error: error as Error };
    }
  },

  // ✅ Get Activities by Date Range
  getByDateRange: async (
    startDate: Date, 
    endDate: Date, 
    limitCount: number = 100
  ): Promise<{ data: ActivityLog[]; error: Error | null }> => {
    try {
      const q = query(
        collection(db, 'activities'),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const data: ActivityLog[] = [];
      
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          ...docData,
          timestamp: docData.timestamp?.toDate() || new Date(),
        } as ActivityLog);
      });

      return { data, error: null };
    } catch (error: Error | unknown) {
      console.error('Get Activities by Date Range Error:', error);
      return { data: [], error: error as Error };
    }
  },
};
