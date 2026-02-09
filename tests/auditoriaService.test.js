// ========================================
// TESTS: auditoriaService - Sprint 4
// Tests para servicio de auditoría
// ========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditoriaService } from '../src/services/auditoriaService';
import { supabase } from '../src/lib/supabase';

// Mock de Supabase
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

describe('auditoriaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // getHistorial()
  // ========================================
  describe('getHistorial', () => {
    it('debe obtener historial de un registro', async () => {
      const mockHistorial = [
        {
          id: '1',
          tabla: 'arbol_recetas',
          operacion: 'UPDATE',
          usuario_email: 'admin@test.com',
          created_at: '2026-02-09T10:00:00Z',
        },
        {
          id: '2',
          tabla: 'arbol_recetas',
          operacion: 'INSERT',
          usuario_email: 'admin@test.com',
          created_at: '2026-02-08T10:00:00Z',
        },
      ];

      supabase.rpc.mockResolvedValue({
        data: mockHistorial,
        error: null,
      });

      const result = await auditoriaService.getHistorial('arbol_recetas', 'uuid-receta');

      expect(supabase.rpc).toHaveBeenCalledWith('obtener_historial_registro', {
        p_tabla: 'arbol_recetas',
        p_registro_id: 'uuid-receta',
      });

      expect(result.data).toEqual(mockHistorial);
      expect(result.error).toBeNull();
    });

    it('debe manejar errores al obtener historial', async () => {
      const mockError = { message: 'Registro no encontrado' };

      supabase.rpc.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await auditoriaService.getHistorial('arbol_recetas', 'uuid-invalido');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  // ========================================
  // buscar()
  // ========================================
  describe('buscar', () => {
    it('debe buscar con filtros múltiples', async () => {
      const filtros = {
        tabla: 'arbol_recetas',
        operacion: 'UPDATE',
        usuario_email: 'admin@test.com',
        limite: 50,
      };

      const mockResultados = [
        { id: '1', tabla: 'arbol_recetas', operacion: 'UPDATE' },
        { id: '2', tabla: 'arbol_recetas', operacion: 'UPDATE' },
      ];

      supabase.rpc.mockResolvedValue({
        data: mockResultados,
        error: null,
      });

      const result = await auditoriaService.buscar(filtros);

      const call = supabase.rpc.mock.calls[0][1];
      expect(supabase.rpc).toHaveBeenCalledWith('buscar_auditoria', expect.any(Object));
      expect(call.p_tabla).toBe('arbol_recetas');
      expect(call.p_operacion).toBe('UPDATE');
      expect(call.p_usuario_email).toBe('admin@test.com');
      expect(call.p_limite).toBe(50);
      // Fechas son generadas automáticamente si no se proveen
      expect(call.p_fecha_desde).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(call.p_fecha_hasta).toMatch(/\d{4}-\d{2}-\d{2}/);

      expect(result.data).toEqual(mockResultados);
    });

    it('debe buscar con filtros de fecha', async () => {
      const filtros = {
        fecha_desde: new Date('2026-02-01'),
        fecha_hasta: new Date('2026-02-09'),
      };

      supabase.rpc.mockResolvedValue({ data: [], error: null });

      await auditoriaService.buscar(filtros);

      expect(supabase.rpc).toHaveBeenCalledWith('buscar_auditoria', {
        p_tabla: null,
        p_operacion: null,
        p_usuario_email: null,
        p_fecha_desde: filtros.fecha_desde.toISOString(),
        p_fecha_hasta: filtros.fecha_hasta.toISOString(),
        p_limite: 100,
      });
    });

    it('debe usar límite por defecto de 100', async () => {
      supabase.rpc.mockResolvedValue({ data: [], error: null });

      await auditoriaService.buscar({});

      const call = supabase.rpc.mock.calls[0][1];
      expect(call.p_limite).toBe(100);
    });
  });

  // ========================================
  // getEstadisticas()
  // ========================================
  describe('getEstadisticas', () => {
    it('debe obtener estadísticas de auditoría', async () => {
      const mockEstadisticas = {
        total_operaciones: 1500,
        total_inserts: 500,
        total_updates: 800,
        total_deletes: 200,
        usuarios_activos: 5,
        tablas_afectadas: 4,
        operaciones_hoy: 50,
        promedio_diario: 50,
      };

      supabase.rpc.mockResolvedValue({
        data: [mockEstadisticas],
        error: null,
      });

      const result = await auditoriaService.getEstadisticas(30);

      expect(supabase.rpc).toHaveBeenCalledWith('estadisticas_auditoria', {
        p_dias: 30,
      });

      expect(result.data).toEqual([mockEstadisticas]);
    });

    it('debe usar 30 días por defecto', async () => {
      supabase.rpc.mockResolvedValue({ data: [], error: null });

      await auditoriaService.getEstadisticas();

      expect(supabase.rpc).toHaveBeenCalledWith('estadisticas_auditoria', {
        p_dias: 30,
      });
    });
  });

  // ========================================
  // getAuditoriaLegible()
  // ========================================
  describe('getAuditoriaLegible', () => {
    it('debe obtener auditoría en formato legible', async () => {
      const mockAuditoria = [
        {
          id: '1',
          tabla: 'arbol_recetas',
          operacion: 'UPDATE',
          resumen: 'Actualizado campo nombre',
        },
        {
          id: '2',
          tabla: 'arbol_recetas',
          operacion: 'INSERT',
          resumen: 'Creada nueva receta',
        },
      ];

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockAuditoria,
          error: null,
        }),
      };

      supabase.from.mockReturnValue(mockFrom);

      const result = await auditoriaService.getAuditoriaLegible(50);

      expect(supabase.from).toHaveBeenCalledWith('auditoria_legible');
      expect(mockFrom.limit).toHaveBeenCalledWith(50);
      expect(result.data).toEqual(mockAuditoria);
    });

    it('debe usar límite por defecto de 50', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      supabase.from.mockReturnValue(mockFrom);

      await auditoriaService.getAuditoriaLegible();

      expect(mockFrom.limit).toHaveBeenCalledWith(50);
    });
  });

  // ========================================
  // getUsuariosMasActivos()
  // ========================================
  describe('getUsuariosMasActivos', () => {
    it('debe obtener top usuarios activos', async () => {
      const mockUsuarios = [
        { usuario_email: 'admin@test.com', total_operaciones: 500 },
        { usuario_email: 'user@test.com', total_operaciones: 250 },
      ];

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockUsuarios,
          error: null,
        }),
      };

      supabase.from.mockReturnValue(mockFrom);

      const result = await auditoriaService.getUsuariosMasActivos(10);

      expect(supabase.from).toHaveBeenCalledWith('auditoria_por_usuario');
      expect(mockFrom.limit).toHaveBeenCalledWith(10);
      expect(result.data).toEqual(mockUsuarios);
    });
  });

  // ========================================
  // getActividadPorUsuario()
  // ========================================
  describe('getActividadPorUsuario', () => {
    it('debe obtener actividad de un usuario específico', async () => {
      const mockActividad = [
        { fecha: '2026-02-09', operaciones: 50 },
        { fecha: '2026-02-08', operaciones: 40 },
      ];

      const mockQuery = {
        select: vi.fn(),
        gte: vi.fn(),
        order: vi.fn(),
        eq: vi.fn(),
      };

      // Configurar cada método para retornar el mockQuery (chain)
      mockQuery.select.mockReturnValue(mockQuery);
      mockQuery.gte.mockReturnValue(mockQuery);
      mockQuery.order.mockReturnValue(mockQuery);

      // El último (eq) devuelve la promise con los datos
      mockQuery.eq.mockResolvedValue({
        data: mockActividad,
        error: null,
      });

      supabase.from.mockReturnValue(mockQuery);

      const result = await auditoriaService.getActividadPorUsuario('admin@test.com');

      expect(mockQuery.eq).toHaveBeenCalledWith('usuario_email', 'admin@test.com');
      expect(result.data).toEqual(mockActividad);
    });

    it('debe obtener actividad de todos los usuarios si no se especifica', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      supabase.from.mockReturnValue(mockFrom);

      await auditoriaService.getActividadPorUsuario();

      // Verificar que NO se llamó eq (sin filtro de usuario)
      expect(mockFrom.eq).toBeUndefined();
    });
  });

  // ========================================
  // formatearOperacion()
  // ========================================
  describe('formatearOperacion', () => {
    it('debe formatear INSERT correctamente', () => {
      const result = auditoriaService.formatearOperacion('INSERT');
      expect(result).toBe('Creación');
    });

    it('debe formatear UPDATE correctamente', () => {
      const result = auditoriaService.formatearOperacion('UPDATE');
      expect(result).toBe('Actualización');
    });

    it('debe formatear DELETE correctamente', () => {
      const result = auditoriaService.formatearOperacion('DELETE');
      expect(result).toBe('Eliminación');
    });

    it('debe retornar la operación original si no reconoce', () => {
      const result = auditoriaService.formatearOperacion('UNKNOWN');
      expect(result).toBe('UNKNOWN');
    });
  });

  // ========================================
  // getColorOperacion()
  // ========================================
  describe('getColorOperacion', () => {
    it('debe retornar verde para INSERT', () => {
      const result = auditoriaService.getColorOperacion('INSERT');
      expect(result).toBe('green');
    });

    it('debe retornar azul para UPDATE', () => {
      const result = auditoriaService.getColorOperacion('UPDATE');
      expect(result).toBe('blue');
    });

    it('debe retornar rojo para DELETE', () => {
      const result = auditoriaService.getColorOperacion('DELETE');
      expect(result).toBe('red');
    });

    it('debe retornar gray por defecto', () => {
      const result = auditoriaService.getColorOperacion('UNKNOWN');
      expect(result).toBe('gray');
    });
  });
});
