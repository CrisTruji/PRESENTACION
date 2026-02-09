// ========================================
// TESTS UI - StockManagerVirtualized
// Sprint 6.5 - Tests de componente con virtualización
// ========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StockManagerVirtualized from '../../src/components/stock/StockManagerVirtualized';
import * as useStockHooks from '../../src/hooks/useStock';

// ========================================
// MOCKS
// ========================================

// Mock de react-window
vi.mock('react-window', () => ({
  FixedSizeList: vi.fn(({ children, itemCount }) => {
    // Renderizar solo los primeros 10 items para testing
    const items = [];
    for (let i = 0; i < Math.min(itemCount, 10); i++) {
      items.push(children({ index: i, style: {} }));
    }
    return <div data-testid="virtualized-list">{items}</div>;
  }),
}));

// Mock de lucide-react
vi.mock('lucide-react', () => ({
  AlertCircle: () => <div>AlertCircle</div>,
  Package: () => <div>Package</div>,
  RefreshCw: () => <div>RefreshCw</div>,
}));

// Mock data
const mockStockConAlertas = [
  {
    id: '1',
    codigo: 'MP-001',
    nombre: 'Harina Integral',
    categoria_nombre: 'Harinas',
    stock_actual: 5,
    stock_minimo: 10,
    stock_maximo: 100,
    unidad_medida: 'kg',
    estado_stock: 'BAJO',
    valor_inventario: 50.5,
    maneja_stock: true,
  },
  {
    id: '2',
    codigo: 'MP-002',
    nombre: 'Azúcar Blanca',
    categoria_nombre: 'Endulzantes',
    stock_actual: 2,
    stock_minimo: 15,
    stock_maximo: 80,
    unidad_medida: 'kg',
    estado_stock: 'CRÍTICO',
    valor_inventario: 20.0,
    maneja_stock: true,
  },
  {
    id: '3',
    codigo: 'MP-003',
    nombre: 'Aceite de Oliva',
    categoria_nombre: 'Aceites',
    stock_actual: 50,
    stock_minimo: 10,
    stock_maximo: 60,
    unidad_medida: 'litro',
    estado_stock: 'NORMAL',
    valor_inventario: 500.0,
    maneja_stock: true,
  },
];

const mockStockBajo = mockStockConAlertas.filter((item) =>
  ['CRÍTICO', 'BAJO'].includes(item.estado_stock)
);

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

describe('StockManagerVirtualized - Renderizado Inicial', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock hooks con datos
    vi.spyOn(useStockHooks, 'useStockConAlertas').mockReturnValue({
      data: mockStockConAlertas,
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.spyOn(useStockHooks, 'useStockBajo').mockReturnValue({
      data: mockStockBajo,
      isLoading: false,
    });

    vi.spyOn(useStockHooks, 'useActualizarStock').mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
    });
  });

  it('debe renderizar el componente con título correcto', () => {
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    expect(screen.getByText(/Gestión de Stock \(Virtualizado\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Versión optimizada con react-window para listas grandes/i)
    ).toBeInTheDocument();
  });

  it('debe mostrar estadísticas correctas', async () => {
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Verificar que las estadísticas aparecen con los valores correctos
      const stats = screen.getByText('Total Items').closest('div');
      expect(stats).toHaveTextContent('3');
    }, { timeout: 3000 });
  });

  it('debe renderizar tabla virtualizada', () => {
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    const virtualizedList = screen.getByTestId('virtualized-list');
    expect(virtualizedList).toBeInTheDocument();
  });

  it('debe mostrar items de stock en la tabla', async () => {
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Harina Integral')).toBeInTheDocument();
      expect(screen.getByText('Azúcar Blanca')).toBeInTheDocument();
    });
  });
});

describe('StockManagerVirtualized - Estados de Carga', () => {
  it('debe mostrar spinner mientras carga', () => {
    vi.spyOn(useStockHooks, 'useStockConAlertas').mockReturnValue({
      data: null,
      isLoading: true,
      refetch: vi.fn(),
    });

    vi.spyOn(useStockHooks, 'useStockBajo').mockReturnValue({
      data: null,
      isLoading: true,
    });

    vi.spyOn(useStockHooks, 'useActualizarStock').mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
    });

    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    expect(screen.getByText(/Cargando stock.../i)).toBeInTheDocument();
  });

  it('debe manejar datos vacíos correctamente', () => {
    vi.spyOn(useStockHooks, 'useStockConAlertas').mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.spyOn(useStockHooks, 'useStockBajo').mockReturnValue({
      data: [],
      isLoading: false,
    });

    vi.spyOn(useStockHooks, 'useActualizarStock').mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
    });

    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    expect(screen.getByText(/No hay items que coincidan con los filtros/i)).toBeInTheDocument();
  });
});

