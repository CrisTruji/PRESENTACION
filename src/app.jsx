// src/app.jsx
import React from "react";
import { useAuth } from "./context/auth";
import { useRouter } from "./context/router";

import Navbar from "./components/navbar";
import Proveedores from "./screens/proveedores";
import Productos from "./screens/productos";
import Solicitudes from "./screens/solicitudes";
import Facturas from "./screens/facturas";

import AdminDashboard from "./screens/admin/adminDashboard";
import AdminRequests from "./screens/admin/admin_requests";
import WaitingRoleScreen from "./screens/ingreso/waiting_role";
import Login from "./screens/ingreso/login";
import Register from "./screens/ingreso/register";

export default function App() {
  const { session, loading, roleName } = useAuth();
  const { currentScreen } = useRouter();

  if (loading) return <p style={{ padding: 20 }}>Cargando...</p>;
  if (!session) return <AuthViews />;

  if (!roleName) return <WaitingRoleScreen />;

  return (
    <div>
      <Navbar />
      <main style={{ padding: 20 }}>
        {currentScreen.name === "proveedores" && <Proveedores />}
        {currentScreen.name === "productos" && <Productos />}
        {currentScreen.name === "solicitudes" && <Solicitudes />}
        {currentScreen.name === "facturas" && <Facturas />}
        {currentScreen.name === "admin_dashboard" && <AdminDashboard />}
        {currentScreen.name === "admin_requests" && <AdminRequests />}
      </main>
    </div>
  );
}

function AuthViews() {
  const [showRegister, setShowRegister] = React.useState(false);
  return showRegister ? <Register goToLogin={() => setShowRegister(false)} /> : <Login goToSignup={() => setShowRegister(true)} />;
}
