// src/app.jsx
import React from "react";

import { useAuth } from "./context/auth";
import Navbar from "./components/navbar";
import RoleRouter from "./router/rolerouter";
// Screens de ingreso
import Login from "./screens/ingreso/login";
import Register from "./screens/ingreso/register";
import WaitingRoleScreen from "./screens/ingreso/waiting_role";
// ======================================================
// APP PRINCIPAL
// ======================================================
export default function App() {
  const { session, loading, roleName } = useAuth();

  // 1. Cargando sesión
  if (loading) return <p style={{ padding: 20 }}>Cargando sesión...</p>;

  // 2. No autenticado → mostrar login/register
  if (!session) return <AuthViews />;

  // 3. Usuario sin rol asignado aún
  if (!roleName) return <WaitingRoleScreen />;
  return (
    <>
      <Navbar />
      <RoleRouter />
    </>
  );
}

// ======================================================
// LOGIN / REGISTER
// ======================================================
function AuthViews() {
  const [showRegister, setShowRegister] = React.useState(false);

  return showRegister ? (
    <Register goToLogin={() => setShowRegister(false)} />
  ) : (
    <Login goToSignup={() => setShowRegister(true)} />
  );
}
