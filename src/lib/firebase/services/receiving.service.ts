import { FirestoreService, QueryOptions } from './firestore.service';

// ------------------------------------------------------------------
// 🔧 Types
// ------------------------------------------------------------------

export type ReceivingStatus = 'Pending' | 'Verified' | 'Completed';

export interface ReceivingItem {
  partNo: string;
  description: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  condition?: 'Good' | 'Damaged' | 'Partial';
}

export interface ReceivingNote {
  id?: string;
  receivingNo?: string;
  date: string;
  poNumber: string;
  supplier: string;
  items: ReceivingItem[];
  status: ReceivingStatus;
  receivedBy: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  remarks?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ------------------------------------------------------------------
// 📥 Receiving Service
// ------------------------------------------------------------------

const COLLECTION = 'receiving';

export const ReceivingService = {
  
  // ✅ Create Receiving Note
  create: async (data: Omit<ReceivingNote, 'id'>, userId?: string) => {
    // Auto-generate receiving number
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const receivingNo = `RN-${year}-${timestamp}`;
    
    return FirestoreService.create<ReceivingNote>(COLLECTION, {
      ...data,
      receivingNo,
      status: 'Pending',
    }, userId);
  },

  // ✅ Get by ID
  getById: async (id: string) => {
    return FirestoreService.getById<ReceivingNote>(COLLECTION, id);
  },

  // ✅ Get All
  getAll: async (options?: QueryOptions) => {
    return FirestoreService.getAll<ReceivingNote>(COLLECTION, {
      ...options,
      orderBy: options?.orderBy || { field: 'createdAt', direction: 'desc' },
    });
  },

  // ✅ Get by Status
  getByStatus: async (status: ReceivingStatus) => {
    return FirestoreService.getAll<ReceivingNote>(COLLECTION, {
      filters: [{ field: 'status', operator: '==', value: status }],
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
  },

  // ✅ Get by Supplier
  getBySupplier: async (supplier: string) => {
    return FirestoreService.getAll<ReceivingNote>(COLLECTION, {
      filters: [{ field: 'supplier', operator: '==', value: supplier }],
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
  },

  // ✅ Update Receiving Note
  update: async (id: string, data: Partial<ReceivingNote>, userId?: string, originalData?: Partial<ReceivingNote>) => {
    return FirestoreService.update<ReceivingNote>(COLLECTION, id, data, userId, originalData);
  },

  // ✅ Verify Receiving Note
  verify: async (id: string, verifierName: string, userId?: string) => {
    return FirestoreService.update<ReceivingNote>(COLLECTION, id, {
      status: 'Verified',
      verifiedBy: verifierName,
      verifiedAt: new Date(),
    }, userId, { status: 'Pending' });
  },

  // ✅ Complete Receiving Note (Stock updated)
  complete: async (id: string, userId?: string) => {
    return FirestoreService.update<ReceivingNote>(COLLECTION, id, {
      status: 'Completed',
    }, userId, { status: 'Verified' });
  },

  // ✅ Delete Receiving Note
  delete: async (id: string, receivingNo: string, userId?: string) => {
    return FirestoreService.delete(COLLECTION, id, receivingNo, userId);
  },
};
