import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import ManageJobs from "./components/ManageJobs";
import Headers from "./components/Headers"; // Header with dark mode toggle
import Dashboard from "./components/Dashboard";
import Form from "./components/Form";
import Results from "./components/Results";
import Auth from "./components/Auth"; // Login page

import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { ThemeContext, ThemeProvider } from "./ThemeContext"; // Your custom ThemeContext provider

function AppContent() {
  const { darkMode } = useContext(ThemeContext);

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

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Headers />
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/managejobs" element={<ManageJobs />} />
          <Route path="/form" element={<Form />} />
          <Route path="/results/:id" element={<Results />} />
        </Routes>
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
