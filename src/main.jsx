// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // ✅ ESTO FALTABA
import App from "./app.jsx";
import { AuthProvider } from "./context/auth.jsx";
import { RouterProvider } from "./context/roleroutercontext.jsx";
import "./style.css";
import "./lib/test-supabase";


ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <RouterProvider>
        <App />
      </RouterProvider>
    </AuthProvider>
  </BrowserRouter>
);
