// ========================================
// TESTS UI - AuditoriaViewerVirtualized
// Sprint 6.5 - Tests de componente con virtualización
// ========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuditoriaViewerVirtualized from '../../src/components/auditoria/AuditoriaViewerVirtualized';
import * as useAuditoriaHooks from '../../src/hooks/useAuditoria';

// ========================================
// MOCKS
// ========================================

// Mock de react-window
vi.mock('react-window', () => ({
  FixedSizeList: vi.fn(({ children, itemCount }) => {
    const items = [];
    for (let i = 0; i < Math.min(itemCount, 10); i++) {
      items.push(children({ index: i, style: {} }));
    }
    return <div data-testid="virtualized-list">{items}</div>;
  }),
}));

// Mock data
const mockAuditoriaData = [
  {
    id: '1',
    timestamp: '2024-01-15T10:30:00Z',
    operacion: 'INSERT',
    tabla_nombre: 'arbol_recetas',
    registro_id: 'rec-001',
    registro_codigo: 'REC-001',
    descripcion_cambio: 'Creada nueva receta: Pan Francés',
    usuario_email: 'admin@test.com',
    datos_anteriores: null,
    datos_nuevos: {
      codigo: 'REC-001',
      nombre: 'Pan Francés',
      descripcion: 'Receta de pan francés tradicional',
    },
  },
  {
    id: '2',
    timestamp: '2024-01-15T11:45:00Z',
    operacion: 'UPDATE',
    tabla_nombre: 'arbol_materia_prima',
    registro_id: 'mp-001',
    registro_codigo: 'MP-001',
    descripcion_cambio: 'Actualizado stock de Harina Integral',
    usuario_email: 'jefe@test.com',
    datos_anteriores: {
      stock_actual: 50,
    },
    datos_nuevos: {
      stock_actual: 75,
    },
  },
  {
    id: '3',
    timestamp: '2024-01-15T12:00:00Z',
    operacion: 'DELETE',
    tabla_nombre: 'arbol_recetas',
    registro_id: 'rec-002',
    registro_codigo: 'REC-002',
    descripcion_cambio: 'Eliminada receta obsoleta',
    usuario_email: 'admin@test.com',
    datos_anteriores: {
      codigo: 'REC-002',
      nombre: 'Receta Antigua',
    },
    datos_nuevos: null,
  },
];

// ========================================
// HELPER: Crear wrapper con QueryClient
// ========================================
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0, staleTime: 0 },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ========================================
// TESTS
// ========================================

describe('AuditoriaViewerVirtualized - Renderizado Inicial', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(useAuditoriaHooks, 'useAuditoriaLegible').mockReturnValue({
      data: mockAuditoriaData,
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.spyOn(useAuditoriaHooks, 'useBuscarAuditoria').mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('debe renderizar el componente con título correcto', () => {
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    expect(screen.getByText(/Auditoría del Sistema \(Virtualizada\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Versión optimizada con react-window para listas grandes/i)
    ).toBeInTheDocument();
  });

  it('debe mostrar estadísticas correctas', async () => {
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Verificar que las estadísticas aparecen con los valores correctos
      const stats = screen.getByText('Total Registros').closest('div');
      expect(stats).toHaveTextContent('3');
    }, { timeout: 3000 });
  });

  it('debe renderizar tabla virtualizada', () => {
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    const virtualizedList = screen.getByTestId('virtualized-list');
    expect(virtualizedList).toBeInTheDocument();
  });

  it('debe mostrar registros de auditoría en la tabla', async () => {
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Creada nueva receta: Pan Francés/i)).toBeInTheDocument();
      expect(screen.getByText(/Actualizado stock de Harina Integral/i)).toBeInTheDocument();
    });
  });
});

describe('AuditoriaViewerVirtualized - Estados de Carga', () => {
  it('debe mostrar spinner mientras carga', () => {
    vi.spyOn(useAuditoriaHooks, 'useAuditoriaLegible').mockReturnValue({
      data: null,
      isLoading: true,
      refetch: vi.fn(),
    });

    vi.spyOn(useAuditoriaHooks, 'useBuscarAuditoria').mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    expect(screen.getByText(/Cargando auditoría.../i)).toBeInTheDocument();
  });

  it('debe manejar datos vacíos correctamente', () => {
    vi.spyOn(useAuditoriaHooks, 'useAuditoriaLegible').mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.spyOn(useAuditoriaHooks, 'useBuscarAuditoria').mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    expect(screen.getByText(/No hay registros de auditoría/i)).toBeInTheDocument();
  });
});

