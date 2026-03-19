import { FirestoreService, QueryOptions } from './firestore.service';

// ------------------------------------------------------------------
// 🔧 Types
// ------------------------------------------------------------------

export type RequisitionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed';
export type RequisitionPriority = 'High' | 'Normal' | 'Low';

export interface RequisitionItem {
  partNo: string;
  description: string;
  quantity: number;
  unit: string;
}

export interface Requisition {
  id?: string;
  requisitionNo?: string;
  date: string;
  requester: string;
  department: string;
  items: RequisitionItem[];
  priority: RequisitionPriority;
  status: RequisitionStatus;
  remarks?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// ------------------------------------------------------------------
// 📋 Requisition Service
// ------------------------------------------------------------------

const COLLECTION = 'requisitions';

export const RequisitionService = {
  
  // ✅ Create Requisition
  create: async (data: Omit<Requisition, 'id'>, userId?: string) => {
    // Auto-generate requisition number
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const requisitionNo = `REQ-${year}-${timestamp}`;
    
    return FirestoreService.create<Requisition>(COLLECTION, {
      ...data,
      requisitionNo,
      status: 'Pending',
    }, userId);
  },

  // ✅ Get by ID
  getById: async (id: string) => {
    return FirestoreService.getById<Requisition>(COLLECTION, id);
  },

  // ✅ Get All
  getAll: async (options?: QueryOptions) => {
    return FirestoreService.getAll<Requisition>(COLLECTION, {
      ...options,
      orderBy: options?.orderBy || { field: 'createdAt', direction: 'desc' },
    });
  },

  // ✅ Get by Status
  getByStatus: async (status: RequisitionStatus) => {
    return FirestoreService.getAll<Requisition>(COLLECTION, {
      filters: [{ field: 'status', operator: '==', value: status }],
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
  },

  // ✅ Get Pending Requisitions
  getPending: async () => {
    return RequisitionService.getByStatus('Pending');
  },

  // ✅ Update Requisition
  update: async (id: string, data: Partial<Requisition>, userId?: string, originalData?: Partial<Requisition>) => {
    return FirestoreService.update<Requisition>(COLLECTION, id, data, userId, originalData);
  },

  // ✅ Approve Requisition
  approve: async (id: string, approverName: string, userId?: string) => {
    return FirestoreService.update<Requisition>(COLLECTION, id, {
      status: 'Approved',
      approvedBy: approverName,
      approvedAt: new Date(),
    }, userId, { status: 'Pending' });
  },

  // ✅ Reject Requisition
  reject: async (id: string, userId?: string) => {
    return FirestoreService.update<Requisition>(COLLECTION, id, {
      status: 'Rejected',
    }, userId, { status: 'Pending' });
  },

  // ✅ Complete Requisition
  complete: async (id: string, userId?: string) => {
    return FirestoreService.update<Requisition>(COLLECTION, id, {
      status: 'Completed',
    }, userId, { status: 'Approved' });
  },

  // ✅ Delete Requisition
  delete: async (id: string, requisitionNo: string, userId?: string) => {
    return FirestoreService.delete(COLLECTION, id, requisitionNo, userId);
  },
};
