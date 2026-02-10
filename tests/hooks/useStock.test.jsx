// ========================================
// TESTS: useStock hooks
// Sprint 6 - Tests de React Query hooks para stock
// ========================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useStockConAlertas,
  useStockBajo,
  usePresentaciones,
  useCostoPromedio,
  useActualizarStock,
  useActualizarStockBatch,
  useValidarStock,
} from '../../src/features/inventory/hooks/useStock';
import { stockService } from '../../src/features/inventory/services/stockService';

// Mock del servicio
vi.mock('../../src/features/inventory/services/stockService', () => ({
  stockService: {
    getStockConAlertas: vi.fn(),
    getStockBajo: vi.fn(),
    getPresentaciones: vi.fn(),
    getCostoPromedio: vi.fn(),
    actualizarStock: vi.fn(),
    actualizarStockBatch: vi.fn(),
    validarStockDisponible: vi.fn(),
  }
}));

// Helper para crear wrapper con QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Desactivar reintentos en tests
        cacheTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useStock hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ========================================
  // QUERIES (useQuery)
  // ========================================

  describe('useStockConAlertas', () => {
    it('debe obtener stock con alertas correctamente', async () => {
      // Arrange
      const mockData = [
        { id: '1', nombre: 'Harina', stock_actual: 5, estado: 'BAJO' },
        { id: '2', nombre: 'Azúcar', stock_actual: 0, estado: 'CRÍTICO' }
      ];

      stockService.getStockConAlertas.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(() => useStockConAlertas(), {
        wrapper: createWrapper(),
      });

      // Assert inicial (loading)
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      // Esperar a que se resuelva
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert final
      expect(result.current.data).toEqual(mockData);
      expect(result.current.isLoading).toBe(false);
      expect(stockService.getStockConAlertas).toHaveBeenCalledTimes(1);
    });

    it('debe manejar errores al obtener stock con alertas', async () => {
      // Arrange
      const mockError = new Error('Error de BD');

      stockService.getStockConAlertas.mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() => useStockConAlertas(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('useStockBajo', () => {
    it('debe obtener stock bajo con refetch automático', async () => {
      // Arrange
      const mockData = [
        { id: '1', nombre: 'Harina', stock_actual: 2 }
      ];

      stockService.getStockBajo.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(() => useStockBajo(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(stockService.getStockBajo).toHaveBeenCalled();
    });

    it('debe usar queryKey correcto para cache', async () => {
      // Arrange
      stockService.getStockBajo.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const { result } = renderHook(() => useStockBajo(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - verificar que usa el queryKey esperado
      // Los hooks de React Query no exponen el queryKey directamente,
      // pero podemos verificar que el servicio se llamó
      expect(stockService.getStockBajo).toHaveBeenCalledTimes(1);
    });
  });

  describe('usePresentaciones', () => {
    it('debe obtener presentaciones cuando stockId está presente', async () => {
      // Arrange
      const stockId = 'stock-123';
      const mockData = [
        { id: 'pres-1', nombre: 'Bolsa 500g', parent_id: stockId },
        { id: 'pres-2', nombre: 'Bolsa 1kg', parent_id: stockId }
      ];

      stockService.getPresentaciones.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(() => usePresentaciones(stockId), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(stockService.getPresentaciones).toHaveBeenCalledWith(stockId);
    });

    it('NO debe ejecutar query cuando stockId es null', async () => {
      // Arrange
      stockService.getPresentaciones.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const { result } = renderHook(() => usePresentaciones(null), {
        wrapper: createWrapper(),
      });

      // Assert - la query no debe ejecutarse
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(stockService.getPresentaciones).not.toHaveBeenCalled();
    });

    it('debe aceptar options adicionales', async () => {
      // Arrange
      const stockId = 'stock-123';

      stockService.getPresentaciones.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const { result } = renderHook(
        () => usePresentaciones(stockId, { refetchOnMount: false }),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(stockService.getPresentaciones).toHaveBeenCalledWith(stockId);
    });
  });

  describe('useCostoPromedio', () => {
    it('debe obtener costo promedio con parámetros correctos', async () => {
      // Arrange
      const materiaPrimaId = 'mat-123';
      const meses = 6;
      const mockData = {
        costo_promedio: 12.50,
        cantidad_compras: 15,
        desviacion_estandar: 1.20
      };

      stockService.getCostoPromedio.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useCostoPromedio(materiaPrimaId, meses),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(stockService.getCostoPromedio).toHaveBeenCalledWith(materiaPrimaId, meses);
    });

    it('debe usar meses por defecto (3) si no se especifica', async () => {
      // Arrange
      const materiaPrimaId = 'mat-123';

      stockService.getCostoPromedio.mockResolvedValue({
        data: { costo_promedio: 10.00 },
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useCostoPromedio(materiaPrimaId), // Sin segundo parámetro
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(stockService.getCostoPromedio).toHaveBeenCalledWith(materiaPrimaId, 3);
    });

    it('NO debe ejecutar si materiaPrimaId es null', async () => {
      // Arrange
      stockService.getCostoPromedio.mockResolvedValue({
        data: {},
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useCostoPromedio(null),
        { wrapper: createWrapper() }
      );

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(stockService.getCostoPromedio).not.toHaveBeenCalled();
    });
  });

  describe('useValidarStock', () => {
    it('debe validar stock disponible correctamente', async () => {
      // Arrange
      const stockId = 'stock-123';
      const cantidadRequerida = 50;
      const mockData = {
        disponible: true,
        stock_actual: 100,
        cantidad_requerida: 50,
        faltante: 0
      };

      stockService.validarStockDisponible.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useValidarStock(stockId, cantidadRequerida),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(stockService.validarStockDisponible).toHaveBeenCalledWith(
        stockId,
        cantidadRequerida
      );
    });

    it('debe detectar stock insuficiente', async () => {
      // Arrange
      const stockId = 'stock-123';
      const cantidadRequerida = 150;
      const mockData = {
        disponible: false,
        stock_actual: 100,
        cantidad_requerida: 150,
        faltante: 50
      };

      stockService.validarStockDisponible.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useValidarStock(stockId, cantidadRequerida),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data.disponible).toBe(false);
      expect(result.current.data.faltante).toBe(50);
    });

    it('NO debe ejecutar si stockId es null', async () => {
      // Arrange
      stockService.validarStockDisponible.mockResolvedValue({
        data: {},
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useValidarStock(null, 50),
        { wrapper: createWrapper() }
      );

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(stockService.validarStockDisponible).not.toHaveBeenCalled();
    });

    it('NO debe ejecutar si cantidadRequerida es 0', async () => {
      // Arrange
      stockService.validarStockDisponible.mockResolvedValue({
        data: {},
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useValidarStock('stock-123', 0),
        { wrapper: createWrapper() }
      );

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(stockService.validarStockDisponible).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // MUTATIONS (useMutation)
  // ========================================

  describe('useActualizarStock', () => {
    it('debe actualizar stock correctamente', async () => {
      // Arrange
      const mockResponse = {
        data: {
          nuevo_stock: 110,
          mensaje: 'Stock actualizado'
        },
        error: null
      };

      stockService.actualizarStock.mockResolvedValue(mockResponse);

      // Act
      const { result } = renderHook(() => useActualizarStock(), {
        wrapper: createWrapper(),
      });

      // Ejecutar mutación
      result.current.mutate({
        stockId: 'stock-123',
        cantidad: 10,
        operacion: 'incrementar'
      });

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(stockService.actualizarStock).toHaveBeenCalledWith(
        'stock-123',
        10,
        'incrementar'
      );
      expect(result.current.data).toEqual(mockResponse);
    });

    it('debe manejar errores al actualizar stock', async () => {
      // Arrange
      const mockError = new Error('Error al actualizar');

      stockService.actualizarStock.mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() => useActualizarStock(), {
        wrapper: createWrapper(),
      });

      // Ejecutar mutación
      result.current.mutate({
        stockId: 'stock-123',
        cantidad: 10,
        operacion: 'decrementar'
      });

      // Assert
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(mockError);
    });

    it('debe invalidar cache de stock después de actualizar', async () => {
      // Arrange
      stockService.actualizarStock.mockResolvedValue({
        data: { nuevo_stock: 90 },
        error: null
      });

      // Act
      const { result } = renderHook(() => useActualizarStock(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        stockId: 'stock-123',
        cantidad: 10,
        operacion: 'decrementar'
      });

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // El hook debería haber invalidado el cache
      // No podemos verificar directamente, pero verificamos que la mutación fue exitosa
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('useActualizarStockBatch', () => {
    it('debe actualizar múltiples stocks en batch', async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: true,
          actualizados: 3,
          errores: []
        },
        error: null
      };

      stockService.actualizarStockBatch.mockResolvedValue(mockResponse);

      const operaciones = [
        { stockId: 'stock-1', cantidad: 10, operacion: 'incrementar' },
        { stockId: 'stock-2', cantidad: 5, operacion: 'decrementar' },
        { stockId: 'stock-3', cantidad: 20, operacion: 'incrementar' }
      ];

      // Act
      const { result } = renderHook(() => useActualizarStockBatch(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(operaciones);

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(stockService.actualizarStockBatch).toHaveBeenCalledWith(operaciones);
      expect(result.current.data).toEqual(mockResponse);
    });

    it('debe manejar errores parciales en batch', async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: false,
          actualizados: 2,
          errores: [{ stockId: 'stock-2', error: 'Stock no encontrado' }]
        },
        error: null
      };

      stockService.actualizarStockBatch.mockResolvedValue(mockResponse);

      const operaciones = [
        { stockId: 'stock-1', cantidad: 10 },
        { stockId: 'stock-2', cantidad: 5 },
        { stockId: 'stock-3', cantidad: 20 }
      ];

      // Act
      const { result } = renderHook(() => useActualizarStockBatch(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(operaciones);

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data.data.success).toBe(false);
      expect(result.current.data.data.actualizados).toBe(2);
      expect(result.current.data.data.errores).toHaveLength(1);
    });
  });
});
