const fs = require('fs');
const path = require('path');

// Helper to parse CSV line strictly (handling commas in quotes if any, though likely not needed for this simple data)
// Simple split by comma is enough if no quoted commas. 
// Given the data preview, simple split seems mostly fine, but let's be safer.
function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, index) => {
            row[h] = values[index] || '';
        });
        data.push(row);
    }
    return data;
}

// Convert object to CSV string
function toCSV(headers, data) {
    const headerLine = headers.join(',');
    const rows = data.map(row => {
        return headers.map(h => {
            let val = row[h] || '';
            if (val.toString().includes(',')) val = `"${val}"`;
            return val;
        }).join(',');
    });
    return [headerLine, ...rows].join('\n');
}

const file1Path = 'public/files/Data Inverter Main.csv';
const file2Path = 'public/files/Packing Plan - Main_Data.csv';

const file1Content = fs.readFileSync(file1Path, 'utf-8');
const file2Content = fs.readFileSync(file2Path, 'utf-8');

const specData = parseCSV(file1Content); // Key: Item
const ruleData = parseCSV(file2Content); // Key: Item

// Map data by Item
const mergedMap = new Map();

// Process Specs
specData.forEach(row => {
    const sku = row['Item'];
    if (!sku) return;
    
    if (!mergedMap.has(sku)) mergedMap.set(sku, {});
    const obj = mergedMap.get(sku);
    
    // Map Fields
    obj['SKU (Item)'] = sku;
    obj['Name'] = `Inverter-${sku}`; // Auto-gen rule
    obj['Category'] = 'Inverters';
    obj['Width (cm)'] = row['W'] || '';
    obj['Length (cm)'] = row['L'] || '';
    obj['Height (cm)'] = row['H'] || '';
    obj['Net Weight (kg)'] = row['NW.'] || '';
    obj['Gross Weight (kg)'] = row['GW'] || row['GW.'] || ''; // Handle potential dot
    obj['CBM'] = row['CBM.'] || row['CBM'] || '';
    obj['Product Type'] = row['Unit Pallet Type'] || '';
    obj['Stacking Limit'] = row['Limitation of stacking (Qty)'] || '';
    obj['Side Box Weight'] = row['Weight Side Box'] || '';
});

// Process Rules
ruleData.forEach(row => {
    const sku = row['Item'];
    if (!sku) return;

    if (!mergedMap.has(sku)) {
        // Item exists in Rules but not Specs -> Create entry
        mergedMap.set(sku, {
            'SKU (Item)': sku,
            'Name': `Inverter-${sku}`,
            'Category': 'Inverters',
            // Leave dimensions blank
        });
    }
    const obj = mergedMap.get(sku);

    // Map Rules
    // Check headers dynamically or hardcode known columns?
    // Based on user files, we have specific columns.
    
    const sizes = ['42x46x68', '47x66x68', '57x64x84', '68x74x86', '70x100x90'];
    sizes.forEach(size => {
        const total = row[size];
        const layers = row[`${size} Layer`];
        
        if (total && total !== 'n') {
            obj[`Box_${size}_Total`] = total;
            obj[`Box_${size}_Layers`] = layers || '';
            // Basic PerLayer calcluation if possible
            if (total && layers && !isNaN(total) && !isNaN(layers) && Number(layers) > 0) {
                 obj[`Box_${size}_PerLayer`] = (Number(total) / Number(layers)).toFixed(1).replace(/\.0$/, '');
            }
        }
    });

    const pallets = ['80x120x65', '80x120x90', '80x120x115', '110x110x65', '110x110x90', '110x110x115'];
    pallets.forEach(size => {
         const total = row[size];
         const layers = row[`${size} Layer`];
         if (total && total !== 'n') {
             obj[`Pallet_${size}_Total`] = total;
             obj[`Pallet_${size}_Layers`] = layers || '';
             if (total && layers && !isNaN(total) && !isNaN(layers) && Number(layers) > 0) {
                 obj[`Pallet_${size}_PerLayer`] = (Number(total) / Number(layers)).toFixed(1).replace(/\.0$/, '');
            }
         }
    });

    // RTN
    if (row['RTN'] && row['RTN'] !== 'n') {
        obj['RTN_Total'] = row['RTN'];
        obj['RTN_Layers'] = row['RTN Layer'] || '';
         if (row['RTN'] && row['RTN Layer'] && !isNaN(row['RTN']) && !isNaN(row['RTN Layer']) && Number(row['RTN Layer']) > 0) {
             obj['RTN_PerLayer'] = (Number(row['RTN']) / Number(row['RTN Layer'])).toFixed(1).replace(/\.0$/, '');
        }
    }

    // Warp
    if (row['Wrap'] && row['Wrap'] !== 'n') {
        obj['Warp_Required'] = 'TRUE';
    } else {
        obj['Warp_Required'] = 'FALSE';
    }
});

// Final Headers List (Ordered)
const finalHeaders = [
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

const outputData = Array.from(mergedMap.values());
const csvOutput = toCSV(finalHeaders, outputData);

fs.writeFileSync('merged_packaging_data.csv', csvOutput);
console.log(`Merged ${outputData.length} items. Missing items handled.`);
