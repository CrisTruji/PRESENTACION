// src/app.jsx
import React from "react";
import { useAuth } from "./context/auth";
import { useRouter } from "./context/router";

import Navbar from "./components/navbar";
import Proveedores from "./screens/proveedores";
import Productos from "./screens/productos";
import Solicitudes from "./screens/solicitudes";
import Facturas from "./screens/facturas";
import AdminRequests from "./screens/admin/admin_requests"; // ✅ Asegurar este import
import WaitingRoleScreen from "./screens/waiting_role";
import Login from "./screens/login";
import Register from "./screens/register";

export default function App() {
  const { session, loading, profile } = useAuth();
  const { currentScreen } = useRouter();

  if (loading) {
    return <div style={{ padding: 20 }}>Cargando...</div>;
  }

  if (!session) {
    return <AuthViews />;
  }

  if (!profile) {
    return <WaitingRoleScreen />;
  }

  return (
    <div>
      <Navbar />
      <main style={{ padding: 20 }}>
        {currentScreen.name === "proveedores" && <Proveedores />}
        {currentScreen.name === "productos" && <Productos />}
        {currentScreen.name === "solicitudes" && <Solicitudes />}
        {currentScreen.name === "facturas" && <Facturas />}
        {currentScreen.name === "admin_requests" && <AdminRequests />} {/* ✅ Esto debe coincidir con el navigate */}
      </main>
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