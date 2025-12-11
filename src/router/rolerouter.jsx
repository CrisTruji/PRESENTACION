// src/router/rolerouter.jsx
import React, { useEffect } from "react";
import { useAuth } from "../context/auth";
import { useRouter } from "../context/roleroutercontext";

// ADMIN
import AdminDashboard from "../screens/admin/adminDashboard";
import AdminRequests from "../screens/admin/admin_requests";

// PLANTA
import CrearSolicitud from "../screens/planta/crearsolicitud";
import Productos from "../screens/planta/productos";
import SolicitudesPlanta from "../screens/planta/solicitudes";
import VerificarSolicitud from "../screens/planta/verificarsolicitud";

// AUXILIAR
import GestionAux from "../screens/aux_compras/gestionaux.jsx";
import VerDetallesSolicitud from "../screens/aux_compras/verdetallessolicitudes.jsx";

// COMPRAS
import GestionCompras from "../screens/compras/gestioncompras";

// GLOBAL
import Proveedores from "../screens/proveedores";
import Facturas from "../screens/facturas";

// ALMACÉN
import RecepcionFactura from "../screens/almacen/recepcionfactura.jsx";

export default function RoleRouter() {
  const { roleName, loading } = useAuth();
  const { currentScreen, navigate } = useRouter();

  // ================================
  // LOADING
  // ================================
  if (loading) return <p>Cargando…</p>;
  if (!roleName) return <p>No tienes rol asignado</p>;

  // ================================
  // ASIGNAR PANTALLA INICIAL
  // ================================
  useEffect(() => {
    if (currentScreen?.isInitialAssigned) return;

    let defaultScreen = "";

    switch (roleName) {
      case "jefe_de_planta":
        defaultScreen = "crear_solicitud";
        break;

      case "auxiliar_de_compras":
        defaultScreen = "gestion_aux";
        break;

      case "jefe_de_compras":
        defaultScreen = "gestion_compras";
        break;

      case "almacenista":
        defaultScreen = "recepcion_factura";
        break;

      case "administrador":
        defaultScreen = "admin_dashboard";
        break;

      default:
        defaultScreen = "home";
    }

    navigate(defaultScreen, { isInitialAssigned: true });
  }, [roleName]);

  // ================================
  // RENDER DE PANTALLAS
  // ================================
  const renderScreen = () => {
    switch (currentScreen.name) {
      // PLANTA
      case "crear_solicitud":
        return <CrearSolicitud />;

      case "productos":
        return <Productos />;

      case "solicitudes_planta":
        return <SolicitudesPlanta />;

      case "verificar_solicitud":
        return <VerificarSolicitud />;

      // AUXILIAR
      case "gestion_aux":
        return <GestionAux />;

      case "ver_detalles_solicitud":
        return (
          <VerDetallesSolicitud
            solicitudId={currentScreen.params?.id}
          />
        );

      // JEFE DE COMPRAS
      case "gestion_compras":
        return <GestionCompras />;

      // GLOBAL
      case "proveedores":
        return <Proveedores />;

      case "facturas":
        return <Facturas />;

      // ALMACÉN
      case "recepcion_factura":
        return <RecepcionFactura />;

      // ADMIN
      case "admin_dashboard":
        return <AdminDashboard />;

      case "admin_requests":
        return <AdminRequests />;

      // DEFAULT
      default:
        return (
          <div style={{ padding: 20, color: "red" }}>
            <h3>Pantalla no encontrada:</h3>
            <p>{currentScreen?.name || "(sin nombre)"}</p>
          </div>
        );
    }
  };

  return <>{renderScreen()}</>;
}
