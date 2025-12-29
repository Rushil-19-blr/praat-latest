import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDve5AdeyTZJaxv8s3Um-gfTutsBhr8_Xo",
    authDomain: "awaaz-firebase.firebaseapp.com",
    projectId: "awaaz-firebase",
    storageBucket: "awaaz-firebase.firebasestorage.app",
    messagingSenderId: "1062048519198",
    appId: "1:1062048519198:web:05d39a8f2f9e7675f5ca0f",
    measurementId: "G-XFZWHQPJEJ"
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
