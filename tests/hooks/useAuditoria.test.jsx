// ========================================
// TESTS: useAuditoria hooks
// Sprint 6 - Tests de React Query hooks para auditoría
// ========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useHistorialRegistro,
  useHistorialReceta,
  useHistorialMateriaPrima,
  useBuscarAuditoria,
  useEstadisticasAuditoria,
  useAuditoriaLegible,
  useResumenAuditoria,
  useActividadUsuario,
  useUsuariosMasActivos,
  useCambiosRecientes,
} from '../../src/features/audit/hooks/useAuditoria';
import { auditoriaService } from '../../src/features/audit/services/auditoriaService';

// Mock del servicio
vi.mock('../../src/features/audit/services/auditoriaService', () => ({
  auditoriaService: {
    getHistorial: vi.fn(),
    buscar: vi.fn(),
    getEstadisticas: vi.fn(),
    getAuditoriaLegible: vi.fn(),
    getResumenAuditoria: vi.fn(),
    getActividadPorUsuario: vi.fn(),
    getUsuariosMasActivos: vi.fn(),
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
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useAuditoria hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // HISTORIAL
  // ========================================

  describe('useHistorialRegistro', () => {
    it('debe obtener historial de un registro específico', async () => {
      // Arrange
      const tabla = 'arbol_recetas';
      const registroId = 'rec-123';
      const mockData = [
        {
          id: 'audit-1',
          operacion: 'UPDATE',
          tabla_nombre: tabla,
          registro_id: registroId,
          datos_anteriores: { nombre: 'Pan Viejo' },
          datos_nuevos: { nombre: 'Pan Nuevo' },
          created_at: '2026-02-09T10:00:00Z'
        },
        {
          id: 'audit-2',
          operacion: 'INSERT',
          tabla_nombre: tabla,
          registro_id: registroId,
          datos_nuevos: { nombre: 'Pan Viejo' },
          created_at: '2026-02-08T10:00:00Z'
        }
      ];

      auditoriaService.getHistorial.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useHistorialRegistro(tabla, registroId),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(auditoriaService.getHistorial).toHaveBeenCalledWith(tabla, registroId);
    });

    it('NO debe ejecutar si tabla o registroId son null', async () => {
      // Arrange
      auditoriaService.getHistorial.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useHistorialRegistro(null, 'rec-123'),
        { wrapper: createWrapper() }
      );

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(auditoriaService.getHistorial).not.toHaveBeenCalled();
    });

    it('debe manejar errores al obtener historial', async () => {
      // Arrange
      const mockError = new Error('Error de BD');

      auditoriaService.getHistorial.mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(
        () => useHistorialRegistro('arbol_recetas', 'rec-123'),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('useHistorialReceta', () => {
    it('debe ser un shortcut para historial de recetas', async () => {
      // Arrange
      const recetaId = 'rec-123';
      const mockData = [{ id: 'audit-1', operacion: 'UPDATE' }];

      auditoriaService.getHistorial.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useHistorialReceta(recetaId),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(auditoriaService.getHistorial).toHaveBeenCalledWith('arbol_recetas', recetaId);
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useHistorialMateriaPrima', () => {
    it('debe ser un shortcut para historial de materia prima', async () => {
      // Arrange
      const materiaPrimaId = 'mat-123';
      const mockData = [{ id: 'audit-1', operacion: 'INSERT' }];

      auditoriaService.getHistorial.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useHistorialMateriaPrima(materiaPrimaId),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(auditoriaService.getHistorial).toHaveBeenCalledWith('arbol_materia_prima', materiaPrimaId);
      expect(result.current.data).toEqual(mockData);
    });
  });

  // ========================================
  // BÚSQUEDA Y FILTROS
  // ========================================

  describe('useBuscarAuditoria', () => {
    it('debe buscar con filtros múltiples', async () => {
      // Arrange
      const filtros = {
        tabla_nombre: 'arbol_recetas',
        operacion: 'UPDATE',
        usuario_email: 'admin@test.com',
        fecha_desde: '2026-02-01',
        limite: 50
      };

      const mockData = [
        { id: 'audit-1', operacion: 'UPDATE', tabla_nombre: 'arbol_recetas' }
      ];

      auditoriaService.buscar.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useBuscarAuditoria(filtros),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(auditoriaService.buscar).toHaveBeenCalledWith(filtros);
    });

    it('NO debe ejecutar si no hay filtros', async () => {
      // Arrange
      auditoriaService.buscar.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useBuscarAuditoria({}),
        { wrapper: createWrapper() }
      );

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(auditoriaService.buscar).not.toHaveBeenCalled();
    });

    it('debe ejecutar si hay al menos un filtro', async () => {
      // Arrange
      const filtros = { tabla_nombre: 'arbol_recetas' };

      auditoriaService.buscar.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useBuscarAuditoria(filtros),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(auditoriaService.buscar).toHaveBeenCalledWith(filtros);
    });
  });

  // ========================================
  // ESTADÍSTICAS
  // ========================================

  describe('useEstadisticasAuditoria', () => {
    it('debe obtener estadísticas de auditoría', async () => {
      // Arrange
      const mockData = {
        total_cambios: 500,
        por_operacion: {
          INSERT: 200,
          UPDATE: 250,
          DELETE: 50
        },
        por_tabla: {
          arbol_recetas: 300,
          arbol_materia_prima: 200
        },
        usuarios_activos: 15
      };

      auditoriaService.getEstadisticas.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useEstadisticasAuditoria(30),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(auditoriaService.getEstadisticas).toHaveBeenCalledWith(30);
    });

    it('debe usar días por defecto (30) si no se especifica', async () => {
      // Arrange
      auditoriaService.getEstadisticas.mockResolvedValue({
        data: {},
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useEstadisticasAuditoria(),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(auditoriaService.getEstadisticas).toHaveBeenCalledWith(30);
    });
  });

  describe('useAuditoriaLegible', () => {
    it('debe obtener auditoría en formato legible', async () => {
      // Arrange
      const mockData = [
        {
          id: 'audit-1',
          descripcion: 'Admin actualizó receta Pan Francés',
          operacion_legible: 'Actualización',
          created_at: '2026-02-09T10:00:00Z'
        }
      ];

      auditoriaService.getAuditoriaLegible.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useAuditoriaLegible(50),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(auditoriaService.getAuditoriaLegible).toHaveBeenCalledWith(50);
    });

    it('debe usar límite por defecto (50)', async () => {
      // Arrange
      auditoriaService.getAuditoriaLegible.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useAuditoriaLegible(),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(auditoriaService.getAuditoriaLegible).toHaveBeenCalledWith(50);
    });
  });

  describe('useResumenAuditoria', () => {
    it('debe obtener resumen de auditoría', async () => {
      // Arrange
      const mockData = {
        hoy: 50,
        ayer: 45,
        semana: 300,
        mes: 1200
      };

      auditoriaService.getResumenAuditoria.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useResumenAuditoria(),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(auditoriaService.getResumenAuditoria).toHaveBeenCalled();
    });
  });

  // ========================================
  // USUARIOS
  // ========================================

  describe('useActividadUsuario', () => {
    it('debe obtener actividad de un usuario específico', async () => {
      // Arrange
      const usuarioEmail = 'admin@test.com';
      const mockData = [
        { operacion: 'UPDATE', count: 50 },
        { operacion: 'INSERT', count: 30 },
        { operacion: 'DELETE', count: 5 }
      ];

      auditoriaService.getActividadPorUsuario.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useActividadUsuario(usuarioEmail),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(auditoriaService.getActividadPorUsuario).toHaveBeenCalledWith(usuarioEmail);
    });

    it('NO debe ejecutar si usuarioEmail es null', async () => {
      // Arrange
      auditoriaService.getActividadPorUsuario.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useActividadUsuario(null),
        { wrapper: createWrapper() }
      );

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(auditoriaService.getActividadPorUsuario).not.toHaveBeenCalled();
    });
  });

  describe('useUsuariosMasActivos', () => {
    it('debe obtener top usuarios más activos', async () => {
      // Arrange
      const mockData = [
        { usuario_email: 'admin@test.com', total_cambios: 500 },
        { usuario_email: 'chef@test.com', total_cambios: 350 },
        { usuario_email: 'planta@test.com', total_cambios: 200 }
      ];

      auditoriaService.getUsuariosMasActivos.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useUsuariosMasActivos(10),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(auditoriaService.getUsuariosMasActivos).toHaveBeenCalledWith(10);
    });

    it('debe usar límite por defecto (10)', async () => {
      // Arrange
      auditoriaService.getUsuariosMasActivos.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useUsuariosMasActivos(),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(auditoriaService.getUsuariosMasActivos).toHaveBeenCalledWith(10);
    });
  });

  // ========================================
  // CAMBIOS RECIENTES
  // ========================================

  describe('useCambiosRecientes', () => {
    it('debe obtener cambios recientes de las últimas horas', async () => {
      // Arrange
      const mockData = [
        { id: 'audit-1', operacion: 'UPDATE', created_at: new Date().toISOString() }
      ];

      auditoriaService.buscar.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useCambiosRecientes(null, 24),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(auditoriaService.buscar).toHaveBeenCalled();

      // Verificar que el filtro incluye fecha_desde
      const callArgs = auditoriaService.buscar.mock.calls[0][0];
      expect(callArgs).toHaveProperty('fecha_desde');
      expect(callArgs).toHaveProperty('limite', 100);
    });

    it('debe filtrar por tabla específica', async () => {
      // Arrange
      const tabla = 'arbol_recetas';

      auditoriaService.buscar.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useCambiosRecientes(tabla, 12),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const callArgs = auditoriaService.buscar.mock.calls[0][0];
      expect(callArgs.tabla).toBe(tabla);
    });

    it('debe calcular fecha_desde correctamente', async () => {
      // Arrange
      const horas = 6;
      const ahora = Date.now();

      auditoriaService.buscar.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const { result } = renderHook(
        () => useCambiosRecientes(null, horas),
        { wrapper: createWrapper() }
      );

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const callArgs = auditoriaService.buscar.mock.calls[0][0];
      const fechaDesde = new Date(callArgs.fecha_desde);
      const diferenciaHoras = (ahora - fechaDesde.getTime()) / (1000 * 60 * 60);

      // Verificar que la diferencia es aproximadamente las horas solicitadas
      expect(diferenciaHoras).toBeGreaterThanOrEqual(horas - 1);
      expect(diferenciaHoras).toBeLessThanOrEqual(horas + 1);
    });
  });
});
