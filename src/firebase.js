// src/firebase.js

// Import Firebase functions you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your Firebase config object
const firebaseConfig = {
  apiKey: "AIzaSyDYIW0ZDpwgVD3gWXhpUpWLet4zr93DESk",
  authDomain: "work-hour-tracker-56ae1.firebaseapp.com",
  projectId: "work-hour-tracker-56ae1",
  storageBucket: "work-hour-tracker-56ae1.firebasestorage.app",
  messagingSenderId: "540225493834",
  appId: "1:540225493834:web:b37838a8e955c44f65bfb3",
  measurementId: "G-34W6ND5WCM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Export everything you need
export { app, analytics, db, auth };

