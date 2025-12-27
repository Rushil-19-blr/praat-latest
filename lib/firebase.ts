import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDve5AdeyTZJaxv8s3Um-gfTutsBhr8_Xo",
    authDomain: "awaaz-firebase.firebaseapp.com",
    projectId: "awaaz-firebase",
    storageBucket: "awaaz-firebase.firebasestorage.app",
    messagingSenderId: "1062048519198",
    appId: "1:1062048519198:web:05d39a8f2f9e7675f5ca0f",
    measurementId: "G-XFZWHQPJEJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);

export default app;
