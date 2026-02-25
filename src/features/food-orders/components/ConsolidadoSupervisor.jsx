// ========================================
// ConsolidadoSupervisor - Dashboard supervisor produccion
// ========================================

import React, { useEffect } from 'react';
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  Package,
  RefreshCw,
  FileText,
  Check,
  Clock,
  Building2,
  X,
  BookOpen,
} from 'lucide-react';
import { useConsolidadoStore } from '../store/useConsolidadoStore';
import {
  useConsolidadoPorFecha,
  useConsolidar,
  useAprobarConsolidado,
  useMarcarPreparado,
  useSustituirReceta,
  useOperacionesConsolidado,
  useServiciosUnidad,
} from '../hooks/useConsolidado';
import { useSolicitudesPendientes } from '../hooks/useSolicitudesCambio';
import { usePedidosPorFecha } from '../hooks/usePedidos';
import { SERVICIOS, ETIQUETAS_ESTADO_CONSOLIDADO } from '@/shared/types/menu';
import VistaRecetas from './VistaRecetas';
import VistaUnidades from './VistaUnidades';
import VistaIngredientes from './VistaIngredientes';
import CambioRecetaPanel from './CambioRecetaPanel';
import ModalSustituirReceta from './ModalSustituirReceta';
import PanelMenuUnidad from './PanelMenuUnidad';
import ModalCicloCompleto from './ModalCicloCompleto';
import { useAuth } from '@/features/auth';
import notify from '@/shared/lib/notifier';

