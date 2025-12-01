// src/context/roleroutercontext.jsx
import React, { createContext, useContext, useState } from "react";

// CONTEXTO
const RouterContext = createContext(null);

// HOOK PRINCIPAL
export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouter debe usarse dentro de RouterProvider");
  return ctx;
}

// PROVIDER
export function RouterProvider({ children, initial = { name: "home", params: {} } }) {
  const [currentScreen, setCurrentScreen] = useState(initial);

  const navigate = (name, params = {}) => {
    setCurrentScreen({ name, params });
  };

  return (
    <RouterContext.Provider value={{ currentScreen, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}
