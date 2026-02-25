// Public API - Inventory Feature
export { default as StockManager } from './components/StockManager';
export { default as StockManagerVirtualized } from './components/StockManagerVirtualized';
export { default as Inventario } from './components/Inventario';
export {
  useStockConAlertas,
  useStockBajo,
  usePresentaciones,
  useCostoPromedio,
  useActualizarStock,
  useActualizarStockBatch,
  useValidarStock
} from './hooks/useStock';
export { stockService } from './services/stockService';
