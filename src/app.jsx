import React, { useEffect } from "react";
import { Toaster } from "sonner";
import { useAuth } from "./context/auth";
import Navbar from "./components/navbar";
import RoleRouter from "./router/rolerouter";
import Login from "./screens/ingreso/login";
import Register from "./screens/ingreso/register";
import WaitingRoleScreen from "./screens/ingreso/waiting_role";

export default function App() {
  const { session, loading, roleName } = useAuth();

  // Detectar y aplicar tema inicial
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    
    // Aplicar transición
    root.classList.add('theme-transition');
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);
    
    return () => clearTimeout(timeout);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-text-secondary font-medium">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Toaster 
        position="top-right" 
        expand={false} 
        closeButton
        toastOptions={{
          style: {
            padding: '16px',
            borderRadius: '12px',
          },
        }}
      />

      {!session ? (
        <AuthViews />
      ) : !roleName ? (
        <WaitingRoleScreen />
      ) : (
        <>
          <Navbar />
          <div className="navbar-spacer"></div>
          <main className="page-container min-h-content">
            <RoleRouter />
          </main>
        </>
      )}
    </div>
  );
}

function AuthViews() {
  const [showRegister, setShowRegister] = React.useState(false);

  return showRegister ? (
    <Register goToLogin={() => setShowRegister(false)} />
  ) : (
    <Login goToSignup={() => setShowRegister(true)} />
  );
}