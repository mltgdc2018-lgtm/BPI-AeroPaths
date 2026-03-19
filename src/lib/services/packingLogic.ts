import { 
  PackageDef, 
  getAvailablePackages, 
  calculateM3,
  sortPackagesByVolume
} from '@/lib/config/packagingData';

import {
  Item3D,
  Dimensions3D,
  validatePacking,
  simplePhysicalCheck
} from '@/lib/utils/binPacking3D';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProductSpec {
  sku: string;
  name: string;
  width: number;   // cm
  length: number;  // cm
  height: number;  // cm
  m3: number;      // m³
  packingRules?: {
    warp?: boolean;
    boxes?: Record<string, unknown>;
    pallets?: Record<string, unknown>;
  };
}

export interface POItem {
  sku: string;
  qty: number;
}

export interface PackingCase {
  caseNo: number;
  type: 'Full Pallet' | 'Mixed Pallet' | 'Full Box' | 'Mixed Box' | 'Warp Pallet' | 'Loose Box';
  items: Array<{
    sku: string;
    name: string;
    qty: number;
    dims?: string;
  }>;
  dims: string;  // Package name (e.g., "47x66x68")
  totalWeight?: number;
  utilization?: number;
  note?: string;
}

export interface PackingPlanResult {
  po: string;
  cases: PackingCase[];
  summary: {
    totalPallets: number;
    totalBoxes: number;
    totalWarps: number;
    totalItems: number;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Utilization Buffer: Use 95% of package M3 to account for real-world packing inefficiency
 * (air gaps, padding, imperfect stacking)
 */
const UTILIZATION_BUFFER = 0.95;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get capacity limit from packing rules for a specific package
 * @returns capacity number, or Infinity if no rules defined
 */
function getPackageCapacity(
  spec: ProductSpec | undefined,
  packageName: string,
  packageCategory: 'Box' | 'Pallet'
): number {
  if (!spec?.packingRules) return Infinity;
  
  const rulesKey = packageCategory === 'Box' ? 'boxes' : 'pallets';
  const rules = spec.packingRules[rulesKey];
  
  if (!rules || typeof rules !== 'object') return Infinity;
  
  const ruleValue = (rules as Record<string, unknown>)[packageName];
  
  if (typeof ruleValue === 'number') return ruleValue;
  if (typeof ruleValue === 'object' && ruleValue && 'totalQty' in ruleValue) {
    return Number((ruleValue as { totalQty: number }).totalQty);
  }
  
  return Infinity;
}

/**
 * Get the MAX package (largest) that an SKU can use based on packing rules
 * @returns package name, or null if no rules defined
 */
function getMaxPackageForSKU(
  spec: ProductSpec | undefined,
  availablePackages: PackageDef[]
): string | null {
  if (!spec?.packingRules) return null;
  
  const allowedNames = new Set(availablePackages.map(p => p.name));
  let maxPkgName: string | null = null;
  let maxPkgM3 = 0;
  
  // Check boxes
  if (spec.packingRules.boxes && typeof spec.packingRules.boxes === 'object') {
    const boxRules = spec.packingRules.boxes as Record<string, unknown>;
    for (const name of Object.keys(boxRules)) {
      if (!allowedNames.has(name)) continue;
      const val = boxRules[name];
      const cap = typeof val === 'number' ? val : 
                  (typeof val === 'object' && val && 'totalQty' in val) ? Number((val as {totalQty: number}).totalQty) : 0;
      if (cap > 0) {
        const pkg = availablePackages.find(p => p.name === name);
        if (pkg && pkg.m3 > maxPkgM3) {
          maxPkgName = name;
          maxPkgM3 = pkg.m3;
        }
      }
    }
  }
  
  // Check pallets
  if (spec.packingRules.pallets && typeof spec.packingRules.pallets === 'object') {
    const palletRules = spec.packingRules.pallets as Record<string, unknown>;
    for (const name of Object.keys(palletRules)) {
      if (!allowedNames.has(name)) continue;
      const val = palletRules[name];
      const cap = typeof val === 'number' ? val : 
                  (typeof val === 'object' && val && 'totalQty' in val) ? Number((val as {totalQty: number}).totalQty) : 0;
      if (cap > 0) {
        const pkg = availablePackages.find(p => p.name === name);
        if (pkg && pkg.m3 > maxPkgM3) {
          maxPkgName = name;
          maxPkgM3 = pkg.m3;
        }
      }
    }
  }
  
  return maxPkgName;
}

/**
 * Find the best-fit (smallest) package that can hold the given quantity for a specific SKU
 * PRIORITY: Pallets first (prefer pallets over boxes), then boxes
 * Within each category: smallest that fits the quantity
 */
function findBestFitPackageForQty(
  spec: ProductSpec | undefined,
  qty: number,
  availablePackages: PackageDef[]
): { pkg: PackageDef; capacity: number } | null {
  if (!spec?.packingRules) return null;
  
  // Separate pallets and boxes, sort each by volume (small to large)
  const pallets = sortPackagesByVolume(availablePackages.filter(p => p.category === 'Pallet'));
  const boxes = sortPackagesByVolume(availablePackages.filter(p => p.category === 'Box'));
  
  // PRIORITY 1: Find best-fit pallet first
  for (const pkg of pallets) {
    const capacity = getPackageCapacity(spec, pkg.name, pkg.category);
    if (capacity !== Infinity && capacity >= qty) {
      return { pkg, capacity };
    }
  }
  
  // PRIORITY 2: If no pallet fits, try boxes
  for (const pkg of boxes) {
    const capacity = getPackageCapacity(spec, pkg.name, pkg.category);
    if (capacity !== Infinity && capacity >= qty) {
      return { pkg, capacity };
    }
  }
  
  // No perfect fit - return largest pallet with defined capacity
  for (const pkg of pallets.slice().reverse()) {
    const capacity = getPackageCapacity(spec, pkg.name, pkg.category);
    if (capacity !== Infinity && capacity > 0) {
      return { pkg, capacity };
    }
  }
  
  // Fallback: largest box
  for (const pkg of boxes.slice().reverse()) {
    const capacity = getPackageCapacity(spec, pkg.name, pkg.category);
    if (capacity !== Infinity && capacity > 0) {
      return { pkg, capacity };
    }
  }
  
  return null;
}

// ============================================================================
// MAIN PACKING FUNCTION
// ============================================================================

/**
 * Generate packing plan for a PO
 * 
 * @param po - PO number
 * @param items - List of SKU and quantities
 * @param specMap - Product specifications lookup
 * @param customerCode - Customer code for package filtering
 * @param useFullBinPacking - Use full 3D algorithm (slower but more accurate)
 */
export function generatePackingPlan(
  po: string,
  items: POItem[],
  specMap: Record<string, ProductSpec>,
  customerCode: string,
  useFullBinPacking: boolean = false
): PackingPlanResult {
  
  const cases: PackingCase[] = [];
  let globalCaseCounter = 1;
  
  // Get available packages for this customer
  const AVAILABLE_PACKAGES = getAvailablePackages(customerCode);
  
  if (AVAILABLE_PACKAGES.length === 0) {
    throw new Error(`No packages available for customer: ${customerCode}`);
  }
  
  // ========== STEP 1: PREPARE DATA ==========
  
  interface ProcessItem {
    item: POItem;
    spec?: ProductSpec;
    dimsKey: string;
    m3: number;
  }
  
  const processQueue: ProcessItem[] = items.map(item => {
    const spec = specMap[item.sku];
    
    if (!spec) {
      return {
        item,
        dimsKey: `UNKNOWN-${item.sku}`,
        m3: 0
      };
    }
    
    const dimsKey = `${spec.width}x${spec.length}x${spec.height}`;
    const m3 = spec.m3 || calculateM3({ 
      w: spec.width, 
      l: spec.length, 
      h: spec.height 
    });
    
    return { item, spec, dimsKey, m3 };
  });
  
  // ========== PRIORITY 0: WARP ITEMS ==========
  
  const warpItems = processQueue.filter(i => i.spec?.packingRules?.warp === true);
  
  warpItems.forEach(w => {
    for (let k = 0; k < w.item.qty; k++) {
      cases.push({
        caseNo: globalCaseCounter++,
        type: 'Warp Pallet',
        items: [{
          sku: w.item.sku,
          name: w.spec?.name || "Unknown",
          qty: 1,
          dims: w.dimsKey
        }],
        dims: w.dimsKey,
        note: "Warp Item (has built-in pallet)"
      });
    }
  });
  
  // Remove warp items from further processing
  const remainingQueue = processQueue.filter(
    i => i.spec?.packingRules?.warp !== true
  );
  
  // ========== STEP 2: DETERMINE BRANCHING ==========
  
  const uniqueDims = new Set(remainingQueue.map(i => i.dimsKey));
  const isMixedDims = uniqueDims.size > 1;
  

  
  if (isMixedDims && remainingQueue.length > 0) {
    // ========== DOMINANT LOGIC (Mixed Dimensions) ==========
    
    const result = packMixedItems(
      remainingQueue,
      AVAILABLE_PACKAGES,
      globalCaseCounter,
      useFullBinPacking
    );
    
    cases.push(...result.cases);
    globalCaseCounter = result.nextCaseNumber;
    
  } else if (remainingQueue.length > 0) {
    // ========== STANDARD LOGIC (Same Dimensions) ==========
    
    const result = packSameItems(
      remainingQueue,
      AVAILABLE_PACKAGES,
      globalCaseCounter
    );
    
    cases.push(...result.cases);
    globalCaseCounter = result.nextCaseNumber;
  }
  
  // ========== SORT CASES BY TYPE ==========
  
  const typeOrder: Record<string, number> = {
    'Full Pallet': 1,
    'Mixed Pallet': 2,
    'Full Box': 3,
    'Mixed Box': 4,
    'Warp Pallet': 5,
    'Loose Box': 6
  };
  
  cases.sort((a, b) => {
    const orderA = typeOrder[a.type] ?? 99;
    const orderB = typeOrder[b.type] ?? 99;
    return orderA - orderB;
  });
  
  // Re-number cases after sorting
  cases.forEach((c, idx) => { c.caseNo = idx + 1; });
  
  // ========== SUMMARY ==========
  
  const totalPallets = cases.filter(c => c.type.includes('Pallet') && c.type !== 'Warp Pallet').length;
  const totalBoxes = cases.filter(c => c.type.includes('Box')).length;
  const totalWarps = cases.filter(c => c.type === 'Warp Pallet').length;
  const totalItems = cases.reduce((sum, c) => 
    sum + c.items.reduce((s, i) => s + i.qty, 0), 0
  );
  
  return {
    po,
    cases,
    summary: { totalPallets, totalBoxes, totalWarps, totalItems }
  };
}

// ============================================================================
// MIXED ITEMS PACKING (Dominant Logic)
// ============================================================================

function packMixedItems(
  items: Array<{
    item: POItem;
    spec?: ProductSpec;
    dimsKey: string;
    m3: number;
  }>,
  availablePackages: PackageDef[],
  startingCaseNumber: number,
  useFullBinPacking: boolean
): { cases: PackingCase[]; nextCaseNumber: number } {
  
  const cases: PackingCase[] = [];
  let caseCounter = startingCaseNumber;
  
  // ========== STEP 1: GROUP ITEMS BY MAX PACKAGE ==========
  
  interface PoolItem {
    item: POItem;
    spec?: ProductSpec;
    dimsKey: string;
    m3: number;
    remaining: number;
    maxPackage: string | null;
  }
  
  const pool: PoolItem[] = items.map(i => ({
    ...i,
    remaining: i.item.qty,
    maxPackage: getMaxPackageForSKU(i.spec, availablePackages)
  }));
  
  // Group by maxPackage
  const groups = new Map<string, PoolItem[]>();
  for (const p of pool) {
    const key = p.maxPackage || 'NO_RULES';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  
  // ========== STEP 2: FIND DOMINANT GROUP ==========
  
  // Calculate total M3 for each group
  const groupVolumes = Array.from(groups.entries()).map(([pkg, items]) => ({
    pkg,
    items,
    totalM3: items.reduce((sum, i) => sum + (i.m3 * i.remaining), 0),
    totalQty: items.reduce((sum, i) => sum + i.remaining, 0)
  }));
  
  groupVolumes.sort((a, b) => b.totalM3 - a.totalM3);
  
  let iteration = 0;
  const MAX_ITERATIONS = 1000;
  
  // ========== STEP 3: PACK ITERATIVELY ==========
  
  while (pool.some(p => p.remaining > 0)) {
    if (iteration++ > MAX_ITERATIONS) {
      throw new Error("Pack Mixed Items: Max iterations exceeded");
    }
    
    // Find remaining items
    const activePool = pool.filter(p => p.remaining > 0);
    if (activePool.length === 0) break;
    
    // Re-calculate group totals for remaining items
    const currentGroups = new Map<string, PoolItem[]>();
    for (const p of activePool) {
      const key = p.maxPackage || 'NO_RULES';
      if (!currentGroups.has(key)) currentGroups.set(key, []);
      currentGroups.get(key)!.push(p);
    }
    
    // Find dominant group (largest total M3)
    let dominantGroup: { pkg: string; items: PoolItem[] } | null = null;
    let maxTotalM3 = 0;
    
    for (const [pkg, items] of currentGroups.entries()) {
      const totalM3 = items.reduce((sum, i) => sum + (i.m3 * i.remaining), 0);
      if (totalM3 > maxTotalM3) {
        maxTotalM3 = totalM3;
        dominantGroup = { pkg, items };
      }
    }
    
    if (!dominantGroup) break;
    
    // Get dominant item (largest M3) from dominant group for package selection
    const dominantItem = dominantGroup.items.reduce((max, curr) => 
      (curr.m3 * curr.remaining) > (max.m3 * max.remaining) ? curr : max
    );
    
    // ========== STEP 4: SELECT PACKAGE ==========
    
    // Calculate total remaining for dominant group
    const dominantGroupRemaining = dominantGroup.items.reduce((sum, p) => sum + p.remaining, 0);
    
    let selectedPkg: PackageDef | null = null;
    let selectedCapacity = Infinity;
    
    if (dominantGroup.pkg !== 'NO_RULES' && dominantItem.spec) {
      const maxPkg = availablePackages.find(p => p.name === dominantGroup!.pkg);
      
      if (maxPkg) {
        const maxPkgCapacity = getPackageCapacity(dominantItem.spec, maxPkg.name, maxPkg.category);
        
        // Only use max package if we can fill it (or close to it)
        if (dominantGroupRemaining >= maxPkgCapacity) {
          selectedPkg = maxPkg;
          selectedCapacity = maxPkgCapacity;
        } else {
          // Not enough to fill max package - find best-fit for this quantity
          const bestFit = findBestFitPackageForQty(dominantItem.spec, dominantGroupRemaining, availablePackages);
          if (bestFit) {
            selectedPkg = bestFit.pkg;
            selectedCapacity = bestFit.capacity;
          } else {
            // Fallback to max package if no better fit found
            selectedPkg = maxPkg;
            selectedCapacity = maxPkgCapacity;
          }
        }
      }
    }
    
    // Fallback: find best-fit package for remaining quantity
    if (!selectedPkg && dominantItem.spec) {
      const totalRemainingQty = activePool.reduce((sum, p) => sum + p.remaining, 0);
      const bestFit = findBestFitPackageForQty(dominantItem.spec, totalRemainingQty, availablePackages);
      if (bestFit) {
        selectedPkg = bestFit.pkg;
        selectedCapacity = bestFit.capacity;
      }
    }
    
    // Ultimate fallback: use largest available package
    if (!selectedPkg) {
      const sorted = sortPackagesByVolume(availablePackages);
      selectedPkg = sorted[sorted.length - 1];
      selectedCapacity = 1;
    }
    
    if (!selectedPkg) {
      throw new Error("No package available");
    }
    
    // ========== STEP 5: PACK ITEMS INTO CASE ==========
    
    const caseItems: PackingCase['items'] = [];
    let remainingCapacity = selectedCapacity;
    let caseM3Used = 0;
    const pkgM3 = selectedPkg.m3;
    
    // First: Pack items from dominant group
    for (const p of dominantGroup.items) {
      if (p.remaining > 0 && p.spec && remainingCapacity > 0) {
        // Check item's capacity in this package
        const itemCapacity = getPackageCapacity(p.spec, selectedPkg.name, selectedPkg.category);
        
        // How many can we take?
        const maxByCapacity = Math.min(p.remaining, remainingCapacity);
        const maxByM3 = Math.floor((pkgM3 - caseM3Used) / p.m3);
        const maxByItemRules = itemCapacity !== Infinity ? Math.min(p.remaining, itemCapacity) : p.remaining;
        
        const take = Math.max(0, Math.min(maxByCapacity, maxByM3, maxByItemRules));
        
        if (take > 0) {
          caseItems.push({
            sku: p.item.sku,
            name: p.spec.name,
            qty: take,
            dims: p.dimsKey
          });
          p.remaining -= take;
          remainingCapacity -= take;
          caseM3Used += (p.m3 * take);
        }
      }
    }
    
    // ========== STEP 6: TRY PARTIAL FILL FROM OTHER GROUPS ==========
    
    // Remaining space (by M3)
    const remainingM3 = pkgM3 - caseM3Used;
    
    // Try to fill from other groups if we have space
    if (remainingM3 > 0 && remainingCapacity > 0) {
      // Get items from other groups, sorted by M3 (small first to maximize count)
      const otherItems = activePool
        .filter(p => p.remaining > 0 && p.maxPackage !== dominantGroup!.pkg && p.spec)
        .sort((a, b) => a.m3 - b.m3);
      
      for (const p of otherItems) {
        if (p.remaining <= 0 || !p.spec || remainingCapacity <= 0) continue;
        
        // Check if this item CAN go into this package (by M3)
        if (p.m3 > remainingM3) continue;
        
        // How many can we fit by M3?
        const maxByM3 = Math.floor(remainingM3 / p.m3);
        const take = Math.min(p.remaining, maxByM3, remainingCapacity);
        
        if (take > 0) {
          caseItems.push({
            sku: p.item.sku,
            name: p.spec.name,
            qty: take,
            dims: p.dimsKey
          });
          p.remaining -= take;
          remainingCapacity -= take;
          caseM3Used += (p.m3 * take);
        }
      }
    }
    
    // ========== STEP 7: CREATE CASE ==========
    
    if (caseItems.length === 0) {
      // Force at least one item
      const p = activePool.find(x => x.remaining > 0 && x.spec);
      if (p && p.spec) {
        caseItems.push({
          sku: p.item.sku,
          name: p.spec.name,
          qty: 1,
          dims: p.dimsKey
        });
        p.remaining -= 1;
      }
    }
    
    // Calculate utilization
    const caseUtilization = (caseM3Used / pkgM3) * 100;
    
    // Determine correct type: 
    // "Full" = single SKU AND at full capacity
    // "Mixed" = multiple SKUs OR not at full capacity
    const uniqueSkus = new Set(caseItems.map(i => i.sku)).size;
    const totalQtyInCase = caseItems.reduce((sum, i) => sum + i.qty, 0);
    const isAtFullCapacity = totalQtyInCase >= selectedCapacity && selectedCapacity !== Infinity;
    
    let caseType: PackingCase['type'];
    
    if (selectedPkg.category === 'Pallet') {
      caseType = (uniqueSkus === 1 && isAtFullCapacity) ? 'Full Pallet' : 'Mixed Pallet';
    } else {
      caseType = (uniqueSkus === 1 && isAtFullCapacity) ? 'Full Box' : 'Mixed Box';
    }
    
    cases.push({
      caseNo: caseCounter++,
      type: caseType,
      items: caseItems,
      dims: selectedPkg.name,
      utilization: caseUtilization,
      note: `Best fit (${caseUtilization.toFixed(1)}% util)`
    });
  }
  
  // ========== STEP 8: HANDLE REMAINING (LAST BATCH) ==========
  
  // Find remaining items and group them together in best-fit package
  const remainingItems = pool.filter(p => p.remaining > 0 && p.spec);
  
  if (remainingItems.length > 0) {
    // Sort by M3 * remaining (descending) to find dominant
    remainingItems.sort((a, b) => (b.m3 * b.remaining) - (a.m3 * a.remaining));
    
    const dominantRemaining = remainingItems[0];
    
    // Lookup best-fit package for dominant's quantity
    const bestFit = findBestFitPackageForQty(dominantRemaining.spec!, dominantRemaining.remaining, availablePackages);
    
    if (bestFit) {
      const pkg = bestFit.pkg;
      const pkgCapacity = bestFit.capacity;
      const pkgM3 = pkg.m3;
      
      const caseItems: PackingCase['items'] = [];
      let usedCapacity = 0;
      let usedM3 = 0;
      
      // Pack dominant item first
      const dominantTake = Math.min(dominantRemaining.remaining, pkgCapacity);
      caseItems.push({
        sku: dominantRemaining.item.sku,
        name: dominantRemaining.spec!.name,
        qty: dominantTake,
        dims: dominantRemaining.dimsKey
      });
      usedCapacity = dominantTake;
      usedM3 = dominantTake * dominantRemaining.m3;
      dominantRemaining.remaining -= dominantTake;
      
      // Fill remaining space with other items
      for (const p of remainingItems.slice(1)) {
        if (p.remaining > 0 && p.spec) {
          // Check if item can fit in this package
          const itemCapInPkg = getPackageCapacity(p.spec, pkg.name, pkg.category);
          
          if (itemCapInPkg > 0 && itemCapInPkg !== Infinity) {
            // Calculate how many we can fit by M3
            const remainingM3 = pkgM3 - usedM3;
            const maxByM3 = Math.floor(remainingM3 / p.m3);
            
            const take = Math.min(p.remaining, maxByM3, itemCapInPkg);
            
            if (take > 0) {
              caseItems.push({
                sku: p.item.sku,
                name: p.spec.name,
                qty: take,
                dims: p.dimsKey
              });
              usedM3 += take * p.m3;
              p.remaining -= take;
            }
          }
        }
      }
      
      // Determine type
      const uniqueSkus = new Set(caseItems.map(i => i.sku)).size;
      const totalQty = caseItems.reduce((sum, i) => sum + i.qty, 0);
      const isAtFullCapacity = totalQty >= pkgCapacity;
      
      const caseType: PackingCase['type'] = pkg.category === 'Pallet'
        ? (uniqueSkus === 1 && isAtFullCapacity ? 'Full Pallet' : 'Mixed Pallet')
        : (uniqueSkus === 1 && isAtFullCapacity ? 'Full Box' : 'Mixed Box');
      
      cases.push({
        caseNo: caseCounter++,
        type: caseType,
        items: caseItems,
        dims: pkg.name,
        note: `Remainder best-fit (${totalQty}/${pkgCapacity})`
      });
    }
    
    // Handle any still-remaining items (shouldn't happen in normal cases)
    for (const p of pool) {
      if (p.remaining > 0 && p.spec) {
        const fallbackFit = findBestFitPackageForQty(p.spec, p.remaining, availablePackages);
        if (fallbackFit) {
          cases.push({
            caseNo: caseCounter++,
            type: fallbackFit.pkg.category === 'Pallet' ? 'Mixed Pallet' : 'Mixed Box',
            items: [{
              sku: p.item.sku,
              name: p.spec.name,
              qty: p.remaining,
              dims: p.dimsKey
            }],
            dims: fallbackFit.pkg.name,
            note: `Final remainder (${p.remaining} items)`
          });
          p.remaining = 0;
        }
      }
    }
  }
  
  return { cases, nextCaseNumber: caseCounter };
}

// ============================================================================
// SAME ITEMS PACKING (Standard Logic)
// ============================================================================

function packSameItems(
  items: Array<{
    item: POItem;
    spec?: ProductSpec;
    dimsKey: string;
    m3: number;
  }>,
  availablePackages: PackageDef[],
  startingCaseNumber: number
): { cases: PackingCase[]; nextCaseNumber: number } {
  
  const cases: PackingCase[] = [];
  let caseCounter = startingCaseNumber;
  
  const pool = items.map(i => ({
    ...i,
    remaining: i.item.qty
  }));
  
  let iteration = 0;
  const MAX_ITERATIONS = 1000;
  
  while (pool.some(p => p.remaining > 0)) {
    
    if (iteration++ > MAX_ITERATIONS) {
      throw new Error("Pack Same Items: Max iterations exceeded");
    }
    
    const currentTotal = pool.reduce((sum, p) => sum + p.remaining, 0);
    const sampleSpec = pool.find(p => p.spec)?.spec;
    
    if (!sampleSpec) {
      // No spec - pack as loose
      pool.forEach(p => {
        if (p.remaining > 0) {
          cases.push({
            caseNo: caseCounter++,
            type: 'Loose Box',
            items: [{
              sku: p.item.sku,
              name: "Unknown",
              qty: p.remaining
            }],
            dims: "Unknown",
            note: "Missing spec"
          });
          p.remaining = 0;
        }
      });
      continue;
    }
    
    // Find best package from packing rules
    interface PkgInfo {
      name: string;
      capacity: number;
      type: 'Box' | 'Pallet';
    }
    
    // Use an object to track matches so mutations are tracked inside closures
    const matchState = {
        bestPkg: null as PkgInfo | null,
        maxCapPkg: null as PkgInfo | null
    };
    
    const allowedPackageNames = new Set(availablePackages.map(p => p.name));
    
    const scanRules = (rules: unknown, type: 'Box' | 'Pallet') => {
      if (!rules || typeof rules !== 'object') return;
      
      Object.entries(rules as Record<string, unknown>).forEach(([key, val]) => {
        if (!allowedPackageNames.has(key)) return;
        
        let cap = 0;
        if (typeof val === 'number') cap = val;
        else if (typeof val === 'object' && val && typeof val === 'object' && 'totalQty' in val) {
          cap = Number((val as {totalQty: number}).totalQty);
        }
        
        if (cap > 0) {
          if (!matchState.maxCapPkg || cap > matchState.maxCapPkg.capacity) {
            matchState.maxCapPkg = { name: key, capacity: cap, type };
          }
          
          if (cap >= currentTotal) {
            if (!matchState.bestPkg || cap < matchState.bestPkg.capacity) {
              matchState.bestPkg = { name: key, capacity: cap, type };
            }
          }
        }
      });
    };
    
    if (sampleSpec.packingRules?.boxes) {
      scanRules(sampleSpec.packingRules.boxes, 'Box');
    }
    if (sampleSpec.packingRules?.pallets) {
      scanRules(sampleSpec.packingRules.pallets, 'Pallet');
    }
    
    const selectedPkg = matchState.bestPkg || matchState.maxCapPkg;
    
    if (!selectedPkg) {
      // No valid package
      cases.push({
        caseNo: caseCounter++,
        type: 'Loose Box',
        items: pool.filter(p => p.remaining > 0).map(p => ({
          sku: p.item.sku,
          name: p.spec?.name || "",
          qty: p.remaining
        })),
        dims: "No Rules",
        note: "No packing rules defined"
      });
      pool.forEach(p => p.remaining = 0);
      continue;
    }
    
    // Pack into selected package
    const isOverflow = currentTotal > selectedPkg.capacity;
    const fillAmt = isOverflow ? selectedPkg.capacity : currentTotal;
    

    
    const caseItems: PackingCase['items'] = [];
    let pendingFill = fillAmt;
    
    pool.sort((a, b) => b.remaining - a.remaining);
    
    for (const p of pool) {
      if (p.remaining > 0 && pendingFill > 0) {
        const take = Math.min(p.remaining, pendingFill);
        caseItems.push({
          sku: p.item.sku,
          name: p.spec?.name || "",
          qty: take,
          dims: p.dimsKey
        });
        p.remaining -= take;
        pendingFill -= take;
      }
    }
    
    // Determine type: Full only if packing at full capacity
    const isAtFullCapacity = fillAmt >= selectedPkg.capacity;
    
    cases.push({
      caseNo: caseCounter++,
      type: selectedPkg.type === 'Pallet' ? 
        (isAtFullCapacity ? 'Full Pallet' : 'Mixed Pallet') : 
        (isAtFullCapacity ? 'Full Box' : 'Mixed Box'),
      items: caseItems,
      dims: selectedPkg.name,
      note: isOverflow ? 
        `Max capacity split (${selectedPkg.capacity})` : 
        `Best fit (${selectedPkg.capacity})`
    });
  }
  
  return { cases, nextCaseNumber: caseCounter };
}

// ============================================================================
// EXPORT
// ============================================================================

const packingService = {
  generatePackingPlan
};

export default packingService;
