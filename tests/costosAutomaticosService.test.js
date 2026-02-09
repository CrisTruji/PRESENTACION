// ========================================
// TESTS: costosAutomaticosService
// Sprint 5 - Tests de servicio de costos automáticos
// ========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { costosAutomaticosService } from '../src/services/costosAutomaticosService';
import { supabase } from '../src/lib/supabase';

// Mock de Supabase
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  }
}));

describe('costosAutomaticosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // RECÁLCULO DE COSTOS
  // ========================================

  describe('recalcularTodasRecetas', () => {
    it('debe recalcular todas las recetas usando RPC', async () => {
      // Arrange
      const mockData = [
        {
          recetas_actualizadas: 150,
          tiempo_ms: 2500
        }
      ];

      supabase.rpc.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const result = await costosAutomaticosService.recalcularTodasRecetas();

      // Assert
      expect(supabase.rpc).toHaveBeenCalledWith('recalcular_todas_recetas');
      expect(result.data).toEqual({
        recetas_actualizadas: 150,
        tiempo_ms: 2500,
        tiempo_segundos: '2.50'
      });
      expect(result.error).toBeNull();
    });

    it('debe manejar errores al recalcular', async () => {
      // Arrange
      const mockError = { message: 'RPC error' };

      supabase.rpc.mockResolvedValue({
        data: null,
        error: mockError
      });

      // Act
      const result = await costosAutomaticosService.recalcularTodasRecetas();

      // Assert
      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('debe manejar respuesta vacía del RPC', async () => {
      // Arrange
      supabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const result = await costosAutomaticosService.recalcularTodasRecetas();

      // Assert
      expect(result.data).toEqual({
        recetas_actualizadas: 0,
        tiempo_ms: 0,
        tiempo_segundos: '0.00'
      });
    });
  });

  describe('recalcularRecetasPendientes', () => {
    it('debe recalcular solo recetas pendientes', async () => {
      // Arrange
      const mockData = [
        {
          recetas_actualizadas: 25,
          tiempo_ms: 500
        }
      ];

      supabase.rpc.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const result = await costosAutomaticosService.recalcularRecetasPendientes();

      // Assert
      expect(supabase.rpc).toHaveBeenCalledWith('recalcular_recetas_pendientes');
      expect(result.data.recetas_actualizadas).toBe(25);
      expect(result.data.tiempo_segundos).toBe('0.50');
    });
  });

  describe('simularCambioPrecio', () => {
    it('debe simular cambio de precio y retornar recetas afectadas ordenadas', async () => {
      // Arrange
      const mockData = [
        {
          receta_id: 'rec-1',
          nombre: 'Pan Francés',
          costo_actual: 10.00,
          costo_nuevo: 11.50,
          diferencia: 1.50
        },
        {
          receta_id: 'rec-2',
          nombre: 'Pan Integral',
          costo_actual: 8.00,
          costo_nuevo: 7.00,
          diferencia: -1.00
        },
        {
          receta_id: 'rec-3',
          nombre: 'Croissant',
          costo_actual: 15.00,
          costo_nuevo: 17.50,
          diferencia: 2.50
        }
      ];

      supabase.rpc.mockResolvedValue({
        data: mockData,
        error: null
      });

      // Act
      const result = await costosAutomaticosService.simularCambioPrecio(
        'materia-123',
        5.50
      );

      // Assert
      expect(supabase.rpc).toHaveBeenCalledWith('simular_cambio_precio', {
        p_materia_prima_id: 'materia-123',
        p_nuevo_precio: 5.50
      });

      // Verificar que está ordenado por impacto absoluto descendente
      expect(result.data[0].diferencia).toBe(2.50);  // Mayor impacto
      expect(result.data[1].diferencia).toBe(1.50);
      expect(result.data[2].diferencia).toBe(-1.00); // Menor impacto
    });

    it('debe manejar simulación sin recetas afectadas', async () => {
      // Arrange
      supabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      // Act
      const result = await costosAutomaticosService.simularCambioPrecio(
        'materia-999',
        10.00
      );

      // Assert
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  // ========================================
  // CONSULTAS DE ESTADO
  // ========================================

  describe('getRecetasCostosPendientes', () => {
    it('debe obtener recetas con costos pendientes', async () => {
      // Arrange
      const mockData = [
        { id: '1', nombre: 'Receta 1', diferencia: 5.50 },
        { id: '2', nombre: 'Receta 2', diferencia: 3.20 }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockData,
          error: null
        })
      };

      supabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await costosAutomaticosService.getRecetasCostosPendientes(50);

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('recetas_costos_pendientes');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('diferencia', { ascending: false });
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(result.data).toEqual(mockData);
    });

    it('debe usar límite por defecto de 50', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      supabase.from.mockReturnValue(mockQuery);

      // Act
      await costosAutomaticosService.getRecetasCostosPendientes();

      // Assert
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('contarRecetasPendientes', () => {
    it('debe contar recetas con cambios pendientes', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn(),
        eq: vi.fn()
      };

      // Configurar el chain: cada llamada retorna mockQuery excepto la última
      mockQuery.select.mockReturnValue(mockQuery);

      // Primer eq retorna mockQuery para permitir el segundo eq
      mockQuery.eq.mockReturnValueOnce(mockQuery);

      // Segundo eq retorna la promesa con el resultado
      mockQuery.eq.mockResolvedValueOnce({
        count: 42,
        error: null
      });

      supabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await costosAutomaticosService.contarRecetasPendientes();

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('arbol_recetas');
      expect(mockQuery.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
      expect(result.data).toBe(42);
      expect(result.error).toBeNull();
    });
  });

  describe('getImpactoCambioPrecio', () => {
    it('debe obtener impacto global sin filtro de materia prima', async () => {
      // Arrange
      const mockData = [
        { materia_prima_id: 'mat-1', nombre: 'Harina', recetas_afectadas: 50 },
        { materia_prima_id: 'mat-2', nombre: 'Azúcar', recetas_afectadas: 30 }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockData,
          error: null
        })
      };

      supabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await costosAutomaticosService.getImpactoCambioPrecio(null, 1);

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('impacto_cambio_precio');
      expect(mockQuery.gte).toHaveBeenCalledWith('recetas_afectadas', 1);
      expect(mockQuery.order).toHaveBeenCalledWith('recetas_afectadas', { ascending: false });
      expect(result.data).toEqual(mockData);
    });

    it('debe filtrar por materia prima específica', async () => {
      // Arrange
      const mockData = [
        { materia_prima_id: 'mat-123', nombre: 'Harina', recetas_afectadas: 50 }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockData,
          error: null
        })
      };

      supabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await costosAutomaticosService.getImpactoCambioPrecio('mat-123', 5);

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('materia_prima_id', 'mat-123');
      expect(result.data).toEqual(mockData);
    });
  });

  describe('getMateriasPrimasMasUsadas', () => {
    it('debe obtener top materias primas más usadas', async () => {
      // Arrange
      const mockData = [
        { materia_prima_id: 'mat-1', nombre: 'Harina', recetas_afectadas: 100 },
        { materia_prima_id: 'mat-2', nombre: 'Azúcar', recetas_afectadas: 85 },
        { materia_prima_id: 'mat-3', nombre: 'Sal', recetas_afectadas: 70 }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockData,
          error: null
        })
      };

      supabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await costosAutomaticosService.getMateriasPrimasMasUsadas(20);

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('impacto_cambio_precio');
      expect(mockQuery.order).toHaveBeenCalledWith('recetas_afectadas', { ascending: false });
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
      expect(result.data).toHaveLength(3);
    });

    it('debe usar límite por defecto de 20', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      supabase.from.mockReturnValue(mockQuery);

      // Act
      await costosAutomaticosService.getMateriasPrimasMasUsadas();

      // Assert
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });
  });

  // ========================================
  // ANÁLISIS DE COSTOS
  // ========================================

  describe('getRecetasMayorVariacion', () => {
    it('debe obtener recetas con mayor variación y calcular porcentajes', async () => {
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
          costo_actual: 20.00,
          costo_nuevo: 18.00,
          diferencia: -2.00
        }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockData,
          error: null
        })
      };

      supabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await costosAutomaticosService.getRecetasMayorVariacion(20);

      // Assert
      expect(result.data[0].porcentaje_cambio).toBe('20.00'); // 2/10 * 100
      expect(result.data[1].porcentaje_cambio).toBe('-10.00'); // -2/20 * 100
    });

    it('debe manejar división por cero en porcentaje', async () => {
      // Arrange
      const mockData = [
        {
          id: 'rec-1',
          nombre: 'Nueva Receta',
          costo_actual: 0,
          costo_nuevo: 5.00,
          diferencia: 5.00
        }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockData,
          error: null
        })
      };

      supabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await costosAutomaticosService.getRecetasMayorVariacion(20);

      // Assert
      expect(result.data[0].porcentaje_cambio).toBe(0);
    });
  });

  describe('getEstadisticasCostos', () => {
    it('debe calcular estadísticas completas de costos', async () => {
      // Arrange
      const mockPendientes = [
        { id: '1', diferencia: 5.00 },   // Aumento
        { id: '2', diferencia: -3.00 },  // Disminución
        { id: '3', diferencia: 10.00 },  // Mayor aumento
        { id: '4', diferencia: -8.00 },  // Mayor disminución
        { id: '5', diferencia: 0 }       // Sin cambio
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockPendientes,
          error: null
        })
      };

      supabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await costosAutomaticosService.getEstadisticasCostos();

      // Assert
      expect(result.data.total_pendientes).toBe(5);
      expect(result.data.aumentos).toBe(2);
      expect(result.data.disminuciones).toBe(2);
      expect(result.data.sin_cambio).toBe(1);
      expect(result.data.mayor_aumento).toBe(10.00);
      expect(result.data.mayor_disminucion).toBe(-8.00);
      expect(result.data.diferencia_total).toBe(26.00); // |5| + |-3| + |10| + |-8| + |0|
      expect(result.data.diferencia_promedio).toBe('5.20'); // 26/5
    });

    it('debe manejar lista vacía de pendientes', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      supabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await costosAutomaticosService.getEstadisticasCostos();

      // Assert
      expect(result.data.total_pendientes).toBe(0);
      expect(result.data.diferencia_promedio).toBe(0);
      expect(result.data.mayor_aumento).toBe(0);
      expect(result.data.mayor_disminucion).toBe(0);
    });
  });

  describe('compararCostos', () => {
    it('debe comparar costo actual vs nuevo de una receta', async () => {
      // Arrange
      const mockReceta = {
        id: 'rec-123',
        codigo: 'REC-001',
        nombre: 'Pan Francés',
        costo_calculado: 10.00,
        cambios_pendientes: true
      };

      const mockIngredientes = [
        {
          id: 'ing-1',
          cantidad_requerida: 2.5,
          materia_prima: {
            id: 'mat-1',
            codigo: 'HAR-001',
            nombre: 'Harina',
            costo_promedio: 3.00
          }
        },
        {
          id: 'ing-2',
          cantidad_requerida: 1.0,
          materia_prima: {
            id: 'mat-2',
            codigo: 'AZU-001',
            nombre: 'Azúcar',
            costo_promedio: 4.00
          }
        }
      ];

      // Mock primera llamada (receta)
      const mockRecetaQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockReceta,
          error: null
        })
      };

      // Mock segunda llamada (ingredientes)
      const mockIngQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      };

      mockIngQuery.eq.mockReturnValueOnce(mockIngQuery);
      mockIngQuery.eq.mockResolvedValue({
        data: mockIngredientes,
        error: null
      });

      supabase.from
        .mockReturnValueOnce(mockRecetaQuery)
        .mockReturnValueOnce(mockIngQuery);

      // Act
      const result = await costosAutomaticosService.compararCostos('rec-123');

      // Assert
      // Costo nuevo = (2.5 * 3.00) + (1.0 * 4.00) = 7.50 + 4.00 = 11.50
      // Diferencia = 11.50 - 10.00 = 1.50
      // Porcentaje = (1.50 / 10.00) * 100 = 15.00%

      expect(result.data.receta).toEqual({
        id: mockReceta.id,
        codigo: mockReceta.codigo,
        nombre: mockReceta.nombre
      });
      expect(result.data.costo_nuevo).toBe(11.50);
      expect(result.data.diferencia).toBe(1.50);
      expect(result.data.porcentaje_cambio).toBe(15.00);
      expect(result.data.ingredientes_count).toBe(2);
    });

    it('debe manejar error al obtener receta', async () => {
      // Arrange
      const mockError = { message: 'Receta no encontrada' };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      };

      supabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await costosAutomaticosService.compararCostos('rec-999');

      // Assert
      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('debe manejar ingredientes sin costo promedio', async () => {
      // Arrange
      const mockReceta = {
        id: 'rec-123',
        nombre: 'Pan Integral',
        costo_calculado: 5.00,
        cambios_pendientes: false
      };

      const mockIngredientes = [
        {
          id: 'ing-1',
          cantidad_requerida: null,
          materia_prima: {
            id: 'mat-1',
            nombre: 'Harina',
            costo_promedio: null
          }
        }
      ];

      const mockRecetaQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockReceta,
          error: null
        })
      };

      const mockIngQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      };

      mockIngQuery.eq.mockReturnValueOnce(mockIngQuery);
      mockIngQuery.eq.mockResolvedValue({
        data: mockIngredientes,
        error: null
      });

      supabase.from
        .mockReturnValueOnce(mockRecetaQuery)
        .mockReturnValueOnce(mockIngQuery);

      // Act
      const result = await costosAutomaticosService.compararCostos('rec-123');

      // Assert
      expect(result.data.costo_nuevo).toBe(0);
      expect(result.data.diferencia).toBe(-5.00);
    });
  });
});
