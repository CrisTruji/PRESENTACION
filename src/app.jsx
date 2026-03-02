import React, { useEffect } from "react";
import { Toaster } from "sonner";
import { useAuth } from "@/features/auth";
import Navbar from "@/shared/ui/Navbar";
import RoleRouter from "@/router/rolerouter";
import { RegisterScreen as Register, WaitingRoleScreen, EmpleadoRegistroScreen, LoginUnificado } from "@/features/auth";
import { PortalEmpleadoDashboard } from "@/features/portal-empleado";
import ErrorBoundary from "@/shared/ui/ErrorBoundary";

export default function App() {
  const { session, loading, roleName } = useAuth();

  // Determinar si el usuario ingresó por el portal de empleados
  // (se activa en PortalEmpleadoLogin y EmpleadoRegistroScreen)
  const portalMode = session && sessionStorage.getItem("portal_mode") === "1";

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
    <ErrorBoundary>
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
        ) : portalMode ? (
          // Ingresó por el portal de empleados (cédula o pantalla portal)
          // Se muestra el portal sin importar el rol corporativo del JWT
          <PortalEmpleadoDashboard />
        ) : !roleName ? (
          <WaitingRoleScreen />
        ) : roleName === "usuario" ? (
          // Empleado puro (sin rol corporativo) – portal sin navbar
          <RoleRouter />
        ) : (
          // Acceso corporativo con rol (admin, chef, almacén, etc.)
          <>
            <Navbar />
            <div className="navbar-spacer"></div>
            <main className="page-container min-h-content">
              <RoleRouter />
            </main>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

function AuthViews() {
  // "login" | "register_empleado" | "register_admin"
  const [vista, setVista] = React.useState("login");

  if (vista === "register_empleado") {
    return <EmpleadoRegistroScreen goToLogin={() => setVista("login")} />;
  }

  if (vista === "register_admin") {
    return <Register goToLogin={() => setVista("login")} />;
  }

  // Default: login unificado (empleados + corporativo en un solo diseño)
  return (
    <LoginUnificado
      goToRegistro={() => setVista("register_empleado")}
      goToRegistroAdmin={() => setVista("register_admin")}
    />
  );
}