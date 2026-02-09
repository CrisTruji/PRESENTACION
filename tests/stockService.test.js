// ========================================
// TESTS: stockService - Sprint 4
// Tests para servicio de gestión de stock
// ========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stockService } from '../src/services/stockService';
import { supabase } from '../src/lib/supabase';

// Mock de Supabase
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

describe('stockService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // actualizarStock()
  // ========================================
  describe('actualizarStock', () => {
    it('debe actualizar stock correctamente', async () => {
      const mockResponse = {
        data: [{ success: true, nuevo_stock: 25.5, mensaje: 'Stock actualizado' }],
        error: null,
      };

      supabase.rpc.mockResolvedValue(mockResponse);

      const result = await stockService.actualizarStock(
        'uuid-stock-123',
        10.5,
        'incrementar'
      );

      expect(supabase.rpc).toHaveBeenCalledWith('actualizar_stock', {
        p_stock_id: 'uuid-stock-123',
        p_cantidad: 10.5,
        p_operacion: 'incrementar',
      });

      expect(result.data).toEqual(mockResponse.data);
      expect(result.error).toBeNull();
    });

    it('debe manejar errores al actualizar stock', async () => {
      const mockError = { message: 'Stock no encontrado', code: 'PGRST116' };

      supabase.rpc.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await stockService.actualizarStock('uuid-invalido', 10, 'incrementar');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  // ========================================
  // getStockBajo() con Fallback
  // ========================================
  describe('getStockBajo', () => {
    it('debe usar RPC si está disponible', async () => {
      const mockStockBajo = [
        { id: '1', nombre: 'Harina', stock_actual: 5, estado_stock: 'CRÍTICO' },
        { id: '2', nombre: 'Azúcar', stock_actual: 15, estado_stock: 'BAJO' },
      ];

      supabase.rpc.mockResolvedValue({
        data: mockStockBajo,
        error: null,
      });

      const result = await stockService.getStockBajo();

      expect(supabase.rpc).toHaveBeenCalledWith('obtener_stock_bajo');
      expect(result.data).toEqual(mockStockBajo);
      expect(result.error).toBeNull();
    });

    it('debe hacer fallback a vista si RPC no existe', async () => {
      const mockStockBajo = [
        { id: '1', nombre: 'Harina', stock_actual: 5, estado_stock: 'CRÍTICO' },
      ];

      // RPC falla con código PGRST202 (función no existe)
      supabase.rpc.mockResolvedValue({
        data: null,
        error: { code: 'PGRST202', message: 'Function not found' },
      });

      // Mock de la vista
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockStockBajo,
          error: null,
        }),
      };

      supabase.from.mockReturnValue(mockFrom);

      const result = await stockService.getStockBajo();

      // Verificar que intentó RPC primero
      expect(supabase.rpc).toHaveBeenCalledWith('obtener_stock_bajo');

      // Verificar fallback a vista
      expect(supabase.from).toHaveBeenCalledWith('vista_stock_alertas');
      expect(mockFrom.select).toHaveBeenCalledWith('*');
      expect(mockFrom.in).toHaveBeenCalledWith('estado_stock', ['CRÍTICO', 'BAJO']);

      expect(result.data).toEqual(mockStockBajo);
      expect(result.error).toBeNull();
    });
  });

  // ========================================
  // getCostoPromedio()
  // ========================================
  describe('getCostoPromedio', () => {
    it('debe calcular costo promedio correctamente', async () => {
      const mockCosto = { costo_promedio: 125.50 };

      supabase.rpc.mockResolvedValue({
        data: [mockCosto],
        error: null,
      });

      const result = await stockService.getCostoPromedio('uuid-materia-prima', 3);

      expect(supabase.rpc).toHaveBeenCalledWith('calcular_costo_promedio', {
        p_materia_prima_id: 'uuid-materia-prima',
        p_meses: 3,
      });

      expect(result.data).toEqual([mockCosto]);
    });

    it('debe usar 3 meses por defecto', async () => {
      supabase.rpc.mockResolvedValue({ data: [], error: null });

      await stockService.getCostoPromedio('uuid-materia-prima');

      expect(supabase.rpc).toHaveBeenCalledWith('calcular_costo_promedio', {
        p_materia_prima_id: 'uuid-materia-prima',
        p_meses: 3,
      });
    });
  });

  // ========================================
  // getStockConAlertas()
  // ========================================
  describe('getStockConAlertas', () => {
    it('debe obtener todo el stock con alertas', async () => {
      const mockStock = [
        { id: '1', estado_stock: 'CRÍTICO' },
        { id: '2', estado_stock: 'BAJO' },
        { id: '3', estado_stock: 'NORMAL' },
      ];

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockStock,
          error: null,
        }),
      };

      supabase.from.mockReturnValue(mockFrom);

      const result = await stockService.getStockConAlertas();

      expect(supabase.from).toHaveBeenCalledWith('vista_stock_alertas');
      expect(mockFrom.select).toHaveBeenCalledWith('*');
      expect(result.data).toEqual(mockStock);
    });

    it('debe filtrar por estado si se proporciona', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      supabase.from.mockReturnValue(mockFrom);

      await stockService.getStockConAlertas('CRÍTICO');

      expect(mockFrom.eq).toHaveBeenCalledWith('estado_stock', 'CRÍTICO');
    });

    it('debe filtrar por categoría si se proporciona', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      supabase.from.mockReturnValue(mockFrom);

      await stockService.getStockConAlertas(null, 'uuid-categoria');

      expect(mockFrom.eq).toHaveBeenCalledWith('categoria_id', 'uuid-categoria');
    });
  });

  // ========================================
  // getPresentaciones()
  // ========================================
  describe('getPresentaciones', () => {
    it('debe obtener presentaciones de un stock', async () => {
      const mockPresentaciones = [
        { id: '1', presentacion: 'Bolsa 5kg', precio_unitario: 50 },
        { id: '2', presentacion: 'Bolsa 10kg', precio_unitario: 95 },
      ];

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockPresentaciones,
          error: null,
        }),
      };

      supabase.from.mockReturnValue(mockFrom);

      const result = await stockService.getPresentaciones('uuid-stock');

      expect(supabase.from).toHaveBeenCalledWith('vista_presentaciones');
      expect(mockFrom.eq).toHaveBeenCalledWith('stock_id', 'uuid-stock');
      expect(result.data).toEqual(mockPresentaciones);
    });
  });

  // ========================================
  // actualizarStockBatch()
  // ========================================
  describe('actualizarStockBatch', () => {
    it('debe actualizar múltiples stocks en batch', async () => {
      const operaciones = [
        { stockId: 'uuid-1', cantidad: 10, operacion: 'incrementar' },
        { stockId: 'uuid-2', cantidad: 5, operacion: 'decrementar' },
      ];

      // Mock para cada llamada individual
      supabase.rpc.mockResolvedValue({
        data: [{ success: true }],
        error: null,
      });

      const result = await stockService.actualizarStockBatch(operaciones);

      expect(supabase.rpc).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.actualizados).toBe(2);
      expect(result.errores).toHaveLength(0);
    });

    it('debe manejar errores parciales en batch', async () => {
      const operaciones = [
        { stockId: 'uuid-1', cantidad: 10, operacion: 'incrementar' },
        { stockId: 'uuid-invalido', cantidad: 5, operacion: 'decrementar' },
      ];

      // Primera llamada exitosa, segunda falla
      supabase.rpc
        .mockResolvedValueOnce({ data: [{ success: true }], error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const result = await stockService.actualizarStockBatch(operaciones);

      expect(result.success).toBe(false); // Falló al menos una
      expect(result.actualizados).toBe(1);
      expect(result.errores).toHaveLength(1);
    });
  });

  // ========================================
  // validarStockDisponible()
  // ========================================
  describe('validarStockDisponible', () => {
    it('debe retornar true si hay stock suficiente', async () => {
      const mockStock = { stock_actual: 100, stock_minimo: 10 };

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockStock,
          error: null,
        }),
      };

      supabase.from.mockReturnValue(mockFrom);

      const result = await stockService.validarStockDisponible('uuid-stock', 50);

      expect(result.data.disponible).toBe(true);
      expect(result.data.stock_actual).toBe(100);
      expect(result.data.cantidad_requerida).toBe(50);
    });

    it('debe retornar false si no hay stock suficiente', async () => {
      const mockStock = { stock_actual: 20, stock_minimo: 10 };

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockStock,
          error: null,
        }),
      };

      supabase.from.mockReturnValue(mockFrom);

      const result = await stockService.validarStockDisponible('uuid-stock', 50);

      expect(result.data.disponible).toBe(false);
      expect(result.data.faltante).toBe(30);
    });
  });
});
