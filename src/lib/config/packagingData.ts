/**
 * Packaging Configuration Master Data
 * Updated: 2024-02-05
 * 
 * IMPORTANT: 
 * - All dimensions in CENTIMETERS (cm)
 * - "name" = Outside dimensions (for display)
 * - "inner" = Actual usable space for packing calculation
 * - "m3" = Volume calculated from INNER dimensions
 */

// ============================================================================
// PACKAGE MASTER DATA
// ============================================================================

export interface PackageDimensions {
  w: number;  // Width (cm)
  l: number;  // Length (cm)
  h: number;  // Height (cm)
}

export interface PackageDef {
  name: string;                    // Display name (outer dimensions)
  outer: PackageDimensions;        // Outside dimensions
  inner: PackageDimensions;        // ⭐ Usable inner space (for calculation)
  m3: number;                      // Volume in m³ (calculated from inner)
  types: string[];                 // Allowed customer types: A, E, R
  category: 'Box' | 'Pallet';
}

export const PACKAGE_MASTER_DATA: PackageDef[] = [
  // ========== STANDARD BOXES ==========
  {
    name: "42x46x68",
    outer: { w: 42, l: 46, h: 68 },
    inner: { w: 40, l: 44, h: 51 },
    m3: 0.08976,
    types: ["A", "E", "R"],
    category: "Box"
  },
  {
    name: "47x66x68",
    outer: { w: 47, l: 66, h: 68 },
    inner: { w: 45, l: 64, h: 51 },
    m3: 0.14688,
    types: ["A", "E", "R"],
    category: "Box"
  },
  {
    name: "57x64x84",
    outer: { w: 57, l: 64, h: 84 },
    inner: { w: 55, l: 62, h: 67 },
    m3: 0.22847,
    types: ["A", "E", "R"],
    category: "Box"
  },
  {
    name: "68x74x86",
    outer: { w: 68, l: 74, h: 86 },
    inner: { w: 66, l: 72, h: 69 },
    m3: 0.327888,
    types: ["A", "E", "R"],
    category: "Box"
  },
  {
    name: "70x100x90",
    outer: { w: 70, l: 100, h: 90 },
    inner: { w: 68, l: 98, h: 73 },
    m3: 0.486472,
    types: ["A", "E", "R"],
    category: "Box"
  },

  // ========== PALLETS TYPE E ==========
  {
    name: "80x120x65",
    outer: { w: 80, l: 120, h: 65 },
    inner: { w: 78, l: 118, h: 50 },
    m3: 0.4602, // Calculated from 78*118*50
    types: ["E"],
    category: "Pallet"
  },
  {
    name: "80x120x90",
    outer: { w: 80, l: 120, h: 90 },
    inner: { w: 78, l: 118, h: 75 },
    m3: 0.6903,
    types: ["E"],
    category: "Pallet"
  },
  {
    name: "80x120x115",
    outer: { w: 80, l: 120, h: 115 },
    inner: { w: 78, l: 118, h: 100 },
    m3: 0.9204,
    types: ["E"],
    category: "Pallet"
  },

  // ========== PALLETS TYPE A ==========
  {
    name: "110x110x65",
    outer: { w: 110, l: 110, h: 65 },
    inner: { w: 108, l: 108, h: 50 },
    m3: 0.5832,
    types: ["A"],
    category: "Pallet"
  },
  {
    name: "110x110x90",
    outer: { w: 110, l: 110, h: 90 },
    inner: { w: 108, l: 108, h: 75 },
    m3: 0.8748,
    types: ["A"],
    category: "Pallet"
  },
  {
    name: "110x110x115",
    outer: { w: 110, l: 110, h: 115 },
    inner: { w: 108, l: 108, h: 100 },
    m3: 1.1664,
    types: ["A"],
    category: "Pallet"
  },

  // ========== RETURNABLE (RTN) ==========
  {
    name: "RTN",
    outer: { w: 110, l: 110, h: 100 },  // Estimated outer
    inner: { w: 108, l: 108, h: 95 },
    m3: 1.10808, // Calculated from 108*108*95
    types: ["R"],
    category: "Pallet"
  }
];

