// src/router/rolerouter.jsx
import React, { useEffect } from "react";
import { useAuth } from "../context/auth";
import { useRouter } from "../context/roleroutercontext";

// ================================
// IMPORTS DE PANTALLAS POR ROL
// ================================

// ADMIN
import AdminDashboard from "../screens/admin/adminDashboard";
import AdminRequests from "../screens/admin/admin_requests";

// PLANTA (jefe de planta)
import CrearSolicitud from "../screens/planta/crearsolicitud";
import Productos from "../screens/planta/productos";
import SolicitudesPlanta from "../screens/planta/solicitudes";
import VerificarSolicitud from "../screens/planta/verificarsolicitud";

// COMPRAS (auxiliar y jefe)
import GestionCompras from "../screens/compras/gestioncompras";
import GestionAux from "../screens/aux_compras/gestionaux.jsx";

// AUXILIAR
import VerDetallesSolicitud from "../screens/aux_compras/verdetallessolicitudes.jsx";

// PANTALLAS GLOBALES
import Proveedores from "../screens/proveedores";
import Facturas from "../screens/facturas";

// ALMACEN
import RecepcionFactura from "../screens/almacen/recepcionfactura.jsx";

export default function RoleRouter() {
  const { roleName, loading } = useAuth();
  const { currentScreen, navigate } = useRouter();

  if (loading) return <p>Cargando…</p>;
  if (!roleName) return <p>No tienes rol asignado</p>;

  // Determinar pantalla inicial por rol
  const getHomeScreenByRole = () => {
    switch (roleName) {
      case "administrador":
        return "admin_dashboard";
      case "jefe_de_planta":
        return "crear_solicitud";
      case "jefe_de_compras":
        return "gestion_compras";
      case "auxiliar_de_compras":
        return "gestion_aux";
      case "almacenista":
        return "recepcion_factura";
      default:
        return "proveedores";
    }
  };

  // Asignar pantalla inicial por rol (solo la primera vez)
  useEffect(() => {
    if (currentScreen?.isInitialAssigned) return;

    const homeScreen = getHomeScreenByRole();

    if (homeScreen) {
      navigate(homeScreen, { isInitialAssigned: true });
    }
  }, [roleName]);

  const renderInternalScreen = () => {
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

      // COMPRAS
      case "gestion_aux":
        return <GestionAux />;
      case "gestion_compras":
        return <GestionCompras />;

      // AUXILIAR
      case "ver_detalles_solicitud":
        return <VerDetallesSolicitud solicitudId={currentScreen.params?.id} />;

      // PANTALLAS GLOBALES
      case "proveedores":
        return <Proveedores />;
      case "facturas":
        return <Facturas />;
      case "solicitudes":
        return <Proveedores />;

      // ALMACEN
      case "recepcion_factura":
        return <RecepcionFactura />;

      // ADMIN
      case "admin_dashboard":
        return <AdminDashboard />;
      case "admin_requests":
        return <AdminRequests />;

      default:
        // Si no hay pantalla, mostrar la inicial del rol
        const defaultScreen = getHomeScreenByRole();
        if (defaultScreen && defaultScreen !== currentScreen?.name) {
          setTimeout(() => navigate(defaultScreen), 0);
          return (
            <div style={{ padding: 20, textAlign: "center" }}>
              <h3>Redirigiendo a pantalla principal...</h3>
            </div>
          );
        }
        return (
          <div style={{ padding: 20, color: "red" }}>
            <h3>Pantalla no encontrada:</h3>
            <p>{currentScreen?.name || "(sin nombre)"}</p>
          </div>
        );
    }
  };

  return <>{renderInternalScreen()}</>;
}
