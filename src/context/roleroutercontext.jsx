// src/context/roleroutercontext.jsx
import React, { createContext, useContext, useState } from "react";

const RouterContext = createContext(null);

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error("useRouter debe usarse dentro de RouterProvider");
  }
  return ctx;
}

export function RouterProvider({ children }) {
  const [currentScreen, setCurrentScreen] = useState(null);

  const navigate = (name, params = {}) => {
    setCurrentScreen({ name, params });
  };

  return (
    <RouterContext.Provider value={{ currentScreen, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