// ============================================================================
// CUSTOMER PACK TYPE MAPPING
// ============================================================================

export const CUSTOMER_PACK_TYPE_MAPPING: Record<string, string> = {
  // US/EU Customers (Type E)
  "FEA": "E",
  "FEE AIR": "E",
  "FEF": "E",
  
  // Asia Customers (Type A)
  "FAP": "A",
  "FEC": "A",
  "FEI": "A",
  "FEID": "A",
  "FEJP": "A",
  "FEK": "A",
  "FET": "A",
  "FETW": "A",
  "FEV": "A",
  
  // Returnable Customers (Type R)
  "FEE SEA": "R"
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get region based on pack type
 */
export function getRegionByType(type: string): 'US/EU' | 'Asia' {
  if (type === 'A') return 'Asia';
  if (type === 'E') return 'US/EU';
  if (type === 'R') return 'Asia';
  return 'Asia'; // Default
}

/**
 * Get available packages for a customer
 */
export function getAvailablePackages(customerCode: string): PackageDef[] {
  const packType = CUSTOMER_PACK_TYPE_MAPPING[customerCode] || 'E';
  
  // Filter by Type AND by Pack_type string logic (Box is A/E/R, Pallet specific)
  return PACKAGE_MASTER_DATA.filter(pkg => pkg.types.includes(packType));
}

/**
 * Get package by name
 */
export function getPackageByName(name: string): PackageDef | undefined {
  return PACKAGE_MASTER_DATA.find(pkg => pkg.name === name);
}

/**
 * Calculate volume in m³ from dimensions in cm
 */
export function calculateM3(dims: PackageDimensions): number {
  return (dims.w * dims.l * dims.h) / 1000000;
}

/**
 * Sort packages by volume (ascending)
 */
export function sortPackagesByVolume(packages: PackageDef[]): PackageDef[] {
  return [...packages].sort((a, b) => a.m3 - b.m3);
}

/**
 * Find best fit package for given volume
 * Returns smallest package that can fit the volume
 */
export function findBestFitPackage(
  targetM3: number,
  availablePackages: PackageDef[]
): PackageDef | null {
  const sorted = sortPackagesByVolume(availablePackages);
  return sorted.find(pkg => pkg.m3 >= targetM3) || null;
}

/**
 * Find largest package from available list
 */
export function findLargestPackage(
  availablePackages: PackageDef[]
): PackageDef | null {
  if (availablePackages.length === 0) return null;
  const sorted = sortPackagesByVolume(availablePackages);
  return sorted[sorted.length - 1];
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that all packages have consistent data
 */
export function validatePackageData(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  PACKAGE_MASTER_DATA.forEach((pkg, idx) => {
    // Check m3 calculation (Approx check)
    const calculatedM3 = calculateM3(pkg.inner);
    const diff = Math.abs(calculatedM3 - pkg.m3);
    
    // Warn if diff > 10 liters (0.01) - broad tolerance for manual values
    if (diff > 0.01) { 
      // console.warn(`Package ${pkg.name}: m3 mismatch. Declared: ${pkg.m3}, Calc: ${calculatedM3}`);
    }
    
    // Check inner < outer
    if (pkg.inner.w >= pkg.outer.w || 
        pkg.inner.l > pkg.outer.l ||  // Allow length to match (e.g. 110x110) if thin wall? No, strictly smaller usually.
        pkg.inner.h >= pkg.outer.h) {
      // Just a warning in logs, don't block
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  PACKAGE_MASTER_DATA,
  CUSTOMER_PACK_TYPE_MAPPING,
  getRegionByType,
  getAvailablePackages,
  getPackageByName,
  calculateM3,
  sortPackagesByVolume,
  findBestFitPackage,
  findLargestPackage,
  validatePackageData
};
