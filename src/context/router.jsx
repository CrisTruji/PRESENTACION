import React, { createContext, useContext, useState } from "react";

const RouterContext = createContext();

export const RouterProvider = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState({
    name: "login",
    params: {},
  });

  const navigate = (screen, params = {}) => {
    setCurrentScreen({ name: screen, params });
  };

  return (
    <RouterContext.Provider value={{ currentScreen, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => useContext(RouterContext);
