import React, { createContext, useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    // Load from localStorage first (fallback)
    const saved = localStorage.getItem("darkMode");
    return saved === "true";
  });
  const [user, setUser] = useState(null);

  // Save darkMode in localStorage anytime it changes
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        // User logged in: load darkMode from Firestore user settings
        try {
          const docRef = doc(db, "users", u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (typeof data.darkMode === "boolean") {
              setDarkMode(data.darkMode);
              localStorage.setItem("darkMode", data.darkMode); // keep localStorage sync
            }
          }
        } catch (error) {
          console.error("Failed to load user theme settings:", error);
        }
      } else {
        // User logged out, keep darkMode from localStorage fallback
        const saved = localStorage.getItem("darkMode");
        setDarkMode(saved === "true");
      }
    });

    return () => unsubscribe();
  }, []);

  // When darkMode changes and user is logged in, update Firestore
  useEffect(() => {
    if (user) {
      const saveDarkMode = async () => {
        try {
          await setDoc(
            doc(db, "users", user.uid),
            { darkMode },
            { merge: true }
          );
        } catch (error) {
          console.error("Failed to save dark mode to Firestore:", error);
        }
      };
      saveDarkMode();
    }
  }, [darkMode, user]);

  // Function to toggle darkMode easily
  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
