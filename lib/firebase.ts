import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Diagnostic logging
if (!firebaseConfig.apiKey) {
    console.error("FIREBASE ERROR: Missing VITE_FIREBASE_API_KEY. Check your .env.local file.");
}
if (!firebaseConfig.projectId) {
    console.error("FIREBASE ERROR: Missing VITE_FIREBASE_PROJECT_ID. Check your .env.local file.");
}
if (!firebaseConfig.authDomain) {
    console.warn("FIREBASE WARNING: Missing VITE_FIREBASE_AUTH_DOMAIN.");
}

// Log successful config (redacted for security)
console.log('[Firebase] Config loaded:', {
    hasApiKey: !!firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId || 'MISSING',
    authDomain: firebaseConfig.authDomain || 'MISSING',
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

export default app;
