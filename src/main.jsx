// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import { AuthProvider } from "./context/auth.jsx";
import { RouterProvider } from "./context/roleroutercontext.jsx";
import { BrowserRouter } from "react-router-dom";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RouterProvider>
          <App />
        </RouterProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
