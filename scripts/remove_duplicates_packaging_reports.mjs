import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function removeDuplicates() {
  console.log("Checking for duplicate packaging reports...");
  const colRef = db.collection('packaging_reports');
  const snapshot = await colRef.get();
  console.log(`Fetched ${snapshot.size} documents.`);

  const seen = new Set();
  const duplicates = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    // Assuming duplicates have the exact same date, shipment, product, siQty, qty
    const keyParts = [
      data.date ? (data.date.toDate ? data.date.toDate().toISOString() : data.date) : '',
      data.shipment || '',
      data.product || '',
      data.siQty || '',
      data.qty || ''
    ];
    
    // Create a unique hash/string
    const uniqueKey = keyParts.join('|');

    if (seen.has(uniqueKey)) {
      duplicates.push(doc.id);
    } else {
      seen.add(uniqueKey);
    }
  });

  console.log(`Found ${duplicates.length} duplicates.`);

  if (duplicates.length === 0) {
    console.log("No duplicates to remove.");
    return;
  }

  console.log("Deleting duplicates in batches...");
  let batch = db.batch();
  let count = 0;
  let totalDeleted = 0;

  for (const docId of duplicates) {
    batch.delete(colRef.doc(docId));
    count++;
    totalDeleted++;

    if (count >= 400) {
      await batch.commit();
      console.log(`Deleted ${totalDeleted} documents...`);
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`Deleted final ${count} documents...`);
  }

  console.log(`Successfully removed ${totalDeleted} duplicate documents.`);
}

removeDuplicates().catch(console.error);
