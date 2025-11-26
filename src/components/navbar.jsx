import React from "react";
import { useRouter } from "../context/router.jsx";
import { useAuth } from "../context/auth.jsx";

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 20px",
  background: "#fff",
  borderBottom: "1px solid #e5e7eb",
};

const logoutBtn = {
  padding: "8px 12px",
  background: "#ff6b00",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

export default function Navbar() {
  const { navigate } = useRouter();
  const { session, profile, roleName, signOut } = useAuth();

  return (
    <header style={header}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={() => navigate("proveedores")}>Proveedores</button>
        <button onClick={() => navigate("productos")}>Productos</button>
        <button onClick={() => navigate("solicitudes")}>Solicitudes</button>
        <button onClick={() => navigate("facturas")}>Facturas</button>
        {/* botón admin: solo visible si rol = administrador */}
        {roleName === "administrador" && (
          <button onClick={() => navigate("admin_requests")}>Solicitudes de acceso</button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {session && (
          <div style={{ color: "#374151" }}>
            {profile?.nombre || session.user?.email}
            <small style={{ marginLeft: 8, color: "#6b7280" }}>({roleName || "sin rol"})</small>
          </div>
        )}
        {session ? (
          <button onClick={() => signOut()} style={logoutBtn}>Cerrar sesión</button>
        ) : null}
      </div>
    </header>
  );
}
