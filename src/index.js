import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// Import i18n initialization 
import "./i18n";

import { CssBaseline } from "@mui/material";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <CssBaseline /> {/* Normalize CSS with MUI */}
    <App />
  </React.StrictMode>
);

reportWebVitals();
