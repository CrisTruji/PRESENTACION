// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import { AuthProvider } from "./context/auth.jsx";
import { RouterProvider } from "./context/router.jsx";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider initial={{ name: "proveedores", params: {} }}>
        <App />
      </RouterProvider>
    </AuthProvider>
  </React.StrictMode>
);
