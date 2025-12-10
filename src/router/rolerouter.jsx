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


// PANTALLAS GLOBALES / OTRAS (según tu estructura)
// hay archivos en src/screens/ (no en /compras)
import Proveedores from "../screens/proveedores";
import Facturas from "../screens/facturas";

// ALMACEN
// archivo real en tu repo: src/screens/almacen/receocionfactura.jsx
import RecepcionFactura from "../screens/almacen/recepcionfactura.jsx";

export default function RoleRouter() {
  const { roleName, loading } = useAuth();
  const { currentScreen, navigate } = useRouter();

  if (loading) return <p>Cargando…</p>;
  if (!roleName) return <p>No tienes rol asignado</p>;

  // Asignar pantalla inicial por rol (solo la primera vez)
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
        defaultScreen = "";
    }

    if (defaultScreen) navigate(defaultScreen, { isInitialAssigned: true });
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



      // PANTALLAS GLOBALES (existentes en tu repo)
      case "proveedores":
        return <Proveedores />;
      case "facturas":
        return <Facturas />;

      // ALMACEN
      case "recepcion_factura":
        return <RecepcionFactura />;

      // ADMIN
      case "admin_dashboard":
        return <AdminDashboard />;
      case "admin_requests":
        return <AdminRequests />;

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