describe('AuditoriaViewerVirtualized - Filtros', () => {
  beforeEach(() => {
    vi.spyOn(useAuditoriaHooks, 'useAuditoriaLegible').mockReturnValue({
      data: mockAuditoriaData,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('debe filtrar por búsqueda de texto', async () => {
    const user = userEvent.setup();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    // Esperar a que los datos se carguen primero
    await waitFor(() => {
      expect(screen.getByText(/Creada nueva receta/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar en descripción/i);
    await user.type(searchInput, 'Pan');

    // Esperar a que aparezca el indicador de filtros activos
    await waitFor(() => {
      expect(screen.getByText(/resultado\(s\) encontrado\(s\) con filtros activos/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('debe filtrar por tabla', async () => {
    const user = userEvent.setup();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    const selects = screen.getAllByRole('combobox');
    const tablaSelect = selects[0]; // Primer select es el de tabla
    await user.selectOptions(tablaSelect, 'arbol_recetas');

    await waitFor(() => {
      expect(tablaSelect).toHaveValue('arbol_recetas');
    });
  });

  it('debe filtrar por operación', async () => {
    const user = userEvent.setup();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    const selects = screen.getAllByRole('combobox');
    const operacionSelect = selects[1]; // Segundo select es el de operación
    await user.selectOptions(operacionSelect, 'INSERT');

    await waitFor(() => {
      expect(operacionSelect).toHaveValue('INSERT');
    });
  });

  it('debe permitir cambiar el límite de registros', async () => {
    const user = userEvent.setup();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    const selects = screen.getAllByRole('combobox');
    const limiteSelect = selects[2]; // Tercer select es el de límite
    await user.selectOptions(limiteSelect, '200');

    await waitFor(() => {
      expect(limiteSelect).toHaveValue('200');
    });
  });

  it('debe limpiar filtros al hacer click en botón limpiar', async () => {
    vi.spyOn(useAuditoriaHooks, 'useBuscarAuditoria').mockReturnValue({
      data: mockAuditoriaData,
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    // Aplicar filtros
    const searchInput = screen.getByPlaceholderText(/Buscar en descripción/i);
    await user.type(searchInput, 'test');

    const selects = screen.getAllByRole('combobox');
    const tablaSelect = selects[0];
    await user.selectOptions(tablaSelect, 'arbol_recetas');

    // Limpiar filtros
    const limpiarButton = screen.getByText(/🗑️ Limpiar/i);
    await user.click(limpiarButton);

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
      expect(tablaSelect).toHaveValue('todas');
    });
  });
});

describe('AuditoriaViewerVirtualized - Modal de Detalles', () => {
  beforeEach(() => {
    vi.spyOn(useAuditoriaHooks, 'useAuditoriaLegible').mockReturnValue({
      data: mockAuditoriaData,
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.spyOn(useAuditoriaHooks, 'useBuscarAuditoria').mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('debe abrir modal al hacer click en botón Ver', async () => {
    const user = userEvent.setup();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Creada nueva receta/i)).toBeInTheDocument();
    });

    const verButtons = screen.getAllByText('Ver');
    await user.click(verButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Detalles de Auditoría')).toBeInTheDocument();
    });
  });

  it('debe mostrar información completa en el modal', async () => {
    const user = userEvent.setup();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Creada nueva receta/i)).toBeInTheDocument();
    });

    const verButtons = screen.getAllByText('Ver');
    await user.click(verButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Detalles de Auditoría')).toBeInTheDocument();
      // Verificar que el modal contiene la información esperada
      const modal = screen.getByText('Detalles de Auditoría').closest('div');
      expect(modal).toHaveTextContent('INSERT');
      expect(modal).toHaveTextContent('arbol_recetas');
      expect(modal).toHaveTextContent('admin@test.com');
    });
  });

  it('debe mostrar datos nuevos para INSERT', async () => {
    const user = userEvent.setup();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Creada nueva receta/i)).toBeInTheDocument();
    });

    const verButtons = screen.getAllByText('Ver');
    await user.click(verButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Datos Nuevos')).toBeInTheDocument();
      expect(screen.queryByText('Datos Anteriores')).not.toBeInTheDocument();
    });
  });

  it('debe mostrar datos anteriores y nuevos para UPDATE', async () => {
    const user = userEvent.setup();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Actualizado stock/i)).toBeInTheDocument();
    });

    const verButtons = screen.getAllByText('Ver');
    await user.click(verButtons[1]);

    await waitFor(() => {
      // Verificar que ambas secciones están presentes
      const datosAnteriores = screen.getByText('Datos Anteriores');
      const datosNuevos = screen.getByText('Datos Nuevos');
      expect(datosAnteriores).toBeInTheDocument();
      expect(datosNuevos).toBeInTheDocument();
    });
  });

  it('debe cerrar modal al hacer click en Cerrar', async () => {
    const user = userEvent.setup();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Creada nueva receta/i)).toBeInTheDocument();
    });

    const verButtons = screen.getAllByText('Ver');
    await user.click(verButtons[0]);

    const cerrarButton = screen.getByText('Cerrar');
    await user.click(cerrarButton);

    await waitFor(() => {
      expect(screen.queryByText('Detalles de Auditoría')).not.toBeInTheDocument();
    });
  });
});

