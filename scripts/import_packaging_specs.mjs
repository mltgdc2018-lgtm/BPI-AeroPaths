import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Handle newlines in private key
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error("Missing Firebase Admin credentials in .env.local");
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Helper to convert string to number if possible
const parseNumber = (value) => {
  if (value === '' || value === undefined || value === null) return 0;
  const num = Number(value);
  return isNaN(num) ? value : num;
};

// Helper to handle dates
const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : Timestamp.fromDate(date);
};

const BATCH_SIZE = 400;

async function importData() {
  console.log("Starting CSV import for packaging specs...");
  const results = [];
  
  const csvPath = path.join(process.cwd(), 'public', 'files', 'packaging_specs.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve())
      .on('error', (error) => reject(error));
  });

  console.log(`Parsed ${results.length} rows from CSV.`);

  let batch = db.batch();
  let count = 0;
  let totalImported = 0;

  for (const row of results) {
    const docId = row.__id;
    if (!docId) {
      console.warn("Row missing __id, skipping...");
      continue;
    }

    const docRef = db.collection('packaging_specs').doc(docId);
    
    // Construct the document data
    const docData = {};
    const packingRules = {
      boxes: {},
      pallets: {},
      rtn: {}
    };

    for (const [key, value] of Object.entries(row)) {
      // Exclude metadata columns
      if (['__id', '__path'].includes(key)) continue;

      if (key.startsWith('packingRules.')) {
        const parts = key.split('.');
        if (parts.length === 2) {
          // packingRules.warp
          if (parts[1] === 'warp') {
             packingRules.warp = value.toLowerCase() === 'true';
          } else {
             packingRules[parts[1]] = parseNumber(value);
          }
        } else if (parts.length === 3) {
          // packingRules.rtn.totalQty
          const [_, cat, field] = parts;
          if (!packingRules[cat]) packingRules[cat] = {};
          packingRules[cat][field] = parseNumber(value);
        } else if (parts.length === 4) {
          // packingRules.boxes.47x66x68.perLayer
          const [_, cat, subcat, field] = parts;
          if (!packingRules[cat]) packingRules[cat] = {};
          if (!packingRules[cat][subcat]) packingRules[cat][subcat] = {};
          packingRules[cat][subcat][field] = parseNumber(value);
        }
      } else if (['updatedAt', 'lastUpdated', '__createTime', '__updateTime'].includes(key)) {
        docData[key] = parseDate(value);
      } else if (['sideBoxWeight', 'productType', 'name', 'sku', 'category', 'unit'].includes(key)) {
        docData[key] = value;
      } else {
        docData[key] = parseNumber(value);
      }
    }
    
    docData.packingRules = packingRules;

    batch.set(docRef, docData, { merge: true });
    count++;
    totalImported++;

    if (count >= BATCH_SIZE) {
      await batch.commit();
      console.log(`Committed ${totalImported} documents...`);
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`Committed final ${count} documents...`);
  }

  console.log(`Successfully imported ${totalImported} total documents.`);
}

importData().catch(console.error);
