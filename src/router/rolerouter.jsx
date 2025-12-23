import React, { useEffect, useRef } from "react";
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

// COMPRAS
import GestionCompras from "../screens/compras/gestioncompras";
import GestionAux from "../screens/aux_compras/gestionaux";

// AUXILIAR
import VerDetallesSolicitud from "../screens/aux_compras/verdetallessolicitudes";

// GLOBALES
import Proveedores from "../screens/proveedores";
import Facturas from "../screens/facturas";

// ALMACEN
import RecepcionFactura from "../screens/almacen/recepcionfactura";

export default function RoleRouter() {
  const { roleName, loading, session } = useAuth();
  const { currentScreen, navigate } = useRouter();

  const prevRoleRef = useRef(null);
  

  // -----------------------------
  // GUARDS
  // -----------------------------
  if (loading) return <p>Cargando…</p>;
  if (!session) return <p>No autenticado</p>;
  if (!roleName) return <p>No tienes rol asignado</p>;

  // -----------------------------
  // HOME POR ROL
  // -----------------------------
  const getHomeScreenByRole = (role) => {
    switch (role) {
      case "administrador":
        return "admin_dashboard";
      case "jefe_de_planta":
        return "crear_solicitud";
      case "auxiliar_de_compras":
        return "gestion_aux";
      case "jefe_de_compras":
        return "gestion_compras";
      case "almacenista":
        return "recepcion_factura";
      default:
        return "proveedores";
    }
  };

  // -----------------------------
  // 🔥 RESET CUANDO CAMBIA EL ROL
  // -----------------------------
  useEffect(() => {
    if (prevRoleRef.current !== roleName) {
      console.log(
        "🔁 Rol cambiado:",
        prevRoleRef.current,
        "→",
        roleName
      );

      prevRoleRef.current = roleName;

      const home = getHomeScreenByRole(roleName);
      navigate(home, { replace: true });
    }
  }, [roleName]);

  // -----------------------------
  // RENDER DE PANTALLAS
  // -----------------------------
  switch (currentScreen?.name) {
    case "crear_solicitud":
      return <CrearSolicitud />;

    case "productos":
      return <Productos />;

    case "solicitudes_planta":
      return <SolicitudesPlanta />;

    case "verificar_solicitud":
      return <VerificarSolicitud />;

    case "gestion_aux":
      return <GestionAux />;

    case "ver_detalles_solicitud":
      return <VerDetallesSolicitud />;

    case "gestion_compras":
      return <GestionCompras />;

    case "proveedores":
      return <Proveedores />;

    case "facturas":
      return <Facturas />;

    case "recepcion_factura":
      return <RecepcionFactura />;

    case "admin_dashboard":
      return <AdminDashboard />;

    case "admin_requests":
      return <AdminRequests />;

    default:
      return (
        <div style={{ padding: 20 }}>
          <h3>Pantalla no encontrada</h3>
          <p>{currentScreen?.name}</p>
        </div>
      );
  }
}
