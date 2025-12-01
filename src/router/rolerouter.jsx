// src/router/RoleRouter.jsx
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
import SolicitudesGenerales from "../screens/solicitudes";

// ALMACENISTA
import Facturas from "../screens/facturas";

export default function RoleRouter() {
  const { roleName, loading } = useAuth();
  const { currentScreen, navigate } = useRouter();

  if (loading) return <p>Cargando...</p>;
  if (!roleName) return <p>No tienes rol asignado</p>;

  // Asignar pantalla inicial cuando cambia el rol
  useEffect(() => {
    switch (roleName) {
      case "jefe_de_planta":
        navigate("crear_solicitud");
        break;

      case "auxiliar_de_compras":
      case "jefe_de_compras":
        navigate("solicitudes");
        break;

      case "almacenista":
        navigate("facturas");
        break;

      case "administrador":
        navigate("admin_dashboard");
        break;

      default:
        break;
    }
  }, [roleName]);

  // SUB-PANTALLAS
  const renderInternalScreen = () => {
    switch (currentScreen.name) {
      // PLANTA
      case "crear_solicitud": return <CrearSolicitud />;
      case "productos": return <Productos />;
      case "solicitudes_planta": return <SolicitudesPlanta />;
      case "verificar_solicitud": return <VerificarSolicitud />;

      // COMPRAS
      case "solicitudes": return <SolicitudesGenerales />;

      // ALMACENISTA
      case "facturas": return <Facturas />;

      // ADMIN
      case "admin_dashboard": return <AdminDashboard />;
      case "admin_requests": return <AdminRequests />;

      default:
        return <p>Pantalla no encontrada: {currentScreen.name}</p>;
    }
  };

  return <>{renderInternalScreen()}</>;
}
