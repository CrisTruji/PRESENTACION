// ========================================
// AUDITORÍA VIEWER - Reescrito con sistema de diseño del app
// Timeline de cambios y búsqueda de auditoría
// ========================================

import React, { useState } from 'react';
import {
  useAuditoriaLegible,
  useBuscarAuditoria,
  useEstadisticasAuditoria,
} from '@/features/audit';
import {
  Clock,
  Search,
  BarChart2,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  User,
  Database,
  Activity,
  Calendar,
  Filter,
  X,
} from 'lucide-react';

// ─── helpers ───────────────────────────────────────────────────────────────────

const OP_META = {
  INSERT: {
    label: 'Creación',
    icon: <Plus  size={14} />,
    bg:   'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-l-green-500',
    dot: 'bg-green-500',
  },
  UPDATE: {
    label: 'Actualización',
    icon: <Edit  size={14} />,
    bg:   'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-l-blue-500',
    dot: 'bg-blue-500',
  },
  DELETE: {
    label: 'Eliminación',
    icon: <Trash2 size={14} />,
    bg:   'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-l-red-500',
    dot: 'bg-red-500',
  },
};

function fmtFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Componente principal ───────────────────────────────────────────────────────

const AuditoriaViewer = () => {
  // Filtros búsqueda avanzada
  const [tabla, setTabla]             = useState('');
  const [operacion, setOperacion]     = useState('');
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [fechaDesde, setFechaDesde]   = useState('');
  const [fechaHasta, setFechaHasta]   = useState('');
  const [limite, setLimite]           = useState(50);

  // Tab activo
  const [vista, setVista] = useState('recientes'); // 'recientes' | 'buscar' | 'estadisticas'

  // ── Datos recientes ──────────────────────────────────────────────────────────
  const {
    data: recientes,
    isLoading: cargandoRecientes,
    error: errorRecientes,
    refetch: refrescar,
  } = useAuditoriaLegible(limite);

  // ── Estadísticas ─────────────────────────────────────────────────────────────
  const {
    data: stats,
    isLoading: cargandoStats,
  } = useEstadisticasAuditoria(30);

  // ── Búsqueda con filtros ─────────────────────────────────────────────────────
  const filtros = React.useMemo(() => {
    if (!tabla && !operacion && !usuarioEmail && !fechaDesde) return {};
    return {
      tabla:         tabla || null,
      operacion:     operacion || null,
      usuario_email: usuarioEmail || null,
      fecha_desde:   fechaDesde ? new Date(fechaDesde).toISOString() : null,
      fecha_hasta:   fechaHasta ? new Date(fechaHasta).toISOString() : null,
      limite,
    };
  }, [tabla, operacion, usuarioEmail, fechaDesde, fechaHasta, limite]);

  const {
    data: resultados,
    isLoading: buscando,
    error: errorBusqueda,
  } = useBuscarAuditoria(filtros);

  // ── Exportar CSV ─────────────────────────────────────────────────────────────
  function handleExportarCSV() {
    const datos = vista === 'buscar' ? resultados : recientes;
    if (!datos?.length) { alert('No hay datos para exportar'); return; }

    const headers = ['Fecha', 'Tabla', 'Operación', 'Usuario', 'Resumen'];
    const rows = datos.map(r => [
      fmtFecha(r.created_at),
      r.tabla,
      r.operacion,
      r.usuario_email ?? 'N/A',
      r.resumen ?? 'N/A',
    ]);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `auditoria_${new Date().toISOString().split('T')[0]}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  function limpiarFiltros() {
    setTabla(''); setOperacion(''); setUsuarioEmail('');
    setFechaDesde(''); setFechaHasta('');
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-content bg-app">
      <div className="page-container">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="section-header">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="section-title">Auditoría de Cambios</h1>
              <p className="section-subtitle">
                Trazabilidad completa de operaciones INSERT · UPDATE · DELETE
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleExportarCSV}
                className="btn btn-outline flex items-center gap-2 text-sm"
              >
                <Download size={15} />
                Exportar CSV
              </button>
              <button
                onClick={() => refrescar()}
                className="btn btn-outline flex items-center gap-2 text-sm"
              >
                <RefreshCw size={15} />
                Refrescar
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-[var(--color-border)]">
            {[
              { id: 'recientes',    label: 'Cambios Recientes',  icon: <Clock     size={15} /> },
              { id: 'buscar',       label: 'Búsqueda Avanzada',  icon: <Search    size={15} /> },
              { id: 'estadisticas', label: 'Estadísticas',       icon: <BarChart2 size={15} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setVista(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  vista === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Filtros (solo búsqueda avanzada) ────────────────────────────────── */}
        {vista === 'buscar' && (
          <div className="card p-compact mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="relative">
                <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <select
                  value={tabla}
                  onChange={e => setTabla(e.target.value)}
                  className="form-input pl-9 !py-2 appearance-none text-sm"
                >
                  <option value="">Tabla: Todas</option>
                  <option value="arbol_recetas">Recetas</option>
                  <option value="receta_ingredientes">Ingredientes</option>
                  <option value="arbol_materia_prima">Materia Prima</option>
                  <option value="arbol_platos">Platos</option>
                  <option value="empleados">Empleados</option>
                  <option value="empleados_talento_humano">TH</option>
                  <option value="empleados_sst">SST</option>
                </select>
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <select
                  value={operacion}
                  onChange={e => setOperacion(e.target.value)}
                  className="form-input pl-9 !py-2 appearance-none text-sm"
                >
                  <option value="">Operación: Todas</option>
                  <option value="INSERT">Inserciones</option>
                  <option value="UPDATE">Actualizaciones</option>
                  <option value="DELETE">Eliminaciones</option>
                </select>
              </div>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input
                  type="text"
                  value={usuarioEmail}
                  onChange={e => setUsuarioEmail(e.target.value)}
                  placeholder="Email del usuario..."
                  className="form-input pl-9 !py-2 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={limite}
                  onChange={e => setLimite(parseInt(e.target.value) || 50)}
                  min="10" max="500"
                  className="form-input !py-2 text-sm w-24"
                  title="Límite de resultados"
                />
                <button
                  onClick={limpiarFiltros}
                  className="btn btn-outline btn-sm flex items-center gap-1 text-xs"
                >
                  <X size={12} /> Limpiar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input
                  type="datetime-local"
                  value={fechaDesde}
                  onChange={e => setFechaDesde(e.target.value)}
                  className="form-input pl-9 !py-2 text-sm"
                  placeholder="Desde"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input
                  type="datetime-local"
                  value={fechaHasta}
                  onChange={e => setFechaHasta(e.target.value)}
                  className="form-input pl-9 !py-2 text-sm"
                  placeholder="Hasta"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Contenido según tab ──────────────────────────────────────────────── */}
        {vista === 'recientes' && (
          <TimelineAuditoria
            items={recientes}
            loading={cargandoRecientes}
            error={errorRecientes}
            onRetry={refrescar}
          />
        )}

        {vista === 'buscar' && (
          <TimelineAuditoria
            items={resultados}
            loading={buscando}
            error={errorBusqueda}
            onRetry={() => {}}
            emptyMsg={
              Object.keys(filtros).length > 0
                ? 'No se encontraron resultados para los filtros aplicados'
                : 'Configura los filtros de arriba para buscar'
            }
          />
        )}

        {vista === 'estadisticas' && (
          <EstadisticasPanel stats={stats} loading={cargandoStats} />
        )}

      </div>
    </div>
  );
};

// ─── Timeline ─────────────────────────────────────────────────────────────────

const TimelineAuditoria = ({ items, loading, error, onRetry, emptyMsg }) => {
  const [expandido, setExpandido] = useState(null);

  if (loading) {
    return (
      <div className="card p-12 text-center">
        <div className="spinner spinner-lg mx-auto mb-3" />
        <p className="text-muted text-sm">Cargando registros de auditoría…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-12 text-center">
        <AlertCircle size={40} className="mx-auto mb-3 text-error" />
        <p className="text-error font-medium mb-4">Error al cargar auditoría</p>
        <button onClick={onRetry} className="btn btn-primary">Reintentar</button>
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="card p-12 text-center">
        <Activity size={48} className="mx-auto mb-4 text-muted opacity-40" />
        <p className="text-secondary">
          {emptyMsg ?? 'No hay cambios registrados'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Contador */}
      <p className="text-xs text-secondary mb-3">
        <span className="font-semibold text-primary">{items.length}</span> registro{items.length !== 1 ? 's' : ''}
      </p>

      {items.map(item => {
        const meta = OP_META[item.operacion] ?? OP_META.UPDATE;
        const isOpen = expandido === item.id;

        return (
          <div
            key={item.id}
            className={`card border-l-4 ${meta.border} hover:shadow-sm transition-shadow`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                {/* Info principal */}
                <div className="flex items-start gap-3 min-w-0">
                  {/* Operación badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${meta.bg} ${meta.text}`}>
                    {meta.icon}
                    {meta.label}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {/* Tabla */}
                      <span className="font-mono text-xs bg-[var(--color-bg-hover)] px-2 py-0.5 rounded text-secondary">
                        {item.tabla}
                      </span>
                      {/* Usuario */}
                      <span className="text-xs text-secondary flex items-center gap-1">
                        <User size={11} />
                        {item.usuario_email ?? 'Sistema'}
                      </span>
                    </div>

                    {/* Resumen */}
                    {item.resumen && (
                      <p className="text-sm text-primary truncate">{item.resumen}</p>
                    )}
                  </div>
                </div>

                {/* Fecha + expand */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted whitespace-nowrap">
                    {fmtFecha(item.created_at)}
                  </span>
                  {item.cambios_json && (
                    <button
                      onClick={() => setExpandido(isOpen ? null : item.id)}
                      className="p-1 text-secondary hover:text-primary rounded transition-colors"
                      title="Ver detalles del cambio"
                    >
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Detalle expandible */}
              {isOpen && item.cambios_json && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border-light)]">
                  <p className="text-xs font-semibold text-secondary mb-2 uppercase tracking-wide">
                    Detalle del cambio
                  </p>
                  <pre className="text-xs bg-[var(--color-bg-hover)] p-3 rounded overflow-x-auto text-secondary leading-relaxed">
                    {(() => {
                      try { return JSON.stringify(JSON.parse(item.cambios_json), null, 2); }
                      catch { return item.cambios_json; }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Panel de estadísticas ────────────────────────────────────────────────────

const EstadisticasPanel = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="card p-12 text-center">
        <div className="spinner spinner-lg mx-auto mb-3" />
        <p className="text-muted text-sm">Calculando estadísticas…</p>
      </div>
    );
  }

  // El RPC devuelve un array [{ total_operaciones, ... }] — extraer primer elemento
  const s = Array.isArray(stats) ? (stats[0] ?? null) : (stats ?? null);

  if (!s) {
    return (
      <div className="card p-12 text-center">
        <BarChart2 size={40} className="mx-auto mb-3 text-muted opacity-40" />
        <p className="text-secondary">No hay estadísticas disponibles</p>
        <p className="text-xs text-muted mt-1">
          Es posible que la función RPC <code>estadisticas_auditoria</code> no esté configurada
        </p>
      </div>
    );
  }

  const metricasPrincipales = [
    {
      label: 'Total Operaciones',
      valor: s.total_operaciones ?? 0,
      sub:   `Promedio: ${s.promedio_diario ?? 0}/día`,
      icon:  <Activity size={18} className="text-primary" />,
      bg:    'bg-surface',
    },
    {
      label: 'Inserciones',
      valor: s.total_inserts ?? 0,
      icon:  <Plus  size={18} className="text-green-600" />,
      bg:    'bg-green-50 dark:bg-green-900/20',
      borde: 'border-l-4 border-l-green-500',
    },
    {
      label: 'Actualizaciones',
      valor: s.total_updates ?? 0,
      icon:  <Edit  size={18} className="text-blue-600" />,
      bg:    'bg-blue-50 dark:bg-blue-900/20',
      borde: 'border-l-4 border-l-blue-500',
    },
    {
      label: 'Eliminaciones',
      valor: s.total_deletes ?? 0,
      icon:  <Trash2 size={18} className="text-red-600" />,
      bg:    'bg-red-50 dark:bg-red-900/20',
      borde: 'border-l-4 border-l-red-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cards métricas principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricasPrincipales.map(m => (
          <div key={m.label} className={`card p-5 ${m.borde ?? ''} ${m.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-secondary uppercase tracking-wide">{m.label}</p>
              <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
                {m.icon}
              </div>
            </div>
            <p className="text-3xl font-bold text-primary">{(m.valor ?? 0).toLocaleString()}</p>
            {m.sub && <p className="text-xs text-muted mt-1">{m.sub}</p>}
          </div>
        ))}
      </div>

      {/* Info adicional */}
      <div className="card p-6">
        <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
          <Database size={16} />
          Información Adicional — últimos 30 días
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-[var(--color-bg-hover)] rounded-xl">
            <p className="text-xs text-secondary uppercase tracking-wide mb-2">Usuarios Activos</p>
            <p className="text-3xl font-bold text-primary">
              {s.usuarios_activos ?? '—'}
            </p>
          </div>
          <div className="text-center p-4 bg-[var(--color-bg-hover)] rounded-xl">
            <p className="text-xs text-secondary uppercase tracking-wide mb-2">Tablas Afectadas</p>
            <p className="text-3xl font-bold text-primary">
              {s.tablas_afectadas ?? '—'}
            </p>
          </div>
          <div className="text-center p-4 bg-primary/5 rounded-xl border border-primary/20">
            <p className="text-xs text-secondary uppercase tracking-wide mb-2">Operaciones Hoy</p>
            <p className="text-3xl font-bold text-primary">
              {s.operaciones_hoy ?? '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditoriaViewer;
