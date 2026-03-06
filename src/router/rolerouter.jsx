// src/router/rolerouter.jsx
import React, { useEffect } from "react";
import { useAuth } from "@/features/auth";
import { useRouter } from "@/router";

// ================================
// IMPORTS DE PANTALLAS POR ROL (FSD)
// ================================

// ADMIN
import { AdminDashboard, AdminRequests, AnalisisCostos, Nomina, CostosPorUnidad } from "@/features/admin";

// EMPLOYEES
import { EmpleadosSST, EmpleadosTH } from "@/features/employees";

// PLANTA (jefe de planta)
import { ProyeccionSemanal, CostosServicio, Productos, ConfiguracionCapacidades } from "@/features/planta";

// PURCHASES (planta, compras, proveedores)
import {
  CrearSolicitud,
  SolicitudesPlanta,
  VerificarSolicitud,
  GestionCompras,
  GestionAux,
  VerDetallesSolicitud,
  Proveedores,
  ProyeccionCompras,
} from "@/features/purchases";

// WAREHOUSE (almacén, facturas)
import { RecepcionFactura, Facturas } from "@/features/warehouse";

// CHEF / ARBOLES
import { SelectorArboles, ArbolMateriaPrimaScreen as ArbolMateriaPrima } from "@/features/products";

// PRESENTATIONS
import { VincularPresentaciones, PresentacionesManager } from "@/features/presentations";

// INVENTORY
import { Inventario, StockManager } from "@/features/inventory";

// AUDIT
import { AuditoriaViewer } from "@/features/audit";

// CICLOS DE MENU (Chef)
import { ChefDashboard } from "@/features/menu-cycles";

// PEDIDOS Y CONSOLIDADO (Unidades/Supervisor)
import { PedidoServicioForm, ConsolidadoSupervisor } from "@/features/food-orders";

// PRESUPUESTO (Admin / Jefe de Planta)
import { DashboardPresupuesto, CierreCostosMensual } from "@/features/presupuesto";

// GERENCIA (Admin)
import { DashboardGerencia } from "@/features/gerencia";

// INFORMES (Admin)
import { GeneradorInformes } from "@/features/informes";

// PORTAL EMPLEADO (rol: usuario)
import { PortalEmpleadoDashboard } from "@/features/portal-empleado";

// PANEL NOMINA (rol: nomina)
import { PanelNomina, SubirDesprendiblesMasivos } from "@/features/nomina";

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

      case "chef":
        defaultScreen = "chef_dashboard";
        break;

      case "supervisor_produccion":
        defaultScreen = "consolidado_supervisor";
        break;

      case "coordinador_unidad":
        defaultScreen = "pedido_servicio";
        break;

      case "usuario":
        defaultScreen = "portal_empleado";
        break;

      case "nomina":
        defaultScreen = "panel_nomina";
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
      case "proyeccion_semanal":
        return <ProyeccionSemanal />;
      case "costos_servicio":
        return <CostosServicio />;
      case "configuracion_capacidades":
        return <ConfiguracionCapacidades />;

      // AUXILIAR DE COMPRAS
      case "gestion_aux":
        return <GestionAux />;
      case "ver_detalles_solicitud":
        return <VerDetallesSolicitud />;

      // JEFE DE COMPRAS
      case "gestion_compras":
        return <GestionCompras />;
      case "proyeccion_compras":
        return <ProyeccionCompras />;

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
  case "empleados_sst":
  return <EmpleadosSST />;
  case "empleados_th":
  return <EmpleadosTH />;
  case "analisis_costos":
  return <AnalisisCostos />;
    case "nomina":
  return <Nomina />;

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

// SPRINT 7 - Ciclos de Menu (Chef/Admin)
case "chef_dashboard":
  return <ChefDashboard />;

// SPRINT 7 - Pedidos de Servicio (Coordinador Unidad/Admin)
case "pedido_servicio":
  return <PedidoServicioForm />;

// SPRINT 7 - Consolidado (Supervisor/Admin)
case "consolidado_supervisor":
  return <ConsolidadoSupervisor />;

// PRESUPUESTO (Admin / Jefe de Planta)
case "presupuesto":
  return <DashboardPresupuesto />;
case "cierre_costos":
  return <CierreCostosMensual />;

// COSTOS POR UNIDAD (Admin)
case "costos_unidad":
  return <CostosPorUnidad />;

// GERENCIA (Admin)
case "gerencia":
  return <DashboardGerencia />;

// INFORMES (Admin)
case "informes":
  return <GeneradorInformes />;

// PORTAL EMPLEADO (rol: usuario)
case "portal_empleado":
  return <PortalEmpleadoDashboard />;

// PANEL NOMINA (rol: nomina)
case "panel_nomina":
  return <PanelNomina />;
case "subir_desprendibles":
  return <SubirDesprendiblesMasivos />;

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
