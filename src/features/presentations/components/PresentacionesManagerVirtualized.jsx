// ========================================
// PRESENTACIONES MANAGER VIRTUALIZADO - Sprint 6.5
// Versión con react-window para listas grandes (>100 items)
// ========================================

import React, { useState, useMemo } from 'react';
import { useArbolRecetasStore } from '@/features/products';
import { VirtualizedTable, useTableColumns } from '@/shared/ui';
import { supabase } from '@/shared/api';
import notify from '@/shared/lib/notifier';

const PresentacionesManagerVirtualized = () => {
  // ========================================
  // ESTADO GLOBAL (Zustand)
  // ========================================
  const { nivel5Items, loadNivel5 } = useArbolRecetasStore();

  // ========================================
  // ESTADO LOCAL
  // ========================================
  const [busqueda, setBusqueda] = useState('');
  const [filtroStock, setFiltroStock] = useState(null);
  const [ordenPor, setOrdenPor] = useState('nombre');

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
    precio_unitario: '',
    cantidad_por_unidad: '',
    presentacion: '',
    unidad_medida: 'unidad',
    parent_id: null,
  });

  // ========================================
  // ESTADO DE DATOS
  // ========================================
  const [presentaciones, setPresentaciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // ========================================
  // CARGAR DATOS
  // ========================================
  React.useEffect(() => {
    cargarPresentaciones();
  }, [filtroStock]);

  React.useEffect(() => {
    loadNivel5();
  }, []);

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

  // ========================================
  // FILTRADO
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

    return resultado;
  }, [presentaciones, busqueda]);

  // ========================================
  // ESTADÍSTICAS
  // ========================================
  const estadisticas = useMemo(() => {
    const total = presentaciones.length;
    const conPrecio = presentaciones.filter((p) => p.precio_unitario > 0).length;
    const sinPrecio = total - conPrecio;
    const precioPromedio =
      conPrecio > 0
        ? presentaciones.reduce((sum, p) => sum + (p.precio_unitario || 0), 0) / conPrecio
        : 0;

    return { total, conPrecio, sinPrecio, precioPromedio };
  }, [presentaciones]);

  // ========================================
  // CONFIGURACIÓN DE COLUMNAS
  // ========================================
  const columns = useTableColumns([
    {
      key: 'codigo',
      header: 'Código',
      width: '12%',
      render: (_, item) => (
        <span className="text-sm font-mono text-gray-700">
          {item.codigo || '-'}
        </span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre',
      width: '25%',
      render: (_, item) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {item.nombre}
          </div>
          {item.descripcion && (
            <div className="text-xs text-gray-500 truncate max-w-xs">
              {item.descripcion}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock (Nivel 5)',
      width: '18%',
      render: (_, item) => (
        <div>
          <div className="text-sm text-gray-900">
            {item.parent?.nombre || '-'}
          </div>
          {item.parent?.stock_actual !== undefined && (
            <div className="text-xs text-gray-500">
              Stock: {item.parent.stock_actual} {item.parent.unidad_medida}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'presentacion',
      header: 'Presentación',
      width: '12%',
      render: (_, item) => (
        <span className="text-sm text-gray-700">
          {item.presentacion || '-'}
        </span>
      ),
    },
    {
      key: 'precio_unitario',
      header: 'Precio Venta',
      width: '12%',
      align: 'right',
      render: (_, item) => (
        <span className="text-sm font-semibold text-green-600">
          ${item.precio_unitario?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      key: 'unidad_medida',
      header: 'Unidad',
      width: '10%',
      render: (_, item) => (
        <span className="text-sm text-gray-500">
          {item.unidad_medida}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      width: '11%',
      align: 'center',
      render: (_, item) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAbrirModalEditar(item);
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Editar"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAbrirModalEliminar(item);
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Eliminar"
          >
            🗑️
          </button>
        </div>
      ),
    },
  ]);

  // ========================================
  // HANDLERS
  // ========================================
  const handleAbrirModalCrear = () => {
    setFormulario({
      codigo: '',
      nombre: '',
      descripcion: '',
      precio_unitario: '',
      cantidad_por_unidad: '',
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
      precio_unitario: presentacion.precio_unitario || '',
      cantidad_por_unidad: presentacion.cantidad_por_unidad || '',
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
        precio_unitario: parseFloat(formulario.precio_unitario) || 0,
        cantidad_por_unidad: parseFloat(formulario.cantidad_por_unidad) || 0,
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
          precio_unitario: parseFloat(formulario.precio_unitario) || 0,
          cantidad_por_unidad: parseFloat(formulario.cantidad_por_unidad) || 0,
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
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 bg-surface border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">
              📦 Gestión de Presentaciones (Virtualizada)
            </h1>
            <p className="text-muted">
              Versión optimizada con react-window para listas grandes
            </p>
          </div>
          <button
            onClick={handleAbrirModalCrear}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            ➕ Nueva Presentación
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4 p-6">
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-primary">{estadisticas.total}</div>
          <div className="text-sm text-muted">Total Presentaciones</div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-green-600">{estadisticas.conPrecio}</div>
          <div className="text-sm text-muted">Con Precio</div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-yellow-600">{estadisticas.sinPrecio}</div>
          <div className="text-sm text-muted">Sin Precio</div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-purple-600">
            ${estadisticas.precioPromedio.toFixed(2)}
          </div>
          <div className="text-sm text-muted">Precio Promedio</div>
        </div>
      </div>

      {/* Controles */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-4">
          {/* Búsqueda */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, código o descripción..."
              className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
            />
          </div>

          {/* Filtro por Stock */}
          <select
            value={filtroStock || ''}
            onChange={(e) => setFiltroStock(e.target.value || null)}
            className="px-4 py-2 border border-border rounded-lg bg-bg text-primary"
          >
            <option value="">Todos los Stocks</option>
            {nivel5Items?.map((stock) => (
              <option key={stock.id} value={stock.id}>
                {stock.nombre}
              </option>
            ))}
          </select>

          {/* Botón refrescar */}
          <button
            onClick={cargarPresentaciones}
            className="px-4 py-2 bg-surface border border-border rounded-lg hover:bg-bg transition-colors"
            title="Refrescar datos"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Tabla Virtualizada */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted">Cargando presentaciones...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-lg text-red-600 mb-4">Error al cargar presentaciones</p>
              <p className="text-sm text-muted mb-4">{error}</p>
              <button
                onClick={cargarPresentaciones}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <VirtualizedTable
            data={presentacionesFiltradas || []}
            columns={columns}
            rowHeight={70}
            tableHeight={window.innerHeight - 450}
            emptyMessage="No hay presentaciones que coincidan con los filtros"
            onRowClick={(item) => handleAbrirModalEditar(item)}
          />
        )}
      </div>

      {/* Modal Crear */}
      {modalCrear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg p-6 w-full max-w-2xl border border-border max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-primary mb-4">Nueva Presentación</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Código
                  </label>
                  <input
                    type="text"
                    value={formulario.codigo}
                    onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                    placeholder="Código único"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formulario.nombre}
                    onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                    placeholder="Nombre de la presentación"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Descripción
                </label>
                <textarea
                  value={formulario.descripcion}
                  onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                  rows={3}
                  placeholder="Descripción opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Stock (Nivel 5) *
                </label>
                <select
                  value={formulario.parent_id || ''}
                  onChange={(e) => setFormulario({ ...formulario, parent_id: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                  required
                >
                  <option value="">Seleccionar stock...</option>
                  {nivel5Items?.map((stock) => (
                    <option key={stock.id} value={stock.id}>
                      {stock.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Presentación
                  </label>
                  <input
                    type="text"
                    value={formulario.presentacion}
                    onChange={(e) => setFormulario({ ...formulario, presentacion: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                    placeholder="Ej: Caja x12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Precio Venta
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formulario.precio_unitario}
                    onChange={(e) => setFormulario({ ...formulario, precio_unitario: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Unidad Medida
                  </label>
                  <select
                    value={formulario.unidad_medida}
                    onChange={(e) => setFormulario({ ...formulario, unidad_medida: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                  >
                    <option value="unidad">Unidad</option>
                    <option value="caja">Caja</option>
                    <option value="paquete">Paquete</option>
                    <option value="bolsa">Bolsa</option>
                    <option value="kg">Kilogramo</option>
                    <option value="litro">Litro</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setModalCrear(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-bg transition-colors text-primary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrear}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalEditar && presentacionSeleccionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg p-6 w-full max-w-2xl border border-border max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-primary mb-4">Editar Presentación</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Código
                  </label>
                  <input
                    type="text"
                    value={formulario.codigo}
                    onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formulario.nombre}
                    onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Descripción
                </label>
                <textarea
                  value={formulario.descripcion}
                  onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Stock (Nivel 5) *
                </label>
                <select
                  value={formulario.parent_id || ''}
                  onChange={(e) => setFormulario({ ...formulario, parent_id: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                  required
                >
                  <option value="">Seleccionar stock...</option>
                  {nivel5Items?.map((stock) => (
                    <option key={stock.id} value={stock.id}>
                      {stock.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Presentación
                  </label>
                  <input
                    type="text"
                    value={formulario.presentacion}
                    onChange={(e) => setFormulario({ ...formulario, presentacion: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Precio Venta
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formulario.precio_unitario}
                    onChange={(e) => setFormulario({ ...formulario, precio_unitario: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Unidad Medida
                  </label>
                  <select
                    value={formulario.unidad_medida}
                    onChange={(e) => setFormulario({ ...formulario, unidad_medida: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-bg text-primary"
                  >
                    <option value="unidad">Unidad</option>
                    <option value="caja">Caja</option>
                    <option value="paquete">Paquete</option>
                    <option value="bolsa">Bolsa</option>
                    <option value="kg">Kilogramo</option>
                    <option value="litro">Litro</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setModalEditar(false);
                    setPresentacionSeleccionada(null);
                  }}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-bg transition-colors text-primary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditar}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {modalEliminar && presentacionSeleccionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg p-6 w-full max-w-md border border-border">
            <h3 className="text-xl font-bold text-primary mb-4">Eliminar Presentación</h3>

            <p className="text-muted mb-6">
              ¿Estás seguro de que deseas eliminar la presentación{' '}
              <strong className="text-primary">{presentacionSeleccionada.nombre}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalEliminar(false);
                  setPresentacionSeleccionada(null);
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-bg transition-colors text-primary"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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

export default PresentacionesManagerVirtualized;
