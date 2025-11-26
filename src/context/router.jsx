import React, { createContext, useContext, useState } from "react";

const RouterContext = createContext();

export const RouterProvider = ({ children, initial = { name: "proveedores", params: {} } }) => {
  const [currentScreen, setCurrentScreen] = useState(initial);

  const navigate = (screen, params = {}) => {
    console.log("➡️ NAVEGANDO A:", screen, params);
    setCurrentScreen({ name: screen, params });
  };

  return (
    <RouterContext.Provider value={{ currentScreen, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => useContext(RouterContext);
