// src/config/firebase.js

'use strict';

const path = require('path');
const { initializeApp, getApps, getApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// ── Initialise once (safe for hot-reload / serverless) ────────────────────────
function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApp(); // already initialised — return existing instance
  }

  let serviceAccount;

  // Option A: JSON string in environment variable (Vercel / production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      console.log('✅ Firebase: credential loaded from FIREBASE_SERVICE_ACCOUNT_JSON');
    } catch (e) {
      throw new Error(
        `Firebase: failed to parse FIREBASE_SERVICE_ACCOUNT_JSON — ${e.message}\n` +
        `Make sure "private_key_id" field name is correct and the JSON is not hand-edited.`
      );
    }
  }
  // Option B: File path (local development)
  else {
    const filePath = path.resolve(
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json'
    );
    try {
      serviceAccount = require(filePath);
      console.log(`✅ Firebase: credential loaded from file → ${filePath}`);
    } catch (e) {
      throw new Error(
        `Firebase: failed to load service account from ${filePath}\n` +
        `Make sure the file exists and is valid JSON.`
      );
    }
  }

  return initializeApp({ credential: cert(serviceAccount) });
}

const firebaseApp = getFirebaseApp();

// Export the auth instance — this is what auth.service.js needs
const firebaseAuth = getAuth(firebaseApp);

module.exports = { firebaseApp, firebaseAuth };