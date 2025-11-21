// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import { AuthProvider } from "./context/auth.jsx";
import { RouterProvider } from "./context/router.jsx";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  // ❌ Quita StrictMode porque duplica efectos
  // <React.StrictMode>
    <AuthProvider>
      <RouterProvider initial={{ name: "login", params: {} }}>
        <App />
      </RouterProvider>
    </AuthProvider>
  // </React.StrictMode>
);
