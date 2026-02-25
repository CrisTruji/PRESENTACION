// ========================================
// PUBLIC API - Purchases Feature
// ========================================

// Screens
export { default as CrearSolicitud } from './components/CrearSolicitud';
export { default as SolicitudesPlanta } from './components/SolicitudesPlanta';
export { default as VerificarSolicitud } from './components/VerificarSolicitud';
export { default as GestionCompras } from './components/GestionCompras';
export { default as GestionAux } from './components/GestionAux';
export { default as VerDetallesSolicitud } from './components/VerDetallesSolicitud';
export { default as Proveedores } from './components/Proveedores';

// Lib - Estados (re-export everything)
export * from './lib/estados';

// Services
export {
  crearSolicitud,
  agregarItemsSolicitud,
  getSolicitudes,
  getSolicitudById,
  getSolicitudConItems,
  getSolicitudesPorRol,
  getSolicitudesPendientes,
  getSolicitudesPendientesAuxiliar,
  aprobarItemAuxiliar,
  aprobarItemsAuxiliar,
  rechazarItemAuxiliar,
  rechazarItemsAuxiliar,
  cerrarRevisionAuxiliar,
  reenviarSolicitud,
  actualizarEstadoSolicitud,
  getItemsBySolicitud,
  actualizarItem,
  eliminarItem,
  getPresentacionesPorProveedor,
} from './services/solicitudesService';

export { getProveedores } from './services/proveedoresService';

// Hooks
export { default as useSolicitudes } from './hooks/useSolicitudes';