describe('StockManagerVirtualized - Filtros y Búsqueda', () => {
  beforeEach(() => {
    vi.spyOn(useStockHooks, 'useStockConAlertas').mockReturnValue({
      data: mockStockConAlertas,
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.spyOn(useStockHooks, 'useStockBajo').mockReturnValue({
      data: mockStockBajo,
      isLoading: false,
    });

    vi.spyOn(useStockHooks, 'useActualizarStock').mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
    });
  });

  it('debe filtrar por búsqueda de texto', async () => {
    const user = userEvent.setup();
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    // Esperar a que los datos se carguen primero
    await waitFor(() => {
      expect(screen.getByText('Harina Integral')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre o código/i);
    await user.type(searchInput, 'Harina');

    // Después de filtrar, Azúcar debe desaparecer
    await waitFor(() => {
      expect(screen.queryByText('Azúcar Blanca')).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('debe cambiar entre vista de alertas y todo el stock', async () => {
    const user = userEvent.setup();
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    // Inicialmente en vista alertas
    const alertasTab = screen.getByText(/⚠️ Alertas/i);
    expect(alertasTab).toHaveClass('bg-primary');

    // Cambiar a todo el stock
    const todoTab = screen.getByText(/📋 Todo el Stock/i);
    await user.click(todoTab);

    await waitFor(() => {
      expect(todoTab).toHaveClass('bg-primary');
    });
  });

  it('debe filtrar por estado de stock', async () => {
    const user = userEvent.setup();
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    // Esperar a que los datos se carguen
    await waitFor(() => {
      expect(screen.getByText('Azúcar Blanca')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    const filtroEstado = selects.find(select => select.querySelector('option[value="CRÍTICO"]'));
    await user.selectOptions(filtroEstado, 'CRÍTICO');

    // Aceite de Oliva (NORMAL) debe desaparecer
    await waitFor(() => {
      expect(screen.queryByText('Aceite de Oliva')).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });
});

describe('StockManagerVirtualized - Modal de Actualización', () => {
  beforeEach(() => {
    vi.spyOn(useStockHooks, 'useStockConAlertas').mockReturnValue({
      data: mockStockConAlertas,
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.spyOn(useStockHooks, 'useStockBajo').mockReturnValue({
      data: mockStockBajo,
      isLoading: false,
    });

    vi.spyOn(useStockHooks, 'useActualizarStock').mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
    });
  });

  it('debe abrir modal al hacer click en botón Actualizar', async () => {
    const user = userEvent.setup();
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Harina Integral')).toBeInTheDocument();
    });

    const actualizarButtons = screen.getAllByText('Actualizar');
    await user.click(actualizarButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Actualizar Stock')).toBeInTheDocument();
      expect(screen.getByText(/Stock actual:/i)).toBeInTheDocument();
    });
  });

  it('debe cerrar modal al hacer click en Cancelar', async () => {
    const user = userEvent.setup();
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Harina Integral')).toBeInTheDocument();
    });

    const actualizarButtons = screen.getAllByText('Actualizar');
    await user.click(actualizarButtons[0]);

    const cancelarButton = screen.getByText('Cancelar');
    await user.click(cancelarButton);

    await waitFor(() => {
      expect(screen.queryByText('Actualizar Stock')).not.toBeInTheDocument();
    });
  });

  it('debe permitir ingresar cantidad y seleccionar operación', async () => {
    const user = userEvent.setup();
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Harina Integral')).toBeInTheDocument();
    });

    const actualizarButtons = screen.getAllByText('Actualizar');
    await user.click(actualizarButtons[0]);

    // Esperar a que el modal se abra
    await waitFor(() => {
      expect(screen.getByText('Actualizar Stock')).toBeInTheDocument();
    });

    const cantidadInput = screen.getByPlaceholderText(/Ej: 50/i);
    await user.type(cantidadInput, '25');

    const selects = screen.getAllByRole('combobox');
    const operacionSelect = selects[0]; // El select del modal
    await user.selectOptions(operacionSelect, 'decrementar');

    await waitFor(() => {
      expect(cantidadInput).toHaveValue(25);
    });
  });
});

describe('StockManagerVirtualized - Acciones', () => {
  it('debe llamar refetch cuando se hace click en refrescar', async () => {
    const mockRefetch = vi.fn();
    vi.spyOn(useStockHooks, 'useStockConAlertas').mockReturnValue({
      data: mockStockConAlertas,
      isLoading: false,
      refetch: mockRefetch,
    });

    vi.spyOn(useStockHooks, 'useStockBajo').mockReturnValue({
      data: mockStockBajo,
      isLoading: false,
    });

    vi.spyOn(useStockHooks, 'useActualizarStock').mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    const refrescarButton = screen.getByTitle('Refrescar datos');
    await user.click(refrescarButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('debe actualizar stock correctamente', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    vi.spyOn(useStockHooks, 'useStockConAlertas').mockReturnValue({
      data: mockStockConAlertas,
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.spyOn(useStockHooks, 'useStockBajo').mockReturnValue({
      data: mockStockBajo,
      isLoading: false,
    });

    vi.spyOn(useStockHooks, 'useActualizarStock').mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
    });

    // Mock de alert
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const user = userEvent.setup();
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Harina Integral')).toBeInTheDocument();
    });

    const actualizarButtons = screen.getAllByText('Actualizar');
    await user.click(actualizarButtons[0]);

    // Esperar a que el modal se abra
    await waitFor(() => {
      expect(screen.getByText('Actualizar Stock')).toBeInTheDocument();
    });

    const cantidadInput = screen.getByPlaceholderText(/Ej: 50/i);
    await user.type(cantidadInput, '10');

    const actualizarButton = screen.getAllByRole('button').find(btn => btn.textContent === 'Actualizar');
    await user.click(actualizarButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        stockId: '1',
        cantidad: 10,
        operacion: 'incrementar',
      });
      expect(alertMock).toHaveBeenCalledWith('Stock actualizado correctamente');
    });

    alertMock.mockRestore();
  });
});

describe('StockManagerVirtualized - Colores de Estado', () => {
  beforeEach(() => {
    vi.spyOn(useStockHooks, 'useStockConAlertas').mockReturnValue({
      data: mockStockConAlertas,
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.spyOn(useStockHooks, 'useStockBajo').mockReturnValue({
      data: mockStockBajo,
      isLoading: false,
    });

    vi.spyOn(useStockHooks, 'useActualizarStock').mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
    });
  });

  it('debe mostrar badge CRÍTICO en rojo', async () => {
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      const criticoBadge = screen.getByText('CRÍTICO');
      expect(criticoBadge).toHaveClass('bg-red-100');
      expect(criticoBadge).toHaveClass('text-red-700');
    });
  });

  it('debe mostrar badge BAJO en amarillo', async () => {
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    await waitFor(() => {
      const bajoBadge = screen.getByText('BAJO');
      expect(bajoBadge).toHaveClass('bg-yellow-100');
      expect(bajoBadge).toHaveClass('text-yellow-700');
    });
  });

  it('debe mostrar badge NORMAL en verde', async () => {
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    // Primero esperar que los datos carguen
    await waitFor(() => {
      expect(screen.getByText('Aceite de Oliva')).toBeInTheDocument();
    });

    // Luego buscar el badge NORMAL
    await waitFor(() => {
      const normalBadge = screen.getByText('NORMAL');
      expect(normalBadge).toHaveClass('bg-green-100');
      expect(normalBadge).toHaveClass('text-green-700');
    }, { timeout: 2000 });
  });
});

