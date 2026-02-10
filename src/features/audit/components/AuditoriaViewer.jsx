// ========================================
// AUDITORÍA VIEWER - Sprint 3
// Timeline de cambios y búsqueda de auditoría
// ========================================

import React, { useState } from 'react';
import {
  useAuditoriaLegible,
  useBuscarAuditoria,
  useEstadisticasAuditoria,
  useHistorialRegistro,
} from '@/features/audit';
import { auditoriaService } from '@/features/audit';

const AuditoriaViewer = () => {
  // Estados de filtros
  const [tabla, setTabla] = useState('');
  const [operacion, setOperacion] = useState('');
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [limite, setLimite] = useState(50);

  // Vista actual
  const [vistaActual, setVistaActual] = useState('recientes'); // 'recientes' | 'buscar' | 'estadisticas'

  // Query para auditoría reciente
  const {
    data: auditoriaReciente,
    isLoading: cargandoReciente,
    error: errorReciente,
    refetch: refrescarReciente,
  } = useAuditoriaLegible(limite);

  // Query para estadísticas
  const { data: estadisticas, isLoading: cargandoEstadisticas } = useEstadisticasAuditoria(30);

  // Query para búsqueda (solo si hay filtros)
  const filtrosBusqueda = React.useMemo(() => {
    if (!tabla && !operacion && !usuarioEmail && !fechaDesde) {
      return {};
    }

    return {
      tabla: tabla || null,
      operacion: operacion || null,
      usuario_email: usuarioEmail || null,
      fecha_desde: fechaDesde ? new Date(fechaDesde).toISOString() : null,
      fecha_hasta: fechaHasta ? new Date(fechaHasta).toISOString() : null,
      limite,
    };
  }, [tabla, operacion, usuarioEmail, fechaDesde, fechaHasta, limite]);

  const {
    data: resultadosBusqueda,
    isLoading: buscando,
    error: errorBusqueda,
  } = useBuscarAuditoria(filtrosBusqueda);

  // ========================================
  // HANDLERS
  // ========================================

  const handleLimpiarFiltros = () => {
    setTabla('');
    setOperacion('');
    setUsuarioEmail('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const handleExportarCSV = () => {
    const datos = vistaActual === 'buscar' ? resultadosBusqueda : auditoriaReciente;
    if (!datos || datos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Generar CSV
    const headers = ['Fecha', 'Tabla', 'Operación', 'Usuario', 'Resumen'];
    const rows = datos.map((item) => [
      new Date(item.created_at).toLocaleString(),
      item.tabla,
      item.operacion,
      item.usuario_email || 'N/A',
      item.resumen || 'N/A',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    // Descargar
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // ========================================
  // RENDER: Contenido según vista
  // ========================================

  const renderContenido = () => {
    if (vistaActual === 'recientes') {
      if (cargandoReciente) {
        return (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto"></div>
          </div>
        );
      }

      if (errorReciente) {
        return (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">Error al cargar auditoría</p>
            <button
              onClick={refrescarReciente}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg"
            >
              Reintentar
            </button>
          </div>
        );
      }

      return <TimelineAuditoria items={auditoriaReciente} />;
    }

    if (vistaActual === 'buscar') {
      if (buscando) {
        return (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto"></div>
            <p className="text-gray-600 mt-4">Buscando...</p>
          </div>
        );
      }

      if (errorBusqueda) {
        return (
          <div className="text-center py-12">
            <p className="text-red-600">Error en la búsqueda</p>
          </div>
        );
      }

      if (!resultadosBusqueda || resultadosBusqueda.length === 0) {
        return (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🔍</span>
            <p className="text-gray-500">
              {Object.keys(filtrosBusqueda).length > 0
                ? 'No se encontraron resultados'
                : 'Configura los filtros para buscar'}
            </p>
          </div>
        );
      }

      return <TimelineAuditoria items={resultadosBusqueda} />;
    }

    if (vistaActual === 'estadisticas') {
      if (cargandoEstadisticas) {
        return (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto"></div>
          </div>
        );
      }

      return <EstadisticasPanel estadisticas={estadisticas} />;
    }
  };

  // ========================================
  // RENDER: Interfaz principal
  // ========================================

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-6 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              📜 Auditoría de Cambios
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Trazabilidad completa de operaciones
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportarCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📥 Exportar CSV
            </button>
            <button
              onClick={refrescarReciente}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300"
            >
              🔄 Refrescar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setVistaActual('recientes')}
            className={`px-4 py-2 rounded-lg ${
              vistaActual === 'recientes'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            🕐 Cambios Recientes
          </button>
          <button
            onClick={() => setVistaActual('buscar')}
            className={`px-4 py-2 rounded-lg ${
              vistaActual === 'buscar'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            🔍 Búsqueda Avanzada
          </button>
          <button
            onClick={() => setVistaActual('estadisticas')}
            className={`px-4 py-2 rounded-lg ${
              vistaActual === 'estadisticas'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            📊 Estadísticas
          </button>
        </div>
      </div>

      {/* Panel de filtros (solo en vista buscar) */}
      {vistaActual === 'buscar' && (
        <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tabla</label>
              <select
                value={tabla}
                onChange={(e) => setTabla(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Todas</option>
                <option value="arbol_recetas">Recetas</option>
                <option value="receta_ingredientes">Ingredientes</option>
                <option value="arbol_materia_prima">Materia Prima</option>
                <option value="arbol_platos">Platos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Operación</label>
              <select
                value={operacion}
                onChange={(e) => setOperacion(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Todas</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Usuario Email</label>
              <input
                type="text"
                value={usuarioEmail}
                onChange={(e) => setUsuarioEmail(e.target.value)}
                placeholder="email@ejemplo.com"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Límite</label>
              <input
                type="number"
                value={limite}
                onChange={(e) => setLimite(parseInt(e.target.value) || 50)}
                min="10"
                max="500"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha Desde</label>
              <input
                type="datetime-local"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fecha Hasta</label>
              <input
                type="datetime-local"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleLimpiarFiltros}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4">{renderContenido()}</div>
    </div>
  );
};

// ========================================
// COMPONENTE: Timeline de Auditoría
// ========================================

const TimelineAuditoria = ({ items }) => {
  const [detalleExpandido, setDetalleExpandido] = useState(null);

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-6xl mb-4 block">📭</span>
        <p className="text-gray-500">No hay cambios registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start gap-4">
            {/* Icono de operación */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                item.operacion === 'INSERT'
                  ? 'bg-green-100 text-green-600'
                  : item.operacion === 'UPDATE'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {item.operacion === 'INSERT' ? '➕' : item.operacion === 'UPDATE' ? '✏️' : '🗑️'}
            </div>

            {/* Contenido */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                  {item.tabla}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    item.operacion === 'INSERT'
                      ? 'bg-green-100 text-green-700'
                      : item.operacion === 'UPDATE'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {item.operacion}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>

              <p className="text-gray-800 dark:text-white mb-1">
                {item.usuario_email || 'Sistema'}
              </p>

              {/* Cambios en formato legible */}
              {item.cambios_json && (
                <div className="mt-2">
                  <button
                    onClick={() =>
                      setDetalleExpandido(detalleExpandido === item.id ? null : item.id)
                    }
                    className="text-sm text-orange-600 hover:text-orange-700"
                  >
                    {detalleExpandido === item.id ? '▼ Ocultar detalles' : '▶ Ver detalles'}
                  </button>

                  {detalleExpandido === item.id && (
                    <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                      {JSON.stringify(JSON.parse(item.cambios_json), null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ========================================
// COMPONENTE: Panel de Estadísticas
// ========================================

const EstadisticasPanel = ({ estadisticas }) => {
  if (!estadisticas) return null;

  return (
    <div className="space-y-6">
      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Operaciones</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">
            {estadisticas.total_operaciones}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Promedio: {estadisticas.promedio_diario || 0}/día
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-xs text-green-700 dark:text-green-300 mb-1">Inserciones</p>
          <p className="text-3xl font-bold text-green-600">{estadisticas.total_inserts}</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">Actualizaciones</p>
          <p className="text-3xl font-bold text-blue-600">{estadisticas.total_updates}</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg shadow border-l-4 border-red-500">
          <p className="text-xs text-red-700 dark:text-red-300 mb-1">Eliminaciones</p>
          <p className="text-3xl font-bold text-red-600">{estadisticas.total_deletes}</p>
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Información Adicional</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Usuarios Activos</p>
            <p className="text-2xl font-bold">{estadisticas.usuarios_activos}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tablas Afectadas</p>
            <p className="text-2xl font-bold">{estadisticas.tablas_afectadas}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Operaciones Hoy</p>
            <p className="text-2xl font-bold text-orange-600">{estadisticas.operaciones_hoy}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditoriaViewer;
