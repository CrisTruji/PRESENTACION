// src/app.jsx
import React from "react";
import { useAuth } from "./context/auth";
import { useRouter } from "./context/router";
import Navbar from "./components/navbar";

import Proveedores from "./screens/proveedores";
import Productos from "./screens/productos";
import Solicitudes from "./screens/solicitudes";
import Facturas from "./screens/facturas";
import WaitingRoleScreen from "./screens/waiting_role";
import Login from "./screens/login";
import Register from "./screens/register";

export default function App() {
  const { session, loading, waitingForRole } = useAuth();
  const { route } = useRouter();

  if (loading) return <p style={{ padding: 20 }}>Cargando...</p>;
  if (!session) return <AuthViews />;
  if (waitingForRole) return <WaitingRoleScreen />;

  return (
    <div>
      <Navbar />
      <main>
        {route.name === "proveedores" && <Proveedores />}
        {route.name === "productos" && <Productos />}
        {route.name === "solicitudes" && <Solicitudes />}
        {route.name === "facturas" && <Facturas />}
      </main>
    </div>
  );
}

function AuthViews() {
  const [showRegister, setShowRegister] = React.useState(false);
  return showRegister ? <Register goToLogin={() => setShowRegister(false)} /> : <Login goToSignup={() => setShowRegister(true)} />;
}
