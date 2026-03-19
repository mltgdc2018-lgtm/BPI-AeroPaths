"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Play,
  ChevronRight,
  RotateCcw,
  Package,
  Layers,
  Filter,
  Box,
  CheckCircle2,
  Database,
  Ruler,
  GitBranch,
  SplitSquareHorizontal,

  FileText,
  ArrowLeft,
} from "lucide-react";
import { motion } from "motion/react";
import { GlassCard } from "@/components/shared/GlassCard";
import { PackagingService } from "@/lib/firebase/services/packaging.service";
import { PACKAGE_MASTER_DATA } from "@/lib/config/packagingData";

// Types
interface ProcessedItem {
  po: string;
  sku: string;
  qty: number;
  spec?: {
    name: string;
    width: number;
    length: number;
    height: number;
    m3: number;
    packingRules?: {
      warp?: boolean;
      boxes?: Record<string, number>;
      pallets?: Record<string, number>;
    };
  };
  m3Total?: number;
  maxPackage?: string;
  dimsKey?: string;
}

interface ProcessedItemWithDensity extends ProcessedItem {
  density: number;
  maxCapacity: number;
}

interface PackedCase {
  caseNo: number;
  type: string;
  items: { sku: string; name: string; qty: number }[];
  dims: string;
  note?: string;
}

interface POData {
  po: string;
  items: ProcessedItem[];
  uniqueDims: string[];
  packingType: "same" | "mixed" | "pending";
  sameItems: ProcessedItem[];
  mixedItems: ProcessedItem[];
  remainder: ProcessedItem[];
}

interface POResult {
  po: string;
  warpCases: PackedCase[];
  unknownCases: PackedCase[]; // Items with no spec & < 0.15 m3
  monoCases: PackedCase[];  // Mono Alone POs
  sameCases: PackedCase[];  // Overflow / Same dimension
  mixedCases: PackedCase[];
  status: "processing" | "complete";
}

// Step definitions - New Flow
const STEP_FLOW = [
  { id: "input", title: "📥 Input", icon: Package },
  { id: "aggregate", title: "📊 Aggregate", icon: Layers },
  { id: "fetch_specs", title: "🔍 Fetch Specs", icon: Database },
  { id: "separate_warp", title: "🔧 Wrap", icon: Filter },
  { id: "split_po", title: "📋 Split PO", icon: SplitSquareHorizontal },
  { id: "check_mono", title: "🎯 Mono", icon: Box },
  { id: "check_overflow", title: "📊 Overflow", icon: Ruler },
  { id: "pack_same", title: "📦 SamePack", icon: Box },
  { id: "pack_mixed", title: "📦 BinPack", icon: GitBranch },
  { id: "check_choose", title: "✅ Completed", icon: CheckCircle2 },
];