// ----------------------------------------
// Panel de Horarios (inline)
// ----------------------------------------
function PanelHorarios({ operacionId, filtroServicio }) {
  const { data: servicios, isLoading } = useServiciosUnidad(operacionId || null);

  if (isLoading) {
    return (
      <div className="py-2 text-center">
        <div className="spinner spinner-sm mx-auto" />
      </div>
    );
  }

  if (!servicios || servicios.length === 0) {
    return (
      <p className="text-xs text-text-muted py-2">
        Sin horarios configurados. Ejecuta el SQL de horarios para configurarlos.
      </p>
    );
  }

  // Group by operacion if showing all units, else flat list
  const grouped = {};
  for (const s of servicios) {
    const key = s.operacion_id;
    if (!grouped[key]) {
      grouped[key] = { nombre: s.operaciones?.nombre || s.operacion_id, items: [] };
    }
    grouped[key].items.push(s);
  }

  const grupos = Object.values(grouped);

  return (
    <div className="space-y-3">
      {grupos.map((grupo) => (
        <div key={grupo.nombre}>
          {!operacionId && (
            <div className="text-xs font-semibold text-text-secondary uppercase mb-1.5">
              {grupo.nombre}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {grupo.items.map((srv) => {
              const esFiltro = srv.servicio === filtroServicio;
              return (
                <div
                  key={srv.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${
                    esFiltro
                      ? 'bg-primary/10 border-primary text-primary font-semibold'
                      : 'bg-bg-surface border-border text-text-muted'
                  }`}
                >
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className="capitalize">{srv.servicio}:</span>
                  <span className="font-mono font-semibold">
                    {srv.hora_limite?.slice(0, 5) || '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------
// Main Component
// ----------------------------------------
export default function ConsolidadoSupervisor() {
  const { user } = useAuth();
  const {
    vistaActiva,
    filtroFecha,
    filtroServicio,
    filtroUnidad,
    consolidadoActual,
    cambiarVista,
    setFiltroFecha,
    setFiltroServicio,
    setFiltroUnidad,
    setConsolidado,
    iniciarSustitucion,
  } = useConsolidadoStore();

  // Queries
  const { data: consolidado, isLoading: cargandoConsolidado, refetch } =
    useConsolidadoPorFecha(filtroFecha, filtroServicio);
  const { data: pedidos } = usePedidosPorFecha(filtroFecha, filtroServicio);
  const { data: solicitudesPendientes } = useSolicitudesPendientes();
  const { data: operaciones } = useOperacionesConsolidado();

  // Mutations
  const consolidar = useConsolidar();
  const aprobarConsolidado = useAprobarConsolidado();
  const marcarPreparado = useMarcarPreparado();

  // Item seleccionado para sustituir receta
  const [itemSustituyendo, setItemSustituyendo] = React.useState(null);

  // Confirmación de aprobación
  const [confirmarAprobar, setConfirmarAprobar] = React.useState(false);

  // Ciclo seleccionado para modal de ciclo completo
  const [cicloModal, setCicloModal] = React.useState(null);

  useEffect(() => {
    if (consolidado) setConsolidado(consolidado);
  }, [consolidado]);

  // Stats
  const totalPedidos = pedidos?.length || 0;
  const pedidosEnviados = pedidos?.filter((p) => p.estado !== 'borrador').length || 0;
  const pedidosTardios = pedidos?.filter((p) => !p.enviado_en_hora && p.hora_envio).length || 0;

  // Selected unit name for display
  const unidadSeleccionada = filtroUnidad
    ? operaciones?.find((o) => o.id === filtroUnidad)
    : null;

  const handleConsolidar = () => {
    consolidar.mutate(
      { fecha: filtroFecha, servicio: filtroServicio },
      {
        onSuccess: (res) => {
          if (res.error) {
            notify.error('Error al consolidar: ' + res.error.message);
            return;
          }
          notify.success('Consolidado generado exitosamente');
          refetch();
        },
      }
    );
  };

  const handleAprobar = () => {
    if (!consolidadoActual?.id) return;
    setConfirmarAprobar(true);
  };

  const handleConfirmarAprobar = () => {
    setConfirmarAprobar(false);
    aprobarConsolidado.mutate(
      { consolidadoId: consolidadoActual.id, supervisorId: user?.id },
      {
        onSuccess: (res) => {
          if (res.error) { notify.error('Error al aprobar'); return; }
          notify.success('Consolidado aprobado y enviado a cocina');
          refetch();
        },
      }
    );
  };

  const handleMarcarPreparado = () => {
    if (!consolidadoActual?.id) return;
    marcarPreparado.mutate(consolidadoActual.id, {
      onSuccess: (res) => {
        if (res.error) {
          notify.error('Error');
          return;
        }
        notify.success('Marcado como preparado');
        refetch();
      },
    });
  };

  const handleCambiarReceta = (item) => {
    iniciarSustitucion(item.receta_id, consolidadoActual?.id);
    setItemSustituyendo(item);
  };

  return (
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="section-header">
              <h1 className="section-title">Consolidado de Producción</h1>
              <p className="section-subtitle">
                Consolida pedidos, verifica stock y aprueba para cocina
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                disabled={cargandoConsolidado}
                className="btn btn-outline flex items-center gap-2 text-sm !py-1.5"
              >
                {cargandoConsolidado ? (
                  <>
                    <div className="spinner spinner-sm"></div>
                    <span>Cargando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Actualizar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid-cards mb-6">
            <div className="stats-card">
              <div className="stats-icon bg-primary/10 text-primary">
                <FileText className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{pedidosEnviados}/{totalPedidos}</div>
                <div className="stats-label">Pedidos Recibidos</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon bg-warning/10 text-warning">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{pedidosTardios}</div>
                <div className="stats-label">Tardíos</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon bg-accent/10 text-accent">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{solicitudesPendientes?.length || 0}</div>
                <div className="stats-label">Solicitudes de Cambio</div>
              </div>
            </div>

            <div className="stats-card">
              <div className={`stats-icon ${consolidadoActual ? 'bg-success/10 text-success' : 'bg-neutral/10 text-neutral'}`}>
                {consolidadoActual ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Calendar className="w-6 h-6" />
                )}
              </div>
              <div className="stats-content">
                <div className="stats-value text-sm">
                  {consolidadoActual
                    ? ETIQUETAS_ESTADO_CONSOLIDADO[consolidadoActual.estado] || consolidadoActual.estado
                    : 'Sin consolidar'}
                </div>
                <div className="stats-label">Estado</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros + Selector de Unidad */}
        <div className="card mb-4">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-primary">Filtros</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Fecha</label>
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="form-label">Servicio</label>
                <select
                  value={filtroServicio}
                  onChange={(e) => setFiltroServicio(e.target.value)}
                  className="form-input w-full"
                >
                  {SERVICIOS.map((srv) => (
                    <option key={srv.value} value={srv.value}>
                      {srv.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  Unidad (opcional)
                </label>
                <div className="relative">
                  <select
                    value={filtroUnidad || ''}
                    onChange={(e) => setFiltroUnidad(e.target.value || null)}
                    className="form-input w-full pr-8"
                  >
                    <option value="">— Todas las unidades —</option>
                    {(operaciones || []).map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.nombre}
                      </option>
                    ))}
                  </select>
                  {filtroUnidad && (
                    <button
                      onClick={() => setFiltroUnidad(null)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary"
                      title="Limpiar filtro de unidad"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {unidadSeleccionada && (
                  <p className="text-xs text-text-muted mt-1">
                    Viendo datos de: <span className="font-semibold text-primary">{unidadSeleccionada.nombre}</span>
                  </p>
                )}
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleConsolidar}
                  disabled={consolidar.isPending}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  {consolidar.isPending ? (
                    <>
                      <div className="spinner spinner-sm"></div>
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4" />
                      <span>Generar Consolidado</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Horarios */}
        <div className="card mb-6">
          <div className="card-header flex items-center gap-2 py-3">
            <Clock className="w-4 h-4 text-text-muted" />
            <h3 className="text-sm font-semibold text-primary">
              Horarios límite de entrega
              {unidadSeleccionada ? ` — ${unidadSeleccionada.nombre}` : ' (todas las unidades)'}
            </h3>
          </div>
          <div className="card-body py-3">
            <PanelHorarios
              operacionId={filtroUnidad}
              filtroServicio={filtroServicio}
            />
          </div>
        </div>

        {/* Panel Menú del día — visible solo cuando hay unidad seleccionada */}
        {filtroUnidad && (
          <div className="card mb-4">
            <div className="card-header flex items-center gap-2 py-3">
              <BookOpen className="w-4 h-4 text-text-muted" />
              <h3 className="text-sm font-semibold text-primary flex-1">
                Menú del día — {unidadSeleccionada?.nombre}
              </h3>
            </div>
            <div className="card-body py-3">
              <PanelMenuUnidad
                operacionId={filtroUnidad}
                fecha={filtroFecha}
                filtroServicio={filtroServicio}
                onVerCicloCompleto={(ciclo) => setCicloModal(ciclo)}
              />
            </div>
          </div>
        )}

        {/* Solicitudes de cambio pendientes */}
        {solicitudesPendientes && solicitudesPendientes.length > 0 && (
          <div className="mb-6">
            <CambioRecetaPanel />
          </div>
        )}

        {/* Tabs + Contenido */}
        {cargandoConsolidado ? (
          <div className="card">
            <div className="card-body py-12 text-center">
              <div className="spinner spinner-lg mx-auto"></div>
              <p className="mt-4 text-muted text-sm">Cargando consolidado...</p>
            </div>
          </div>
        ) : !consolidadoActual ? (
          <div className="card">
            <div className="card-body py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted mb-3" />
              <h3 className="text-base font-semibold text-primary mb-2">Sin consolidado</h3>
              <p className="text-sm text-muted mb-4">
                No hay consolidado para {filtroFecha} — {filtroServicio}. Genera uno cuando los pedidos estén listos.
              </p>
              <button
                onClick={handleConsolidar}
                disabled={consolidar.isPending}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                <span>Generar Consolidado</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            {/* Tabs */}
            <div className="card-header border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex gap-0 flex-wrap">
                {[
                  { key: 'recetas', label: 'Por Receta' },
                  { key: 'unidades', label: filtroUnidad ? `Unidad: ${unidadSeleccionada?.nombre || '...'}` : 'Por Unidad' },
                  { key: 'ingredientes', label: 'Ingredientes' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => cambiarVista(tab.key)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      vistaActiva === tab.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-text-muted hover:text-primary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Info de totales */}
            <div className="px-4 py-2 border-b bg-bg-surface flex items-center justify-between text-xs text-text-muted" style={{ borderColor: 'var(--color-border)' }}>
              <span>
                Total porciones: <strong className="text-primary">{consolidadoActual.total_porciones || 0}</strong>
              </span>
              <span>
                Consolidado: {new Date(consolidadoActual.created_at).toLocaleString('es-CO')}
              </span>
            </div>

            {/* Contenido según tab */}
            <div className="card-body">
              {vistaActiva === 'recetas' && (
                <VistaRecetas
                  consolidadoId={consolidadoActual.id}
                  onCambiarReceta={handleCambiarReceta}
                />
              )}
              {vistaActiva === 'unidades' && <VistaUnidades />}
              {vistaActiva === 'ingredientes' && (
                <VistaIngredientes consolidadoId={consolidadoActual.id} />
              )}
            </div>

            {/* Footer acciones */}
            <div className="card-footer flex items-center justify-between">
              <div className="text-xs text-muted">
                {consolidadoActual.fecha_aprobacion && (
                  <span>Aprobado el {new Date(consolidadoActual.fecha_aprobacion).toLocaleString('es-CO')}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(consolidadoActual.estado === 'en_revision' || consolidadoActual.estado === 'pendiente') && (
                  <button
                    onClick={handleAprobar}
                    disabled={aprobarConsolidado.isPending}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {aprobarConsolidado.isPending ? (
                      <>
                        <div className="spinner spinner-sm"></div>
                        <span>Aprobando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Aprobar y Enviar a Cocina</span>
                      </>
                    )}
                  </button>
                )}
                {consolidadoActual.estado === 'aprobado' && (
                  <button
                    onClick={handleMarcarPreparado}
                    disabled={marcarPreparado.isPending}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {marcarPreparado.isPending ? (
                      <>
                        <div className="spinner spinner-sm"></div>
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Marcar como Preparado</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal confirmación aprobación */}
      {confirmarAprobar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}>
          <div className="bg-bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6"
               style={{ border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">Aprobar consolidado</h3>
                <p className="text-xs text-text-muted">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary mb-1">
              Vas a enviar a cocina el consolidado de:
            </p>
            <div className="bg-bg-app rounded-lg px-4 py-3 mb-5 text-sm"
                 style={{ border: '1px solid var(--color-border)' }}>
              <span className="font-semibold text-primary capitalize">{filtroServicio}</span>
              <span className="text-text-muted"> · </span>
              <span className="text-text-secondary">{filtroFecha}</span>
              <span className="text-text-muted"> · </span>
              <span className="font-semibold text-primary">{consolidadoActual?.total_porciones} porciones</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmarAprobar(false)}
                className="btn btn-outline flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarAprobar}
                disabled={aprobarConsolidado.isPending}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {aprobarConsolidado.isPending
                  ? <><div className="spinner spinner-sm" /><span>Aprobando...</span></>
                  : <><Check className="w-4 h-4" /><span>Confirmar</span></>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal sustitución de receta */}
      {itemSustituyendo && consolidadoActual && (
        <ModalSustituirReceta
          item={itemSustituyendo}
          consolidadoId={consolidadoActual.id}
          onClose={() => setItemSustituyendo(null)}
          onSuccess={() => {
            setItemSustituyendo(null);
            refetch();
          }}
        />
      )}

      {/* Modal ciclo completo (solo lectura) */}
      {cicloModal && (
        <ModalCicloCompleto
          ciclo={cicloModal}
          unidadNombre={unidadSeleccionada?.nombre || ''}
          onClose={() => setCicloModal(null)}
        />
      )}
    </div>
  );
}
