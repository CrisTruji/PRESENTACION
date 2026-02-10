// ========================================
// PRESENTACIONES MANAGER - Sprint 5
// Gestión completa de presentaciones (Nivel 6)
// ========================================

import React, { useState, useMemo } from 'react';
import { usePresentaciones } from '@/features/inventory';
import { useArbolRecetasStore } from '@/features/products';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Archive,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const PresentacionesManager = () => {
  // ========================================
  // ESTADO GLOBAL (Zustand)
  // ========================================
  const { nivel5Items, selectedNivel5, loadNivel5 } = useArbolRecetasStore();

  // ========================================
  // ESTADO LOCAL
  // ========================================
  const [busqueda, setBusqueda] = useState('');
  const [filtroStock, setFiltroStock] = useState(null); // null = todos
  const [ordenPor, setOrdenPor] = useState('nombre'); // 'nombre' | 'precio' | 'codigo'
  const [ordenDir, setOrdenDir] = useState('asc'); // 'asc' | 'desc'

  // Modales
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [presentacionSeleccionada, setPresentacionSeleccionada] = useState(null);

  // Formulario
  const [formulario, setFormulario] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    precio_venta: '',
    precio_compra: '',
    presentacion: '',
    unidad_medida: 'unidad',
    parent_id: null,
  });

  // ========================================
  // QUERIES
  // ========================================
  const [presentaciones, setPresentaciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Cargar presentaciones cuando cambia el filtro de stock
  React.useEffect(() => {
    cargarPresentaciones();
  }, [filtroStock]);

  const cargarPresentaciones = async () => {
    setCargando(true);
    setError(null);

    try {
      let query = supabase
        .from('arbol_materia_prima')
        .select(`
          *,
          parent:parent_id (
            id,
            codigo,
            nombre,
            stock_actual,
            unidad_medida
          )
        `)
        .eq('nivel_actual', 6)
        .eq('activo', true);

      // Filtrar por stock seleccionado
      if (filtroStock) {
        query = query.eq('parent_id', filtroStock);
      }

      const { data, error: queryError } = await query.order('nombre');

      if (queryError) throw queryError;

      setPresentaciones(data || []);
    } catch (err) {
      setError(err.message);
      console.error('[PresentacionesManager] Error:', err);
    } finally {
      setCargando(false);
    }
  };

  // Cargar stocks (nivel 5) al montar
  React.useEffect(() => {
    loadNivel5();
  }, []);

  // ========================================
  // FILTRADO Y ORDENAMIENTO
  // ========================================
  const presentacionesFiltradas = useMemo(() => {
    let resultado = [...presentaciones];

    // Búsqueda
    if (busqueda.length >= 2) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter(
        (p) =>
          p.nombre?.toLowerCase().includes(termino) ||
          p.codigo?.toLowerCase().includes(termino) ||
          p.descripcion?.toLowerCase().includes(termino)
      );
    }

    // Ordenamiento
    resultado.sort((a, b) => {
      let valorA, valorB;

      switch (ordenPor) {
        case 'nombre':
          valorA = a.nombre?.toLowerCase() || '';
          valorB = b.nombre?.toLowerCase() || '';
          break;
        case 'precio':
          valorA = a.precio_venta || 0;
          valorB = b.precio_venta || 0;
          break;
        case 'codigo':
          valorA = a.codigo?.toLowerCase() || '';
          valorB = b.codigo?.toLowerCase() || '';
          break;
        default:
          valorA = a.nombre?.toLowerCase() || '';
          valorB = b.nombre?.toLowerCase() || '';
      }

      if (valorA < valorB) return ordenDir === 'asc' ? -1 : 1;
      if (valorA > valorB) return ordenDir === 'asc' ? 1 : -1;
      return 0;
    });

    return resultado;
  }, [presentaciones, busqueda, ordenPor, ordenDir]);

  // ========================================
  // ESTADÍSTICAS
  // ========================================
  const estadisticas = useMemo(() => {
    const total = presentaciones.length;
    const conPrecio = presentaciones.filter((p) => p.precio_venta > 0).length;
    const sinPrecio = total - conPrecio;
    const precioPromedio =
      conPrecio > 0
        ? presentaciones.reduce((sum, p) => sum + (p.precio_venta || 0), 0) / conPrecio
        : 0;

    return { total, conPrecio, sinPrecio, precioPromedio };
  }, [presentaciones]);

  // ========================================
  // HANDLERS
  // ========================================
  const handleCambiarOrden = (campo) => {
    if (ordenPor === campo) {
      setOrdenDir(ordenDir === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenPor(campo);
      setOrdenDir('asc');
    }
  };

  const handleAbrirModalCrear = () => {
    setFormulario({
      codigo: '',
      nombre: '',
      descripcion: '',
      precio_venta: '',
      precio_compra: '',
      presentacion: '',
      unidad_medida: 'unidad',
      parent_id: filtroStock || null,
    });
    setModalCrear(true);
  };

  const handleAbrirModalEditar = (presentacion) => {
    setPresentacionSeleccionada(presentacion);
    setFormulario({
      codigo: presentacion.codigo || '',
      nombre: presentacion.nombre || '',
      descripcion: presentacion.descripcion || '',
      precio_venta: presentacion.precio_venta || '',
      precio_compra: presentacion.precio_compra || '',
      presentacion: presentacion.presentacion || '',
      unidad_medida: presentacion.unidad_medida || 'unidad',
      parent_id: presentacion.parent_id,
    });
    setModalEditar(true);
  };

  const handleAbrirModalEliminar = (presentacion) => {
    setPresentacionSeleccionada(presentacion);
    setModalEliminar(true);
  };

  const handleCrear = async () => {
    if (!formulario.nombre || !formulario.parent_id) {
      alert('Nombre y Stock son obligatorios');
      return;
    }

    try {
      const { error } = await supabase.from('arbol_materia_prima').insert({
        ...formulario,
        nivel_actual: 6,
        activo: true,
        precio_venta: parseFloat(formulario.precio_venta) || 0,
        precio_compra: parseFloat(formulario.precio_compra) || 0,
      });

      if (error) throw error;

      setModalCrear(false);
      cargarPresentaciones();
      alert('Presentación creada exitosamente');
    } catch (err) {
      alert('Error al crear presentación: ' + err.message);
      console.error(err);
    }
  };

  const handleEditar = async () => {
    if (!formulario.nombre) {
      alert('El nombre es obligatorio');
      return;
    }

    try {
      const { error } = await supabase
        .from('arbol_materia_prima')
        .update({
          codigo: formulario.codigo,
          nombre: formulario.nombre,
          descripcion: formulario.descripcion,
          precio_venta: parseFloat(formulario.precio_venta) || 0,
          precio_compra: parseFloat(formulario.precio_compra) || 0,
          presentacion: formulario.presentacion,
          unidad_medida: formulario.unidad_medida,
          parent_id: formulario.parent_id,
        })
        .eq('id', presentacionSeleccionada.id);

      if (error) throw error;

      setModalEditar(false);
      setPresentacionSeleccionada(null);
      cargarPresentaciones();
      alert('Presentación actualizada exitosamente');
    } catch (err) {
      alert('Error al actualizar presentación: ' + err.message);
      console.error(err);
    }
  };

  const handleEliminar = async () => {
    try {
      const { error } = await supabase
        .from('arbol_materia_prima')
        .update({ activo: false })
        .eq('id', presentacionSeleccionada.id);

      if (error) throw error;

      setModalEliminar(false);
      setPresentacionSeleccionada(null);
      cargarPresentaciones();
      alert('Presentación eliminada exitosamente');
    } catch (err) {
      alert('Error al eliminar presentación: ' + err.message);
      console.error(err);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-red-600">Error al cargar presentaciones</p>
          <p className="text-sm text-muted mt-2">{error}</p>
          <button
            onClick={cargarPresentaciones}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ========== ENCABEZADO ========== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Package className="w-8 h-8" />
            Gestión de Presentaciones
          </h1>
          <p className="text-muted mt-1">
            Administra las presentaciones finales de productos (Nivel 6)
          </p>
        </div>
        <button
          onClick={handleAbrirModalCrear}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Presentación
        </button>
      </div>

      {/* ========== ESTADÍSTICAS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Presentaciones</p>
              <p className="text-2xl font-bold text-primary">{estadisticas.total}</p>
            </div>
            <Layers className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Con Precio</p>
              <p className="text-2xl font-bold text-green-600">{estadisticas.conPrecio}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Sin Precio</p>
              <p className="text-2xl font-bold text-yellow-600">{estadisticas.sinPrecio}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Precio Promedio</p>
              <p className="text-2xl font-bold text-purple-600">
                ${estadisticas.precioPromedio.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* ========== FILTROS ========== */}
      <div className="bg-surface p-4 rounded-lg border border-border space-y-4">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <Filter className="w-5 h-5" />
          Filtros y Búsqueda
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Filtro por Stock */}
          <select
            value={filtroStock || ''}
            onChange={(e) => setFiltroStock(e.target.value || null)}
            className="px-4 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todos los Stocks</option>
            {nivel5Items?.map((stock) => (
              <option key={stock.id} value={stock.id}>
                {stock.nombre}
              </option>
            ))}
          </select>

          {/* Ordenar por */}
          <select
            value={ordenPor}
            onChange={(e) => setOrdenPor(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="nombre">Ordenar por Nombre</option>
            <option value="codigo">Ordenar por Código</option>
            <option value="precio">Ordenar por Precio</option>
          </select>
        </div>
      </div>

      {/* ========== TABLA ========== */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted">Cargando presentaciones...</p>
            </div>
          </div>
        ) : presentacionesFiltradas.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Archive className="w-16 h-16 text-muted mx-auto mb-4" />
              <p className="text-lg text-primary">No hay presentaciones</p>
              <p className="text-sm text-muted mt-2">
                {busqueda
                  ? 'No se encontraron resultados para tu búsqueda'
                  : 'Crea tu primera presentación usando el botón superior'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg border-b border-border">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer hover:bg-surface"
                    onClick={() => handleCambiarOrden('codigo')}
                  >
                    <div className="flex items-center gap-2">
                      Código
                      {ordenPor === 'codigo' &&
                        (ordenDir === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer hover:bg-surface"
                    onClick={() => handleCambiarOrden('nombre')}
                  >
                    <div className="flex items-center gap-2">
                      Nombre
                      {ordenPor === 'nombre' &&
                        (ordenDir === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Stock (Nivel 5)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Presentación
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer hover:bg-surface"
                    onClick={() => handleCambiarOrden('precio')}
                  >
                    <div className="flex items-center gap-2">
                      Precio Venta
                      {ordenPor === 'precio' &&
                        (ordenDir === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        ))}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Unidad
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {presentacionesFiltradas.map((presentacion) => (
                  <tr key={presentacion.id} className="hover:bg-bg transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-primary">
                        {presentacion.codigo || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-primary">
                          {presentacion.nombre}
                        </div>
                        {presentacion.descripcion && (
                          <div className="text-xs text-muted truncate max-w-xs">
                            {presentacion.descripcion}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-primary">
                        {presentacion.parent?.nombre || '-'}
                      </div>
                      {presentacion.parent?.stock_actual !== undefined && (
                        <div className="text-xs text-muted">
                          Stock: {presentacion.parent.stock_actual}{' '}
                          {presentacion.parent.unidad_medida}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-primary">
                        {presentacion.presentacion || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-green-600">
                        ${presentacion.precio_venta?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-muted">
                        {presentacion.unidad_medida}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAbrirModalEditar(presentacion)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAbrirModalEliminar(presentacion)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========== MODAL CREAR ========== */}
      {modalCrear && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-bold text-primary">Nueva Presentación</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    value={formulario.codigo}
                    onChange={(e) =>
                      setFormulario({ ...formulario, codigo: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ej: PRES-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formulario.nombre}
                    onChange={(e) =>
                      setFormulario({ ...formulario, nombre: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ej: Pan Francés 500g"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Stock (Nivel 5) <span className="text-red-500">*</span>
                </label>
                <select
                  value={formulario.parent_id || ''}
                  onChange={(e) =>
                    setFormulario({ ...formulario, parent_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Selecciona un stock</option>
                  {nivel5Items?.map((stock) => (
                    <option key={stock.id} value={stock.id}>
                      {stock.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Descripción
                </label>
                <textarea
                  value={formulario.descripcion}
                  onChange={(e) =>
                    setFormulario({ ...formulario, descripcion: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="3"
                  placeholder="Descripción del producto..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Precio Venta
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formulario.precio_venta}
                    onChange={(e) =>
                      setFormulario({ ...formulario, precio_venta: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Precio Compra
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formulario.precio_compra}
                    onChange={(e) =>
                      setFormulario({ ...formulario, precio_compra: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Unidad Medida
                  </label>
                  <select
                    value={formulario.unidad_medida}
                    onChange={(e) =>
                      setFormulario({ ...formulario, unidad_medida: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="unidad">Unidad</option>
                    <option value="kg">Kilogramo</option>
                    <option value="g">Gramo</option>
                    <option value="l">Litro</option>
                    <option value="ml">Mililitro</option>
                    <option value="paquete">Paquete</option>
                    <option value="caja">Caja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Presentación
                </label>
                <input
                  type="text"
                  value={formulario.presentacion}
                  onChange={(e) =>
                    setFormulario({ ...formulario, presentacion: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Bolsa 500g, Caja 12 unidades"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setModalCrear(false)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-bg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrear}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Crear Presentación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL EDITAR ========== */}
      {modalEditar && presentacionSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-bold text-primary">Editar Presentación</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    value={formulario.codigo}
                    onChange={(e) =>
                      setFormulario({ ...formulario, codigo: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formulario.nombre}
                    onChange={(e) =>
                      setFormulario({ ...formulario, nombre: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Stock (Nivel 5)
                </label>
                <select
                  value={formulario.parent_id || ''}
                  onChange={(e) =>
                    setFormulario({ ...formulario, parent_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecciona un stock</option>
                  {nivel5Items?.map((stock) => (
                    <option key={stock.id} value={stock.id}>
                      {stock.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Descripción
                </label>
                <textarea
                  value={formulario.descripcion}
                  onChange={(e) =>
                    setFormulario({ ...formulario, descripcion: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Precio Venta
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formulario.precio_venta}
                    onChange={(e) =>
                      setFormulario({ ...formulario, precio_venta: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Precio Compra
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formulario.precio_compra}
                    onChange={(e) =>
                      setFormulario({ ...formulario, precio_compra: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Unidad Medida
                  </label>
                  <select
                    value={formulario.unidad_medida}
                    onChange={(e) =>
                      setFormulario({ ...formulario, unidad_medida: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="unidad">Unidad</option>
                    <option value="kg">Kilogramo</option>
                    <option value="g">Gramo</option>
                    <option value="l">Litro</option>
                    <option value="ml">Mililitro</option>
                    <option value="paquete">Paquete</option>
                    <option value="caja">Caja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Presentación
                </label>
                <input
                  type="text"
                  value={formulario.presentacion}
                  onChange={(e) =>
                    setFormulario({ ...formulario, presentacion: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => {
                  setModalEditar(false);
                  setPresentacionSeleccionada(null);
                }}
                className="px-4 py-2 border border-border rounded-lg hover:bg-bg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditar}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL ELIMINAR ========== */}
      {modalEliminar && presentacionSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-bold text-red-600">Confirmar Eliminación</h2>
            </div>

            <div className="p-6">
              <p className="text-primary">
                ¿Estás seguro de que deseas eliminar la presentación{' '}
                <span className="font-bold">{presentacionSeleccionada.nombre}</span>?
              </p>
              <p className="text-muted text-sm mt-2">
                Esta acción marcará la presentación como inactiva. Podrás reactivarla
                desde la base de datos si es necesario.
              </p>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => {
                  setModalEliminar(false);
                  setPresentacionSeleccionada(null);
                }}
                className="px-4 py-2 border border-border rounded-lg hover:bg-bg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresentacionesManager;
