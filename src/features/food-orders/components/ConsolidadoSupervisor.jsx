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
} from 'lucide-react';
import { useConsolidadoStore } from '../store/useConsolidadoStore';
import {
  useConsolidadoPorFecha,
  useConsolidar,
  useAprobarConsolidado,
  useMarcarPreparado,
  useSustituirReceta,
} from '../hooks/useConsolidado';
import { useSolicitudesPendientes } from '../hooks/useSolicitudesCambio';
import { usePedidosPorFecha } from '../hooks/usePedidos';
import { SERVICIOS, ETIQUETAS_ESTADO_CONSOLIDADO } from '@/shared/types/menu';
import VistaRecetas from './VistaRecetas';
import VistaUnidades from './VistaUnidades';
import VistaIngredientes from './VistaIngredientes';
import CambioRecetaPanel from './CambioRecetaPanel';
import { useAuth } from '@/context/auth';
import notify from '@/utils/notifier';

export default function ConsolidadoSupervisor() {
  const { user } = useAuth();
  const {
    vistaActiva,
    filtroFecha,
    filtroServicio,
    consolidadoActual,
    cambiarVista,
    setFiltroFecha,
    setFiltroServicio,
    setConsolidado,
    iniciarSustitucion,
  } = useConsolidadoStore();

  // Queries
  const { data: consolidado, isLoading: cargandoConsolidado, refetch } =
    useConsolidadoPorFecha(filtroFecha, filtroServicio);
  const { data: pedidos } = usePedidosPorFecha(filtroFecha, filtroServicio);
  const { data: solicitudesPendientes } = useSolicitudesPendientes();

  // Mutations
  const consolidar = useConsolidar();
  const aprobarConsolidado = useAprobarConsolidado();
  const marcarPreparado = useMarcarPreparado();
  const sustituirReceta = useSustituirReceta();

  useEffect(() => {
    if (consolidado) setConsolidado(consolidado);
  }, [consolidado]);

  // Stats
  const totalPedidos = pedidos?.length || 0;
  const pedidosEnviados = pedidos?.filter((p) => p.estado !== 'borrador').length || 0;
  const pedidosTardios = pedidos?.filter((p) => !p.enviado_en_hora && p.hora_envio).length || 0;

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
    aprobarConsolidado.mutate(
      { consolidadoId: consolidadoActual.id, supervisorId: user?.id },
      {
        onSuccess: (res) => {
          if (res.error) {
            notify.error('Error al aprobar');
            return;
          }
          notify.success('Consolidado aprobado');
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

        {/* Filtros */}
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-primary">Filtros</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                No hay consolidado para {filtroFecha} - {filtroServicio}. Genera uno cuando los pedidos estén listos.
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
              <div className="flex gap-0">
                {[
                  { key: 'recetas', label: 'Por Receta' },
                  { key: 'unidades', label: 'Por Unidad' },
                  { key: 'ingredientes', label: 'Ingredientes' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => cambiarVista(tab.key)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
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
                {consolidadoActual.aprobado_por && (
                  <span>Aprobado el {new Date(consolidadoActual.aprobado_at).toLocaleString('es-CO')}</span>
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
    </div>
  );
}
