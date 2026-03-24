"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Boxes,
  Zap,
  Info,
  History as HistoryIcon,
  Upload,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  Eye,
  EyeOff
} from "lucide-react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Modal } from "@/components/shared/Modal";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { ModuleHeader } from "@/components/projects/material-control/ModuleHeader";
import { cn } from "@/lib/utils/cn";
import { PackagingService, PackagingProductDTO, IActivityChange } from "@/lib/firebase/services/packaging.service";
// Removed static import for pdfGenerator to optimize bundle size


// Types
interface PackingRule {
  layers: number | 'n' | 'w'; // 'n' = N/A, 'w' = Warp
  perLayer: number | string; // Keep string to allow formatted numbers like "2.5" if needed, though mostly int
  totalQty: number | string;
}

export interface PackagingProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  width: number;
  length: number;
  height: number;
  nw: number; // Net Weight
  gw: number; // Gross Weight
  cbm: number;
  productType: 'Carton' | 'Carton Case' | 'Wooden Case';
  unit?: string;
  stackingLimit: number;
  sideBoxWeight: string;
  lastUpdated: string;
  
  // Packing Rules for different containers
  packingRules: {
    boxes: Record<string, PackingRule>; // size e.g. "42x46x68"
    pallets: Record<string, PackingRule>; // type e.g. "80x120x65"
    rtn: PackingRule;
    warp: boolean;
  };
}

