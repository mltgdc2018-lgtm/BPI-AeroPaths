/**
 * 3D Bin Packing Algorithm
 * Purpose: Validate if items can physically fit into a package
 * 
 * Constraints:
 * - Items can rotate horizontally (W/L swap) but NOT vertically
 * - Height (H) must always be the vertical axis (no flipping upside down)
 * - Items cannot overlap
 * - All dimensions in CENTIMETERS (cm)
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface Dimensions3D {
  w: number;  // Width (cm)
  l: number;  // Length (cm)
  h: number;  // Height (cm)
}

export interface Item3D {
  sku: string;
  dims: Dimensions3D;
  qty: number;
  m3?: number;  // Volume (optional, for sorting)
}

export interface PackingSpace {
  x: number;
  y: number;
  z: number;
  w: number;
  l: number;
  h: number;
}

export interface PlacedItem {
  sku: string;
  position: { x: number; y: number; z: number };
  dims: Dimensions3D;  // Final orientation after rotation
  rotated: boolean;
}

export interface PackingResult {
  success: boolean;
  packed: PlacedItem[];
  utilizationPercent: number;
  message?: string;
}

// ============================================================================
// ROTATION LOGIC
// ============================================================================

/**
 * Get all valid rotations for an item
 * Rule: Height (H) must remain vertical (Z-axis)
 * Only W and L can be swapped
 */
export function getValidRotations(dims: Dimensions3D): Dimensions3D[] {
  return [
    { w: dims.w, l: dims.l, h: dims.h },  // Original
    { w: dims.l, l: dims.w, h: dims.h }   // Rotated 90° (W/L swap)
  ];
}

/**
 * Check if item can fit in space with any rotation
 */
export function canItemFitInSpace(
  item: Dimensions3D,
  space: PackingSpace
): { fits: boolean; orientation: Dimensions3D | null } {
  
  const rotations = getValidRotations(item);
  
  for (const rot of rotations) {
    if (rot.w <= space.w && rot.l <= space.l && rot.h <= space.h) {
      return { fits: true, orientation: rot };
    }
  }
  
  return { fits: false, orientation: null };
}

// ============================================================================
// SIMPLE VALIDATION (Quick Check)
// ============================================================================

/**
 * Simple check: Can all items fit based on dimensions alone?
 * Does NOT consider actual placement, just max dimensions
 * Use this for quick pre-filtering
 */
export function simplePhysicalCheck(
  items: Item3D[],
  containerInner: Dimensions3D
): { canFit: boolean; problematicItems: string[] } {
  
  const problematic: string[] = [];
  
  for (const item of items) {
    const rotations = getValidRotations(item.dims);
    const canFit = rotations.some(rot => 
      rot.w <= containerInner.w &&
      rot.l <= containerInner.l &&
      rot.h <= containerInner.h
    );
    
    if (!canFit) {
      problematic.push(`${item.sku} (${item.dims.w}x${item.dims.l}x${item.dims.h})`);
    }
  }
  
  return {
    canFit: problematic.length === 0,
    problematicItems: problematic
  };
}

/**
 * Volume check: Do items fit by total volume?
 */
export function volumeCheck(
  items: Item3D[],
  containerM3: number
): { fits: boolean; totalM3: number; utilizationPercent: number } {
  
  const totalM3 = items.reduce((sum, item) => {
    const itemM3 = (item.dims.w * item.dims.l * item.dims.h) / 1000000;
    return sum + (itemM3 * item.qty);
  }, 0);
  
  const utilization = (totalM3 / containerM3) * 100;
  
  return {
    fits: totalM3 <= containerM3,
    totalM3,
    utilizationPercent: utilization
  };
}

// ============================================================================
// 3D BIN PACKING ALGORITHM
// ============================================================================

/**
 * Guillotine Algorithm with First-Fit Decreasing (FFD)
 * 
 * Steps:
 * 1. Sort items by volume (largest first)
 * 2. For each item, find first space that fits
 * 3. Place item and split remaining space
 * 4. Continue until all items placed or no space
 */
export function pack3D(
  items: Item3D[],
  containerInner: Dimensions3D,
  containerM3: number
): PackingResult {
  
  // Step 0: Pre-checks
  const simpleCheck = simplePhysicalCheck(items, containerInner);
  if (!simpleCheck.canFit) {
    return {
      success: false,
      packed: [],
      utilizationPercent: 0,
      message: `Items too large: ${simpleCheck.problematicItems.join(', ')}`
    };
  }
  
  const volCheck = volumeCheck(items, containerM3);
  if (!volCheck.fits) {
    return {
      success: false,
      packed: [],
      utilizationPercent: volCheck.utilizationPercent,
      message: `Volume exceeded: ${volCheck.totalM3.toFixed(3)} > ${containerM3.toFixed(3)} m³`
    };
  }
  
  // Step 1: Flatten items (expand quantities)
  const expandedItems: Item3D[] = [];
  items.forEach(item => {
    for (let i = 0; i < item.qty; i++) {
      expandedItems.push({
        ...item,
        qty: 1,
        m3: (item.dims.w * item.dims.l * item.dims.h) / 1000000
      });
    }
  });
  
  // Step 2: Sort by volume (largest first) - First-Fit Decreasing
  expandedItems.sort((a, b) => (b.m3 || 0) - (a.m3 || 0));
  
  // Step 3: Initialize packing state
  const spaces: PackingSpace[] = [{
    x: 0,
    y: 0,
    z: 0,
    w: containerInner.w,
    l: containerInner.l,
    h: containerInner.h
  }];
  
  const packed: PlacedItem[] = [];
  
  // Step 4: Pack each item
  for (const item of expandedItems) {
    let placed = false;
    
    // Try to fit in existing spaces
    for (let i = 0; i < spaces.length; i++) {
      const space = spaces[i];
      const fitResult = canItemFitInSpace(item.dims, space);
      
      if (fitResult.fits && fitResult.orientation) {
        // Place item
        packed.push({
          sku: item.sku,
          position: { x: space.x, y: space.y, z: space.z },
          dims: fitResult.orientation,
          rotated: fitResult.orientation.w !== item.dims.w
        });
        
        // Split space (Guillotine cut)
        const newSpaces = splitSpace(space, fitResult.orientation);
        
        // Remove used space and add new spaces
        spaces.splice(i, 1);
        spaces.push(...newSpaces);
        
        // Merge overlapping spaces (optional optimization)
        // mergeSpaces(spaces);
        
        placed = true;
        break;
      }
    }
    
    if (!placed) {
      // Could not fit this item
      return {
        success: false,
        packed,
        utilizationPercent: (packed.length / expandedItems.length) * 100,
        message: `Could not fit item: ${item.sku} (${item.dims.w}x${item.dims.l}x${item.dims.h})`
      };
    }
  }
  
  // Success!
  const usedVolume = packed.reduce((sum, p) => {
    return sum + (p.dims.w * p.dims.l * p.dims.h) / 1000000;
  }, 0);
  
  return {
    success: true,
    packed,
    utilizationPercent: (usedVolume / containerM3) * 100,
    message: `All ${packed.length} items packed successfully`
  };
}