describe('StockManagerVirtualized - Virtualización', () => {
  it('debe renderizar lista virtualizada con react-window', () => {
    vi.spyOn(useStockHooks, 'useStockConAlertas').mockReturnValue({
      data: mockStockConAlertas,
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.spyOn(useStockHooks, 'useStockBajo').mockReturnValue({
      data: mockStockBajo,
      isLoading: false,
    });

    vi.spyOn(useStockHooks, 'useActualizarStock').mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
    });

    render(<StockManagerVirtualized />, { wrapper: createWrapper() });

    const virtualizedList = screen.getByTestId('virtualized-list');
    expect(virtualizedList).toBeInTheDocument();
  });

  it('debe manejar grandes cantidades de datos eficientemente', () => {
    // Crear array de 1000 items
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i}`,
      codigo: `MP-${i.toString().padStart(3, '0')}`,
      nombre: `Producto ${i}`,
      categoria_nombre: 'Categoría Test',
      stock_actual: Math.floor(Math.random() * 100),
      stock_minimo: 10,
      stock_maximo: 100,
      unidad_medida: 'kg',
      estado_stock: i % 3 === 0 ? 'CRÍTICO' : i % 2 === 0 ? 'BAJO' : 'NORMAL',
      valor_inventario: Math.random() * 1000,
      maneja_stock: true,
    }));

    vi.spyOn(useStockHooks, 'useStockConAlertas').mockReturnValue({
      data: largeDataset,
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.spyOn(useStockHooks, 'useStockBajo').mockReturnValue({
      data: largeDataset.filter((item) => ['CRÍTICO', 'BAJO'].includes(item.estado_stock)),
      isLoading: false,
    });

    vi.spyOn(useStockHooks, 'useActualizarStock').mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
    });

    const startTime = performance.now();
    render(<StockManagerVirtualized />, { wrapper: createWrapper() });
    const endTime = performance.now();

    // Verificar que renderiza rápido incluso con 1000 items
    expect(endTime - startTime).toBeLessThan(1000); // Menos de 1 segundo

    const virtualizedList = screen.getByTestId('virtualized-list');
    expect(virtualizedList).toBeInTheDocument();
  });
});
