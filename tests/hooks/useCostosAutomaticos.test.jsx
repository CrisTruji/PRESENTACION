// ========================================
// TESTS: useCostosAutomaticos hooks
// Sprint 6 - Tests de React Query hooks para costos automáticos
// ========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useRecetasCostosPendientes,
  useContarRecetasPendientes,
  useImpactoCambioPrecio,
  useMateriasPrimasMasUsadas,
  useRecalcularTodasRecetas,
  useRecalcularRecetasPendientes,
  useSimularCambioPrecio,
  useRecetasMayorVariacion,
  useEstadisticasCostos,
  useCompararCostos,
  useActualizarPreciosBatch,
} from '../../src/features/recipes/hooks/useCostosAutomaticos';
import { costosAutomaticosService } from '../../src/features/recipes/services/costosAutomaticosService';

// Mock del servicio
vi.mock('../../src/features/recipes/services/costosAutomaticosService', () => ({
  costosAutomaticosService: {
    getRecetasCostosPendientes: vi.fn(),
    contarRecetasPendientes: vi.fn(),
    getImpactoCambioPrecio: vi.fn(),
    getMateriasPrimasMasUsadas: vi.fn(),
    recalcularTodasRecetas: vi.fn(),
    recalcularRecetasPendientes: vi.fn(),
    simularCambioPrecio: vi.fn(),
    getRecetasMayorVariacion: vi.fn(),
    getEstadisticasCostos: vi.fn(),
    compararCostos: vi.fn(),
    actualizarPreciosBatch: vi.fn(),
  }
}));

// Helper para crear wrapper con QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
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