/**
 * Split space after placing an item (Guillotine Algorithm)
 * Creates new spaces from remaining area
 */
function splitSpace(
  space: PackingSpace,
  placedDims: Dimensions3D
): PackingSpace[] {
  
  const newSpaces: PackingSpace[] = [];
  
  // Right space (along X-axis)
  if (space.w > placedDims.w) {
    newSpaces.push({
      x: space.x + placedDims.w,
      y: space.y,
      z: space.z,
      w: space.w - placedDims.w,
      l: space.l,
      h: space.h
    });
  }
  
  // Front space (along Y-axis)
  if (space.l > placedDims.l) {
    newSpaces.push({
      x: space.x,
      y: space.y + placedDims.l,
      z: space.z,
      w: placedDims.w,  // Only the width of the placed item
      l: space.l - placedDims.l,
      h: space.h
    });
  }
  
  // Top space (along Z-axis)
  if (space.h > placedDims.h) {
    newSpaces.push({
      x: space.x,
      y: space.y,
      z: space.z + placedDims.h,
      w: placedDims.w,
      l: placedDims.l,
      h: space.h - placedDims.h
    });
  }
  
  return newSpaces;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate total volume of items
 */
export function calculateTotalVolume(items: Item3D[]): number {
  return items.reduce((sum, item) => {
    const m3 = (item.dims.w * item.dims.l * item.dims.h) / 1000000;
    return sum + (m3 * item.qty);
  }, 0);
}

/**
 * Format dimensions as string
 */
export function formatDimensions(dims: Dimensions3D): string {
  return `${dims.w}x${dims.l}x${dims.h}`;
}

/**
 * Print packing result (for debugging)
 */
export function printPackingResult(result: PackingResult): void {
  console.log('='.repeat(60));
  console.log(`Packing Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Utilization: ${result.utilizationPercent.toFixed(1)}%`);
  if (result.message) console.log(`Message: ${result.message}`);
  
  if (result.packed.length > 0) {
    console.log(`
Packed Items: ${result.packed.length}`);
    result.packed.forEach((item, idx) => {
      console.log(
        `  ${idx + 1}. ${item.sku} at (${item.position.x}, ${item.position.y}, ${item.position.z}) ` +
        `- ${formatDimensions(item.dims)}${item.rotated ? ' [ROTATED]' : ''}`
      );
    });
  }
  console.log('='.repeat(60));
}

// ============================================================================
// HYBRID APPROACH (Recommended)
// ============================================================================

/**
 * Hybrid packing validation
 * 1. Quick checks first (volume + simple dimension check)
 * 2. Full 3D algorithm only if needed
 * 
 * @param useFullAlgorithm - Set to false for quick mode, true for accurate mode
 */
export function validatePacking(
  items: Item3D[],
  containerInner: Dimensions3D,
  containerM3: number,
  useFullAlgorithm: boolean = false
): PackingResult {
  
  // Quick Mode: Just check volume and max dimensions
  if (!useFullAlgorithm) {
    const volCheck = volumeCheck(items, containerM3);
    const simpleCheck = simplePhysicalCheck(items, containerInner);
    
    if (!volCheck.fits) {
      return {
        success: false,
        packed: [],
        utilizationPercent: volCheck.utilizationPercent,
        message: `Volume exceeded (Quick Check)`
      };
    }
    
    if (!simpleCheck.canFit) {
      return {
        success: false,
        packed: [],
        utilizationPercent: 0,
        message: `Physical constraint failed (Quick Check): ${simpleCheck.problematicItems[0]}`
      };
    }
    
    // Assume it fits (with utilization estimate)
    return {
      success: true,
      packed: [],  // Not actually packed in quick mode
      utilizationPercent: volCheck.utilizationPercent,
      message: `Passes quick checks (estimated ${volCheck.utilizationPercent.toFixed(1)}% utilization)`
    };
  }
  
  // Full Algorithm: Actual 3D bin packing
  return pack3D(items, containerInner, containerM3);
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

const binPacking3DApi = {
  pack3D,
  validatePacking,
  simplePhysicalCheck,
  volumeCheck,
  getValidRotations,
  canItemFitInSpace,
  calculateTotalVolume,
  formatDimensions,
  printPackingResult
};

export default binPacking3DApi;
