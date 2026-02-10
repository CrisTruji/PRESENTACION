// src/router/rolerouter.jsx
import React, { useEffect } from "react";
import { useAuth } from "../context/auth";
import { useRouter } from "../context/roleroutercontext";

// ================================
// IMPORTS DE PANTALLAS POR ROL
// ================================

// CHEF / ARBOLES (admin)
import ArbolMateriaPrima from "../screens/chef/arbol_materia_prima";
import SelectorArboles from "../screens/chef/selector_arboles";

// ADMIN
import AdminDashboard from "../screens/admin/adminDashboard";
import AdminRequests from "../screens/admin/admin_requests";
import VincularPresentaciones from "../screens/admin/vincular_presentaciones";
import Inventario from "../screens/admin/inventario";
import EmpleadosSST from "../screens/empleados/EmpleadosSST";
import EmpleadosTH from "../screens/empleados/EmpleadosTalentoHumano";

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

// SPRINT 3 - Stock & Auditoría (Admin)
import { StockManager } from "@/features/inventory";
import { AuditoriaViewer } from "@/features/audit";

// SPRINT 5 - Presentaciones (Admin/Planta)
import { PresentacionesManager } from "@/features/presentations";

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
case "vincular_presentaciones":
  return <VincularPresentaciones />;
case "inventario":
  return <Inventario />;
  case "Empleados_SST":
  return <EmpleadosSST />;
  case "Empleados_TH":
  return <EmpleadosTH />;

// CHEF / ARBOLES (ADMIN)
case "selector_arboles":
case "arboles":
  return <SelectorArboles />;
case "arbol_materia_prima":
case "chef_arbol_materia_prima":
  return <ArbolMateriaPrima />;

// SPRINT 3.5 - Stock & Auditoría (Admin)
case "stock_manager":
  return <StockManager />;
case "auditoria_viewer":
  return <AuditoriaViewer />;

// SPRINT 5 - Presentaciones (Admin/Planta)
case "presentaciones_manager":
  return <PresentacionesManager />;

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
