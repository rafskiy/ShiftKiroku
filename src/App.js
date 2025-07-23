import React, { useContext, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

import ManageJobs from "./components/ManageJobs";
import Headers from "./components/Headers";
import Dashboard from "./components/Dashboard";
import Form from "./components/Form";
import Results from "./components/Results";
import Auth from "./components/Auth";
import AddToCalendar from "./components/AddToCalendar";

import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline, CircularProgress, Box } from "@mui/material";
import { ThemeContext, ThemeProvider } from "./ThemeContext";

function AppContent() {
  const { darkMode } = useContext(ThemeContext);
  const [user, setUser] = useState(undefined); // undefined while checking auth

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      background: {
        default: darkMode ? "#121212" : "#e6f0ff",
      },
    },
    typography: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
  });

  if (user === undefined) {
    // Still checking auth state, show loading spinner
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <Box minHeight="100vh" display="flex" justifyContent="center" alignItems="center">
          <CircularProgress />
        </Box>
      </MuiThemeProvider>
    );
  }

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        {user ? (
          <>
            <Headers />
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/managejobs" element={<ManageJobs />} />
              <Route path="/form" element={<Form />} />
              <Route path="/results/:id" element={<Results />} />
              <Route path="/add-to-calendar" element={<AddToCalendar />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </>
        ) : (
          <Routes>
            <Route path="*" element={<Auth />} />
          </Routes>
        )}
      </Router>
    </MuiThemeProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
