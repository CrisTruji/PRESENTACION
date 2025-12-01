// src/components/Navbar.jsx
import React from "react";
import { useRouter } from "../router";
import { useAuth } from "../context/auth";

export default function Navbar() {
  const { navigate } = useRouter();
  const { session, profile, roleName, signOut } = useAuth();

  return (
    <header style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <strong style={{ marginRight: 12 }}>Gestión de Facturas</strong>
        <button onClick={() => navigate("proveedores")} style={{ padding: "8px 12px" }}>Proveedores</button>
        <button onClick={() => navigate("solicitudes")} style={{ padding: "8px 12px" }}>Solicitudes</button>
        <button onClick={() => navigate("facturas")} style={{ padding: "8px 12px" }}>Facturas</button>
        {roleName === "administrador" && <button onClick={() => navigate("admin_requests")} style={{ padding: "8px 12px", background: "#2563eb", color: "white", borderRadius: 6 }}>Solicitudes</button>}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {session && <div style={{ color: "#374151" }}>{profile?.nombre || session.user.email} <small style={{ marginLeft: 8, color: "#6b7280" }}>({roleName || "sin rol"})</small></div>}
        {session && <button onClick={() => signOut()} style={{ background: "#ef4444", color: "white", padding: "8px 12px", borderRadius: 6 }}>Cerrar sesión</button>}
      </div>
    </header>
  );
}
