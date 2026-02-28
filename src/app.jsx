import React, { useEffect } from "react";
import { Toaster } from "sonner";
import { useAuth } from "@/features/auth";
import Navbar from "@/shared/ui/Navbar";
import RoleRouter from "@/router/rolerouter";
import { LoginScreen as Login, RegisterScreen as Register, WaitingRoleScreen, EmpleadoRegistroScreen, PortalEmpleadoLogin } from "@/features/auth";
import ErrorBoundary from "@/shared/ui/ErrorBoundary";

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
        ) : !roleName ? (
          <WaitingRoleScreen />
        ) : roleName === "usuario" ? (
          // Portal empleados – tiene su propio header, sin navbar principal
          <RoleRouter />
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
    </ErrorBoundary>
  );
}

function AuthViews() {
  // "portal_empleado" | "register_empleado" | "login_corporativo" | "register_admin"
  const [vista, setVista] = React.useState("portal_empleado");

  // Registro cédula → crear cuenta de empleado
  if (vista === "register_empleado") {
    return (
      <EmpleadoRegistroScreen
        goToLogin={() => setVista("portal_empleado")}
      />
    );
  }

  // Registro de admin/usuario corporativo
  if (vista === "register_admin") {
    return <Register goToLogin={() => setVista("login_corporativo")} />;
  }

  // Login corporativo (admin, planta, compras, etc.)
  if (vista === "login_corporativo") {
    return (
      <Login
        goToSignup={() => setVista("register_admin")}
        goToPortalEmpleado={() => setVista("portal_empleado")}
      />
    );
  }

  // Default: Portal de empleados (email + contraseña)
  return (
    <PortalEmpleadoLogin
      goToRegistro={() => setVista("register_empleado")}
      goToLoginCorporativo={() => setVista("login_corporativo")}
    />
  );
}