// ========================================
// AUDITORIA VIEWER VIRTUALIZADO - Sprint 6.5
// Versión con react-window para listas grandes (>100 items)
// ========================================

import React, { useState, useMemo } from 'react';
import { useAuditoriaLegible, useBuscarAuditoria } from '../../hooks/useAuditoria';
import VirtualizedTable, { useTableColumns } from '../common/VirtualizedTable';

const AuditoriaViewerVirtualized = () => {
  // ========================================
  // ESTADO LOCAL
  // ========================================
  const [limite, setLimite] = useState(100);
  const [busqueda, setBusqueda] = useState('');
  const [tablaFiltro, setTablaFiltro] = useState('todas');
  const [operacionFiltro, setOperacionFiltro] = useState('todas');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // ========================================
  // QUERIES
  // ========================================

  // Query principal: auditoria legible con límite
  const {
    data: auditoriaData,
    isLoading,
    refetch,
  } = useAuditoriaLegible(limite);

  // Query de búsqueda (solo cuando hay filtros activos)
  const tieneFiltros = busqueda || tablaFiltro !== 'todas' || operacionFiltro !== 'todas' || fechaDesde || fechaHasta;

  const filtrosQuery = useMemo(() => {
    if (!tieneFiltros) return {};

    const filtros = { limite };

    if (busqueda) filtros.busqueda = busqueda;
    if (tablaFiltro !== 'todas') filtros.tabla = tablaFiltro;
    if (operacionFiltro !== 'todas') filtros.operacion = operacionFiltro;
    if (fechaDesde) filtros.fecha_desde = new Date(fechaDesde).toISOString();
    if (fechaHasta) filtros.fecha_hasta = new Date(fechaHasta).toISOString();

    return filtros;
  }, [busqueda, tablaFiltro, operacionFiltro, fechaDesde, fechaHasta, limite, tieneFiltros]);

  const {
    data: busquedaData,
    isLoading: buscando,
  } = useBuscarAuditoria(filtrosQuery);

  // Usar datos de búsqueda si hay filtros, sino usar auditoria legible
  const dataActual = tieneFiltros ? busquedaData : auditoriaData;

  // ========================================
  // ESTADÍSTICAS
  // ========================================
  const stats = useMemo(() => {
    if (!dataActual) return { total: 0, inserciones: 0, actualizaciones: 0, eliminaciones: 0 };

    return {
      total: dataActual.length,
      inserciones: dataActual.filter(item => item.operacion === 'INSERT').length,
      actualizaciones: dataActual.filter(item => item.operacion === 'UPDATE').length,
      eliminaciones: dataActual.filter(item => item.operacion === 'DELETE').length,
    };
  }, [dataActual]);

  // ========================================
  // CONFIGURACIÓN DE COLUMNAS
  // ========================================
  const columns = useTableColumns([
    {
      key: 'timestamp',
      header: 'Fecha/Hora',
      width: '15%',
      render: (_, item) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {new Date(item.timestamp).toLocaleDateString('es-ES')}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(item.timestamp).toLocaleTimeString('es-ES')}
          </div>
        </div>
      ),
    },
    {
      key: 'operacion',
      header: 'Operación',
      width: '10%',
      render: (_, item) => {
        const operacionStyles = {
          INSERT: 'bg-green-100 text-green-700',
          UPDATE: 'bg-blue-100 text-blue-700',
          DELETE: 'bg-red-100 text-red-700',
        };

        const operacionEmoji = {
          INSERT: '➕',
          UPDATE: '✏️',
          DELETE: '🗑️',
        };

        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              operacionStyles[item.operacion] || 'bg-gray-100 text-gray-700'
            }`}
          >
            {operacionEmoji[item.operacion]}
            {item.operacion}
          </span>
        );
      },
    },
    {
      key: 'tabla',
      header: 'Tabla',
      width: '15%',
      render: (_, item) => (
        <span className="font-mono text-sm text-gray-700">
          {item.tabla_nombre}
        </span>
      ),
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      width: '35%',
      render: (_, item) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 truncate">
            {item.descripcion_cambio}
          </div>
          {item.registro_codigo && (
            <div className="text-xs text-gray-500 mt-0.5">
              Código: {item.registro_codigo}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'usuario',
      header: 'Usuario',
      width: '15%',
      render: (_, item) => (
        <div className="text-sm">
          <div className="text-gray-900">
            {item.usuario_email || 'Sistema'}
          </div>
        </div>
      ),
    },
    {
      key: 'detalles',
      header: 'Cambios',
      width: '10%',
      align: 'center',
      render: (_, item) => (
        <button
          onClick={() => handleVerDetalles(item)}
          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm transition-colors"
        >
          Ver
        </button>
      ),
    },
  ]);

  // ========================================
  // MODAL DE DETALLES
  // ========================================
  const [modalDetalles, setModalDetalles] = useState(false);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState(null);

  const handleVerDetalles = (item) => {
    setAuditoriaSeleccionada(item);
    setModalDetalles(true);
  };

  // ========================================
  // HANDLERS
  // ========================================
  const handleLimpiarFiltros = () => {
    setBusqueda('');
    setTablaFiltro('todas');
    setOperacionFiltro('todas');
    setFechaDesde('');
    setFechaHasta('');
  };

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 bg-surface border-b border-border">
        <h1 className="text-3xl font-bold text-primary mb-2">
          📋 Auditoría del Sistema (Virtualizada)
        </h1>
        <p className="text-muted">
          Versión optimizada con react-window para listas grandes
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4 p-6">
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-primary">{stats.total}</div>
          <div className="text-sm text-muted">Total Registros</div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-green-600">{stats.inserciones}</div>
          <div className="text-sm text-muted">Inserciones</div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-blue-600">{stats.actualizaciones}</div>
          <div className="text-sm text-muted">Actualizaciones</div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-red-600">{stats.eliminaciones}</div>
          <div className="text-sm text-muted">Eliminaciones</div>
        </div>
      </div>

      {/* Controles de Filtrado */}
      <div className="px-6 pb-4">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Búsqueda
              </label>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en descripción..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-primary"
              />
            </div>

            {/* Filtro de Tabla */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Tabla
              </label>
              <select
                value={tablaFiltro}
                onChange={(e) => setTablaFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-primary"
              >
                <option value="todas">Todas las tablas</option>
                <option value="arbol_recetas">Recetas</option>
                <option value="arbol_materia_prima">Materia Prima</option>
                <option value="arbol_platos">Platos</option>
                <option value="receta_ingredientes">Ingredientes</option>
              </select>
            </div>

            {/* Filtro de Operación */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Operación
              </label>
              <select
                value={operacionFiltro}
                onChange={(e) => setOperacionFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-primary"
              >
                <option value="todas">Todas las operaciones</option>
                <option value="INSERT">➕ Inserciones</option>
                <option value="UPDATE">✏️ Actualizaciones</option>
                <option value="DELETE">🗑️ Eliminaciones</option>
              </select>
            </div>

            {/* Límite de Registros */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Límite
              </label>
              <select
                value={limite}
                onChange={(e) => setLimite(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-primary"
              >
                <option value={50}>50 registros</option>
                <option value={100}>100 registros</option>
                <option value={200}>200 registros</option>
                <option value={500}>500 registros</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Fecha Desde */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Fecha Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-primary"
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg text-primary"
              />
            </div>

            {/* Botones */}
            <div className="flex items-end gap-2">
              <button
                onClick={handleLimpiarFiltros}
                className="flex-1 px-4 py-2 bg-surface border border-border rounded-lg hover:bg-bg transition-colors"
              >
                🗑️ Limpiar
              </button>
              <button
                onClick={() => refetch()}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                🔄 Refrescar
              </button>
            </div>
          </div>

          {/* Indicador de filtros activos */}
          {tieneFiltros && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {stats.total} resultado(s) encontrado(s) con filtros activos
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabla Virtualizada */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        {isLoading || buscando ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted">Cargando auditoría...</p>
            </div>
          </div>
        ) : (
          <VirtualizedTable
            data={dataActual || []}
            columns={columns}
            rowHeight={70}
            tableHeight={window.innerHeight - 500}
            emptyMessage="No hay registros de auditoría"
            onRowClick={(item) => handleVerDetalles(item)}
          />
        )}
      </div>

      {/* Modal de Detalles */}
      {modalDetalles && auditoriaSeleccionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg p-6 w-full max-w-3xl border border-border max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-primary mb-4">
              Detalles de Auditoría
            </h3>

            {/* Información General */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Fecha/Hora
                </label>
                <p className="text-primary">
                  {new Date(auditoriaSeleccionada.timestamp).toLocaleString('es-ES')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Usuario
                </label>
                <p className="text-primary">
                  {auditoriaSeleccionada.usuario_email || 'Sistema'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Operación
                </label>
                <p className="text-primary">{auditoriaSeleccionada.operacion}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Tabla
                </label>
                <p className="text-primary font-mono">
                  {auditoriaSeleccionada.tabla_nombre}
                </p>
              </div>
            </div>

            {/* Descripción */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted mb-1">
                Descripción del Cambio
              </label>
              <p className="text-primary">{auditoriaSeleccionada.descripcion_cambio}</p>
            </div>

            {/* Datos Anteriores (solo UPDATE y DELETE) */}
            {(auditoriaSeleccionada.operacion === 'UPDATE' ||
              auditoriaSeleccionada.operacion === 'DELETE') &&
             auditoriaSeleccionada.datos_anteriores && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted mb-2">
                  Datos Anteriores
                </label>
                <pre className="bg-bg p-4 rounded-lg border border-border overflow-x-auto text-sm">
                  {JSON.stringify(auditoriaSeleccionada.datos_anteriores, null, 2)}
                </pre>
              </div>
            )}

            {/* Datos Nuevos (solo INSERT y UPDATE) */}
            {(auditoriaSeleccionada.operacion === 'INSERT' ||
              auditoriaSeleccionada.operacion === 'UPDATE') &&
             auditoriaSeleccionada.datos_nuevos && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted mb-2">
                  Datos Nuevos
                </label>
                <pre className="bg-bg p-4 rounded-lg border border-border overflow-x-auto text-sm">
                  {JSON.stringify(auditoriaSeleccionada.datos_nuevos, null, 2)}
                </pre>
              </div>
            )}

            {/* Botón Cerrar */}
            <div className="flex justify-end">
              <button
                onClick={() => setModalDetalles(false)}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditoriaViewerVirtualized;
