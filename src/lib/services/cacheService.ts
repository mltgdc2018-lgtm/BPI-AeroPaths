import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

export interface CacheEntry<T = unknown> {
  data: T;
  updatedAt: Timestamp;
  dateKey: string; // "YYYY-MM-DD"
}

export const cacheService = {
  async get<T = unknown>(collectionName: string, docId: string = 'latest'): Promise<CacheEntry<T> | null> {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as CacheEntry<T>;
      }
      return null;
    } catch (error) {
      console.error(`Cache Get Error (${collectionName}):`, error);
      return null;
    }
  },

  async set<T>(collectionName: string, data: T, dateKey: string, docId: string = 'latest'): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, {
        data,
        updatedAt: Timestamp.now(),
        dateKey
      });
    } catch (error) {
      console.error(`Cache Set Error (${collectionName}):`, error);
    }
  },

  async getAll<T = unknown>(collectionName: string): Promise<Record<string, CacheEntry<T>>> {
    try {
       const { getDocs, collection } = await import("firebase/firestore");
       const colRef = collection(db, collectionName);
       const snaps = await getDocs(colRef);
       
       const results: Record<string, CacheEntry<T>> = {};
       snaps.forEach(doc => {
         results[doc.id] = doc.data() as CacheEntry<T>;
       });
       return results;
    } catch (error) {
      console.error(`Cache GetAll Error (${collectionName}):`, error);
      return {};
    }
  }
};
