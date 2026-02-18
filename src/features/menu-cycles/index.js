// ========================================
// PUBLIC API - Menu Cycles Feature
// ========================================

// Components
export { default as ChefDashboard } from './components/ChefDashboard';
export { default as CicloEditor } from './components/CicloEditor';

// Hooks
export {
  useOperaciones,
  useOperacionesConCiclo,
  useOperacion,
  useCrearOperacion,
} from './hooks/useOperaciones';

export {
  useCiclosActivos,
  useCicloCompleto,
  useProgresoCiclo,
  useDiaServicios,
  useCrearCiclo,
  useActivarCiclo,
  useCopiarDia,
  useMarcarDiaCompleto,
} from './hooks/useCiclos';

export {
  useComponentesDia,
  useAsignarComponente,
  useEliminarComponente,
  useGramajes,
  useGuardarGramajes,
  useCrearRecetaLocal,
  useBuscarRecetas,
  useRecetaConIngredientes,
} from './hooks/useMenuComponentes';

export { useTiposDieta, useTiposDietaPorCategoria } from './hooks/useTiposDieta';
export { useComponentesPlato, useCrearComponente } from './hooks/useComponentesPlato';

// Store
export { useCicloEditorStore } from './store/useCicloEditorStore';

// Services
export { operacionesService } from './services/operacionesService';
export { ciclosService } from './services/ciclosService';
export { menuComponentesService } from './services/menuComponentesService';
export { catalogosService } from './services/catalogosService';