describe('AuditoriaViewerVirtualized - Badges de Operación', () => {
  beforeEach(() => {
    vi.spyOn(useAuditoriaHooks, 'useAuditoriaLegible').mockReturnValue({
      data: mockAuditoriaData,
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.spyOn(useAuditoriaHooks, 'useBuscarAuditoria').mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('debe mostrar badge INSERT en verde', async () => {
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      const insertBadge = screen.getByText('➕INSERT');
      expect(insertBadge).toHaveClass('bg-green-100');
      expect(insertBadge).toHaveClass('text-green-700');
    });
  });

  it('debe mostrar badge UPDATE en azul', async () => {
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      const updateBadge = screen.getByText('✏️UPDATE');
      expect(updateBadge).toHaveClass('bg-blue-100');
      expect(updateBadge).toHaveClass('text-blue-700');
    });
  });

  it('debe mostrar badge DELETE en rojo', async () => {
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      const deleteBadge = screen.getByText('🗑️DELETE');
      expect(deleteBadge).toHaveClass('bg-red-100');
      expect(deleteBadge).toHaveClass('text-red-700');
    });
  });
});

describe('AuditoriaViewerVirtualized - Acciones', () => {
  it('debe llamar refetch cuando se hace click en refrescar', async () => {
    const mockRefetch = vi.fn();
    vi.spyOn(useAuditoriaHooks, 'useAuditoriaLegible').mockReturnValue({
      data: mockAuditoriaData,
      isLoading: false,
      refetch: mockRefetch,
    });

    vi.spyOn(useAuditoriaHooks, 'useBuscarAuditoria').mockReturnValue({
      data: [],
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    const refrescarButton = screen.getByText(/🔄 Refrescar/i);
    await user.click(refrescarButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});

describe('AuditoriaViewerVirtualized - Virtualización', () => {
  it('debe renderizar lista virtualizada con react-window', () => {
    vi.spyOn(useAuditoriaHooks, 'useAuditoriaLegible').mockReturnValue({
      data: mockAuditoriaData,
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.spyOn(useAuditoriaHooks, 'useBuscarAuditoria').mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    const virtualizedList = screen.getByTestId('virtualized-list');
    expect(virtualizedList).toBeInTheDocument();
  });

  it('debe manejar grandes cantidades de datos eficientemente', () => {
    // Crear array de 500 registros de auditoría
    const largeDataset = Array.from({ length: 500 }, (_, i) => ({
      id: `${i}`,
      timestamp: new Date(2024, 0, 1, 10 + i).toISOString(),
      operacion: ['INSERT', 'UPDATE', 'DELETE'][i % 3],
      tabla_nombre: 'arbol_recetas',
      registro_id: `rec-${i}`,
      registro_codigo: `REC-${i.toString().padStart(3, '0')}`,
      descripcion_cambio: `Operación ${i}`,
      usuario_email: 'test@test.com',
      datos_anteriores: null,
      datos_nuevos: { test: 'data' },
    }));

    vi.spyOn(useAuditoriaHooks, 'useAuditoriaLegible').mockReturnValue({
      data: largeDataset,
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.spyOn(useAuditoriaHooks, 'useBuscarAuditoria').mockReturnValue({
      data: [],
      isLoading: false,
    });

    const startTime = performance.now();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });
    const endTime = performance.now();

    // Verificar que renderiza rápido incluso con 500 items
    expect(endTime - startTime).toBeLessThan(1000);

    const virtualizedList = screen.getByTestId('virtualized-list');
    expect(virtualizedList).toBeInTheDocument();
  });
});

describe('AuditoriaViewerVirtualized - Filtros de Fecha', () => {
  beforeEach(() => {
    vi.spyOn(useAuditoriaHooks, 'useAuditoriaLegible').mockReturnValue({
      data: mockAuditoriaData,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('debe permitir seleccionar fecha desde', async () => {
    const user = userEvent.setup();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    const dateInputs = screen.getAllByDisplayValue('');
    const fechaDesdeInput = dateInputs.find(input => input.type === 'date');
    await user.type(fechaDesdeInput, '2024-01-01');

    await waitFor(() => {
      expect(fechaDesdeInput).toHaveValue('2024-01-01');
    });
  });

  it('debe permitir seleccionar fecha hasta', async () => {
    const user = userEvent.setup();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    const dateInputs = screen.getAllByDisplayValue('').filter(input => input.type === 'date');
    const fechaHastaInput = dateInputs[1]; // Segundo input de fecha
    await user.type(fechaHastaInput, '2024-01-31');

    await waitFor(() => {
      expect(fechaHastaInput).toHaveValue('2024-01-31');
    });
  });

  it('debe mostrar indicador de filtros activos cuando hay fechas', async () => {
    vi.spyOn(useAuditoriaHooks, 'useBuscarAuditoria').mockReturnValue({
      data: mockAuditoriaData,
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<AuditoriaViewerVirtualized />, { wrapper: createWrapper() });

    const dateInputs = screen.getAllByDisplayValue('').filter(input => input.type === 'date');
    const fechaDesdeInput = dateInputs[0];
    await user.type(fechaDesdeInput, '2024-01-01');

    await waitFor(() => {
      expect(screen.getByText(/resultado\(s\) encontrado\(s\) con filtros activos/i)).toBeInTheDocument();
    });
  });
});
