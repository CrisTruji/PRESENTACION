// ========================================
// PUBLIC API - Food Orders Feature
// ========================================

// Components
export { default as PedidoServicioForm } from './components/PedidoServicioForm';
export { default as ConsolidadoSupervisor } from './components/ConsolidadoSupervisor';

// Hooks - Pedidos
export {
  usePedidoDelDia,
  usePedidosPorFecha,
  useMenuDelDia,
  useCrearPedido,
  useEnviarPedido,
  useGuardarItems,
} from './hooks/usePedidos';

export { useGuardarPacientes } from './hooks/usePedidoPacientes';

// Hooks - Solicitudes de Cambio
export {
  useSolicitudesPendientes,
  useSolicitudesPorPedido,
  useCrearSolicitudCambio,
  useAprobarSolicitud,
  useRechazarSolicitud,
} from './hooks/useSolicitudesCambio';

// Hooks - Consolidado
export {
  useConsolidadoPorFecha,
  useConsolidado,
  useVistaRecetas,
  useIngredientesTotales,
  useCambiosRealizados,
  useConsolidar,
  useSustituirReceta,
  useAprobarConsolidado,
  useMarcarPreparado,
} from './hooks/useConsolidado';

// Store
export { usePedidoStore } from './store/usePedidoStore';
export { useConsolidadoStore } from './store/useConsolidadoStore';

// Services
export { pedidosService } from './services/pedidosService';
export { solicitudesCambioService } from './services/solicitudesCambioService';
export { consolidadoService } from './services/consolidadoService';
