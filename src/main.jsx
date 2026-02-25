// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App.jsx";
import { AuthProvider } from "@/features/auth";
import { RouterProvider } from "@/router";
import { queryClient } from "@/shared/api";
import "./style.css";
import "./lib/test-supabase";

// src/main.jsx
import { supabase } from "@/shared/api";

let hadSession = false;

supabase.auth.onAuthStateChange((event, session) => {
  console.log("[SUPABASE AUTH]", event);

  // Marcamos cuando alguna vez hubo sesión
  if (event === "SIGNED_IN") {
    hadSession = true;
  }

  // Solo redirigir si el usuario YA estaba logueado
  if (
    hadSession &&
    (event === "SIGNED_OUT" || event === "TOKEN_REFRESH_FAILED")
  ) {
    localStorage.clear();
    window.location.href = "/";
  }
});


ReactDOM.createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <RouterProvider>
          <App />
        </RouterProvider>
      </AuthProvider>
    </BrowserRouter>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
