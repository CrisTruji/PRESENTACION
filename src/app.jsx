import React, { useState } from "react";
import { useAuth } from "./context/auth";
import LoginScreen from "./screens/login";
import SignupScreen from "./screens/register";
import ProveedoresScreen from "./screens/proveedores";
import ProductosScreen from "./screens/productos";
import SolicitudesScreen from "./screens/solicitudes";
import FacturasScreen from "./screens/facturas";
import { createSolicitud, listSolicitudes } from "./lib/solicitudes";

export default function App() {
  const { user, loading } = useAuth();
  const [showSignup, setShowSignup] = useState(false);
  const [currentScreen, setCurrentScreen] = useState("proveedores"); // Estado para navegación
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]); // Para pasar a FacturasScreen

  // Función para cargar solicitudes (usada en navegación)
  const loadSolicitudes = async () => {
    try {
      const data = await listSolicitudes();
      setSolicitudes(data);
    } catch (err) {
      console.error("Error cargando solicitudes:", err);
    }
  };

  // Función para crear solicitud desde ProductosScreen
  const handleCreateSolicitud = async (items) => {
    if (!selectedProveedor) return alert("Selecciona un proveedor primero");
    try {
      await createSolicitud(
        { proveedor_id: selectedProveedor.id, items, observaciones: "" },
        user.id
      );
      alert("Solicitud creada exitosamente");
      setCurrentScreen("solicitudes");
      loadSolicitudes(); // Recargar solicitudes
    } catch (err) {
      alert("Error creando solicitud: " + err.message);
    }
  };

  if (loading) return <p>Cargando...</p>;

  if (!user) {
    return showSignup ? (
      <SignupScreen goToLogin={() => setShowSignup(false)} />
    ) : (
      <LoginScreen goToSignup={() => setShowSignup(true)} />
    );
  }

  // Navegación basada en estado
  const renderScreen = () => {
    switch (currentScreen) {
      case "proveedores":
        return (
          <ProveedoresScreen
            onSelectProveedor={(prov) => {
              setSelectedProveedor(prov);
              setCurrentScreen("productos");
            }}
          />
        );
      case "productos":
        return (
          <ProductosScreen
            proveedor={selectedProveedor}
            onCreateSolicitud={handleCreateSolicitud}
          />
        );
      case "solicitudes":
        return <SolicitudesScreen />;
      case "facturas":
        return <FacturasScreen solicitudes={solicitudes} />;
      default:
        return <ProveedoresScreen onSelectProveedor={(prov) => setSelectedProveedor(prov)} />;
    }
  };

  return (
    <div>
      {/* Barra de navegación simple */}
      <nav style={{ padding: "10px", background: "#f0f0f0" }}>
        <button onClick={() => setCurrentScreen("proveedores")}>Proveedores</button>
        <button onClick={() => setCurrentScreen("solicitudes")}>Solicitudes</button>
        <button onClick={() => setCurrentScreen("facturas")}>Facturas</button>
        <button onClick={() => setCurrentScreen("productos")} disabled={!selectedProveedor}>
          Productos
        </button>
      </nav>
      {renderScreen()}
    </div>
  );
}