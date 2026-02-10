// Tests para useArbolRecetasStore
import { describe, it, expect, beforeEach } from 'vitest';
import { useArbolRecetasStore } from '../src/features/products/store/useArbolRecetasStore';

describe('useArbolRecetasStore', () => {
  beforeEach(() => {
    // Reset store antes de cada test
    useArbolRecetasStore.getState().reset();
  });

  describe('Estado inicial', () => {
    it('debe tener conectores vacío', () => {
      const { conectores } = useArbolRecetasStore.getState();
      expect(conectores).toEqual([]);
    });

    it('debe tener expandidos como Set vacío', () => {
      const { expandidos } = useArbolRecetasStore.getState();
      expect(expandidos).toBeInstanceOf(Set);
      expect(expandidos.size).toBe(0);
    });

    it('debe tener hijosMap como Map vacío', () => {
      const { hijosMap } = useArbolRecetasStore.getState();
      expect(hijosMap).toBeInstanceOf(Map);
      expect(hijosMap.size).toBe(0);
    });

    it('debe tener cargando en false', () => {
      const { cargando } = useArbolRecetasStore.getState();
      expect(cargando).toBe(false);
    });

    it('debe tener error en null', () => {
      const { error } = useArbolRecetasStore.getState();
      expect(error).toBeNull();
    });

    it('debe tener busqueda vacía', () => {
      const { busqueda } = useArbolRecetasStore.getState();
      expect(busqueda).toBe('');
    });

    it('debe tener resultadosBusqueda vacío', () => {
      const { resultadosBusqueda } = useArbolRecetasStore.getState();
      expect(resultadosBusqueda).toEqual([]);
    });

    it('debe tener modalAbierto en false', () => {
      const { modalAbierto } = useArbolRecetasStore.getState();
      expect(modalAbierto).toBe(false);
    });

    it('debe tener totalRecetas en 0', () => {
      const { totalRecetas } = useArbolRecetasStore.getState();
      expect(totalRecetas).toBe(0);
    });
  });

  describe('Acciones disponibles', () => {
    it('debe tener método cargarArbol', () => {
      const { cargarArbol } = useArbolRecetasStore.getState();
      expect(typeof cargarArbol).toBe('function');
    });

    it('debe tener método toggleNodo', () => {
      const { toggleNodo } = useArbolRecetasStore.getState();
      expect(typeof toggleNodo).toBe('function');
    });

    it('debe tener método buscarRecetas', () => {
      const { buscarRecetas } = useArbolRecetasStore.getState();
      expect(typeof buscarRecetas).toBe('function');
    });

    it('debe tener método abrirModal', () => {
      const { abrirModal } = useArbolRecetasStore.getState();
      expect(typeof abrirModal).toBe('function');
    });

    it('debe tener método cerrarModal', () => {
      const { cerrarModal } = useArbolRecetasStore.getState();
      expect(typeof cerrarModal).toBe('function');
    });

    it('debe tener método limpiarBusqueda', () => {
      const { limpiarBusqueda } = useArbolRecetasStore.getState();
      expect(typeof limpiarBusqueda).toBe('function');
    });

    it('debe tener método refrescar', () => {
      const { refrescar } = useArbolRecetasStore.getState();
      expect(typeof refrescar).toBe('function');
    });

    it('debe tener método reset', () => {
      const { reset } = useArbolRecetasStore.getState();
      expect(typeof reset).toBe('function');
    });
  });

  describe('Mutaciones de estado', () => {
    it('abrirModal debe actualizar estado correctamente', () => {
      const store = useArbolRecetasStore.getState();
      const mockReceta = { id: '123', nombre: 'Test Receta' };

      store.abrirModal('ver', mockReceta);

      const newState = useArbolRecetasStore.getState();
      expect(newState.modalAbierto).toBe(true);
      expect(newState.modoModal).toBe('ver');
      expect(newState.recetaSeleccionada).toEqual(mockReceta);
    });

    it('abrirModal con modo crear debe establecer padre', () => {
      const store = useArbolRecetasStore.getState();
      const mockPadre = { id: '456', nombre: 'Padre' };

      store.abrirModal('crear', null, mockPadre);

      const newState = useArbolRecetasStore.getState();
      expect(newState.modalAbierto).toBe(true);
      expect(newState.modoModal).toBe('crear');
      expect(newState.recetaSeleccionada).toBeNull();
      expect(newState.padreParaCrear).toEqual(mockPadre);
    });

    it('cerrarModal debe limpiar estado', () => {
      const store = useArbolRecetasStore.getState();

      // Primero abrir modal
      store.abrirModal('ver', { id: '123' });

      // Luego cerrar
      store.cerrarModal();

      const newState = useArbolRecetasStore.getState();
      expect(newState.modalAbierto).toBe(false);
      expect(newState.recetaSeleccionada).toBeNull();
      expect(newState.padreParaCrear).toBeNull();
    });

    it('limpiarBusqueda debe resetear búsqueda', () => {
      const store = useArbolRecetasStore.getState();

      // Simular búsqueda activa
      useArbolRecetasStore.setState({
        busqueda: 'arroz',
        resultadosBusqueda: [{ id: '1' }],
        buscando: true
      });

      // Limpiar
      store.limpiarBusqueda();

      const newState = useArbolRecetasStore.getState();
      expect(newState.busqueda).toBe('');
      expect(newState.resultadosBusqueda).toEqual([]);
      expect(newState.buscando).toBe(false);
    });

    it('reset debe volver al estado inicial', () => {
      const store = useArbolRecetasStore.getState();

      // Modificar varios estados
      useArbolRecetasStore.setState({
        conectores: [{ id: '1' }],
        expandidos: new Set(['1', '2']),
        hijosMap: new Map([['1', [{ id: '2' }]]]),
        busqueda: 'test',
        modalAbierto: true
      });

      // Reset
      store.reset();

      const newState = useArbolRecetasStore.getState();
      expect(newState.conectores).toEqual([]);
      expect(newState.expandidos.size).toBe(0);
      expect(newState.hijosMap.size).toBe(0);
      expect(newState.busqueda).toBe('');
      expect(newState.modalAbierto).toBe(false);
    });
  });

  describe('Estructura de datos', () => {
    it('expandidos debe ser un Set', () => {
      const { expandidos } = useArbolRecetasStore.getState();
      expect(expandidos).toBeInstanceOf(Set);
    });

    it('hijosMap debe ser un Map', () => {
      const { hijosMap } = useArbolRecetasStore.getState();
      expect(hijosMap).toBeInstanceOf(Map);
    });

    it('debe poder agregar IDs a expandidos', () => {
      const store = useArbolRecetasStore.getState();
      const nuevoExpandidos = new Set(store.expandidos);
      nuevoExpandidos.add('test-id-1');
      nuevoExpandidos.add('test-id-2');

      useArbolRecetasStore.setState({ expandidos: nuevoExpandidos });

      const newState = useArbolRecetasStore.getState();
      expect(newState.expandidos.has('test-id-1')).toBe(true);
      expect(newState.expandidos.has('test-id-2')).toBe(true);
      expect(newState.expandidos.size).toBe(2);
    });

    it('debe poder agregar entradas a hijosMap', () => {
      const store = useArbolRecetasStore.getState();
      const nuevoHijosMap = new Map(store.hijosMap);
      nuevoHijosMap.set('parent-1', [{ id: 'child-1' }, { id: 'child-2' }]);

      useArbolRecetasStore.setState({ hijosMap: nuevoHijosMap });

      const newState = useArbolRecetasStore.getState();
      expect(newState.hijosMap.has('parent-1')).toBe(true);
      expect(newState.hijosMap.get('parent-1')).toHaveLength(2);
    });
  });
});
