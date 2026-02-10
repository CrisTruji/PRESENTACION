// Public API - Audit Feature
export { default as AuditoriaViewer } from './components/AuditoriaViewer';
export { default as AuditoriaViewerVirtualized } from './components/AuditoriaViewerVirtualized';
export {
  useAuditoriaLegible,
  useBuscarAuditoria,
  useHistorialRegistro,
  useEstadisticasAuditoria
} from './hooks/useAuditoria';
export { auditoriaService } from './services/auditoriaService';