export default function LogicProcessPage() {
  const [rawInput, setRawInput] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Working data
  const [workingItems, setWorkingItems] = useState<ProcessedItem[]>([]);
  const [stepDescription, setStepDescription] = useState("");

  // PO-based processing
  const [poDataMap, setPODataMap] = useState<Map<string, POData>>(new Map());
  const poDataMapRef = useRef(poDataMap);
  
  // Keep ref in sync with state
  useEffect(() => {
    poDataMapRef.current = poDataMap;
  }, [poDataMap]);

  // Completed results (left panel)
  const [poResults, setPOResults] = useState<Map<string, POResult>>(new Map());
  const poResultsRef = useRef(poResults);
  
  // Keep ref in sync with state
  useEffect(() => {
    poResultsRef.current = poResults;
  }, [poResults]);

  // Region Selection (A/E/R)
  const [selectedRegion, setSelectedRegion] = useState<"A" | "E" | "R">("E");

  // Parse input
  const parseInput = (input: string): ProcessedItem[] => {
    const lines = input.split("\n");
    const items: ProcessedItem[] = [];
    lines.forEach((line) => {
      const parts = line.trim().split(/[\t,]+/);
      if (parts.length >= 3) {
        const po = parts[0].trim();
        const sku = parts[1].trim();
        const qty = parseInt(parts[2].replace(/,/g, "").trim());
        if (po && sku && !isNaN(qty)) {
          items.push({ po, sku, qty });
        }
      }
    });
    return items;
  };

  // Aggregate and sort
  const aggregateAndSort = (items: ProcessedItem[]): ProcessedItem[] => {
    const aggregated = new Map<string, ProcessedItem>();
    for (const item of items) {
      const key = `${item.po}|${item.sku}`;
      if (aggregated.has(key)) {
        aggregated.get(key)!.qty += item.qty;
      } else {
        aggregated.set(key, { ...item });
      }
    }
    return Array.from(aggregated.values()).sort((a, b) => {
      if (a.po !== b.po) return a.po.localeCompare(b.po);
      return b.qty - a.qty;
    });
  };

  // Fetch specs
  const fetchSpecs = async (
    items: ProcessedItem[],
  ): Promise<ProcessedItem[]> => {
    const uniqueSkus = [...new Set(items.map((i) => i.sku))];
    const specsMap = new Map<string, ProcessedItem["spec"]>();

    // 1. Get Allowed Package Names for Selected Region
    const allowedPackageNames = PACKAGE_MASTER_DATA
        .filter(pkg => pkg.types.includes(selectedRegion))
        .map(pkg => pkg.name);

    console.log(`[DEBUG] Fetch Specs for Region: ${selectedRegion}`);
    console.log(`[DEBUG] Allowed Packages:`, allowedPackageNames);

    for (const sku of uniqueSkus) {
      try {
        const spec = await PackagingService.getProductSpec(sku);
        if (spec) {
          const rules = spec.packingRules as {
              warp?: boolean;
              boxes?: Record<string, number>;
              pallets?: Record<string, number>;
          };

          // 2. Determine Validity (Region Match or Warp)
          let isValidForRegion = false;
          if (rules) {
              const hasBoxRule = rules.boxes && Object.keys(rules.boxes).some(k => allowedPackageNames.includes(k));
              const hasPalletRule = rules.pallets && Object.keys(rules.pallets).some(k => allowedPackageNames.includes(k));
              if (hasBoxRule || hasPalletRule) isValidForRegion = true;
          }

          const isWarp = rules?.warp === true;

          // Always keep basic dimensions for M3 Fallback calculation in Step 4
          // But only keep packingRules if it's actually valid for this region or is explicit Warp
          specsMap.set(sku, {
              name: spec.name,
              width: spec.width,
              length: spec.length,
              height: spec.height,
              m3: spec.cbm,
              packingRules: (isValidForRegion || isWarp) ? rules : undefined,
          });

          if (!isValidForRegion && !isWarp) {
              console.log(`[DEBUG] SKU: ${sku} - No region match & not Warp. Packing rules hidden for fallback.`);
          }

        } else {
          console.log(`[DEBUG] SKU: ${sku}, NOT FOUND in database`);
        }
      } catch (error) {
        console.error(`Error fetching spec for ${sku}:`, error);
      }
    }

    return items.map((item) => ({ ...item, spec: specsMap.get(item.sku) }));
  };

  // Separate warp items
  const separateWarp = (items: ProcessedItem[]) => {
    const warpItems: ProcessedItem[] = [];
    const unknownItems: ProcessedItem[] = [];
    const normalItems: ProcessedItem[] = [];

    for (const item of items) {
        const spec = item.spec;
        const rules = spec?.packingRules;

        // 1. Explicit Warp: If spec has warp flag set to true
        if (rules?.warp === true) {
            warpItems.push(item);
        }
        // 2. Normal Case: Has packing rules (which means it passed Region check in Step 3)
        else if (rules) {
            normalItems.push(item);
        }
        // 3. Fallback (No Rules / No Spec): Filtered out in Step 3 or not found in DB
        else {
            // Calculate M3 from dimensions (either from spec or fallback to 0)
            const width = spec?.width || 0;
            const length = spec?.length || 0;
            const height = spec?.height || 0;
            const m3 = spec?.m3 || (width * length * height) / 1000000;
            
            if (m3 >= 0.15) {
                warpItems.push(item);
            } else {
                unknownItems.push(item);
            }
        }
    }

    // Group items by PO
    const warpByPO = new Map<string, ProcessedItem[]>();
    for (const item of warpItems) {
      if (!warpByPO.has(item.po)) warpByPO.set(item.po, []);
      warpByPO.get(item.po)!.push(item);
    }
    
    const unknownByPO = new Map<string, ProcessedItem[]>();
    for (const item of unknownItems) {
      if (!unknownByPO.has(item.po)) unknownByPO.set(item.po, []);
      unknownByPO.get(item.po)!.push(item);
    }

    // Update results
    const newResults = new Map(poResults);
    
    // Process Warp Cases
    for (const [po, items] of warpByPO.entries()) {
      if (!newResults.has(po)) {
        newResults.set(po, {
          po,
          warpCases: [],
          unknownCases: [],
          monoCases: [],
          sameCases: [],
          mixedCases: [],
          status: "processing",
        });
      }
      const result = newResults.get(po)!;
      let caseNo = result.warpCases.length + 1;

      // Create 1:1 Cases for each unit
      for (const item of items) {
        const dims = item.spec
          ? `${item.spec.width}x${item.spec.length}x${item.spec.height}`
          : "Wrap";

        for (let q = 0; q < item.qty; q++) {
          result.warpCases.push({
            caseNo: caseNo++,
            type: "Wrap Pallet",
            items: [{ sku: item.sku, name: item.spec?.name || "", qty: 1 }],
            dims,
          });
        }
      }
    }
    
    // Process Unknown Cases
    for (const [po, items] of unknownByPO.entries()) {
      if (!newResults.has(po)) {
        newResults.set(po, {
            po,
            warpCases: [],
            unknownCases: [],
            monoCases: [],
            sameCases: [],
            mixedCases: [],
            status: "processing",
        });
      }
      const result = newResults.get(po)!;
      let caseNo = (result.unknownCases?.length || 0) + 1;

      // Group by SKU for clearer display (1 Case per SKU type)
      const skuGroups = new Map<string, ProcessedItem>();
      items.forEach(i => {
           if(skuGroups.has(i.sku)) skuGroups.get(i.sku)!.qty += i.qty;
           else skuGroups.set(i.sku, { ...i });
      });

      for (const item of skuGroups.values()) {
          result.unknownCases.push({
              caseNo: caseNo++,
              type: "Unknown Spec",
              items: [{ sku: item.sku, name: item.spec?.name || "Unknown", qty: item.qty }],
              dims: item.spec ? `${item.spec.width}x${item.spec.length}x${item.spec.height}` : "N/A",
              note: "Complete manually (No Region Rule)"
          });
      }
    }

    setPOResults(newResults);
    return normalItems;
  };

  // Split by PO
  const splitByPO = (items: ProcessedItem[]) => {
    const byPO = new Map<string, ProcessedItem[]>();
    for (const item of items) {
      if (!byPO.has(item.po)) byPO.set(item.po, []);
      byPO.get(item.po)!.push(item);
    }

    const newPOData = new Map<string, POData>();
    for (const [po, poItems] of byPO.entries()) {
      // Calculate dims key for each item
      const itemsWithDims = poItems.map((item) => ({
        ...item,
        dimsKey: item.spec
          ? `${item.spec.width}x${item.spec.length}x${item.spec.height}`
          : "unknown",
        m3Total: (item.spec?.m3 || 0) * item.qty,
      }));

      const uniqueDims = [...new Set(itemsWithDims.map((i) => i.dimsKey))];

      newPOData.set(po, {
        po,
        items: itemsWithDims,
        uniqueDims,
        packingType: "pending",
        sameItems: [],
        mixedItems: [],
        remainder: [],
      });
    }

    // Also create POResult entries for all POs
    const newResults = new Map(poResults);
    for (const po of newPOData.keys()) {
      if (!newResults.has(po)) {
        newResults.set(po, {
          po,
          warpCases: [],
          unknownCases: [],
          monoCases: [],
          sameCases: [],
          mixedCases: [],
          status: "processing",
        });
      }
    }

    // Update both state AND refs for immediate access
    setPODataMap(newPOData);
    setPOResults(newResults);
    poDataMapRef.current = newPOData;
    poResultsRef.current = newResults;
    return items;
  };

  // Find max package for item (respecting selectedRegion)
  const findMaxPackage = (
    item: ProcessedItem,
  ): { pkg: string; capacity: number } => {
    const packages = getAllPackages(item);
    if (packages.length === 0) return { pkg: "NO_RULES", capacity: 0 };
    
    // The list is sorted by capacity ascending, so the last one is the max
    const max = packages[packages.length - 1];
    return { pkg: max.pkg, capacity: max.capacity };
  };

  // Get ALL available packages for the selected region (sorted by capacity ascending)
  const getAllPackages = (item: ProcessedItem): Array<{ pkg: string; capacity: number; type: 'pallet' | 'box' }> => {
    // 1. Get packages allowed for the selected region from MASTER DATA
    const allowedPackages = PACKAGE_MASTER_DATA.filter(pkg => pkg.types.includes(selectedRegion));
    
    const results: Array<{ pkg: string; capacity: number; type: 'pallet' | 'box' }> = [];
    const rules = item.spec?.packingRules;

    if (!rules) return [];

    allowedPackages.forEach(p => {
      let capacity = 0;
      if (p.category === 'Pallet' && rules.pallets) {
        const pkgData = rules.pallets[p.name];
        capacity = typeof pkgData === 'object' && pkgData !== null 
          ? (pkgData as { totalQty?: number }).totalQty || 0
          : (typeof pkgData === 'number' ? pkgData : 0);
      } else if (p.category === 'Box' && rules.boxes) {
        const pkgData = rules.boxes[p.name];
        capacity = typeof pkgData === 'object' && pkgData !== null 
          ? (pkgData as { totalQty?: number }).totalQty || 0
          : (typeof pkgData === 'number' ? pkgData : 0);
      }

      if (capacity > 0) {
        results.push({
          pkg: p.name,
          capacity,
          type: p.category === 'Pallet' ? 'pallet' : 'box'
        });
      }
    });

    // Sort by capacity ascending (smallest first)
    return results.sort((a, b) => a.capacity - b.capacity);
  };

  // Find BEST FIT package for given quantity
  // Strategy: Find smallest package that can hold qty OR largest package if qty exceeds all
  const findBestFitPackage = (item: ProcessedItem, qty: number): { pkg: string; capacity: number; type: 'pallet' | 'box' } | null => {
    const packages = getAllPackages(item);
    if (packages.length === 0) return null;
    
    // Find smallest package that can hold the qty
    for (const p of packages) {
      if (p.capacity >= qty) {
        return p;
      }
    }
    
    // If qty exceeds all packages, return the largest one
    return packages[packages.length - 1];
  };

  // ========== STEP: Process Mono Alone ==========
  // ถ้าทั้ง PO มีขนาดเดียว → หา Best Fit Package → จบ PO นี้
  const processMonoAlone = () => {
    const updatedPOData = new Map(poDataMap);
    const newResults = new Map(poResults);
    
    for (const [po, data] of updatedPOData.entries()) {
      if (data.items.length === 0) continue;
      if (data.uniqueDims.length !== 1 || data.uniqueDims[0] === 'unknown') continue;
      
      // This is Mono Alone PO
      if (!newResults.has(po)) {
      if (!newResults.has(po)) {
        newResults.set(po, { po, warpCases: [], unknownCases: [], monoCases: [], sameCases: [], mixedCases: [], status: 'processing' });
      }
      }
      const result = newResults.get(po)!;
      let caseNo = result.monoCases.length + 1;
      
      const allItems = [...data.items];
      
      // Calculate individual SKU quantities for this PO
      const skuQtys = new Map<string, number>();
      allItems.forEach(i => skuQtys.set(i.sku, (skuQtys.get(i.sku) || 0) + i.qty));
      let totalRemaining = allItems.reduce((sum, i) => sum + i.qty, 0);

      const packages = getAllPackages(allItems[0]);
      
      if (packages.length === 0) {
        // No packing rules → Create "No Rules" case
        result.monoCases.push({
          caseNo: caseNo++,
          type: 'Mono (No Rules)',
          items: Array.from(skuQtys.entries()).map(([sku, qty]) => ({ 
            sku, 
            name: allItems.find(i => i.sku === sku)?.spec?.name || '', 
            qty 
          })),
          dims: data.uniqueDims[0],
          note: 'ต้องกำหนด Packing Rules'
        });
        totalRemaining = 0;
      } else {
        // Pack using best fit strategy with Efficiency Check
        while (totalRemaining > 0) {
          let bestPkg = findBestFitPackage(allItems[0], totalRemaining);
          if (!bestPkg) break;

          // --- Efficiency Check (75% Rule for Pallets) ---
          if (bestPkg.type === 'pallet' && totalRemaining < bestPkg.capacity) {
            const efficiency = totalRemaining / bestPkg.capacity;
            if (efficiency < 0.75) {
              // Downgrade to next smaller package
              const pkgIdx = packages.findIndex(p => p.pkg === bestPkg?.pkg);
              if (pkgIdx > 0) {
                const smallerPkg = packages[pkgIdx - 1];
                console.log(`[DEBUG] Mono Efficiency Low (${(efficiency * 100).toFixed(1)}%). Downgrading ${bestPkg.pkg} -> ${smallerPkg.pkg}`);
                bestPkg = smallerPkg;
              }
            }
          }

          // Determine how many items to pack in this case
          const qtyToPack = Math.min(totalRemaining, bestPkg.capacity);
          const isFull = qtyToPack === bestPkg.capacity;
          
          // Distribute qtyToPack across SKUs
          const itemsInCase: { sku: string; name: string; qty: number }[] = [];
          let quota = qtyToPack;

          for (const [sku, available] of skuQtys.entries()) {
            if (quota <= 0) break;
            if (available <= 0) continue;

            const take = Math.min(available, quota);
            itemsInCase.push({ 
              sku, 
              name: allItems.find(i => i.sku === sku)?.spec?.name || '', 
              qty: take 
            });
            skuQtys.set(sku, available - take);
            quota -= take;
          }

          // Create the case
          const type = isFull 
            ? (bestPkg.type === 'pallet' ? 'Full Pallet' : 'Full Box')
            : (bestPkg.type === 'pallet' ? 'Partial Pallet' : 'Partial Box');
          
          const note = isFull 
            ? `Mono (${bestPkg.capacity} ชิ้น)` 
            : `เศษ ${qtyToPack}/${bestPkg.capacity} ชิ้น`;

          result.monoCases.push({
            caseNo: caseNo++,
            type,
            items: itemsInCase,
            dims: bestPkg.pkg,
            note
          });

          totalRemaining -= qtyToPack;
        }
      }
      
      // จบ PO นี้ - ลบ items และไม่ส่งไป Mixed
      data.items = [];
      data.packingType = 'same';
      result.status = 'complete';
    }
    
    // Update both state AND refs for immediate access
    setPODataMap(updatedPOData);
    setPOResults(newResults);
    poDataMapRef.current = updatedPOData;
    poResultsRef.current = newResults;
  };

  // ========== STEP: Process Overflow ==========
  // Items ที่มี qty >= capacity → ตัด Full → เศษไป Same Dimension Pool
  const processOverflow = () => {
    const updatedPOData = new Map(poDataMap);
    const newResults = new Map(poResults);
    
    for (const [po, data] of updatedPOData.entries()) {
      if (data.items.length === 0) continue;
      
      if (!newResults.has(po)) {
      if (!newResults.has(po)) {
        newResults.set(po, { po, warpCases: [], unknownCases: [], monoCases: [], sameCases: [], mixedCases: [], status: 'processing' });
      }
      }
      const result = newResults.get(po)!;
      let caseNo = result.sameCases.length + 1;
      const pool: ProcessedItem[] = [];
      
      for (const item of data.items) {
        const { pkg, capacity } = findMaxPackage(item);
        
        if (capacity > 0 && item.qty >= capacity) {
          // Overflow: ตัด Full cases
          let remainingQty = item.qty;
          const type = pkg.includes('110') || pkg.includes('120') ? 'Full Pallet' : 'Full Box';
          
          while (remainingQty >= capacity) {
            result.sameCases.push({
              caseNo: caseNo++,
              type,
              items: [{ sku: item.sku, name: item.spec?.name || '', qty: capacity }],
              dims: pkg,
              note: 'Overflow'
            });
            remainingQty -= capacity;
          }
          
          if (remainingQty > 0) {
            pool.push({ ...item, qty: remainingQty });
          }
        } else {
          pool.push({ ...item });
        }
      }
      
      // Handover: ส่งต่อให้ sameItems เพื่อรอจัดกลุ่มในขั้นตอนถัดไป
      data.items = [];
      data.sameItems = [...data.sameItems, ...pool];
    }
    
    // Update both state AND refs for immediate access
    setPODataMap(updatedPOData);
    setPOResults(newResults);
    poDataMapRef.current = updatedPOData;
    poResultsRef.current = newResults;
  };

  // ========== STEP: Pack Same Items ==========
  // Process items with same dimensions within each PO (items that weren't Mono/Overflow)
  // Returns updated data for chaining with packMixedItems
  const packSameItems = (): { updatedPOData: Map<string, POData>; newResults: Map<string, POResult> } => {
    const updatedPOData = new Map(poDataMap);
    const newResults = new Map(poResults);
    
    for (const [po, data] of updatedPOData.entries()) {
      // Skip POs that are already complete (Mono)
      const existingResult = newResults.get(po);
      if (existingResult?.status === 'complete') continue;
      
      // Get items remaining in sameItems (from Split PO)
      if (data.sameItems.length === 0) continue;
      
      if (!newResults.has(po)) {
      if (!newResults.has(po)) {
        newResults.set(po, { po, warpCases: [], unknownCases: [], monoCases: [], sameCases: [], mixedCases: [], status: 'processing' });
      }
      }
      const result = newResults.get(po)!;
      let caseNo = result.sameCases.length + 1;
      
      // Group by dimensions
      const dimGroups = new Map<string, ProcessedItem[]>();
      for (const item of data.sameItems) {
        const dim = item.dimsKey || 'unknown';
        if (!dimGroups.has(dim)) dimGroups.set(dim, []);
        dimGroups.get(dim)!.push(item);
      }
      
      // Pack each dimension group
      for (const [dim, items] of dimGroups.entries()) {
        if (items.length === 0 || dim === 'unknown') continue;
        
        const { pkg, capacity } = findMaxPackage(items[0]);
        if (capacity > 0) {
          let totalQty = items.reduce((sum, i) => sum + i.qty, 0);
          const type = pkg.includes('110') || pkg.includes('120') ? 'Full Pallet' : 'Full Box';
          
          while (totalQty >= capacity) {
            // Calculate how much each SKU contributes to this full case
            let remainingInCase = capacity;
            const itemsInCase: Array<{ sku: string; name: string; qty: number }> = [];
            
            for (const item of items) {
              if (item.qty > 0 && remainingInCase > 0) {
                const take = Math.min(item.qty, remainingInCase);
                itemsInCase.push({ sku: item.sku, name: item.spec?.name || '', qty: take });
                item.qty -= take;
                remainingInCase -= take;
              }
            }

            result.sameCases.push({
              caseNo: caseNo++,
              type,
              items: itemsInCase,
              dims: pkg,
              note: 'Same Dim Group'
            });
            totalQty -= capacity;
          }
          
          // เศษ → Mixed (เก็บทุก SKU ที่ยังเหลืออยู่)
          const remainingItems = items.filter(i => i.qty > 0);
          data.mixedItems.push(...remainingItems);
        } else {
          // No rules → ส่งไป Mixed
          data.mixedItems.push(...items);
        }
      }
      
      data.sameItems = [];
    }
    
    // Update both state AND refs for immediate access
    setPODataMap(updatedPOData);
    setPOResults(newResults);
    poDataMapRef.current = updatedPOData;
    poResultsRef.current = newResults;
    
    return { updatedPOData, newResults };
  };

  // --- Binary Packing Helper (Generic 3D Fit with Rotation) ---
  const calculateBestFit3D = (container: {w: number, l: number, h: number}, item: {w: number, l: number, h: number}) => {
    if (item.w <= 0 || item.l <= 0 || item.h <= 0) return 0;
    
    const fits = [
      Math.floor(container.w / item.w) * Math.floor(container.l / item.l) * Math.floor(container.h / item.h),
      Math.floor(container.w / item.l) * Math.floor(container.l / item.w) * Math.floor(container.h / item.h),
      Math.floor(container.w / item.l) * Math.floor(container.l / item.h) * Math.floor(container.h / item.w),
      Math.floor(container.w / item.h) * Math.floor(container.l / item.w) * Math.floor(container.h / item.l),
      Math.floor(container.w / item.w) * Math.floor(container.l / item.h) * Math.floor(container.h / item.l),
      Math.floor(container.w / item.h) * Math.floor(container.l / item.l) * Math.floor(container.h / item.w),
    ];
    return Math.max(0, ...fits.filter(v => !isNaN(v) && isFinite(v)));
  };

  // Pack Mixed Items (Refined Logic)
  // Accepts optional data parameters for chaining after packSameItems
  const packMixedItems = (
    inputPOData?: Map<string, POData>,
    inputResults?: Map<string, POResult>
  ) => {
    // Use refs by default for latest data
    const updatedPOData = new Map(inputPOData || poDataMapRef.current);
    const newResults = new Map(inputResults || poResultsRef.current);

    console.log("=== packMixedItems START ===");
    console.log("POs in updatedPOData:", Array.from(updatedPOData.keys()));

    for (const [po, data] of updatedPOData.entries()) {
      console.log(`PO ${po}: mixedItems.length = ${data.mixedItems.length}`);
      if (data.mixedItems.length === 0) continue;

      if (!newResults.has(po)) {
        newResults.set(po, {
          po,
          warpCases: [],
          unknownCases: [],
          monoCases: [],
          sameCases: [],
          mixedCases: [],
          status: "processing",
        });
      }
      const result = newResults.get(po)!;

      // Iterative Packing Loop for Mixed Items
      // We keep packing cases until the mixedItems pool is empty
      while (data.mixedItems.some(item => item.qty > 0)) {
        // 1. Group active items by their Max Package type (Step 9.1)
        const activeItems = data.mixedItems.filter(i => i.qty > 0);
        if (activeItems.length === 0) break;

        const pkgGroups = new Map<string, ProcessedItem[]>();
        for (const item of activeItems) {
          const { pkg } = findMaxPackage(item);
          if (!pkgGroups.has(pkg)) pkgGroups.set(pkg, []);
          pkgGroups.get(pkg)!.push(item);
        }

        // 2. Identify High Density Groups (Path A Candidate)
        let topGroup: { pkgName: string, items: ProcessedItemWithDensity[], primary: ProcessedItemWithDensity } | null = null;
        
        for (const [pkgName, groupItems] of pkgGroups.entries()) {
          const itemsWithDensity = groupItems.map(item => {
            const { capacity } = findMaxPackage(item);
            return {
              ...item,
              density: capacity > 0 ? (item.qty / capacity) * 100 : 0,
              maxCapacity: capacity
            };
          }).sort((a, b) => b.density - a.density);

          // Step 9.2: Density Check (> 60%)
          if (itemsWithDensity.length > 0 && itemsWithDensity[0].density > 60) {
            // Found a High Density candidate. Select the one with highest density to process.
            if (!topGroup || itemsWithDensity[0].density > topGroup.primary.density) {
                topGroup = { pkgName, items: itemsWithDensity, primary: itemsWithDensity[0] };
            }
          }
        }

        if (topGroup) {
          // --- PATH A: High Density Logic (Steps 9.3 - 9.5) ---
          const { pkgName, items: itemsWithDensity, primary } = topGroup;
          const secondary = itemsWithDensity.length > 1 ? itemsWithDensity[1] : null;

          const pkgDef = PACKAGE_MASTER_DATA.find(p => p.name === pkgName);
          if (!pkgDef) {
             // Fallback: Skip if pkg data missing
             data.mixedItems.find(i => i.sku === primary.sku)!.qty = 0;
             continue;
          }
          
          const container = pkgDef.inner;
          const mainDim = primary.spec || { width: 0, length: 0, height: 0 };
          const smallDim = secondary?.spec || { width: 0, length: 0, height: 0 };

          // Step 9.4: Calculate Gaps & Filling
          const maxPossibleLayers = mainDim.height > 0 ? Math.floor(container.h / mainDim.height) : 0;
          const impliedItemsPerLayer = maxPossibleLayers > 0 ? Math.ceil(primary.maxCapacity / maxPossibleLayers) : 0;
          const currentLayersUsed = impliedItemsPerLayer > 0 ? Math.ceil(primary.qty / impliedItemsPerLayer) : 0;
          const currentStackHeight = Math.min(container.h, currentLayersUsed * mainDim.height);

          let totalInsertable = 0;
          let fromMissing = 0, fromTop = 0, fromSide = 0, volRatio = 1;

          if (secondary && secondary.spec) {
            const volPrimary = (mainDim.width * mainDim.length * mainDim.height) / 1000000;
            const volSecondary = (smallDim.width * smallDim.length * smallDim.height) / 1000000;
            volRatio = volPrimary > 0 && volSecondary > 0 ? Math.max(volPrimary / volSecondary, volSecondary / volPrimary) : 1;

            const totalSlotsInStack = currentLayersUsed * impliedItemsPerLayer;
            const emptySlots = Math.max(0, totalSlotsInStack - primary.qty);
            const smallInMainRatio = calculateBestFit3D(
              { w: mainDim.width, l: mainDim.length, h: mainDim.height },
              { w: smallDim.width, l: smallDim.length, h: smallDim.height }
            );
            fromMissing = emptySlots * smallInMainRatio;

            const remainingHeight = Math.max(0, container.h - currentStackHeight);
            fromTop = calculateBestFit3D({ w: container.w, l: container.l, h: remainingHeight }, { w: smallDim.width, l: smallDim.length, h: smallDim.height });

            if (volRatio <= 3) {
              const totalArea = container.w * container.l;
              const usedArea = impliedItemsPerLayer * (mainDim.width * mainDim.length);
              const freeArea = Math.max(0, (totalArea - usedArea) * 0.95);
              const smallArea = smallDim.width * smallDim.length;
              if (smallArea > 0) {
                const sideItemsPerLayer = Math.floor(freeArea / smallArea);
                fromSide = sideItemsPerLayer * currentLayersUsed;
              }
            }
            totalInsertable = Math.min(secondary.qty, fromMissing + fromTop + fromSide);
          }

          let note = `Primary: ${primary.sku}`;
          const itemsInCase: Array<{ sku: string; name: string; qty: number }> = [
            { sku: primary.sku, name: primary.spec?.name || "", qty: primary.qty }
          ];

          if (secondary && totalInsertable > 0) {
            itemsInCase.push({ sku: secondary.sku, name: secondary.spec?.name || "", qty: totalInsertable });
            note += ` | Insert: ${secondary.sku} (+${totalInsertable})`;

            // --- Step 9.5: Substitution (Item #3) ---
            const totalCapacityForSecondary = fromMissing + fromTop + fromSide;
            if (secondary.qty < totalCapacityForSecondary) {
              const missingCount = totalCapacityForSecondary - secondary.qty;
              const volSecondary = (smallDim.width * smallDim.length * smallDim.height) / 1000000;

              const substituteCandidate = itemsWithDensity.slice(2).find(cand => {
                const candDim = cand.spec || { width: 0, length: 0, height: 0 };
                const volCand = (candDim.width * candDim.length * candDim.height) / 1000000;
                const ratio = volSecondary > 0 ? volCand / volSecondary : 0;
                return ratio >= 0.5 && ratio <= 1.5;
              });

              if (substituteCandidate) {
                const candDim = substituteCandidate.spec || { width: 0, length: 0, height: 0 };
                const volCand = (candDim.width * candDim.length * candDim.height) / 1000000;
                const ratio = volSecondary > 0 ? volCand / volSecondary : 0;

                let take = 0;
                if (ratio > 1.0) take = Math.min(substituteCandidate.qty, missingCount);
                else {
                  const targetQty = Math.ceil(missingCount * 1.5);
                  take = Math.min(substituteCandidate.qty, targetQty);
                }

                if (take > 0) {
                  itemsInCase.push({ sku: substituteCandidate.sku, name: substituteCandidate.spec?.name || "", qty: take });
                  note += ` | Sub: ${substituteCandidate.sku} (+${take})`;
                  const subInPool = data.mixedItems.find(i => i.sku === substituteCandidate.sku);
                  if (subInPool) subInPool.qty -= take;
                }
              }
            }
          }

          result.mixedCases.push({
            caseNo: result.mixedCases.length + 1,
            type: pkgName.includes("110") || pkgName.includes("120") ? "Mixed Pallet" : "Mixed Box",
            items: itemsInCase,
            dims: pkgName,
            note: note
          });

          // --- Step 9.6: Finalize & Deduct Pool ---
          const primaryInPool = data.mixedItems.find(i => i.sku === primary.sku);
          if (primaryInPool) primaryInPool.qty = 0;
          if (secondary && totalInsertable > 0) {
            const secondaryInPool = data.mixedItems.find(i => i.sku === secondary.sku);
            if (secondaryInPool) secondaryInPool.qty -= totalInsertable;
          }
          // Loop continues to check remaining items
        } else {
          // --- Phase 2: Global Consolidation (Step 9.7 / Path B) ---
          // No High Density groups remain. Dissolve groups and process PO globally.
          const flatPool = activeItems.map(item => {
            const { capacity } = findMaxPackage(item);
            return {
              ...item,
              density: capacity > 0 ? (item.qty / capacity) * 100 : 0
            };
          }).sort((a, b) => b.density - a.density);

          if (flatPool.length === 0) break;

          const baseItem = flatPool[0];
          const allowedPkgs = getAllPackages(baseItem);

          if (allowedPkgs.length === 0) {
              const itemsInCase = flatPool.map(i => ({ sku: i.sku, name: i.spec?.name || "", qty: i.qty }));
              result.mixedCases.push({
                  caseNo: result.mixedCases.length + 1, type: "Mixed (No Rules)", items: itemsInCase, dims: "N/A", note: "No packing rules"
              });
              flatPool.forEach(i => { const pool = data.mixedItems.find(p => p.sku === i.sku); if (pool) pool.qty = 0; });
              break;
          }

          // Step 9.7.1: Identify Initial Base Pkg (Mono-style best fit)
          const initialBasePkg = allowedPkgs.find(p => p.capacity >= baseItem.qty) || allowedPkgs[allowedPkgs.length - 1];
          const totalVol = flatPool.reduce((sum, item) => {
              if (!item.spec) return sum;
              return sum + ((item.spec.width * item.spec.length * item.spec.height) / 1000000) * item.qty;
          }, 0);

          // Step 9.7.2: Smarter Level-up (Volume Triggered)
          let selectedPkg = initialBasePkg;
          const initialDef = PACKAGE_MASTER_DATA.find(p => p.name === initialBasePkg.pkg);
          const initialVol = initialDef?.m3 || 0;

          if (totalVol > initialVol) {
              const startIdx = allowedPkgs.findIndex(p => p.pkg === initialBasePkg.pkg);
              if (startIdx !== -1) {
                  for (let i = startIdx + 1; i < allowedPkgs.length; i++) {
                      const p = allowedPkgs[i];
                      const pDef = PACKAGE_MASTER_DATA.find(x => x.name === p.pkg);
                      if (pDef && pDef.m3 >= totalVol) {
                          selectedPkg = p;
                          break;
                      }
                      if (i === allowedPkgs.length - 1) selectedPkg = p; // Max size reached
                  }
              }
          }

          // Step 9.7.3: Create Consolidated Case + Max Size Split
          const finalPkgDef = PACKAGE_MASTER_DATA.find(p => p.name === selectedPkg.pkg);
          const containerVolLimit = finalPkgDef?.m3 || 0;
          
          let currentPackedVol = 0;
          const itemsToPack: Array<{ sku: string; name: string; qty: number }> = [];
          
          for (const item of flatPool) {
              const itemUnitVol = item.spec 
                  ? (item.spec.width * item.spec.length * item.spec.height) / 1000000 
                  : 0;
              const poolItem = data.mixedItems.find(i => i.sku === item.sku)!;
              
              if (containerVolLimit > 0) {
                  const remainingSpace = containerVolLimit - currentPackedVol;
                  if (remainingSpace <= 0) break;

                  const canFitQty = Math.floor(remainingSpace / itemUnitVol);
                  const take = Math.min(poolItem.qty, canFitQty);
                  
                  if (take > 0) {
                      itemsToPack.push({ sku: item.sku, name: item.spec?.name || "", qty: take });
                      currentPackedVol += itemUnitVol * take;
                      poolItem.qty -= take;
                  } else if (itemsToPack.length === 0) {
                      // Safety: Always pack at least 1 if it's the first item to avoid infinite loop
                      itemsToPack.push({ sku: item.sku, name: item.spec?.name || "", qty: 1 });
                      currentPackedVol += itemUnitVol;
                      poolItem.qty -= 1;
                  }
              } else {
                  itemsToPack.push({ sku: item.sku, name: item.spec?.name || "", qty: poolItem.qty });
                  poolItem.qty = 0;
              }
          }

          result.mixedCases.push({
              caseNo: result.mixedCases.length + 1,
              type: selectedPkg.type === "pallet" ? "Mixed Pallet" : "Mixed Box",
              items: itemsToPack,
              dims: selectedPkg.pkg,
              note: `Mixed (Total Vol: ${currentPackedVol.toFixed(3)} m3, Base: ${initialBasePkg.pkg})`
          });
          
          // Loop continues if items remain (Split Case)
        }
      }

      data.mixedItems = [];
      result.status = "complete";
    } // End of for..of updatedPOData

    console.log("=== packMixedItems END ===");
    console.log("Results:", Array.from(newResults.values()).map(r => ({ po: r.po, mixed: r.mixedCases.length })));

    // Update both state AND refs for immediate access
    setPODataMap(updatedPOData);
    setPOResults(newResults);
    poDataMapRef.current = updatedPOData;
    poResultsRef.current = newResults;
  };

  const handleStart = () => {
    if (!rawInput.trim()) return;
    setIsProcessing(true);

    const parsed = parseInput(rawInput);
    setWorkingItems(parsed);
    setStepDescription(`รับข้อมูล ${parsed.length} รายการ (ยังไม่รวม)`);
    setPOResults(new Map());
    setPODataMap(new Map());
    setCurrentStepIndex(0);
    setIsProcessing(false);
  };

  const handleNext = async () => {
    if (currentStepIndex >= STEP_FLOW.length - 1) return;
    setIsProcessing(true);

    const nextStep = STEP_FLOW[currentStepIndex + 1]?.id;
    let newItems = workingItems;

    try {
      switch (nextStep) {
        case "aggregate":
          newItems = aggregateAndSort(workingItems);
          setStepDescription(`รวมเหลือ ${newItems.length} รายการ`);
          break;

        case "fetch_specs":
          newItems = await fetchSpecs(workingItems);
          const foundCount = newItems.filter((i) => i.spec).length;
          setStepDescription(`พบ Spec ${foundCount}/${newItems.length}`);
          break;

        case "separate_warp":
          newItems = separateWarp(workingItems);
          const warpCount = workingItems.length - newItems.length;
          setStepDescription(
            `แยก Wrap ${warpCount} | เหลือ ${newItems.length}`,
          );
          break;

        case "split_po":
          splitByPO(workingItems);
          const poCount = [...new Set(workingItems.map((i) => i.po))].length;
          setStepDescription(`แยก ${poCount} POs`);
          break;

        case "check_mono":
          processMonoAlone();
          const monoCount = Array.from(poDataMap.values()).filter(d => d.uniqueDims.length === 1).length;
          setStepDescription(`Mono Alone: ${monoCount} POs → Full Pallet/Box`);
          break;

        case "check_overflow":
          processOverflow();
          setStepDescription(`Overflow items → ตัด Full + เศษไป Pool`);
          break;

        case "pack_same":
          packSameItems();
          const sameCount = Array.from(poResults.values()).reduce((sum, r) => sum + r.sameCases.length, 0);
          setStepDescription(`Pack Same Items: ${sameCount} cases`);
          break;

        case "pack_mixed":
          // Read from refs which were updated by packSameItems in the previous step
          // This ensures mixedItems from Same step are available immediately
          packMixedItems(poDataMapRef.current, poResultsRef.current);
          const mixedCount = Array.from(poResultsRef.current.values()).reduce((sum, r) => sum + r.mixedCases.length, 0);
          setStepDescription(`Bin EP1: ${mixedCount} Mixed Cases สร้าง!`);
          break;

        case "check_choose":
          // Summary of all packed cases
          const totalWarp = Array.from(poResults.values()).reduce((sum, r) => sum + r.warpCases.length, 0);
          const totalMono = Array.from(poResults.values()).reduce((sum, r) => sum + r.monoCases.length, 0);
          const totalSame = Array.from(poResults.values()).reduce((sum, r) => sum + r.sameCases.length, 0);
          const totalMixed = Array.from(poResults.values()).reduce((sum, r) => sum + r.mixedCases.length, 0);
          setStepDescription(`สรุป: Wrap=${totalWarp}, Mono=${totalMono}, Same=${totalSame}, Mixed=${totalMixed}`);
          break;

        case "final":
          // Finalization: Clear remaining items and set status to complete
          const finalizedData = new Map(poDataMap);
          for (const data of finalizedData.values()) {
            data.items = [];
            data.sameItems = [];
            data.mixedItems = [];
          }
          const finalizedResults = new Map(poResults);
          for (const res of finalizedResults.values()) {
            res.status = "complete";
          }
          setPODataMap(finalizedData);
          setPOResults(finalizedResults);
          setStepDescription(`✅ เสร็จสิ้นการประมวลผลทั้งหมด!`);
          break;
      }

      setWorkingItems(newItems);
      setCurrentStepIndex(currentStepIndex + 1);
    } catch (error) {
      console.error("Error:", error);
    }

    setIsProcessing(false);
  };

  const handleReset = () => {
    setCurrentStepIndex(-1);
    setWorkingItems([]);
    setStepDescription("");
    setPOResults(new Map());
    setPODataMap(new Map());
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container-custom">
        {/* Header */}
        <div className="relative text-center mb-8 pt-2">
          {/* Back Link - Positioned Absolute Left */}
          <Link
            href="/projects/packaging"
            className="absolute left-0 top-1.5 inline-flex items-center gap-2 text-[#7E5C4A] hover:text-[#272727] transition-colors text-sm md:text-base group"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline font-medium">Packaging Console</span>
          </Link>

          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-3xl font-bold mb-4"
          >
            <span className="bg-clip-text text-transparent bg-linear-to-r from-[#9ACD32] via-[#7E5C4A] to-[#272727] drop-shadow-sm">
              🧪 Logic Process Visualizer
            </span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            <Link href="/projects/packaging/logic-docs">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="group relative flex items-center gap-3 px-8 py-3 bg-[#EEF2F6]/95 backdrop-blur-xl border border-white/80 rounded-full shadow-lg shadow-[#272727]/15 hover:shadow-[#272727]/25 transition-all cursor-pointer overflow-hidden"
              >
                {/* Glossy background effect */}
                <div className="absolute inset-0 bg-linear-to-tr from-[#9ACD32]/5 to-[#7E5C4A]/5 group-hover:from-[#9ACD32]/10 group-hover:to-[#7E5C4A]/10 transition-colors" />
                
                <div className="relative flex items-center gap-3">
                  <div className="p-2 bg-[#9ACD32]/10 rounded-full text-[#5a7a1a] group-hover:bg-[#9ACD32] group-hover:text-[#272727] transition-all ring-1 ring-[#9ACD32]/20">
                    <FileText size={18} className="transition-transform group-hover:rotate-12" />
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-sm font-bold text-[#272727] tracking-tight">View Algorithm Flow</span>
                    <span className="text-[10px] text-[#5a7a1a]/70 font-semibold uppercase tracking-widest mt-1">Full Documentation (PDF)</span>
                  </div>
                  <ChevronRight size={16} className="text-[#7E5C4A]/80 group-hover:text-[#9ACD32] group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </div>

        {/* Progress Steps */}
        <div className="mb-4 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max justify-center">
            {STEP_FLOW.map((step, idx) => {
              const isActive = idx === currentStepIndex;
              const isComplete = idx < currentStepIndex;
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`
                    flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                    ${isActive ? "bg-[#9ACD32] text-[#272727] shadow" : ""}
                    ${isComplete ? "bg-[#9ACD32]/20 text-[#5a7a1a]" : ""}
                    ${!isActive && !isComplete ? "bg-[#EFD09E]/60 text-[#7E5C4A]" : ""}
                  `}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{step.title}</span>
                  </div>
                  {idx < STEP_FLOW.length - 1 && (
                    <ChevronRight
                      className={`w-3 h-3 ${isComplete ? "text-[#9ACD32]" : "text-[#D4AA7D]/60"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT: Working + PO Data */}
          <div className="space-y-4">
            {/* Input / Status */}
            <GlassCard className="p-4">
              <h2 className="text-base font-bold text-[#272727] mb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#7E5C4A]" />
                {currentStepIndex < 0 ? "Input Data" : "Processing"}
              </h2>

              {currentStepIndex < 0 ? (
                <>
                  <div className="mb-3">
                    <label className="text-xs font-semibold text-[#7E5C4A] mb-1 block">
                      🌍 Select Region (Pack Type)
                    </label>
                    <div className="flex gap-2">
                      {["A", "E", "R"].map((r) => (
                        <button
                          key={r}
                          onClick={() => setSelectedRegion(r as "A" | "E" | "R")}
                          className={`
                            flex-1 py-1.5 rounded-md text-sm font-bold border transition-all
                            ${selectedRegion === r 
                              ? "bg-[#272727] border-[#272727] text-[#EFD09E] shadow-md" 
                              : "bg-[#EEF2F6]/95 border-[#D4AA7D]/40 text-[#7E5C4A] hover:border-[#9ACD32]/45"
                            }
                          `}
                        >
                          {r} {r === "A" ? "(Asia)" : r === "E" ? "(US/EU)" : "(RTN)"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    className="w-full h-32 p-3 border border-[#D4AA7D]/40 bg-[#EEF2F6]/95 rounded-lg text-xs font-mono resize-none focus:ring-2 focus:ring-[#9ACD32]/30 text-[#272727] placeholder-[#7E5C4A]/70"
                    placeholder="วางข้อมูล PO + SKU + Qty"
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                  />
                </>
              ) : (
                <div className="p-2 bg-[#EFD09E]/45 rounded border border-[#D4AA7D]/35">
                  <p className="text-[#7E5C4A] text-sm font-medium">
                    {stepDescription}
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                {currentStepIndex < 0 ? (
                  <button
                    onClick={handleStart}
                    disabled={!rawInput.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#9ACD32] hover:bg-[#7fb832] text-[#272727] font-semibold rounded-lg text-sm disabled:opacity-50 border border-[#9ACD32]/25"
                  >
                    <Play className="w-4 h-4" /> Start
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleNext}
                      disabled={
                        currentStepIndex >= STEP_FLOW.length - 1 || isProcessing
                      }
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#9ACD32] hover:bg-[#7fb832] text-[#272727] font-semibold rounded-lg text-sm disabled:opacity-50 border border-[#9ACD32]/25"
                    >
                      {isProcessing ? "Processing..." : "Next"}{" "}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-3 py-2 bg-[#D4AA7D]/20 text-[#7E5C4A] rounded-lg border border-[#D4AA7D]/30"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </GlassCard>

            {/* PO Data Status */}
            {poDataMap.size > 0 && (
              <GlassCard className="p-4">
                <h3 className="text-sm font-bold text-[#272727] mb-2">
                  📋 PO Status (Remaining)
                </h3>
                <div className="space-y-3">
                  {Array.from(poDataMap.values())
                    .filter((data) => 
                      data.items.length > 0 || 
                      data.sameItems.length > 0 || 
                      data.mixedItems.length > 0
                    )
                    .map((data) => (
                    <div
                      key={data.po}
                      className="p-3 bg-[#EFD09E]/45 rounded-lg border border-[#D4AA7D]/35 text-xs"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-[#7E5C4A] text-sm">{data.po}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            data.packingType === "same"
                              ? "bg-[#EFD09E] text-[#7E5C4A] border border-[#D4AA7D]/45"
                              : data.packingType === "mixed"
                                ? "bg-[#D4AA7D]/30 text-[#7E5C4A] border border-[#D4AA7D]/45"
                                : "bg-[#EEF2F6]/85 text-[#7E5C4A] border border-[#D4AA7D]/30"
                          }`}
                        >
                          {data.packingType.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="space-y-4 mt-2 border-t pt-2 border-[#D4AA7D]/30">
                        {(() => {
                          const allPending = [...data.items, ...data.sameItems, ...data.mixedItems];
                          const pkgGroups = new Map<string, ProcessedItem[]>();
                          
                          let poTotalM3 = 0;
                          allPending.forEach(item => {
                            const { pkg } = findMaxPackage(item);
                            if (!pkgGroups.has(pkg)) pkgGroups.set(pkg, []);
                            pkgGroups.get(pkg)!.push(item);

                            if (item.spec) {
                              const itemM3 = (item.spec.width * item.spec.length * item.spec.height) / 1000000;
                              poTotalM3 += itemM3 * item.qty;
                            }
                          });

                          // PO Consolidation Recommendation (70% Rule)
                          // Find SMALLEST package where poTotalM3 <= 0.7 * pkg.m3
                          const recommendation = PACKAGE_MASTER_DATA
                            .filter(p => (poTotalM3 / p.m3) <= 0.7)
                            .sort((a, b) => a.m3 - b.m3)[0];

                          return (
                            <>
                              {recommendation && STEP_FLOW[currentStepIndex].id === "check_choose" && (
                                <div className="mb-3 p-2 bg-[#EFD09E]/60 border border-[#D4AA7D]/35 rounded-md">
                                  <div className="flex justify-between items-center text-[10px] mb-1">
                                    <span className="font-bold text-[#7E5C4A] uppercase">✨ PO Recommendation</span>
                                    <span className="text-[#7E5C4A]/70">Total: {poTotalM3.toFixed(3)} m³</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-[#272727]">{recommendation.name}</span>
                                    <span className="text-xs font-black text-[#7E5C4A]">{(poTotalM3 / recommendation.m3 * 100).toFixed(1)}% Full</span>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2">
                                {Array.from(pkgGroups.entries()).map(([pkg, groupItems], gIdx) => {
                                  const pkgDef = PACKAGE_MASTER_DATA.find(p => p.name === pkg);
                                  const containerM3 = pkgDef ? pkgDef.m3 : 0;
                                  let groupM3 = 0;
                                  groupItems.forEach(item => {
                                    if (item.spec) {
                                      const itemM3 = (item.spec.width * item.spec.length * item.spec.height) / 1000000;
                                      groupM3 += itemM3 * item.qty;
                                    }
                                  });
                                  const efficiency = containerM3 > 0 ? (groupM3 / containerM3) * 100 : 0;

                                  return (
                                    <div key={gIdx} className="bg-[#EEF2F6]/85 p-2 rounded-md border border-[#D4AA7D]/35">
                                      <div className="flex justify-between items-center mb-1">
                                        <p className="text-[10px] uppercase font-bold text-[#7E5C4A] flex items-center gap-1">
                                          <Package className="w-3 h-3" /> {pkg}
                                        </p>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                          efficiency >= 90 ? "bg-[#9ACD32]/20 text-[#5a7a1a]" :
                                          efficiency >= 70 ? "bg-[#EFD09E] text-[#7E5C4A] border border-[#D4AA7D]/45" :
                                          "bg-[#EEF2F6]/85 text-[#7E5C4A] border border-[#D4AA7D]/30"
                                        }`}>
                                          {efficiency.toFixed(1)}% Full
                                        </span>
                                      </div>
                                      <div className="space-y-1">
                                        {groupItems.map((item, idx) => (
                                          <div key={idx} className="flex justify-between items-start gap-2 text-[10px]">
                                            <span className="text-[#272727] font-medium truncate flex-1">{item.sku}</span>
                                            <span className="text-[#7E5C4A]/70">({item.spec ? `${item.spec.width}x${item.spec.length}x${item.spec.height}` : '-'})</span>
                                            <span className="text-[#7E5C4A] font-bold min-w-[30px] text-right">x{item.qty}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                  {Array.from(poDataMap.values()).every(d => d.items.length === 0 && d.sameItems.length === 0 && d.mixedItems.length === 0) && (
                    <div className="text-center py-4 text-[#7E5C4A]/70 italic">
                      All POs processed.
                    </div>
                  )}
                </div>
              </GlassCard>
            )}

            {/* Working Items Table */}
            {workingItems.length > 0 &&
              currentStepIndex >= 0 &&
              currentStepIndex < 4 && (
                <GlassCard className="p-4">
                  <h3 className="text-sm font-bold text-[#272727] mb-2">
                    Working ({workingItems.length})
                  </h3>
                  <div className="overflow-auto rounded-xl shadow-[4px_4px_12px_rgba(166,180,200,0.28),-4px_-4px_12px_rgba(255,255,255,0.92)]">
                    <table className="w-full text-xs">
                      <thead className="bg-[#D4AA7D] sticky top-0">
                        <tr>
                          <th className="py-1 px-2 text-left text-[#272727] font-black uppercase text-[10px] tracking-wide">PO</th>
                          <th className="py-1 px-2 text-left text-[#272727] font-black uppercase text-[10px] tracking-wide">SKU</th>
                          <th className="py-1 px-2 text-right text-[#272727] font-black uppercase text-[10px] tracking-wide">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D4AA7D]/20 bg-transparent">
                        {workingItems.slice(0, 15).map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#272727]/70 group transition-colors">
                            <td className="py-1 px-2 font-mono text-[#7E5C4A] group-hover:text-[#EFD09E]/80">
                              {item.po}
                            </td>
                            <td className="py-1 px-2 text-[#272727] group-hover:text-[#EFD09E]">{item.sku}</td>
                            <td className="py-1 px-2 text-right font-bold text-[#7E5C4A] group-hover:text-[#EFD09E]">
                              {item.qty}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {workingItems.length > 15 && (
                      <p className="text-center text-[#7E5C4A]/70 text-xs py-1">
                        +{workingItems.length - 15} more
                      </p>
                    )}
                  </div>
                </GlassCard>
              )}
          </div>

          {/* RIGHT: Completed Results by PO */}
          <GlassCard className="p-4 h-fit">
            <h2 className="text-base font-bold text-[#272727] mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#9ACD32]" />
              ผลลัพธ์ (แยกตาม PO)
            </h2>

            {poResults.size > 0 ? (
              <div className="space-y-3">
                {Array.from(poResults.entries()).map(([po, result]) => (
                  <div
                    key={po}
                    className="border border-[#D4AA7D]/40 rounded-lg overflow-hidden"
                  >
                    <div
                      className={`px-3 py-2 font-bold text-sm ${
                        result.status === "complete"
                          ? "bg-[#9ACD32] text-[#272727]"
                          : "bg-[#D4AA7D]/30 text-[#7E5C4A]"
                      }`}
                    >
                      📋 PO: {po} {result.status === "complete" ? "✓" : "⏳"}
                    </div>




                    {/* Same - แสดงก่อน */}
                    {result.sameCases.length > 0 && (
                      <div className="p-2 bg-[#EFD09E]/45 border-b border-[#D4AA7D]/30">
                        <p className="text-xs font-semibold text-[#7E5C4A] mb-2">
                          📦 Same Cases ({result.sameCases.length})
                        </p>
                        <div className="space-y-1">
                          {result.sameCases.map((c, idx) => (
                            <div key={idx} className="bg-[#EEF2F6]/95 rounded p-2 border border-[#D4AA7D]/35">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-[#7E5C4A] text-[#EFD09E] text-xs font-bold px-2 py-0.5 rounded">
                                  Case #{c.caseNo}
                                </span>
                                <span className="text-xs text-[#7E5C4A]">{c.type}</span>
                                <span className="text-xs text-[#7E5C4A]/70">({c.dims})</span>
                              </div>
                              {c.note && <div className="text-xs text-[#7E5C4A]/80 mb-1">[{c.note}]</div>}
                              <div className="text-xs text-[#272727]">
                                {c.items.map((i, iIdx) => (
                                  <div key={iIdx}>• {i.sku} x{i.qty}</div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mixed - แสดงที่สอง */}
                    {result.mixedCases.length > 0 && (
                      <div className="p-2 bg-[#9ACD32]/10 border-b border-[#9ACD32]/30">
                        <p className="text-xs font-semibold text-[#5a7a1a] mb-2">
                          🔀 Mixed Cases ({result.mixedCases.length})
                        </p>
                        <div className="space-y-1">
                          {result.mixedCases.map((c, idx) => (
                            <div key={idx} className="bg-[#EEF2F6]/95 rounded p-2 border border-[#9ACD32]/35">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-[#9ACD32] text-[#272727] text-xs font-bold px-2 py-0.5 rounded">
                                  Case #{c.caseNo}
                                </span>
                                <span className="text-xs text-[#5a7a1a]">{c.type}</span>
                                <span className="text-xs text-[#7E5C4A]/70">({c.dims})</span>
                              </div>
                              {c.note && <div className="text-xs text-[#5a7a1a]/80 mb-1">[{c.note}]</div>}
                              <div className="text-xs text-[#272727]">
                                {c.items.map((i, iIdx) => (
                                  <div key={iIdx}>• {i.sku} x{i.qty}</div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Warp - แสดงที่สาม */}
                    {result.warpCases.length > 0 && (
                      <div className="p-2 bg-[#D4AA7D]/10 border-b border-[#D4AA7D]/30">
                        <p className="text-xs font-semibold text-[#7E5C4A] mb-2">
                          🔴 Wrap Cases ({result.warpCases.length})
                        </p>
                        <div className="space-y-1">
                          {result.warpCases.map((c, idx) => (
                            <div key={idx} className="bg-[#EEF2F6]/95 rounded p-2 border border-[#D4AA7D]/35">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-[#D4AA7D] text-[#EFD09E] text-xs font-bold px-2 py-0.5 rounded">
                                  Case #{c.caseNo}
                                </span>
                                <span className="text-xs text-[#7E5C4A]">{c.type}</span>
                                <span className="text-xs text-[#7E5C4A]/70">({c.dims})</span>
                              </div>
                              <div className="text-xs text-[#272727]">
                                {c.items.map((i, iIdx) => (
                                  <div key={iIdx}>• {i.sku} x{i.qty}</div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unknown Cases - ⚠️ แสดงหลัง Warp และก่อน Mono */}
                    {result.unknownCases && result.unknownCases.length > 0 && (
                      <div className="p-2 bg-[#EFD09E]/60 border-b border-[#D4AA7D]/35">
                        <p className="text-xs font-semibold text-[#7E5C4A] mb-2">
                          ⚠️ Unknown Cases ({result.unknownCases.length})
                        </p>
                        <div className="space-y-1">
                          {result.unknownCases.map((c, idx) => (
                            <div key={idx} className="bg-[#EEF2F6]/95 rounded p-2 border border-[#D4AA7D]/35">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-[#7E5C4A] text-[#EFD09E] text-xs font-bold px-2 py-0.5 rounded">
                                  Case #{c.caseNo}
                                </span>
                                <span className="text-xs text-[#7E5C4A]">{c.type}</span>
                                <span className="text-xs text-[#7E5C4A]/70">({c.dims})</span>
                              </div>
                              {c.note && <div className="text-xs text-[#7E5C4A]/80 font-medium mb-1">⚠️ {c.note}</div>}
                              <div className="text-xs text-[#272727]">
                                {c.items.map((i, iIdx) => (
                                  <div key={iIdx}>• {i.sku} ({i.name}) x{i.qty}</div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mono - แสดงสุดท้าย */}
                    {result.monoCases.length > 0 && (
                      <div className="p-2 bg-[#272727]/10 border-b border-[#272727]/30">
                        <p className="text-xs font-semibold text-[#272727] mb-2">
                          🎯 Mono Cases ({result.monoCases.length})
                        </p>
                        <div className="space-y-1">
                          {result.monoCases.map((c, idx) => (
                            <div key={idx} className="bg-[#EEF2F6]/95 rounded p-2 border border-[#272727]/35">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-[#272727] text-[#EFD09E] text-xs font-bold px-2 py-0.5 rounded">
                                  Case #{c.caseNo}
                                </span>
                                <span className="text-xs text-[#272727]">{c.type}</span>
                                <span className="text-xs text-[#7E5C4A]/70">({c.dims})</span>
                              </div>
                              {c.note && <div className="text-xs text-[#272727]/80 mb-1">[{c.note}]</div>}
                              <div className="text-xs text-[#272727]">
                                {c.items.map((i, iIdx) => (
                                  <div key={iIdx}>• {i.sku} x{i.qty}</div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-[#7E5C4A]/70 text-sm">
                ผลลัพธ์จะแสดงเมื่อ process เสร็จ
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
