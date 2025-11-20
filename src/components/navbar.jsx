// src/components/navbar.jsx
import React from "react";
import { useRouter } from "../context/router";
import { useAuth } from "../context/auth";

export default function Navbar() {
  const { navigate, route } = useRouter();
  const { session, profile, signOut } = useAuth();

  return (
    <header style={header}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={logo}>🌿 <strong style={{color:"#ff6b00"}}>HealthyFood</strong></div>
        <nav style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("proveedores")} style={navBtn}>Proveedores</button>
          <button onClick={() => navigate("productos")} style={navBtn}>Productos</button>
          <button onClick={() => navigate("solicitudes")} style={navBtn}>Solicitudes</button>
          <button onClick={() => navigate("facturas")} style={navBtn}>Facturas</button>
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {session && <div style={{ color: "#374151" }}>{profile?.nombre || session.email}</div>}
        <button onClick={() => signOut()} style={logoutBtn}>Cerrar sesión</button>
      </div>
    </header>
  );
}

const header = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", background: "#fff", borderBottom: "1px solid #eee" };
const logo = { fontSize: 16 };
const navBtn = { padding: "8px 10px", borderRadius: 8, border: "none", background: "#f3f4f6", cursor: "pointer" };
const logoutBtn = { padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" };
