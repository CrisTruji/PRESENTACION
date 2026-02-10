// Public API - Inventory Feature
export { default as StockManager } from './components/StockManager';
export { default as StockManagerVirtualized } from './components/StockManagerVirtualized';
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
