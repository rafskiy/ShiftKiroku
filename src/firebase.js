import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDYIW0ZDpwgVD3gWXhpUpWLet4zr93DESk",
  authDomain: "work-hour-tracker-56ae1.firebaseapp.com",
  projectId: "work-hour-tracker-56ae1",
  storageBucket: "work-hour-tracker-56ae1.firebasestorage.app",
  messagingSenderId: "540225493834",
  appId: "1:540225493834:web:b37838a8e955c44f65bfb3",
  measurementId: "G-34W6ND5WCM"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };

