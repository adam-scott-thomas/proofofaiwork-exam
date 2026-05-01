import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { reportEnvIssues } from "./lib/envValidation";
import "./styles/globals.css";

// Surface deploy misconfig (missing VITE_* vars) in DevTools at boot.
// Runs before the first render so it shows up in the initial console
// output rather than racing with API calls.
reportEnvIssues();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element not found in index.html");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