describe('useCostosAutomaticos hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // QUERIES (useQuery)
  // ========================================

  describe('useRecetasCostosPendientes', () => {
    it('debe obtener recetas con costos pendientes', async () => {
      // Arrange
      const mockData = [
        {
          id: 'rec-1',
          nombre: 'Pan Francés',
          costo_actual: 10.00,
          costo_nuevo: 12.00,
          diferencia: 2.00
        },
        {
          id: 'rec-2',
          nombre: 'Pan Integral',
          costo_actual: 8.00,
          costo_nuevo: 7.50,
          diferencia: -0.50
        }
      ];

      costosAutomaticosService.getRecetasCostosPendientes.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useRecetasCostosPendientes(50),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(costosAutomaticosService.getRecetasCostosPendientes).toHaveBeenCalledWith(50);
    });

    it('debe usar límite por defecto (50)', async () => {
      // Arrange
      costosAutomaticosService.getRecetasCostosPendientes.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useRecetasCostosPendientes(),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(costosAutomaticosService.getRecetasCostosPendientes).toHaveBeenCalledWith(50);
    });
  });

  describe('useContarRecetasPendientes', () => {
    it('debe contar recetas pendientes', async () => {
      // Arrange
      const mockCount = 42;

      costosAutomaticosService.contarRecetasPendientes.mockResolvedValue({
        data: mockCount,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useContarRecetasPendientes(),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBe(mockCount);
      expect(costosAutomaticosService.contarRecetasPendientes).toHaveBeenCalled();
    });
  });

  describe('useImpactoCambioPrecio', () => {
    it('debe obtener impacto de cambio de precio', async () => {
      // Arrange
      const materiaPrimaId = 'mat-123';
      const mockData = [
        {
          materia_prima_id: materiaPrimaId,
          nombre: 'Harina',
          recetas_afectadas: 50,
          costo_total_impacto: 250.00
        }
      ];

      costosAutomaticosService.getImpactoCambioPrecio.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useImpactoCambioPrecio(materiaPrimaId, 5),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(costosAutomaticosService.getImpactoCambioPrecio).toHaveBeenCalledWith(
        materiaPrimaId,
        5
      );
    });

    it('NO debe ejecutar si materiaPrimaId es null', async () => {
      // Arrange
      costosAutomaticosService.getImpactoCambioPrecio.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useImpactoCambioPrecio(null, 1),
        { wrapper: createWrapper() }
      );

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(costosAutomaticosService.getImpactoCambioPrecio).not.toHaveBeenCalled();
    });
  });

  describe('useMateriasPrimasMasUsadas', () => {
    it('debe obtener top materias primas más usadas', async () => {
      // Arrange
      const mockData = [
        { materia_prima_id: 'mat-1', nombre: 'Harina', recetas_afectadas: 100 },
        { materia_prima_id: 'mat-2', nombre: 'Azúcar', recetas_afectadas: 85 },
        { materia_prima_id: 'mat-3', nombre: 'Sal', recetas_afectadas: 70 }
      ];

      costosAutomaticosService.getMateriasPrimasMasUsadas.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useMateriasPrimasMasUsadas(20),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(costosAutomaticosService.getMateriasPrimasMasUsadas).toHaveBeenCalledWith(20);
    });

    it('debe usar límite por defecto (20)', async () => {
      // Arrange
      costosAutomaticosService.getMateriasPrimasMasUsadas.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useMateriasPrimasMasUsadas(),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(costosAutomaticosService.getMateriasPrimasMasUsadas).toHaveBeenCalledWith(20);
    });
  });

  describe('useRecetasMayorVariacion', () => {
    it('debe obtener recetas con mayor variación', async () => {
      // Arrange
      const mockData = [
        {
          id: 'rec-1',
          nombre: 'Pan Francés',
          diferencia: 5.00,
          porcentaje_cambio: '25.00'
        },
        {
          id: 'rec-2',
          nombre: 'Croissant',
          diferencia: 3.50,
          porcentaje_cambio: '15.00'
        }
      ];

      costosAutomaticosService.getRecetasMayorVariacion.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useRecetasMayorVariacion(20),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(costosAutomaticosService.getRecetasMayorVariacion).toHaveBeenCalledWith(20);
    });
  });

  describe('useEstadisticasCostos', () => {
    it('debe obtener estadísticas de costos', async () => {
      // Arrange
      const mockData = {
        total_pendientes: 42,
        diferencia_total: 150.00,
        diferencia_promedio: '3.57',
        aumentos: 25,
        disminuciones: 15,
        sin_cambio: 2,
        mayor_aumento: 10.00,
        mayor_disminucion: -5.00
      };

      costosAutomaticosService.getEstadisticasCostos.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useEstadisticasCostos(),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(costosAutomaticosService.getEstadisticasCostos).toHaveBeenCalled();
    });
  });

  describe('useCompararCostos', () => {
    it('debe comparar costos de una receta', async () => {
      // Arrange
      const recetaId = 'rec-123';
      const mockData = {
        receta: {
          id: recetaId,
          codigo: 'REC-001',
          nombre: 'Pan Francés'
        },
        costo_actual: 10.00,
        costo_nuevo: 11.50,
        diferencia: 1.50,
        porcentaje_cambio: 15.00,
        ingredientes_count: 5
      };

      costosAutomaticosService.compararCostos.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useCompararCostos(recetaId),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(costosAutomaticosService.compararCostos).toHaveBeenCalledWith(recetaId);
    });

    it('NO debe ejecutar si recetaId es null', async () => {
      // Arrange
      costosAutomaticosService.compararCostos.mockResolvedValue({
        data: {},
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useCompararCostos(null),
        { wrapper: createWrapper() }
      );

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(costosAutomaticosService.compararCostos).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // MUTATIONS (useMutation)
  // ========================================

  describe('useRecalcularTodasRecetas', () => {
    it('debe recalcular todas las recetas', async () => {
      // Arrange
      const mockResponse = {
        data: {
          recetas_actualizadas: 150,
          tiempo_ms: 2500,
          tiempo_segundos: '2.50'
        },
        error: null
      };

      costosAutomaticosService.recalcularTodasRecetas.mockResolvedValue(mockResponse);

      // Act
      const { result } = renderHook(
        () => useRecalcularTodasRecetas(),
        { wrapper: createWrapper() }
      );

      result.current.mutate();

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(costosAutomaticosService.recalcularTodasRecetas).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockResponse);
    });

    it('debe manejar errores al recalcular', async () => {
      // Arrange
      const mockError = new Error('Error en recálculo');

      costosAutomaticosService.recalcularTodasRecetas.mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(
        () => useRecalcularTodasRecetas(),
        { wrapper: createWrapper() }
      );

      result.current.mutate();

      // Assert
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('useRecalcularRecetasPendientes', () => {
    it('debe recalcular solo recetas pendientes', async () => {
      // Arrange
      const mockResponse = {
        data: {
          recetas_actualizadas: 25,
          tiempo_ms: 500,
          tiempo_segundos: '0.50'
        },
        error: null
      };

      costosAutomaticosService.recalcularRecetasPendientes.mockResolvedValue(mockResponse);

      // Act
      const { result } = renderHook(
        () => useRecalcularRecetasPendientes(),
        { wrapper: createWrapper() }
      );

      result.current.mutate();

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(costosAutomaticosService.recalcularRecetasPendientes).toHaveBeenCalled();
      expect(result.current.data.data.recetas_actualizadas).toBe(25);
    });
  });

  describe('useSimularCambioPrecio', () => {
    it('debe simular cambio de precio sin aplicarlo', async () => {
      // Arrange
      const mockResponse = {
        data: [
          {
            receta_id: 'rec-1',
            nombre: 'Pan Francés',
            costo_actual: 10.00,
            costo_nuevo: 11.50,
            diferencia: 1.50
          }
        ],
        error: null
      };

      costosAutomaticosService.simularCambioPrecio.mockResolvedValue(mockResponse);

      // Act
      const { result } = renderHook(
        () => useSimularCambioPrecio(),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        materiaPrimaId: 'mat-123',
        nuevoPrecio: 5.50
      });

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(costosAutomaticosService.simularCambioPrecio).toHaveBeenCalledWith(
        'mat-123',
        5.50
      );
      expect(result.current.data).toEqual(mockResponse);
    });

    it('debe manejar errores en simulación', async () => {
      // Arrange
      const mockError = new Error('Error en simulación');

      costosAutomaticosService.simularCambioPrecio.mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(
        () => useSimularCambioPrecio(),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        materiaPrimaId: 'mat-999',
        nuevoPrecio: 10.00
      });

      // Assert
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('useActualizarPreciosBatch', () => {
    it('debe actualizar múltiples precios en batch', async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: true,
          actualizados: 3,
          errores: []
        },
        error: null
      };

      costosAutomaticosService.actualizarPreciosBatch.mockResolvedValue(mockResponse);

      const actualizaciones = [
        { materia_prima_id: 'mat-1', nuevo_precio: 5.00 },
        { materia_prima_id: 'mat-2', nuevo_precio: 7.50 },
        { materia_prima_id: 'mat-3', nuevo_precio: 3.25 }
      ];

      // Act
      const { result } = renderHook(
        () => useActualizarPreciosBatch(),
        { wrapper: createWrapper() }
      );

      result.current.mutate(actualizaciones);

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(costosAutomaticosService.actualizarPreciosBatch).toHaveBeenCalledWith(
        actualizaciones
      );
      expect(result.current.data).toEqual(mockResponse);
    });

    it('debe manejar errores parciales en batch', async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: false,
          actualizados: 2,
          errores: [{ materia_prima_id: 'mat-2', error: 'No encontrada' }]
        },
        error: null
      };

      costosAutomaticosService.actualizarPreciosBatch.mockResolvedValue(mockResponse);

      const actualizaciones = [
        { materia_prima_id: 'mat-1', nuevo_precio: 5.00 },
        { materia_prima_id: 'mat-2', nuevo_precio: 7.50 },
        { materia_prima_id: 'mat-3', nuevo_precio: 3.25 }
      ];

      // Act
      const { result } = renderHook(
        () => useActualizarPreciosBatch(),
        { wrapper: createWrapper() }
      );

      result.current.mutate(actualizaciones);

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data.data.success).toBe(false);
      expect(result.current.data.data.actualizados).toBe(2);
      expect(result.current.data.data.errores).toHaveLength(1);
    });
  });
});
