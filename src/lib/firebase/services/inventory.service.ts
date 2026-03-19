import { FirestoreService, QueryOptions } from './firestore.service';

// ------------------------------------------------------------------
// 🔧 Types
// ------------------------------------------------------------------

export interface InventoryItem {
  id?: string;
  partNo: string;
  description: string;
  category: string;
  stock: number;
  unit: string;
  location: string;
  minStock?: number;
  maxStock?: number;
  lastUpdated?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// ------------------------------------------------------------------
// 📦 Inventory Service
// ------------------------------------------------------------------

const COLLECTION = 'inventory';

export const InventoryService = {
  
  // ✅ Create Inventory Item
  create: async (data: Omit<InventoryItem, 'id'>, userId?: string) => {
    return FirestoreService.create<InventoryItem>(COLLECTION, data, userId);
  },

  // ✅ Get Item by ID
  getById: async (id: string) => {
    return FirestoreService.getById<InventoryItem>(COLLECTION, id);
  },

  // ✅ Get All Items
  getAll: async (options?: QueryOptions) => {
    return FirestoreService.getAll<InventoryItem>(COLLECTION, options);
  },

  // ✅ Get Items by Category
  getByCategory: async (category: string) => {
    return FirestoreService.getAll<InventoryItem>(COLLECTION, {
      filters: [{ field: 'category', operator: '==', value: category }],
      orderBy: { field: 'partNo', direction: 'asc' },
    });
  },

  // ✅ Get Low Stock Items
  getLowStock: async () => {
    // Note: This requires a composite query or client-side filtering
    // For now, get all and filter client-side
    const { data, error } = await FirestoreService.getAll<InventoryItem>(COLLECTION);
    if (error) return { data: [], error };
    
    const lowStock = data.filter(item => item.minStock && item.stock <= item.minStock);
    return { data: lowStock, error: null };
  },

  // ✅ Update Item
  update: async (id: string, data: Partial<InventoryItem>, userId?: string, originalData?: Partial<InventoryItem>) => {
    return FirestoreService.update<InventoryItem>(COLLECTION, id, data, userId, originalData);
  },

  // ✅ Update Stock (Quick method for stock changes)
  updateStock: async (id: string, newStock: number, userId?: string, originalStock?: number) => {
    return FirestoreService.update<InventoryItem>(
      COLLECTION, 
      id, 
      { stock: newStock }, 
      userId,
      originalStock !== undefined ? { stock: originalStock } : undefined
    );
  },

  // ✅ Delete Item
  delete: async (id: string, itemName: string, userId?: string) => {
    return FirestoreService.delete(COLLECTION, id, itemName, userId);
  },

  // ✅ Search Items
  search: async (searchTerm: string) => {
    // Note: Firestore doesn't support full-text search
    // For production, use Algolia or client-side filtering
    const { data, error } = await FirestoreService.getAll<InventoryItem>(COLLECTION);
    if (error) return { data: [], error };
    
    const filtered = data.filter(item => 
      item.partNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { data: filtered, error: null };
  },
};
