// src/router/rolerouter.jsx
import React, { useEffect } from "react";
import { useAuth } from "../context/auth";
import { useRouter } from "../context/roleroutercontext";

// ================================
// IMPORTS DE PANTALLAS POR ROL
// ================================

// CHEF (solo admin)
import ArbolMateriaPrima from "../screens/chef/arbol_materia_prima";

// ADMIN
import AdminDashboard from "../screens/admin/adminDashboard";
import AdminRequests from "../screens/admin/admin_requests";

// PLANTA (jefe de planta)
import CrearSolicitud from "../screens/planta/crearsolicitud";
import Productos from "../screens/planta/productos";
import SolicitudesPlanta from "../screens/planta/solicitudes";
import VerificarSolicitud from "../screens/planta/verificarsolicitud";

// COMPRAS
import GestionCompras from "../screens/compras/gestioncompras";
import GestionAux from "../screens/aux_compras/gestionaux";
import VerDetallesSolicitud from "../screens/aux_compras/verdetallessolicitudes";

// ALMACEN
import RecepcionFactura from "../screens/almacen/recepcionfactura"; // ← FIX

// PANTALLAS GLOBALES
import Proveedores from "../screens/proveedores";
import Facturas from "../screens/facturas";

export default function RoleRouter() {
  const { roleName, loading } = useAuth();
  const { currentScreen, navigate } = useRouter();

  if (loading) return <p>Cargando…</p>;
  if (!roleName) return <p>No tienes rol asignado</p>;

  // Asignar pantalla inicial por rol
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
        defaultScreen = "crear_solicitud";
    }

    if (defaultScreen) navigate(defaultScreen, { isInitialAssigned: true });
  }, [roleName]);

  const renderInternalScreen = () => {
    switch (currentScreen?.name) {
      // PLANTA
      case "crear_solicitud":
        return <CrearSolicitud />;
      case "productos":
        return <Productos />;
      case "solicitudes_planta":
        return <SolicitudesPlanta />;
      case "verificar_solicitud":
        return <VerificarSolicitud />;

      // AUXILIAR DE COMPRAS
      case "gestion_aux":
        return <GestionAux />;
      case "ver_detalles_solicitud":
        return <VerDetallesSolicitud />;

      // JEFE DE COMPRAS
      case "gestion_compras":
        return <GestionCompras />;

      // ALMACEN
      case "recepcion_factura":
        return <RecepcionFactura />;

      // PANTALLAS GLOBALES
      case "proveedores":
        return <Proveedores />;
      case "facturas":
        return <Facturas />;

// ADMIN
case "admin_dashboard":
  return <AdminDashboard />;
case "admin_requests":
  return <AdminRequests />;

// CHEF (ADMIN)
case "arbol_materia_prima":
case "chef_arbol_materia_prima":
  return <ArbolMateriaPrima />;

default:
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
