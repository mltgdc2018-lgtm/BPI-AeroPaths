import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// HOW TO USE:
// 1. Make sure you have your service-account.json in the root directory.
// 2. Run: node scripts/activate-user.mjs <your-email-address>

const emailToActivate = process.argv[2];

if (!emailToActivate) {
  console.error('❌ Please provide an email address as an argument.');
  console.log('Usage: node scripts/activate-user.mjs user@example.com');
  process.exit(1);
}

const serviceAccountPath = path.resolve('service-account.json');
let serviceAccount;

if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} else {
  console.log('💡 service-account.json not found, attempting to use .env.local...');
  // Simple .env.local parser
  const envPath = path.resolve('.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        env[match[1]] = value.replace(/\\n/g, '\n');
      }
    });

    if (env.FIREBASE_PROJECT_ID && env.FIREBASE_PRIVATE_KEY && env.FIREBASE_CLIENT_EMAIL) {
      serviceAccount = {
        projectId: env.FIREBASE_PROJECT_ID,
        privateKey: env.FIREBASE_PRIVATE_KEY,
        clientEmail: env.FIREBASE_CLIENT_EMAIL
      };
    }
  }
}

if (!serviceAccount) {
  console.error('❌ Credentials not found in service-account.json or .env.local');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function activateUser() {
  console.log(`🔍 Searching for user with email: ${emailToActivate}...`);
  
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', emailToActivate).get();

    if (snapshot.empty) {
      console.error('❌ No user found with that email. Have you signed up on the website first?');
      process.exit(1);
    }

    const userDoc = snapshot.docs[0];
    const uid = userDoc.id;

    console.log(`✅ Found user: ${userDoc.data().displayName} (UID: ${uid})`);
    console.log('⏳ Activating and granting Admin role...');

    await usersRef.doc(uid).update({
      status: 'active',
      role: 'admin',
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('🎉 SUCCESS! Your account has been unlocked and granted Admin privileges.');
    console.log('🚀 You can now refresh the website to access all features.');
  } catch (error) {
    console.error('❌ Error updating user:', error);
  } finally {
    process.exit(0);
  }
}

activateUser();
