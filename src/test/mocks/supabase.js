// Mock de Supabase Client para tests
import { vi } from 'vitest';

// Mock data factory
export const createMockReceta = (overrides = {}) => ({
  id: 'mock-uuid-' + Math.random().toString(36).substr(2, 9),
  codigo: '3.001',
  nombre: 'Arroz Blanco',
  descripcion: 'Receta de arroz blanco estándar',
  nivel_actual: 2,
  parent_id: null,
  plato_id: null,
  rendimiento: 10,
  version: 1,
  activo: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

export const createMockConector = (overrides = {}) => ({
  id: 'mock-uuid-conector-' + Math.random().toString(36).substr(2, 9),
  codigo: '2.001',
  nombre: 'Conector Arroz',
  descripcion: 'Conector para recetas de arroz',
  nivel_actual: 1,
  parent_id: null,
  plato_id: 'plato-uuid',
  activo: true,
  ...overrides
});

export const createMockIngrediente = (overrides = {}) => ({
  id: 'mock-uuid-ingrediente-' + Math.random().toString(36).substr(2, 9),
  receta_id: 'receta-uuid',
  materia_prima_id: 'mp-uuid',
  cantidad_requerida: 1.5,
  unidad_medida: 'kg',
  orden: 1,
  materia_prima: {
    id: 'mp-uuid',
    codigo: '5.001',
    nombre: 'Arroz grano largo',
    costo_promedio: 25.50
  },
  ...overrides
});

// Mock del cliente Supabase
export const createMockSupabaseClient = () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockEq = vi.fn();
  const mockIn = vi.fn();
  const mockOr = vi.fn();
  const mockOrder = vi.fn();
  const mockLimit = vi.fn();
  const mockSingle = vi.fn();
  const mockExecute = vi.fn();
  const mockRpc = vi.fn();

  // Chainable methods
  const createChain = (finalData, finalError = null) => {
    const chain = {
      select: mockSelect.mockReturnValue(chain),
      insert: mockInsert.mockReturnValue(chain),
      update: mockUpdate.mockReturnValue(chain),
      delete: mockDelete.mockReturnValue(chain),
      eq: mockEq.mockReturnValue(chain),
      in: mockIn.mockReturnValue(chain),
      or: mockOr.mockReturnValue(chain),
      order: mockOrder.mockReturnValue(chain),
      limit: mockLimit.mockReturnValue(chain),
      single: mockSingle.mockResolvedValue({ data: finalData, error: finalError }),
      execute: mockExecute.mockResolvedValue({ data: finalData, error: finalError })
    };
    return chain;
  };

  const mockTable = vi.fn((tableName) => {
    return createChain([], null);
  });

  const mockFrom = vi.fn((tableName) => {
    return createChain([], null);
  });

  const supabaseClient = {
    from: mockFrom,
    table: mockTable,
    rpc: mockRpc,
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signIn: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn((callback) => {
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      })
    }
  };

  return {
    client: supabaseClient,
    mocks: {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      in: mockIn,
      or: mockOr,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      execute: mockExecute,
      rpc: mockRpc,
      table: mockTable,
      from: mockFrom
    }
  };
};

// Helper para resetear todos los mocks
export const resetSupabaseMocks = (mocks) => {
  Object.values(mocks).forEach(mock => {
    if (typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });
};
