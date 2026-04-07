import { 
  collection, 
  doc, 
  writeBatch, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Material } from '@/types/material';

export const MaterialService = {
  // Bulk Import for BOMs and Raw Materials
  importBOMData: async (materials: Material[]) => {
    const batchSize = 500;
    const chunks = [];
    
    for (let i = 0; i < materials.length; i += batchSize) {
      chunks.push(materials.slice(i, i + batchSize));
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const chunk of chunks) {
      try {
        const batch = writeBatch(db);
        
        chunk.forEach(item => {
          // Use sku or id as document ID for upsert
          const docId = item.id || item.sku;
          const docRef = doc(db, 'materials', docId);
          
          const payload = {
            ...item,
            updatedAt: serverTimestamp(),
          };
          
          // merge: true allows upserting without overwriting fields not present in payload
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

  // Get all materials
  getAllMaterials: async () => {
    try {
      const snapshot = await getDocs(collection(db, 'materials'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material));
    } catch (error) {
      console.error("Error fetching materials:", error);
      return [];
    }
  },

  // Get packages/BOMs specifically
  getBOMPackages: async () => {
    try {
      const q = query(
        collection(db, 'materials'), 
        where('category', '==', 'packaging'),
        where('type', '==', 'composite')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material));
    } catch (error) {
      console.error("Error fetching BOMs:", error);
      return [];
    }
  },

  // Delete a single material document
  deleteMaterial: async (id: string) => {
    try {
      const { deleteDoc, doc: firestoreDoc } = await import('firebase/firestore');
      await deleteDoc(firestoreDoc(db, 'materials', id));
      return { success: true };
    } catch (error) {
      console.error("Error deleting material:", error);
      return { success: false, error };
    }
  },

  // Update a single material (partial update)
  updateMaterial: async (id: string, data: Partial<Material>) => {
    try {
      const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore');
      await updateDoc(firestoreDoc(db, 'materials', id), { ...data, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error("Error updating material:", error);
      return { success: false, error };
    }
  }
};
