// src/components/Navbar.jsx
import React from "react";
import { useRouter } from "../router";
import { useAuth } from "../context/auth";

export default function Navbar() {
  const { navigate, currentScreen } = useRouter();
  const { session, profile, roleName, signOut } = useAuth();

  // Configuración de navegación por rol
  const getTabsByRole = () => {
    switch (roleName) {
      case "administrador":
        return [
          { label: "🏠 Dashboard", name: "admin_dashboard" },
          { label: "📋 Solicitudes de Acceso", name: "admin_requests" },
          { label: "🧾 Facturas", name: "facturas" },
        ];

      case "jefe_de_planta":
        return [
          { label: "➕ Crear", name: "crear_solicitud" },
          { label: "📄 Solicitudes", name: "solicitudes_planta" },
          { label: "📦 Productos", name: "productos" },
          { label: "🏢 Proveedores", name: "proveedores" },
        ];

      case "jefe_de_compras":
        return [
          { label: "💰 Gestión", name: "gestion_compras" },
          { label: "📋 Solicitudes", name: "solicitudes_planta" },
          { label: "🏢 Proveedores", name: "proveedores" },
          { label: "📦 Productos", name: "productos" },
          { label: "🧾 Facturas", name: "facturas" },
        ];

      case "auxiliar_de_compras":
        return [
          { label: "📋 Solicitudes", name: "gestion_aux" },
          { label: "🛒 Gestion de compras", name: "gestion_compras" },
        ];

      case "almacenista":
        return [
          { label: "📥 Recepción", name: "recepcion_factura" },
          { label: "🧾 Facturas", name: "facturas" },
          { label: "🏢 Proveedores", name: "proveedores" },
        ];

      default:
        return [
          { label: "🏢 Proveedores", name: "proveedores" },
          { label: "📦 Productos", name: "productos" },
        ];
    }
  };

  const tabs = getTabsByRole();

  return (
    <header
      style={{
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      {/* Logo y navegación */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <strong style={{ fontSize: "1.25rem", color: "#1f2937" }}>
          📊 DataSpectra
        </strong>

        {/* Navegación por pestañas */}
        <nav style={{ display: "flex", gap: 8 }}>
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => navigate(tab.name)}
              style={{
                padding: "8px 16px",
                background:
                  currentScreen?.name === tab.name ? "#2563eb" : "transparent",
                color: currentScreen?.name === tab.name ? "white" : "#4b5563",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (currentScreen?.name !== tab.name) {
                  e.currentTarget.style.background = "#f3f4f6";
                }
              }}
              onMouseLeave={(e) => {
                if (currentScreen?.name !== tab.name) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Información de usuario */}
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {session && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                background: "#2563eb",
                color: "white",
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
              }}
            >
              {profile?.nombre?.charAt(0) ||
                session.user.email?.charAt(0) ||
                "U"}
            </div>
            <div>
              <div style={{ fontWeight: "500", color: "#1f2937" }}>
                {profile?.nombre || session.user.email}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                {roleName || "Sin rol asignado"}
              </div>
            </div>
          </div>
        )}

        {session && (
          <button
            onClick={() => signOut()}
            style={{
              background: "#ef4444",
              color: "white",
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </header>
  );
}