// Helper Component for Packing Standards
const PackingCard = ({ title, layers, perLayer, totalQty, className, titleClassName }: { title: string, layers: number | string, perLayer: number | string, totalQty: number | string, className?: string, titleClassName?: string }) => (
  <div className={cn("bg-[#EEF2F6]/95 border border-white/80 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all", className)}>
    <div className={cn("bg-[#272727] px-4 py-2 border-b border-[#7E5C4A]/45 flex justify-center items-center", titleClassName)}>
      <span className="text-xs font-black text-[#EFD09E] uppercase tracking-wider">{title}</span>
    </div>
    <div className="p-4 grid grid-cols-2 gap-4 text-center">
      <div>
        <p className="text-[10px] font-bold text-[#7E5C4A]/80 uppercase mb-1">Layers</p>
        <p className="text-xl font-black text-[#272727]">{layers}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold text-[#7E5C4A]/80 uppercase mb-1">Per Layer</p>
        <p className="text-xl font-black text-[#272727]">{perLayer}</p>
      </div>
    </div>
    <div className="bg-[#D4AA7D]/20 px-4 py-3 border-t border-[#D4AA7D]/35 flex justify-between items-center">
      <span className="text-[10px] font-bold text-[#7E5C4A] uppercase">Total Qty</span>
      <span className="text-lg font-black text-[#272727]">{totalQty}</span>
    </div>
  </div>
);

// Helper to calculate volume from dimension string "WxLxH"
const getVolume = (dimStr: string) => {
  const dims = dimStr.split('x').map(d => parseFloat(d));
  if (dims.length !== 3 || dims.some(isNaN)) return 0;
  return dims[0] * dims[1] * dims[2];
};

export default function CategoryDetailPage() {
  const params = useParams();
  const categoryId = params.category as string;
  
  const [selectedItem, setSelectedItem] = useState<PackagingProduct | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");
  const [searchValue, setSearchValue] = useState("");
  const [importProgress, setImportProgress] = useState<{status: 'idle' | 'uploading' | 'parsing' | 'complete', percent: number}>({status: 'idle', percent: 0});
  const [products, setProducts] = useState<PackagingProduct[]>([]);
  const [importStats, setImportStats] = useState({ success: 0, updated: 0 }); // Track real stats
  
  // New: Dimension Filters
  const [filters, setFilters] = useState({
    length: '',
    width: '',
    height: ''
  });
  
  // Add/Edit/Success Modal State
  const [isBasicInfoModalOpen, setIsBasicInfoModalOpen] = useState(false);
  const [isPackingStandardsModalOpen, setIsPackingStandardsModalOpen] = useState(false);
  const [isAddNewModalOpen, setIsAddNewModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Track hidden fields for Packing Standards form
  const [hiddenFields, setHiddenFields] = useState<Record<string, boolean>>({});

  // Auto-close Success Modal
  useEffect(() => {
    if (isSuccessModalOpen) {
      const timer = setTimeout(() => setIsSuccessModalOpen(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [isSuccessModalOpen]);

  const [newItem, setNewItem] = useState<Partial<PackagingProductDTO>>({
    sku: '', name: '', width: 0, length: 0, height: 0, nw: 0, gw: 0, productType: 'Carton', stackingLimit: 0, sideBoxWeight: ''
  });

  // Mapping URL categoryId to Firestore category exactly as defined in specs/page.tsx
  const categoryMap: Record<string, string> = {
    "inverters": "Inverters",
    "batteries": "Battery Modules",
    "mounting": "Mounting Systems",
    "cables": "Cables & Connectors"
  };

  const firestoreCategory = categoryMap[categoryId] || categoryId;

  // Fetch Data from Firestore
  useEffect(() => {
    const loadData = async () => {
      const items = await PackagingService.getByCategory(firestoreCategory); 
      setProducts(items as PackagingProduct[]);
    };
    loadData();
  }, [firestoreCategory, importProgress.status, isBasicInfoModalOpen, isPackingStandardsModalOpen]); // Reload on Add/Edit complete
  // Filter Logic
  const filteredData = products.filter(item => {
    const matchesSearch = 
      item.sku.toLowerCase().includes(searchValue.toLowerCase()) ||
      item.name.toLowerCase().includes(searchValue.toLowerCase());
    
    // Dimension Filters (String matching)
    // removed weight filter
    const matchesLength = !filters.length || String(item.length).includes(filters.length);
    const matchesWidth  = !filters.width  || String(item.width).includes(filters.width);
    const matchesHeight = !filters.height || String(item.height).includes(filters.height);

    return matchesSearch && matchesLength && matchesWidth && matchesHeight;
  });

  const categoryTitle = categoryId ? (categoryId.charAt(0).toUpperCase() + categoryId.slice(1)) : 'Product';

  // Export CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;

    // Headers
    const headers = [
      "SKU (Item)", "Name", "Category", 
      "Width (cm)", "Length (cm)", "Height (cm)", 
      "Net Weight (kg)", "Gross Weight (kg)", "CBM",
      "Product Type", "Stacking Limit", "Side Box Weight"
    ];

    // Rows
    const rows = filteredData.map(item => [
      item.sku, item.name, item.category,
      item.width, item.length, item.height,
      item.nw, item.gw, item.cbm,
      item.productType, item.stackingLimit, item.sideBoxWeight
    ].map(v => `"${v || ''}"`).join(",")); // Quote values

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const timestamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
    link.setAttribute("download", `packaging_export_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Activity Log
    PackagingService.logActivity({
      project: 'Packaging Console',
      action: 'Export',
      category: categoryId ? (categoryId.charAt(0).toUpperCase() + categoryId.slice(1)) : 'Inverters',
      targetId: 'Filtered Data',
      targetName: `CSV Export (${filteredData.length} items)`,
      user: 'System', // Replace with auth user if available later
      details: `Exported ${filteredData.length} items from ${categoryId || 'Inverters'} specs.`
    });
  };

  // Handle Add Item Submit
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.sku) return;

    // Construct full DTO
    const product: PackagingProductDTO = {
      sku: newItem.sku!,
      name: newItem.name || `${categoryId || 'Inverters'}-${newItem.sku}`,
      category: categoryId ? (categoryId.charAt(0).toUpperCase() + categoryId.slice(1)) : 'Inverters',
      width: Number(newItem.width) || 0,
      length: Number(newItem.length) || 0,
      height: Number(newItem.height) || 0,
      nw: Number(newItem.nw) || 0,
      gw: Number(newItem.gw) || 0,
      cbm: Number(((Number(newItem.width) * Number(newItem.length) * Number(newItem.height)) / 1000000).toFixed(3)),
      productType: (newItem.productType || 'Carton') as 'Carton' | 'Carton Case' | 'Wooden Case',
      stackingLimit: Number(newItem.stackingLimit) || 0, // Ensure number
      sideBoxWeight: newItem.sideBoxWeight || '',
      lastUpdated: new Date().toISOString().split('T')[0],
      packingRules: isEditing && selectedItem ? selectedItem.packingRules : {
          boxes: {},
          pallets: {},
          rtn: { layers: 0, perLayer: 0, totalQty: 0 },
          warp: false
      }
    };

    await PackagingService.importItems([product]); 

    // Activity Log logic
    const categoryName = categoryId ? (categoryId.charAt(0).toUpperCase() + categoryId.slice(1)) : 'Inverters';
    if (isEditing && selectedItem) {
      // Calculate changes
      const changes: IActivityChange[] = [];
      const fieldsToTrack: (keyof PackagingProductDTO)[] = ['name', 'width', 'length', 'height', 'nw', 'gw', 'productType', 'stackingLimit', 'sideBoxWeight'];
      
      fieldsToTrack.forEach(field => {
        const itemVal = selectedItem[field as keyof PackagingProduct];
        const productVal = product[field];
        if (itemVal !== productVal) {
          changes.push({
            field: field.charAt(0).toUpperCase() + field.slice(1),
            before: String(itemVal ?? '-'),
            after: String(productVal ?? '-')
          });
        }
      });

      // Track Special Packaging Changes
      const productRules = product.packingRules as unknown as PackagingProduct['packingRules'];
      if (selectedItem.packingRules.warp !== productRules.warp) {
          changes.push({ field: 'Wrap Required', before: String(selectedItem.packingRules.warp), after: String(productRules.warp) });
      }
      // Simple check for RTN total change
      const oldRtn = selectedItem.packingRules.rtn?.totalQty || 0;
      const newRtn = productRules.rtn?.totalQty || 0;
      if (oldRtn !== newRtn) {
           changes.push({ field: 'RTN Total', before: String(oldRtn), after: String(newRtn) });
      }

      if (changes.length > 0) {
        PackagingService.logActivity({
          project: 'Packaging Console',
          action: 'Update',
          category: categoryName,
          targetId: product.sku,
          targetName: product.name,
          user: 'System',
          changes
        });
      }
    } else {
      PackagingService.logActivity({
        project: 'Packaging Console',
        action: 'Create',
        category: categoryName,
        targetId: product.sku,
        targetName: product.name,
        user: 'System',
        details: `Created new item: ${product.sku}`
      });
    }

    // Refresh selected item if editing
    if (isEditing && selectedItem?.sku === product.sku) {
       setSelectedItem(product as PackagingProduct);
    }

    // Close form and show success modal immediately
    setIsBasicInfoModalOpen(false);
    setIsSuccessModalOpen(true);
    
    // Reset form state after a brief delay
    setTimeout(() => {
      setIsEditing(false);
      setNewItem({ sku: '', name: '', width: 0, length: 0, height: 0, nw: 0, gw: 0, productType: 'Carton', stackingLimit: 0, sideBoxWeight: '' });
    }, 100);
  };

  // Handle Add New Item (Unified Form)
  const handleAddNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.sku) return;

    const categoryName = categoryId ? (categoryId.charAt(0).toUpperCase() + categoryId.slice(1)) : 'Inverters';
    
    // Construct full DTO with all data from unified form
    const product: PackagingProductDTO = {
      sku: newItem.sku!,
      name: newItem.name || `${categoryName}-${newItem.sku}`,
      category: categoryName,
      width: Number(newItem.width) || 0,
      length: Number(newItem.length) || 0,
      height: Number(newItem.height) || 0,
      nw: Number(newItem.nw) || 0,
      gw: Number(newItem.gw) || 0,
      cbm: Number(((Number(newItem.width) * Number(newItem.length) * Number(newItem.height)) / 1000000).toFixed(3)),
      productType: (newItem.productType || 'Carton') as 'Carton' | 'Carton Case' | 'Wooden Case',
      stackingLimit: Number(newItem.stackingLimit) || 0,
      sideBoxWeight: newItem.sideBoxWeight || '',
      lastUpdated: new Date().toISOString().split('T')[0],
      packingRules: newItem.packingRules || {
          boxes: {},
          pallets: {},
          rtn: { layers: 0, perLayer: 0, totalQty: 0 },
          warp: false
      }
    };

    // Save as new item
    await PackagingService.importItems([product]);

    // Log Activity (Create)
    PackagingService.logActivity({
      project: 'Packaging Console',
      action: 'Create',
      category: categoryName,
      targetId: product.sku,
      targetName: product.name,
      user: 'System',
      details: `Created new item via Unified Form: ${product.sku}`
    });

    setIsAddNewModalOpen(false);
    setIsSuccessModalOpen(true);
    
    // Reset form
    setTimeout(() => {
      setNewItem({ sku: '', name: '', width: 0, length: 0, height: 0, nw: 0, gw: 0, productType: 'Carton', stackingLimit: 0, sideBoxWeight: '' });
    }, 100);
  };

  // NEW: Handle Packing Standards Submit
  const handlePackingStandardsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    // Merge changes into existing item
    const currentRules = newItem.packingRules as unknown as PackagingProduct['packingRules'];
    
    // Ensure all standard keys exist in the merged object to avoid undefined errors if they were missing
    const mergedBoxes = { ...selectedItem.packingRules.boxes, ...currentRules.boxes };
    const mergedPallets = { ...selectedItem.packingRules.pallets, ...currentRules.pallets };
    
    // Apply hidden fields logic: if hidden, delete the key
    Object.keys(hiddenFields).forEach(uiKey => {
        if (hiddenFields[uiKey]) {
            if (uiKey.startsWith('Box_')) {
                const size = uiKey.replace('Box_', '');
                delete (mergedBoxes as Partial<Record<string, PackingRule>>)[size];
            } else if (uiKey.startsWith('Pallet_')) {
                const size = uiKey.replace('Pallet_', '');
                delete (mergedPallets as Partial<Record<string, PackingRule>>)[size];
            } else if (uiKey === 'RTN_Standard') {
                   delete (currentRules as Partial<PackagingProduct['packingRules']>).rtn;
            }
        }
    });

    const updatedProductDTO: PackagingProductDTO = {
        sku: selectedItem.sku,
        name: selectedItem.name,
        category: selectedItem.category,
        width: selectedItem.width,
        length: selectedItem.length,
        height: selectedItem.height,
        nw: selectedItem.nw,
        gw: selectedItem.gw,
        cbm: selectedItem.cbm,
        productType: selectedItem.productType,
        stackingLimit: selectedItem.stackingLimit,
        sideBoxWeight: selectedItem.sideBoxWeight,
        lastUpdated: new Date().toISOString().split('T')[0],
        packingRules: {
           boxes: mergedBoxes,
           pallets: mergedPallets,
           rtn: currentRules.rtn || selectedItem.packingRules.rtn,
           warp: currentRules.warp ?? selectedItem.packingRules.warp
        }
    };

    // Use updateItem to Replace the packingRules logic entirely (so deletions work)
  await PackagingService.updateItem(selectedItem.sku, updatedProductDTO);

    // Activity Log (Simplified for now, focusing on the action)
    PackagingService.logActivity({
        project: 'Packaging Console',
        action: 'Update',
        category: categoryTitle,
        targetId: selectedItem.sku,
        targetName: selectedItem.name,
        user: 'System',
        details: `Updated Packing Standards for ${selectedItem.sku}`
    });

    // Update local state
    setSelectedItem(updatedProductDTO as PackagingProduct);
    
    setIsPackingStandardsModalOpen(false);
    setIsSuccessModalOpen(true);
  };




  // ... handleFileUpload ...
  // Helper: Parse CSV
  const parseCSV = (text: string): PackagingProductDTO[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '')); 
    
    // Key Mapping (CSV Header -> DTO Key)
    const keyMap: Record<string, string> = {
       "SKU (Item)": "sku", "Name": "name", "Category": "category",
       "Width (cm)": "width", "Length (cm)": "length", "Height (cm)": "height",
       "Net Weight (kg)": "nw", "Gross Weight (kg)": "gw", "CBM": "cbm",
       "Product Type": "productType", "Stacking Limit": "stackingLimit", "Side Box Weight": "sideBoxWeight"
    };

    const results: PackagingProductDTO[] = [];

    for (let i = 1; i < lines.length; i++) {
       if (!lines[i].trim()) continue;
       
       // Handle CSV split respecting quotes might be needed for complex names, 
       // but for now assuming simple CSV structure as per previous implementation
       const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, '')); 
       const row: Record<string, string | number> = {};
       
       headers.forEach((h, idx) => {
         const val = values[idx] || '';
         if (keyMap[h]) {
            if (['width', 'length', 'height'].includes(keyMap[h])) {
               row[keyMap[h]] = parseFloat(val) ? Number(parseFloat(val).toFixed(2)) : 0;
            } else if (['nw', 'gw'].includes(keyMap[h])) {
               row[keyMap[h]] = parseFloat(val) ? Number(parseFloat(val).toFixed(3)) : 0;
            } else if (['cbm', 'stackingLimit'].includes(keyMap[h])) {
                row[keyMap[h]] = parseFloat(val) || 0;
            } else {
                row[keyMap[h]] = val;
            }
         }
         row[h] = val;
       });

       if (!row.name && row.sku) {
          row.name = `${row.category || 'Product'}-${row.sku}`;
       }
       
       if (!row.sku) continue; 

       const packingRules = {
          boxes: {} as Record<string, PackingRule>,
          pallets: {} as Record<string, PackingRule>,
          rtn: { layers: 0, perLayer: 0, totalQty: 0 } as PackingRule,
          warp: false
       };

       ['42x46x68', '47x66x68', '57x64x84', '68x74x86', '70x100x90'].forEach(size => {
          if (row[`Box_${size}_Total`]) {
             packingRules.boxes[size] = {
                layers: Number(row[`Box_${size}_Layers`]) || 0,
                perLayer: Number(row[`Box_${size}_PerLayer`]) || 0,
                totalQty: Number(row[`Box_${size}_Total`]) || 0
             };
          }
       });

       ['80x120x65', '80x120x90', '80x120x115', '110x110x65', '110x110x90', '110x110x115'].forEach(type => {
           if (row[`Pallet_${type}_Total`]) {
              packingRules.pallets[type] = {
                 layers: Number(row[`Pallet_${type}_Layers`]) || 0,
                 perLayer: Number(row[`Pallet_${type}_PerLayer`]) || 0,
                 totalQty: Number(row[`Pallet_${type}_Total`]) || 0
              };
           }
       });

       // Fix: More robust checking for RTN
       const rtnTotal = Number(row['RTN_Total']);
       if (!isNaN(rtnTotal) && rtnTotal > 0) {
          packingRules.rtn = {
             layers: Number(row['RTN_Layers']) || 0,
             perLayer: Number(row['RTN_PerLayer']) || 0,
             totalQty: rtnTotal
          };
       }

       // Fix: Case insensitive check for Warp + handle 1/0/Yes/No
       const warpVal = String(row['Warp_Required'] || '').toUpperCase();
       packingRules.warp = ['TRUE', 'YES', '1', 'REQUIRED'].includes(warpVal);

       results.push({
          sku: String(row.sku),
          name: String(row.name),
          category: String(row.category) || 'Inverters',
          width: Number(row.width), length: Number(row.length), height: Number(row.height),
          nw: Number(row.nw), gw: Number(row.gw), cbm: Number(row.cbm),
          productType: (String(row.productType) || 'Carton') as 'Carton' | 'Carton Case' | 'Wooden Case',
          stackingLimit: Number(row.stackingLimit),
          sideBoxWeight: String(row.sideBoxWeight),
          lastUpdated: new Date().toISOString().split('T')[0],
          packingRules
       });
    }
    return results;
  };


  // Updated Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onloadstart = () => {
       setImportProgress({status: 'uploading', percent: 10});
    };

    reader.onprogress = (event) => {
       if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 40) + 10; 
          setImportProgress(prev => ({...prev, percent}));
       }
    };

    reader.onload = async (event) => {
       const text = event.target?.result as string;
       setImportProgress({status: 'parsing', percent: 60});
       
       const items = parseCSV(text);
       setImportProgress({status: 'parsing', percent: 80});

       const result = await PackagingService.importItems(items);
       
       setImportStats({
          success: result.successCount,
          updated: 0 
       });

        setImportProgress({status: 'complete', percent: 100});

        // Activity Log
        PackagingService.logActivity({
          project: 'Packaging Console',
          action: 'Import',
          category: categoryId ? (categoryId.charAt(0).toUpperCase() + categoryId.slice(1)) : 'Inverters',
          targetId: file.name,
          targetName: `Bulk Import (${items.length} items)`,
          user: 'System',
          details: `Imported ${result.successCount} items successfully from ${file.name}.`
        });
    };

    reader.readAsText(file);
  };
   
  // Table Columns
  const columns: Column<PackagingProduct>[] = [
    { 
      key: "sku", 
      header: "Item / SKU",
      render: (val) => (
        <div className="flex items-center gap-3 whitespace-nowrap">
          <div className="w-8 h-8 rounded-lg bg-[#272727]/10 flex items-center justify-center text-[#272727] group-hover:bg-[#EFD09E]/15 group-hover:text-[#EFD09E]">
            <Zap className="w-4 h-4" />
          </div>
          <div className="font-bold text-[#272727] group-hover:text-[#EFD09E]">{val as React.ReactNode}</div>
        </div>
      )
    },


    { 
      key: "dimensions", 
      header: "W x L x H (cm)", 
      align: "center",
      render: (_, row) => (
        <span className="font-medium text-[#7E5C4A] group-hover:text-[#EFD09E] whitespace-nowrap">
          {row.width} x {row.length} x {row.height}
        </span>
      )
    },
    { 
      key: "nw", 
      header: "Net Weight (kg)", 
      align: "center",
      render: (val) => <span className="font-bold text-[#272727] group-hover:text-[#EFD09E]">{val as React.ReactNode}</span>
    },
    { 
      key: "gw", 
      header: "Gross Weight (kg)", 
      align: "center",
      render: (val) => <span className="font-bold text-[#272727] group-hover:text-[#EFD09E]">{val as React.ReactNode}</span>
    },
    {
      key: "cbm",
      header: "CBM",
      align: "center",
      render: (val) => <span className="font-bold text-[#7E5C4A] group-hover:text-[#EFD09E]">{val as React.ReactNode}</span>
    },
    { key: "productType", header: "Product Type", align: "center", className: "whitespace-nowrap", render: (val) => (
        <span className={cn(
          "inline-flex items-center justify-center whitespace-nowrap min-w-[92px] px-2.5 py-1 rounded text-[10px] leading-none font-black uppercase tracking-wider",
          val === "Carton" ? "bg-[#EFD09E] text-[#7E5C4A] border border-[#D4AA7D]/45" :
          val === "Carton Case" ? "bg-[#EEF2F6] text-[#272727] border border-[#D4AA7D]/45" :
          "bg-[#D4AA7D]/55 text-[#7E5C4A] border border-[#D4AA7D]/45 group-hover:text-white" 
        )}>
          {val as React.ReactNode}
        </span>
      )
    },
    {
      key: "stackingLimit",
      header: "Stack Limit",
      align: "center",
      render: (val) => <span className="font-semibold">{val as React.ReactNode}</span>
    },

    { key: "lastUpdated", header: "Last Update", align: "center", type: "date", className: "whitespace-nowrap" },
  ];


  return (
    <div className="min-h-screen bg-[#F6EDDE] pt-20">
      <section className="py-12 md:py-16">
        <div className="container-custom">
          
          <ModuleHeader
            title={`${categoryTitle} Specs`}
            description={`Manage physical dimensions and packing standards for ${categoryTitle}.`}
            backHref="/projects/packaging/specs"
            backLabel="Data Specifications"
          >
            <div className="space-y-6 mt-12">
              <div className="sticky top-14 z-30 -mx-4 px-4 py-2">
                <SearchToolbar
                  searchValue={searchValue}
                  onSearchChange={setSearchValue}
                  searchPlaceholder={`Search ${categoryId}...`}
                  showFilter={false}
                  primaryButton={{
                    label: <span className="hidden sm:inline">Import</span>,
                    icon: <Upload className="w-4 h-4" />,
                    onClick: () => setIsImportModalOpen(true),
                  }}
                  actions={
                    <>
                      <button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg text-sm font-semibold transition-colors shadow-md shadow-[#272727]/20 border border-[#EFD09E]/20 flex items-center gap-2"
                        title="Export CSV"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span className="hidden sm:inline">Export CSV</span>
                      </button>

                      <button
                        onClick={() => {
                           setIsEditing(false);
                           setHiddenFields({});
                           setNewItem({ 
                             sku: '', name: '', width: 0, length: 0, height: 0, nw: 0, gw: 0, productType: 'Carton', stackingLimit: 0, sideBoxWeight: '',
                             packingRules: { boxes: {}, pallets: {}, rtn: { layers: 0, perLayer: 0, totalQty: 0 }, warp: false }
                           });
                           setIsAddNewModalOpen(true);
                        }}
                        className="px-4 py-2 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg text-sm font-semibold transition-colors shadow-md shadow-[#272727]/20 border border-[#EFD09E]/20 flex items-center gap-2"
                        title="Add New Item"
                      >
                        <Zap className="w-4 h-4" />
                        <span className="hidden sm:inline">Add New</span>
                      </button>
                    </>
                  }
                >
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                    <input 
                      placeholder="W" 
                      value={filters.width}
                      onChange={e => setFilters({...filters, width: e.target.value})}
                      className="w-16 px-3 py-2 rounded-lg bg-[#EFD09E]/45 border border-[#D4AA7D]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30 text-[#272727] placeholder-[#7E5C4A]/70"
                    />
                    <input 
                      placeholder="L" 
                      value={filters.length}
                      onChange={e => setFilters({...filters, length: e.target.value})}
                      className="w-16 px-3 py-2 rounded-lg bg-[#EFD09E]/45 border border-[#D4AA7D]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30 text-[#272727] placeholder-[#7E5C4A]/70"
                    />
                    <input 
                      placeholder="H" 
                      value={filters.height}
                      onChange={e => setFilters({...filters, height: e.target.value})}
                      className="w-16 px-3 py-2 rounded-lg bg-[#EFD09E]/45 border border-[#D4AA7D]/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30 text-[#272727] placeholder-[#7E5C4A]/70"
                    />
                  </div>
                </SearchToolbar>
              </div>

              <DataTable
                columns={columns}
                data={filteredData}
                keyField="id"
                onRowClick={(row) => {
                  setSelectedItem(row);
                  setActiveTab("overview");
                }}
                emptyMessage="No products found in this category."
              />

              <div className="mt-6 flex justify-center">
                <p className="text-[#7E5C4A] text-[11px] font-bold uppercase tracking-widest bg-[#EFD09E]/55 px-4 py-1.5 rounded-full border border-[#D4AA7D]/35 backdrop-blur-sm">
                  Showing {filteredData.length} of {products.length} items (Total in DB)
                </p>
              </div>
            </div>
          </ModuleHeader>

        </div>
      </section>

      {/* Add/Edit Basic Info Modal */}
      <Modal
         isOpen={isBasicInfoModalOpen}
         onClose={() => setIsBasicInfoModalOpen(false)}
         title={isEditing ? "Edit Item (Basic Info)" : "Add New Item"}
         className="max-w-lg"
      >
        <form onSubmit={handleAddItemSubmit} className="space-y-6">
            <div className="space-y-4">
               {/* Row 1: SKU & Name */}
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-bold text-[#7E5C4A] mb-1">SKU / Item Code <span className="text-red-500">*</span></label>
                     <input 
                        required
                        value={newItem.sku}
                        onChange={e => setNewItem({...newItem, sku: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#F6EDDE] text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                        placeholder="e.g. INV-001"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-[#7E5C4A] mb-1">Product Name</label>
                     <input 
                        value={newItem.name}
                        onChange={e => setNewItem({...newItem, name: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                        placeholder="e.g. Inverter Model X"
                     />
                  </div>
               </div>

               {/* Row 2: Dimensions */}
               <div className="grid grid-cols-3 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-[#7E5C4A] mb-1">Width (cm)</label>
                     <input type="number" step="0.01"
                        value={newItem.width}
                        onChange={e => setNewItem({...newItem, width: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-[#7E5C4A] mb-1">Length (cm)</label>
                     <input type="number" step="0.01"
                        value={newItem.length}
                        onChange={e => setNewItem({...newItem, length: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-[#7E5C4A] mb-1">Height (cm)</label>
                     <input type="number" step="0.01"
                        value={newItem.height}
                        onChange={e => setNewItem({...newItem, height: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                     />
                  </div>
               </div>

               {/* Row 3: Weights */}
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-[#7E5C4A] mb-1">Net Weight (kg)</label>
                     <input type="number" step="0.001"
                        value={newItem.nw}
                        onChange={e => setNewItem({...newItem, nw: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-[#7E5C4A] mb-1">Gross Weight (kg)</label>
                     <input type="number" step="0.001"
                        value={newItem.gw}
                        onChange={e => setNewItem({...newItem, gw: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                     />
                  </div>
               </div>

               {/* Row 4: Type, Stack, Side Box */}
               <div className="grid grid-cols-3 gap-4">
                  <div>
                     <label className="block text-sm font-bold text-[#7E5C4A] mb-1">Product Type</label>
                     <select 
                        value={newItem.productType}
                        onChange={e => setNewItem({...newItem, productType: e.target.value as 'Carton' | 'Carton Case' | 'Wooden Case'})}
                        className="w-full px-4 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                     >
                        <option value="Carton">Carton</option>
                        <option value="Carton Case">Carton Case</option>
                        <option value="Wooden Case">Wooden Case</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-[#7E5C4A] mb-1">Stack Limit</label>
                     <input type="number"
                        value={newItem.stackingLimit}
                        onChange={e => setNewItem({...newItem, stackingLimit: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                        placeholder="e.g. 5"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-[#7E5C4A] mb-1">Side Box Weight</label>
                     <input 
                        value={newItem.sideBoxWeight || ''}
                        onChange={e => setNewItem({...newItem, sideBoxWeight: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                        placeholder="e.g. Max 15kg"
                     />
                  </div>
               </div>
            </div>


                {/* Row 4.5: Special Packaging (Removed from Basic Info, moved to Packing Standards Modal) */}

            <button type="submit" className="w-full py-3 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] font-bold rounded-xl transition-colors shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20">
              {isEditing ? "Update Item" : "Create Item"}
           </button>
        </form>
      </Modal>

            {/* Success Notification Modal - Minimalist & Fast */}
      <Modal
         isOpen={isSuccessModalOpen}
         onClose={() => setIsSuccessModalOpen(false)}
         title=""
         className="max-w-[280px] text-center bg-transparent! border-none! shadow-none!"
         hideHeader
      >
        <div className="bg-[#EEF2F6]/95 border border-white/80 p-6 rounded-[2.5rem] shadow-2xl shadow-[#272727]/15 flex flex-col items-center justify-center space-y-3 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-[#9ACD32] text-[#272727] rounded-full flex items-center justify-center shadow-lg shadow-[#9ACD32]/35 animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-[#272727] leading-tight tracking-tight">
              {isEditing ? "Updated!" : "Created!"}
            </h3>
            <p className="text-[#7E5C4A] text-sm font-bold opacity-70">
              Database Sync OK
            </p>
          </div>

        </div>
      </Modal>

      {/* Unified Add New Item Modal (Two Columns) */}
      <Modal
        isOpen={isAddNewModalOpen}
        onClose={() => {
          setIsAddNewModalOpen(false);
          setHiddenFields({});
        }}
        title="Add New Packaging Specification"
        className="max-w-6xl"
      >
        <form onSubmit={handleAddNewSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pr-2">
            
            {/* Left Column: Basic Info */}
            <div className="space-y-6 border-r border-[#D4AA7D]/30 pr-4">
              <h4 className="text-sm font-black text-[#7E5C4A] uppercase tracking-widest bg-[#EFD09E]/60 px-3 py-1.5 rounded-lg inline-block border border-[#D4AA7D]/35">
                1. Basic Info & Dimensions
              </h4>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#7E5C4A] mb-1">SKU / Item Code <span className="text-red-500">*</span></label>
                    <input 
                      required
                      value={newItem.sku}
                      onChange={e => setNewItem({...newItem, sku: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                      placeholder="e.g. INV-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#7E5C4A] mb-1">Product Name</label>
                    <input 
                      value={newItem.name}
                      onChange={e => setNewItem({...newItem, name: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                      placeholder="e.g. Inverter Model X"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#7E5C4A] mb-1">Width (cm)</label>
                    <input type="number" step="0.01"
                      value={newItem.width}
                      onChange={e => setNewItem({...newItem, width: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#7E5C4A] mb-1">Length (cm)</label>
                    <input type="number" step="0.01"
                      value={newItem.length}
                      onChange={e => setNewItem({...newItem, length: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#7E5C4A] mb-1">Height (cm)</label>
                    <input type="number" step="0.01"
                      value={newItem.height}
                      onChange={e => setNewItem({...newItem, height: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#7E5C4A] mb-1">Net Weight (kg)</label>
                    <input type="number" step="0.001"
                      value={newItem.nw}
                      onChange={e => setNewItem({...newItem, nw: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#7E5C4A] mb-1">Gross Weight (kg)</label>
                    <input type="number" step="0.001"
                      value={newItem.gw}
                      onChange={e => setNewItem({...newItem, gw: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#7E5C4A] mb-1">Product Type</label>
                    <select 
                      value={newItem.productType}
                      onChange={e => setNewItem({...newItem, productType: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                    >
                      <option value="Carton">Carton</option>
                      <option value="Carton Case">Carton Case</option>
                      <option value="Wooden Case">Wooden Case</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#7E5C4A] mb-1">Stack Limit</label>
                    <input type="number"
                      value={newItem.stackingLimit}
                      onChange={e => setNewItem({...newItem, stackingLimit: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#7E5C4A] mb-1">Side Box Weight</label>
                  <input 
                    value={newItem.sideBoxWeight || ''}
                    onChange={e => setNewItem({...newItem, sideBoxWeight: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#272727] focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                    placeholder="e.g. Max 15kg"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Packing Standards */}
            <div className="space-y-6">
              <h4 className="text-sm font-black text-[#7E5C4A] uppercase tracking-widest bg-[#EFD09E]/60 px-3 py-1.5 rounded-lg inline-block border border-[#D4AA7D]/35">
                2. Packing Standards
              </h4>

              <div className="space-y-6">
                {/* Standard Boxes */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-black text-[#7E5C4A] uppercase tracking-widest">Standard Boxes</h5>
                  {[
                    "42x46x68", "47x66x68", "57x64x84", "68x74x86", "70x100x90"
                  ].map((size) => {
                    const rule = (newItem.packingRules as unknown as PackagingProduct['packingRules'])?.boxes?.[size] || { layers: 0, perLayer: 0, totalQty: 0 };
                    const uiKey = `Add_Box_${size}`;
                    const isHidden = hiddenFields[uiKey];
                    return (
                      <div
                        key={size}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg border transition-colors",
                          isHidden
                            ? "bg-[#EFD09E]/35 border-[#D4AA7D]/25 opacity-60"
                            : "bg-[#EEF2F6]/85 border-[#D4AA7D]/35"
                        )}
                      >
                        <div className="flex items-center gap-2 w-28 shrink-0">
                          <button
                            type="button"
                            onClick={() => setHiddenFields((prev) => ({ ...prev, [uiKey]: !prev[uiKey] }))}
                            className="text-[#7E5C4A]/80 hover:text-[#272727] transition-colors"
                            title={isHidden ? "Unhide" : "Hide"}
                          >
                            {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <span className="text-[10px] font-bold text-[#272727] whitespace-nowrap">{size.replace(/x/g, ' x ')}</span>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <input 
                            type="number" placeholder="Layers"
                            disabled={isHidden}
                            value={rule.layers || ''}
                            onChange={e => {
                              const rules = { ...(newItem.packingRules as unknown as PackagingProduct['packingRules'] || { boxes: {}, pallets: {}, rtn: { layers: 0, perLayer: 0, totalQty: 0 }, warp: false }) };
                              rules.boxes = { ...rules.boxes, [size]: { ...rule, layers: Number(e.target.value) } };
                              setNewItem({ ...newItem, packingRules: rules });
                            }}
                            className="px-2 py-1 rounded border border-[#D4AA7D]/40 bg-[#F6EDDE] text-[10px] text-[#272727] disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60"
                          />
                          <input 
                            type="number" placeholder="Pieces per Layer"
                            disabled={isHidden}
                            value={rule.perLayer || ''}
                            onChange={e => {
                              const rules = { ...(newItem.packingRules as unknown as PackagingProduct['packingRules'] || { boxes: {}, pallets: {}, rtn: { layers: 0, perLayer: 0, totalQty: 0 }, warp: false }) };
                              rules.boxes = { ...rules.boxes, [size]: { ...rule, perLayer: Number(e.target.value) } };
                              setNewItem({ ...newItem, packingRules: rules });
                            }}
                            className="px-2 py-1 rounded border border-[#D4AA7D]/40 bg-[#F6EDDE] text-[10px] text-[#272727] disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60"
                          />
                          <input 
                            type="number" placeholder="Total Qty"
                            disabled={isHidden}
                            value={rule.totalQty || ''}
                            onChange={e => {
                              const rules = { ...(newItem.packingRules as unknown as PackagingProduct['packingRules'] || { boxes: {}, pallets: {}, rtn: { layers: 0, perLayer: 0, totalQty: 0 }, warp: false }) };
                              rules.boxes = { ...rules.boxes, [size]: { ...rule, totalQty: Number(e.target.value) } };
                              setNewItem({ ...newItem, packingRules: rules });
                            }}
                            className="px-2 py-1 rounded border border-[#D4AA7D]/40 text-[10px] font-bold text-[#7E5C4A] bg-[#EFD09E]/55 disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Standard Pallets */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-black text-[#7E5C4A] uppercase tracking-widest">Standard Pallets</h5>
                  {[
                    "80x120x65", "80x120x90", "80x120x115", "110x110x65", "110x110x90", "110x110x115"
                  ].map((size) => {
                    const rule = (newItem.packingRules as unknown as PackagingProduct['packingRules'])?.pallets?.[size] || { layers: 0, perLayer: 0, totalQty: 0 };
                    const uiKey = `Add_Pallet_${size}`;
                    const isHidden = hiddenFields[uiKey];
                    return (
                      <div
                        key={size}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg border transition-colors",
                          isHidden
                            ? "bg-[#EFD09E]/35 border-[#D4AA7D]/25 opacity-60"
                            : "bg-[#EEF2F6]/85 border-[#D4AA7D]/35"
                        )}
                      >
                        <div className="flex items-center gap-2 w-28 shrink-0">
                          <button
                            type="button"
                            onClick={() => setHiddenFields((prev) => ({ ...prev, [uiKey]: !prev[uiKey] }))}
                            className="text-[#7E5C4A]/80 hover:text-[#272727] transition-colors"
                            title={isHidden ? "Unhide" : "Hide"}
                          >
                            {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <span className="text-[10px] font-bold text-[#272727] whitespace-nowrap">{size.replace(/x/g, ' x ')}</span>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <input 
                            type="number" placeholder="Layers"
                            disabled={isHidden}
                            value={rule.layers || ''}
                            onChange={e => {
                              const rules = { ...(newItem.packingRules as unknown as PackagingProduct['packingRules'] || { boxes: {}, pallets: {}, rtn: { layers: 0, perLayer: 0, totalQty: 0 }, warp: false }) };
                              rules.pallets = { ...rules.pallets, [size]: { ...rule, layers: Number(e.target.value) } };
                              setNewItem({ ...newItem, packingRules: rules });
                            }}
                            className="px-2 py-1 rounded border border-[#D4AA7D]/40 bg-[#F6EDDE] text-[10px] text-[#272727] disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60"
                          />
                          <input 
                            type="number" placeholder="Pieces per Layer"
                            disabled={isHidden}
                            value={rule.perLayer || ''}
                            onChange={e => {
                              const rules = { ...(newItem.packingRules as unknown as PackagingProduct['packingRules'] || { boxes: {}, pallets: {}, rtn: { layers: 0, perLayer: 0, totalQty: 0 }, warp: false }) };
                              rules.pallets = { ...rules.pallets, [size]: { ...rule, perLayer: Number(e.target.value) } };
                              setNewItem({ ...newItem, packingRules: rules });
                            }}
                            className="px-2 py-1 rounded border border-[#D4AA7D]/40 bg-[#F6EDDE] text-[10px] text-[#272727] disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60"
                          />
                          <input 
                            type="number" placeholder="Total Qty"
                            disabled={isHidden}
                            value={rule.totalQty || ''}
                            onChange={e => {
                              const rules = { ...(newItem.packingRules as unknown as PackagingProduct['packingRules'] || { boxes: {}, pallets: {}, rtn: { layers: 0, perLayer: 0, totalQty: 0 }, warp: false }) };
                              rules.pallets = { ...rules.pallets, [size]: { ...rule, totalQty: Number(e.target.value) } };
                              setNewItem({ ...newItem, packingRules: rules });
                            }}
                            className="px-2 py-1 rounded border border-[#D4AA7D]/40 text-[10px] font-bold text-[#7E5C4A] bg-[#EFD09E]/55 disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* RTN & Warp */}
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={cn(
                      "p-3 rounded-lg border space-y-2 transition-colors",
                      hiddenFields["Add_RTN_Standard"]
                        ? "bg-[#EFD09E]/35 border-[#D4AA7D]/25 opacity-60"
                        : "bg-[#EEF2F6]/85 border-[#D4AA7D]/35"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-black text-[#272727] uppercase tracking-widest flex items-center gap-1">
                        <HistoryIcon className="w-3 h-3" /> RTN (Returnable)
                      </h5>
                      <button
                        type="button"
                        onClick={() => setHiddenFields((prev) => ({ ...prev, Add_RTN_Standard: !prev.Add_RTN_Standard }))}
                        className="text-[#7E5C4A]/80 hover:text-[#272727] transition-colors"
                        title={hiddenFields["Add_RTN_Standard"] ? "Unhide" : "Hide"}
                      >
                        {hiddenFields["Add_RTN_Standard"] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                       <input 
                          type="number" placeholder="Total RTN Qty"
                          disabled={!!hiddenFields["Add_RTN_Standard"]}
                          value={(newItem.packingRules as unknown as PackagingProduct['packingRules'])?.rtn?.totalQty || ''}
                          onChange={e => {
                            const rules = { ...(newItem.packingRules as unknown as PackagingProduct['packingRules'] || { boxes: {}, pallets: {}, rtn: { layers: 0, perLayer: 0, totalQty: 0 }, warp: false }) };
                            rules.rtn = { ...rules.rtn, totalQty: Number(e.target.value) };
                            setNewItem({ ...newItem, packingRules: rules });
                          }}
                          className="w-full px-3 py-1.5 rounded border border-[#D4AA7D]/40 text-xs font-bold text-[#7E5C4A] bg-[#F6EDDE] disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60"
                       />
                    </div>
                  </div>
                  <div className="p-3 bg-[#EEF2F6]/85 rounded-lg border border-[#D4AA7D]/35 space-y-2 flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-black text-[#272727] uppercase tracking-widest">Wrap Required</h5>
                      <button 
                        type="button"
                        onClick={() => {
                          const rules = { ...(newItem.packingRules as unknown as PackagingProduct['packingRules'] || { boxes: {}, pallets: {}, rtn: { layers: 0, perLayer: 0, totalQty: 0 }, warp: false }) };
                          rules.warp = !rules.warp;
                          setNewItem({ ...newItem, packingRules: rules });
                        }}
                        className={cn("w-10 h-5 rounded-full transition-colors relative", (newItem.packingRules as unknown as PackagingProduct['packingRules'])?.warp ? "bg-[#9ACD32]" : "bg-[#D4AA7D]/55")}
                      >
                        <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all z-10", (newItem.packingRules as unknown as PackagingProduct['packingRules'])?.warp ? "left-6" : "left-1")} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="pt-6 border-t border-[#D4AA7D]/30 flex gap-4">
             <button type="button" onClick={() => setIsAddNewModalOpen(false)} className="px-6 py-3 bg-[#EFD09E]/70 hover:bg-[#EFD09E] text-[#7E5C4A] rounded-xl font-bold transition-all border border-[#D4AA7D]/40">
                Cancel
             </button>
             <button type="submit" className="flex-1 py-3 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] font-black rounded-xl transition-all shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20 uppercase tracking-widest">
                Create Specification
             </button>
          </div>
        </form>
      </Modal>

      {/* Item Details Modal */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Inventory Specifications & Packing Rules"
        className="md:max-w-4xl" // Increased width for the complex grid
      >
        {selectedItem && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="grid grid-cols-2 border-b border-[#D4AA7D]/30 -mx-6 -mt-6 mb-6">
              <button 
                onClick={() => setActiveTab("overview")}
                className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'overview' 
                  ? 'border-[#272727] text-[#272727] bg-[#EFD09E]/55' 
                  : 'border-transparent text-[#7E5C4A] hover:text-[#EFD09E] hover:bg-[#272727]'
                }`}
              >
                <Info className="w-4 h-4" /> Dimension & Basic Info
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'history' 
                  ? 'border-[#272727] text-[#272727] bg-[#EFD09E]/55' 
                  : 'border-transparent text-[#7E5C4A] hover:text-[#EFD09E] hover:bg-[#272727]'
                }`}
              >
                <Boxes className="w-4 h-4" /> Packing Standards
              </button>
            </div>

            <div className="min-h-[500px]">
              {activeTab === "overview" ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Product Header */}
                  <div className="group p-5 bg-[#EEF2F6]/95 rounded-2xl border border-white/80 flex items-center gap-6 shadow-md">
                    <div className="w-20 h-20 bg-[#EFD09E]/55 rounded-2xl shadow-sm border border-[#D4AA7D]/35 flex items-center justify-center text-[#272727] group-hover:bg-[#272727] group-hover:text-[#EFD09E] group-hover:border-[#7E5C4A]/55 transition-colors">
                      <Zap className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#7E5C4A] uppercase tracking-[0.2em] mb-1">{selectedItem.name}</p>
                      <h3 className="text-2xl font-black text-[#272727] tracking-tight">{selectedItem.sku}</h3>
                      <div className="flex gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-[#7E5C4A]">
                          <HistoryIcon className="w-3.5 h-3.5" /> Updated: {selectedItem.lastUpdated}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dimension Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-[#EFD09E]/55 rounded-xl border border-[#D4AA7D]/35 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-[10px] font-black text-[#7E5C4A] uppercase tracking-widest mb-2">Physical Specs</p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-[#7E5C4A]">WxLxH</span>
                          <span className="text-lg font-black text-[#272727]">{selectedItem.width}x{selectedItem.length}x{selectedItem.height} <small className="text-[10px] font-medium text-[#7E5C4A]/70">cm</small></span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-[#7E5C4A]">CBM</span>
                          <span className="text-lg font-black text-[#272727]">{selectedItem.cbm}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-[#EFD09E]/55 rounded-xl border border-[#D4AA7D]/35 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-[10px] font-black text-[#7E5C4A] uppercase tracking-widest mb-2">Weight Data</p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-[#7E5C4A]">NW</span>
                          <span className="text-lg font-black text-[#272727]">{selectedItem.nw} <small className="text-[10px] font-medium text-[#7E5C4A]/70">kg</small></span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-[#7E5C4A]">GW</span>
                          <span className="text-lg font-black text-[#272727]">{selectedItem.gw} <small className="text-[10px] font-medium text-[#7E5C4A]/70">kg</small></span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-[#EFD09E]/55 rounded-xl border border-[#D4AA7D]/35 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-[10px] font-black text-[#7E5C4A] uppercase tracking-widest mb-2">Handling</p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-[#7E5C4A]">Product Type</span>
                          <span className="text-lg font-black text-[#272727]">{selectedItem.productType}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-[#7E5C4A]">Stack Limit</span>
                          <span className="text-lg font-black text-[#7E5C4A]">{selectedItem.stackingLimit} <small className="text-[10px] font-medium text-[#7E5C4A]/70">Layers</small></span>
                        </div>
                      </div>
                    </div>

                    {/* Side Notes */}
                    <div className="p-4 bg-[#EFD09E]/55 border border-[#D4AA7D]/35 rounded-xl flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <Info className="w-5 h-5 text-[#7E5C4A] mt-0.5" />
                      <div>
                        <h4 className="text-sm font-black text-[#7E5C4A] uppercase tracking-wide">Side Box Weight</h4>
                        <p className="text-sm text-[#7E5C4A] font-medium">{selectedItem.sideBoxWeight || "No special handling notes recorded for this item's side packaging."}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  
                  {/* Standard Boxes */}
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-black text-[#272727] uppercase tracking-widest mb-4">
                      <Boxes className="w-4 h-4 text-[#7E5C4A]" /> Standard Boxes
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {Object.entries(selectedItem.packingRules.boxes)
                        .filter(([, rule]) => rule && Number(rule.totalQty) > 0) // Filter out 0 qty
                        .sort((a, b) => getVolume(a[0]) - getVolume(b[0]))
                        .map(([size, rule]) => (
                        <PackingCard 
                          key={size}
                          title={size}
                          layers={rule.layers}
                          perLayer={rule.perLayer}
                          totalQty={rule.totalQty}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Pallet Configuration */}
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-black text-[#272727] uppercase tracking-widest mb-4">
                      <div className="w-4 h-4 rounded bg-[#9ACD32]/20 text-[#5a7a1a] flex items-center justify-center">
                        <div className="w-2 h-2 bg-[#9ACD32] rounded-full" />
                      </div>
                      Pallet Configuration
                    </h4>
                    {/* 80x120 Series */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {Object.entries(selectedItem.packingRules.pallets)
                        .filter(([type, rule]) => type.includes('80x120') && rule && Number(rule.totalQty) > 0) // Filter out 0 qty
                        .sort((a, b) => {
                           const getH = (s: string) => parseInt(s.split('x')[2] || '0');
                           return getH(a[0]) - getH(b[0]);
                        })
                        .map(([type, rule]) => (
                        <PackingCard 
                          key={type}
                          title={type}
                          layers={rule.layers}
                          perLayer={rule.perLayer}
                          totalQty={rule.totalQty}
                          className="border-[#9ACD32]/35"
                        />
                      ))}
                    </div>

                    {/* 110x110 Series */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(selectedItem.packingRules.pallets)
                        .filter(([type, rule]) => type.includes('110x110') && rule && Number(rule.totalQty) > 0) // Filter out 0 qty
                        .sort((a, b) => {
                           const getH = (s: string) => parseInt(s.split('x')[2] || '0');
                           return getH(a[0]) - getH(b[0]);
                        })
                        .map(([type, rule]) => (
                        <PackingCard 
                          key={type}
                          title={type}
                          layers={rule.layers}
                          perLayer={rule.perLayer}
                          totalQty={rule.totalQty}
                          className="border-[#9ACD32]/35"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Special Packaging (RTN & Warp) */}
                  <div>
                     <h4 className="flex items-center gap-2 text-sm font-black text-[#272727] uppercase tracking-widest mb-4">
                      <HistoryIcon className="w-4 h-4 text-[#7E5C4A]" /> Special Packaging
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {/* RTN */}
                       {selectedItem.packingRules.rtn && Number(selectedItem.packingRules.rtn.totalQty) > 0 && (
                          <PackingCard 
                             title="RTN (Returnable)"
                             layers={selectedItem.packingRules.rtn.layers}
                             perLayer={selectedItem.packingRules.rtn.perLayer}
                             totalQty={selectedItem.packingRules.rtn.totalQty}
                             className="border-[#F2C464]/40 ring-2 ring-[#F7DC6F]/40"
                          />
                       )}
                       
                       {/* Warp */}
                       <div className="bg-[#272727]/95 border border-[#7E5C4A]/45 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all flex flex-col">
                          <div className="bg-[#272727] px-4 py-2 border-b border-[#7E5C4A]/45 flex justify-center">
                             <span className="text-xs font-black text-[#EFD09E] uppercase tracking-wider">Wrap Packaging</span>
                          </div>
                          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-2">
                             <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-colors", 
                                selectedItem.packingRules.warp ? "bg-rose-500/20 text-rose-600" : "bg-emerald-500/20 text-emerald-600"
                             )}>
                                <CheckCircle2 className="w-6 h-6" />
                             </div>
                             <p className={cn("text-sm font-bold uppercase tracking-tight", 
                                selectedItem.packingRules.warp ? "text-rose-600" : "text-emerald-600"
                             )}>
                                {selectedItem.packingRules.warp ? "Required" : "Not Required"}
                             </p>
                          </div>
                       </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-6 border-t border-[#F2C464]/30 flex gap-4">
              <button 
                onClick={async () => {
                  if (selectedItem) {
                    const { generatePackagingSpecPDFMake } = await import("@/lib/utils/pdfSpecGenerator");
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await generatePackagingSpecPDFMake(selectedItem as any);
                  }
                }}

                className="flex-1 py-4 bg-[#F6EDDE] hover:bg-[#272727] text-[#7E5C4A] hover:text-[#EFD09E] rounded-2xl border border-[#D4AA7D]/45 hover:border-[#7E5C4A]/55 font-black text-sm transition-all uppercase tracking-widest hover:shadow-md flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download PDF Spec
              </button>
              
              {/* Actions Based on Tab */}
              {activeTab === 'overview' ? (
                <button 
                  onClick={() => {
                    if (selectedItem) {
                      setNewItem({
                        sku: selectedItem.sku,
                        name: selectedItem.name,
                        category: selectedItem.category,
                        width: selectedItem.width,
                        length: selectedItem.length,
                        height: selectedItem.height,
                        nw: selectedItem.nw,
                        gw: selectedItem.gw,
                        sideBoxWeight: selectedItem.sideBoxWeight,
                        productType: selectedItem.productType,
                        packingRules: JSON.parse(JSON.stringify(selectedItem.packingRules))
                      });
                      setIsEditing(true);
                      setIsBasicInfoModalOpen(true);
                    }
                  }}
                  className="flex-2 py-4 bg-[#D4AA7D]/80 hover:bg-[#272727] text-[#7E5C4A] hover:text-[#EFD09E] rounded-2xl border border-[#D4AA7D]/45 hover:border-[#7E5C4A]/55 font-black text-sm transition-all shadow-lg shadow-[#D4AA7D]/20 uppercase tracking-widest hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  Edit Basic Info
                </button>
              ) : (
                <button 
                   onClick={() => {
                      if (selectedItem) {
                         setNewItem({
                            sku: selectedItem.sku,
                            name: selectedItem.name,
                            width: 0, length: 0, height: 0, nw: 0, gw: 0,
                            packingRules: JSON.parse(JSON.stringify(selectedItem.packingRules))
                         });
                         setIsPackingStandardsModalOpen(true);
                      }
                   }}
                   className="flex-2 py-4 bg-[#D4AA7D]/80 hover:bg-[#272727] text-[#7E5C4A] hover:text-[#EFD09E] rounded-2xl border border-[#D4AA7D]/45 hover:border-[#7E5C4A]/55 font-black text-sm transition-all shadow-lg shadow-[#D4AA7D]/20 flex items-center justify-center gap-2 uppercase tracking-widest hover:scale-[1.02] active:scale-95"
                >
                   <Boxes className="w-4 h-4" /> Edit Packing Standards
                </button>
              )}
            </div>


          </div>
        )}
      </Modal>

      {/* Edit Packing Standards Modal */}
      {/* Edit Packing Standards Modal */}
      <Modal
         isOpen={isPackingStandardsModalOpen}
         onClose={() => setIsPackingStandardsModalOpen(false)}
         title="Edit Packing Standards"
         className="max-w-2xl"
      >
         <form onSubmit={handlePackingStandardsSubmit} className="space-y-6">
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">

               {/* Standard Boxes (ALL Sizes) */}
               <div className="space-y-4">
                  <h4 className="text-sm font-black text-[#272727] uppercase tracking-wide flex items-center gap-2">
                     <div className="w-4 h-4 bg-[#9ACD32] rounded-sm" /> Standard Boxes
                  </h4>
                   {[
                     "42x46x68",
                     "47x66x68", 
                     "57x64x84",
                     "68x74x86",
                     "70x100x90"
                   ].map((size) => {
                     const rule = (newItem.packingRules as unknown as PackagingProduct['packingRules'])?.boxes?.[size] || { layers: 0, perLayer: 0, totalQty: 0 };
                     const uiKey = `Box_${size}`;
                     const isHidden = hiddenFields[uiKey];

                     return (
                     <div key={size} className={cn("p-3 border rounded-lg flex items-center gap-4 transition-colors", 
                        isHidden ? "bg-[#EFD09E]/35 border-[#D4AA7D]/25 opacity-60" : "bg-[#EEF2F6]/85 border-[#D4AA7D]/35"
                     )}>
                        <div className="flex items-center gap-3 w-32">
                           <button
                              type="button"
                              onClick={() => setHiddenFields(prev => ({ ...prev, [uiKey]: !prev[uiKey] }))}
                              className="text-[#7E5C4A]/80 hover:text-[#272727] transition-colors"
                              title={isHidden ? "Unhide" : "Hide"}
                           >
                              {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                           </button>
                           <span className="font-bold text-[#272727] text-xs whitespace-nowrap leading-tight">
                              {size.replace(/x/g, ' x ')}
                           </span>
                        </div>
                        
                        <div className="flex-1 grid grid-cols-3 gap-2">
                           <input 
                              type="number" 
                              placeholder="Layers"
                              disabled={isHidden}
                              value={rule.layers || ''}
                              onChange={e => {
                                 const currentRules = newItem.packingRules as unknown as PackagingProduct['packingRules'];
                                 const newBoxes = { ...currentRules.boxes };
                                 newBoxes[size] = { ...rule, layers: Number(e.target.value) };
                                 setNewItem({ ...newItem, packingRules: { ...currentRules, boxes: newBoxes } });
                              }}
                              className="px-2 py-1 rounded border border-[#D4AA7D]/40 bg-[#F6EDDE] text-xs text-[#272727] disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60"
                           />
                           <input 
                              type="number" 
                              placeholder="Pieces per Layer"
                              disabled={isHidden}
                              value={rule.perLayer || ''}
                              onChange={e => {
                                 const currentRules = newItem.packingRules as unknown as PackagingProduct['packingRules'];
                                 const newBoxes = { ...currentRules.boxes };
                                 newBoxes[size] = { ...rule, perLayer: Number(e.target.value) };
                                 setNewItem({ ...newItem, packingRules: { ...currentRules, boxes: newBoxes } });
                              }}
                              className="px-2 py-1 rounded border border-[#D4AA7D]/40 bg-[#F6EDDE] text-xs text-[#272727] disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60"
                           />
                           <input 
                              type="number" 
                              placeholder="Total Qty"
                              disabled={isHidden}
                              value={rule.totalQty || ''}
                              onChange={e => {
                                 const currentRules = newItem.packingRules as unknown as PackagingProduct['packingRules'];
                                 const newBoxes = { ...currentRules.boxes };
                                 newBoxes[size] = { ...rule, totalQty: Number(e.target.value) };
                                 setNewItem({ ...newItem, packingRules: { ...currentRules, boxes: newBoxes } });
                              }}
                              className="px-2 py-1 rounded border border-[#D4AA7D]/40 text-xs font-bold text-[#7E5C4A] bg-[#EFD09E]/55 disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60 disabled:border-[#D4AA7D]/30"
                           />
                        </div>
                     </div>
                   );
                   })}
               </div>

               {/* Standard Pallets (ALL Sizes) */}
               <div className="space-y-4">
                  <h4 className="text-sm font-black text-[#272727] uppercase tracking-wide flex items-center gap-2">
                     <div className="w-4 h-4 bg-[#9ACD32] rounded-sm" /> Standard Pallets
                  </h4>
                   {[
                     "80x120x65",
                     "80x120x90",
                     "80x120x115",
                     "110x110x65",
                     "110x110x90",
                     "110x110x115"
                   ].map((size) => {
                     const rule = (newItem.packingRules as unknown as PackagingProduct['packingRules'])?.pallets?.[size] || { layers: 0, perLayer: 0, totalQty: 0 };
                     const uiKey = `Pallet_${size}`;
                     const isHidden = hiddenFields[uiKey];

                     return (
                     <div key={size} className={cn("p-3 border rounded-lg flex items-center gap-4 transition-colors", 
                        isHidden ? "bg-[#EFD09E]/35 border-[#D4AA7D]/25 opacity-60" : "bg-[#EEF2F6]/85 border-[#D4AA7D]/35"
                     )}>
                        <div className="flex items-center gap-3 w-40">
                           <button
                              type="button"
                              onClick={() => setHiddenFields(prev => ({ ...prev, [uiKey]: !prev[uiKey] }))}
                              className="text-[#7E5C4A]/80 hover:text-[#272727] transition-colors"
                              title={isHidden ? "Unhide" : "Hide"}
                           >
                              {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                           </button>
                           <span className="font-bold text-[#272727] text-xs whitespace-nowrap leading-tight">
                              {size.replace(/x/g, ' x ')}
                           </span>
                        </div>

                        <div className="flex-1 grid grid-cols-3 gap-2">
                           <input 
                              type="number" 
                              placeholder="Layers"
                              disabled={isHidden}
                              value={rule.layers || ''}
                              onChange={e => {
                                 const currentRules = newItem.packingRules as unknown as PackagingProduct['packingRules'];
                                 const newPallets = { ...currentRules.pallets };
                                 newPallets[size] = { ...rule, layers: Number(e.target.value) };
                                 setNewItem({ ...newItem, packingRules: { ...currentRules, pallets: newPallets } });
                              }}
                              className="px-2 py-1 rounded border border-[#D4AA7D]/40 bg-[#F6EDDE] text-xs text-[#272727] disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60"
                           />
                           <input 
                              type="number" 
                              placeholder="Pieces per Layer"
                              disabled={isHidden}
                              value={rule.perLayer || ''}
                              onChange={e => {
                                 const currentRules = newItem.packingRules as unknown as PackagingProduct['packingRules'];
                                 const newPallets = { ...currentRules.pallets };
                                 newPallets[size] = { ...rule, perLayer: Number(e.target.value) };
                                 setNewItem({ ...newItem, packingRules: { ...currentRules, pallets: newPallets } });
                              }}
                              className="px-2 py-1 rounded border border-[#D4AA7D]/40 bg-[#F6EDDE] text-xs text-[#272727] disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60"
                           />
                           <input 
                              type="number" 
                              placeholder="Total Qty"
                              disabled={isHidden}
                              value={rule.totalQty || ''}
                              onChange={e => {
                                 const currentRules = newItem.packingRules as unknown as PackagingProduct['packingRules'];
                                 const newPallets = { ...currentRules.pallets };
                                 newPallets[size] = { ...rule, totalQty: Number(e.target.value) };
                                 setNewItem({ ...newItem, packingRules: { ...currentRules, pallets: newPallets } });
                              }}
                              className="px-2 py-1 rounded border border-[#D4AA7D]/40 text-xs font-bold text-[#7E5C4A] bg-[#EFD09E]/55 disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60 disabled:border-[#D4AA7D]/30"
                           />
                        </div>
                     </div>
                   );
                   })}
               </div>

                {/* RTN Section - Reconfigured to match Box/Pallet style */}
               <div className="space-y-4">
                  <h4 className="text-sm font-black text-[#272727] uppercase tracking-wide flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#9ACD32] rounded-sm" /> RTN (Returnable)
                  </h4>
                  {(() => {
                     const isHidden = hiddenFields['RTN_Standard'];
                     return (
                        <div className={cn("p-3 border rounded-lg flex items-center gap-4 transition-colors", 
                           isHidden ? "bg-[#EFD09E]/35 border-[#D4AA7D]/25 opacity-60" : "bg-[#EEF2F6]/85 border-[#D4AA7D]/35"
                        )}>
                           <div className="flex items-center gap-3 w-32">
                              <button
                                 type="button"
                                 onClick={() => setHiddenFields(prev => ({ ...prev, 'RTN_Standard': !prev['RTN_Standard'] }))}
                                 className="text-[#7E5C4A]/80 hover:text-[#272727] transition-colors"
                                 title={isHidden ? "Unhide" : "Hide"}
                              >
                                 {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                               <span className="font-bold text-[#272727] text-sm whitespace-nowrap leading-tight">
                                 Standard RTN
                               </span>
                           </div>

                           <div className="flex-1 grid grid-cols-3 gap-2">
                              <input 
                                 type="number" 
                                 placeholder="Layers"
                                 disabled={isHidden}
                                 value={(newItem.packingRules as unknown as PackagingProduct['packingRules'])?.rtn?.layers || ''}
                                 onChange={e => {
                                    const currentRules = newItem.packingRules as unknown as PackagingProduct['packingRules'];
                                    setNewItem({ ...newItem, packingRules: { ...currentRules, rtn: { ...(currentRules.rtn || { layers: 0, perLayer: 0, totalQty: 0 }), layers: Number(e.target.value) } } });
                                 }}
                                 className="px-2 py-1 rounded border border-[#D4AA7D]/40 bg-[#F6EDDE] text-xs text-[#272727] disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60"
                              />
                              <input 
                                 type="number" 
                                 placeholder="Pieces per Layer"
                                 disabled={isHidden}
                                 value={(newItem.packingRules as unknown as PackagingProduct['packingRules'])?.rtn?.perLayer || ''}
                                 onChange={e => {
                                    const currentRules = newItem.packingRules as unknown as PackagingProduct['packingRules'];
                                    setNewItem({ ...newItem, packingRules: { ...currentRules, rtn: { ...(currentRules.rtn || { layers: 0, perLayer: 0, totalQty: 0 }), perLayer: Number(e.target.value) } } });
                                 }}
                                 className="px-2 py-1 rounded border border-[#D4AA7D]/40 bg-[#F6EDDE] text-xs text-[#272727] disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60"
                              />
                              <input 
                                 type="number" 
                                 placeholder="Total Qty"
                                 disabled={isHidden}
                                 value={(newItem.packingRules as unknown as PackagingProduct['packingRules'])?.rtn?.totalQty || ''}
                                 onChange={e => {
                                    const currentRules = newItem.packingRules as unknown as PackagingProduct['packingRules'];
                                    setNewItem({ ...newItem, packingRules: { ...currentRules, rtn: { ...(currentRules.rtn || { layers: 0, perLayer: 0, totalQty: 0 }), totalQty: Number(e.target.value) } } });
                                 }}
                                 className="px-2 py-1 rounded border border-[#D4AA7D]/40 text-xs font-bold text-[#7E5C4A] bg-[#EFD09E]/55 disabled:bg-[#EFD09E]/35 disabled:text-[#7E5C4A]/60 disabled:border-[#D4AA7D]/30"
                              />
                           </div>
                        </div>
                     );
                  })()}
               </div>

                {/* Special Packaging Section - Moved to Bottom */}
                <div className="pt-4 border-t border-[#D4AA7D]/30 flex items-center justify-between">
                   <h4 className="text-sm font-black text-[#7E5C4A] uppercase tracking-wide flex items-center gap-2">
                     <HistoryIcon className="w-4 h-4" /> Special Packaging
                   </h4>
                   
                     {/* Warp Toggle */}
                     <div className="flex items-center gap-3">
                        <label className="text-sm font-bold text-[#7E5C4A]">Wrap Required?</label>
                        <button
                           type="button"
                           onClick={() => {
                              const currentRules = newItem.packingRules as unknown as PackagingProduct['packingRules'] || {};
                              setNewItem({
                                 ...newItem,
                                 packingRules: {
                                    ...currentRules,
                                    warp: !currentRules.warp
                                 }
                              });
                           }}
                           className={cn("w-12 h-6 rounded-full transition-colors relative", 
                              (newItem.packingRules as unknown as PackagingProduct['packingRules'])?.warp ? "bg-[#9ACD32]" : "bg-[#D4AA7D]/60"
                           )}
                        >
                           <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", 
                              (newItem.packingRules as unknown as PackagingProduct['packingRules'])?.warp ? "left-7" : "left-1"
                           )} />
                        </button>
                     </div>
                </div>

             </div>
            
            <button type="submit" className="w-full py-3 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] font-bold rounded-xl transition-colors shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20">
               Update Packing Standards
            </button>
         </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          if (importProgress.status !== 'uploading' && importProgress.status !== 'parsing') {
            setIsImportModalOpen(false);
            setImportProgress({status: 'idle', percent: 0});
          }
        }}
        title="Import Packaging Specifications"
        className="md:max-w-2xl"
      >
        <div className="space-y-8 p-2">
          {importProgress.status === 'idle' ? (
            <div className="space-y-6">
              {/* Info Box */}
              <div className="p-4 bg-[#EFD09E]/60 border border-[#D4AA7D]/35 rounded-2xl flex items-start gap-4">
                <Info className="w-6 h-6 text-[#7E5C4A] mt-1" />
                <div>
                  <h4 className="text-sm font-black text-[#7E5C4A] uppercase tracking-wide">Import Instructions</h4>
                  <p className="text-xs text-[#7E5C4A] font-medium leading-relaxed mt-1">
                    Please use the official CSV template to ensure all 1,800+ items are mapped correctly to our new W/L/H separate storage structure.
                  </p>
                </div>
              </div>

              {/* Upload Area */}
              <div 
                className="border-2 border-dashed border-[#D4AA7D]/45 rounded-3xl p-8 text-center hover:border-[#9ACD32]/45 hover:bg-[#EFD09E]/45 transition-all cursor-pointer group relative"
              >
                <input 
                  type="file" 
                  accept=".csv,.xlsx" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleFileUpload}
                />
                <div className="w-16 h-16 bg-[#EFD09E]/60 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:bg-[#9ACD32]/20 transition-all">
                  <FileSpreadsheet className="w-8 h-8 text-[#7E5C4A] group-hover:text-[#5a7a1a]" />
                </div>
                <h3 className="text-base font-black text-[#272727] tracking-tight">Drop your CSV file here</h3>
                <p className="text-xs text-[#7E5C4A] font-medium mt-1">or click to browse from your computer</p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#272727] text-[#EFD09E] rounded-xl text-xs font-bold transition-colors uppercase tracking-widest pointer-events-none border border-[#EFD09E]/20">
                  Select File
                </div>
              </div>

              {/* Download Template */}
              <div className="flex items-center justify-between p-4 bg-[#EFD09E]/50 rounded-2xl border border-[#D4AA7D]/35">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-[#7E5C4A]" />
                  <div>
                    <p className="text-sm font-black text-[#272727] tracking-tight">Don&apos;t have the template?</p>
                    <p className="text-[10px] text-[#7E5C4A] font-medium">Download the schema-compatible CSV template</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const headers = [
                      "SKU (Item)", "Name", "Category", 
                      "Width (cm)", "Length (cm)", "Height (cm)", 
                      "Net Weight (kg)", "Gross Weight (kg)", "CBM",
                      "Product Type", "Stacking Limit", "Side Box Weight",
                      // Boxes
                      "Box_42x46x68_Layers", "Box_42x46x68_PerLayer", "Box_42x46x68_Total",
                      "Box_47x66x68_Layers", "Box_47x66x68_PerLayer", "Box_47x66x68_Total", 
                      "Box_57x64x84_Layers", "Box_57x64x84_PerLayer", "Box_57x64x84_Total",
                      "Box_68x74x86_Layers", "Box_68x74x86_PerLayer", "Box_68x74x86_Total",
                      "Box_70x100x90_Layers", "Box_70x100x90_PerLayer", "Box_70x100x90_Total",
                      // Pallets
                      "Pallet_80x120x65_Layers", "Pallet_80x120x65_PerLayer", "Pallet_80x120x65_Total",
                      "Pallet_80x120x90_Layers", "Pallet_80x120x90_PerLayer", "Pallet_80x120x90_Total",
                      "Pallet_80x120x115_Layers", "Pallet_80x120x115_PerLayer", "Pallet_80x120x115_Total",
                      "Pallet_110x110x65_Layers", "Pallet_110x110x65_PerLayer", "Pallet_110x110x65_Total",
                      "Pallet_110x110x90_Layers", "Pallet_110x110x90_PerLayer", "Pallet_110x110x90_Total",
                      "Pallet_110x110x115_Layers", "Pallet_110x110x115_PerLayer", "Pallet_110x110x115_Total",
                      // RTN & Warp
                      "RTN_Layers", "RTN_PerLayer", "RTN_Total",
                      "Warp_Required"
                    ];
                    
                    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "packaging_specs_template.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-4 py-2 text-[#272727] bg-[#EEF2F6]/95 border border-[#D4AA7D]/35 rounded-xl text-xs font-black hover:bg-[#EFD09E]/70 transition-colors uppercase tracking-widest"
                >
                  Download
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
              {importProgress.status === 'complete' ? (
                <>
                  <div className="w-24 h-24 bg-[#9ACD32]/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <CheckCircle2 className="w-12 h-12 text-[#5a7a1a]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#272727] tracking-tight">Import Successful!</h3>
                    <p className="text-[#7E5C4A] font-medium mt-1">Processed {importStats.success} items.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    <div className="p-4 bg-[#EFD09E]/55 rounded-2xl border border-[#D4AA7D]/35">
                      <p className="text-[10px] text-[#7E5C4A] font-black uppercase tracking-widest mb-1">New Items</p>
                      <p className="text-2xl font-black text-[#7E5C4A]">{importStats.success}</p>
                    </div>
                    <div className="p-4 bg-[#EFD09E]/55 rounded-2xl border border-[#D4AA7D]/35">
                      <p className="text-[10px] text-[#7E5C4A] font-black uppercase tracking-widest mb-1">Updated</p>
                      <p className="text-2xl font-black text-[#272727]">{importStats.updated || '-'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                        setIsImportModalOpen(false);
                        setImportProgress({status: 'idle', percent: 0});
                    }}
                    className="w-full py-4 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20"
                  >
                    Return to Table
                  </button>
                </>
              ) : (
                <>
                  <div className="relative w-32 h-32 mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full border-4 border-[#D4AA7D]/40" />
                    <div 
                      className="absolute inset-0 rounded-full border-4 border-[#9ACD32] border-t-transparent animate-spin" 
                      style={{ animationDuration: '0.8s' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-[#272727]">
                      {importProgress.percent}%
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#272727] uppercase tracking-widest">
                      {importProgress.status === 'uploading' ? 'Uploading File...' : 'Parsing Specifications...'}
                    </h3>
                    <p className="text-sm text-[#7E5C4A] font-medium mt-1">
                      {importProgress.status === 'uploading' 
                        ? 'Transferring data to our secure servers' 
                        : 'Mapping CSV data to smart packing structure'}
                    </p>
                  </div>
                  <div className="max-w-md mx-auto h-2 bg-[#D4AA7D]/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#9ACD32] transition-all duration-300"
                      style={{ width: `${importProgress.percent}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
