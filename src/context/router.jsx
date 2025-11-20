// src/context/router.jsx
import React, { createContext, useContext, useState } from "react";

const RouterContext = createContext();

export function RouterProvider({ children, initial }) {
  const [route, setRoute] = useState(initial);

  function navigate(name, params = {}) {
    setRoute({ name, params });
  }

  return (
    <RouterContext.Provider value={{ route, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}


export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouter must be used inside RouterProvider");
  return ctx;
}
