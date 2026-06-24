const admin = require('firebase-admin');
const path = require('path');

let firebaseApp;

try {
  firebaseApp = admin.app();
} catch (error) {
  try {
    let credentialData;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      credentialData = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else {
      const filePath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json');
      credentialData = require(filePath);
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential ? admin.credential.cert(credentialData) : require('firebase-admin/app').cert(credentialData)
    });

    console.log('✅ Firebase Admin SDK Initialized Successfully.');
  } catch (initError) {
    try {
      const { initializeApp, cert } = require('firebase-admin/app');
      let credentialData = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
        : require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json'));

      firebaseApp = initializeApp({
        credential: cert(credentialData)
      });
      console.log('✅ Firebase Admin SDK Initialized Successfully via Native Module.');
    } catch (nativeError) {
      console.error('❌ Firebase initialization completely failed:', nativeError.message);
    }
  }
}

module.exports = admin;