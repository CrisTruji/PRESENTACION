// ========================================
// PUBLIC API - Employees Feature
// ========================================

export { default as EmpleadosSST } from './components/EmpleadosSST';
export { default as EmpleadosTH } from './components/EmpleadosTH';

// Services - todas las funciones expuestas al resto de la app
export {
  getEmpleadosBase,
  getEmpleadosSST,
  getEmpleadosTalentoHumano,
  getEmpleadoCompleto,
  createEmpleadoCompleto,
  updateEmpleado,
  updateTalentoHumano,
  updateSST,
  uploadEmpleadoDocumento,
  getEmpleadoDocumentos,
  deleteEmpleadoDocumento,
  searchEmpleados,
  toggleEmpleadoEstado,
  getEmpleadosPorCentro,
  getEstadisticasEmpleados,
  verificarDocumentoExistente,
  getEmpleadosFiltrados,
  probarConexionStorage,
} from './services/empleadosService';
