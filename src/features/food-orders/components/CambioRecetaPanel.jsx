// ========================================
// CambioRecetaPanel - Panel aprobar/rechazar solicitudes
// Soporta tipo_solicitud: 'cambio_receta' | 'observacion'
// Layout inspirado en mockup-v4: dos cajas receta actual / propuesta
// ========================================

import React, { useState } from 'react';
import { Check, X, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useSolicitudesPendientes, useAprobarSolicitud, useRechazarSolicitud } from '../hooks/useSolicitudesCambio';
import { useAuth } from '@/features/auth';
import { supabase } from '@/shared/api';
import notify from '@/shared/lib/notifier';
import { consolidadoService } from '../services/consolidadoService';
import ModalSustituirReceta from './ModalSustituirReceta';

export default function CambioRecetaPanel() {
  const { data: solicitudes, isLoading } = useSolicitudesPendientes();
  const aprobar  = useAprobarSolicitud();
  const rechazar = useRechazarSolicitud();
  const { user } = useAuth();

  const [respuestas,         setRespuestas]         = useState({});
  const [mostrarRespuesta,   setMostrarRespuesta]   = useState({});
  const [checkandoConsolidado, setCheckandoConsolidado] = useState(null);
  const [sustitucionPendiente, setSustitucionPendiente] = useState(null);

  const handleAprobar = async (sol) => {
    const fecha    = sol.pedidos_servicio?.fecha;
    const servicio = sol.pedidos_servicio?.servicio;

    if (fecha && servicio && sol.receta_solicitada_id) {
      setCheckandoConsolidado(sol.id);
      try {
        const { data: consolidado } = await consolidadoService.getConsolidadoPorFecha(fecha, servicio);
        if (consolidado && ['en_revision', 'pendiente'].includes(consolidado.estado)) {
          const componentePlatoId = sol.menu_componentes?.componente_id;
          const matchingItem = consolidado.consolidado_items?.find(
            (ci) => ci.componente_id === componentePlatoId,
          ) || consolidado.consolidado_items?.[0];
          if (matchingItem) {
            setSustitucionPendiente({ solicitud: sol, consolidado, item: matchingItem });
            return;
          }
        }
      } catch (e) {
        console.error('[CambioRecetaPanel] Error verificando consolidado:', e);
      } finally {
        setCheckandoConsolidado(null);
      }
    }

    aprobar.mutate(
      { solicitudId: sol.id, aprobadoPor: user?.id, respuesta: respuestas[sol.id] || null },
      {
        onSuccess: (res) => {
          if (res.error) { notify.error('Error al aprobar'); return; }
          notify.success('Solicitud aprobada');
          supabase.rpc('fn_notif_cambio_receta', { p_solicitud_id: sol.id }).catch(() => {});
        },
      }
    );
  };

  const handleRechazar = (sol) => {
    if (!respuestas[sol.id]?.trim()) {
      notify.warning('Debes indicar un motivo para rechazar');
      return;
    }
    rechazar.mutate(
      { solicitudId: sol.id, aprobadoPor: user?.id, respuesta: respuestas[sol.id] },
      {
        onSuccess: (res) => {
          if (res.error) { notify.error('Error al rechazar'); return; }
          notify.success('Solicitud rechazada');
          supabase.rpc('fn_notif_cambio_receta', { p_solicitud_id: sol.id }).catch(() => {});
        },
      }
    );
  };

  if (isLoading || !solicitudes || solicitudes.length === 0) return null;

  return (
    <>
      <div
        className="rounded-xl border p-4 mb-4"
        style={{ borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.05)' }}
      >
        <h3
          className="text-sm font-bold mb-3 flex items-center gap-2"
          style={{ color: 'var(--color-warning, #d97706)' }}
        >
          🔔 Solicitudes pendientes
          <span
            className="px-2 py-0.5 rounded-full text-xs"
            style={{ background: 'rgba(245,158,11,0.2)', color: 'var(--color-warning, #d97706)' }}
          >
            {solicitudes.length}
          </span>
        </h3>

        <div className="space-y-3">
          {solicitudes.map((sol) => {
            const esObservacion = sol.tipo_solicitud === 'observacion';
            const unidad        = sol.pedidos_servicio?.operaciones?.nombre || 'Unidad';
            const fecha         = sol.pedidos_servicio?.fecha;
            const servicio      = sol.pedidos_servicio?.servicio;
            const showResp      = mostrarRespuesta[sol.id];

            return (
              <div
                key={sol.id}
                className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: esObservacion
                    ? 'var(--color-border)'
                    : 'rgba(99,102,241,0.25)',
                  background: 'var(--color-bg-surface)',
                }}
              >
                {/* ── Header solicitud ─────────────────── */}
                <div
                  className="px-4 py-3 flex items-center gap-2 flex-wrap border-b"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {/* Tipo badge */}
                  {esObservacion ? (
                    <span className="text-xs px-2 py-0.5 rounded-full border font-semibold"
                      style={{ background: 'var(--color-bg-app)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                      📋 Observación
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full border font-semibold"
                      style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.3)', color: 'var(--color-primary)' }}>
                      📝 Cambio de receta
                    </span>
                  )}

                  <span className="text-sm font-semibold text-primary">{unidad}</span>

                  {sol.tipos_dieta && (
                    <span className="text-xs px-2 py-0.5 rounded-full border"
                      style={{ background: 'rgba(168,85,247,0.1)', borderColor: 'rgba(168,85,247,0.3)', color: '#a855f7' }}>
                      {sol.tipos_dieta.codigo} · {sol.tipos_dieta.nombre}
                    </span>
                  )}

                  {fecha && (
                    <span className="text-xs text-text-muted ml-auto">
                      {fecha}{servicio ? ` · ${servicio}` : ''}
                    </span>
                  )}
                </div>

                {/* ── Cuerpo ───────────────────────────── */}
                <div className="px-4 py-3">
                  {esObservacion ? (
                    /* Observación: texto prominente */
                    <div className="space-y-2">
                      <p className="text-sm text-primary">{sol.motivo}</p>
                      {sol.paciente_info?.referencia && (
                        <p className="text-xs text-text-muted">
                          👤 {sol.paciente_info.referencia}
                        </p>
                      )}
                      {sol.menu_componentes?.componentes_plato?.nombre && (
                        <p className="text-xs text-text-muted">
                          Componente: {sol.menu_componentes.componentes_plato.nombre}
                        </p>
                      )}
                      <div
                        className="mt-2 px-3 py-2 rounded-lg text-xs"
                        style={{ background: 'var(--color-bg-app)', color: 'var(--color-text-muted)' }}
                      >
                        ℹ Esta observación es solo informativa — no requiere aprobación ni afecta inventario
                      </div>
                    </div>
                  ) : (
                    /* Cambio receta: dos columnas actual vs propuesta */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Receta actual */}
                        <div
                          className="p-2.5 rounded-xl border"
                          style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.25)' }}
                        >
                          <p className="text-xs font-bold mb-1" style={{ color: '#ef4444' }}>
                            Receta actual
                          </p>
                          <p className="text-sm font-semibold text-primary">
                            {sol.menu_componentes?.componentes_plato?.nombre
                              ? `${sol.menu_componentes.componentes_plato.nombre}`
                              : '—'}
                          </p>
                          {sol.menu_componentes?.arbol_recetas?.nombre && (
                            <p className="text-xs text-text-muted mt-0.5 line-through">
                              {sol.menu_componentes.arbol_recetas.nombre}
                            </p>
                          )}
                        </div>

                        {/* Receta propuesta */}
                        <div
                          className="p-2.5 rounded-xl border"
                          style={{ background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.25)' }}
                        >
                          <p className="text-xs font-bold mb-1" style={{ color: 'var(--color-primary)' }}>
                            Receta propuesta
                          </p>
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                            {sol.arbol_recetas?.nombre || (
                              <span className="text-text-muted italic text-xs">No especificada</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Motivo */}
                      <p className="text-xs text-text-muted italic">"{sol.motivo}"</p>

                      {/* Nota stock */}
                      <div
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.2)', border: '1px solid' }}
                      >
                        ℹ Al aprobar: el descuento de stock usará la receta sustituta
                      </div>

                      {/* Campo respuesta colapsable */}
                      <button
                        onClick={() => setMostrarRespuesta((p) => ({ ...p, [sol.id]: !p[sol.id] }))}
                        className="flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {showResp ? 'Ocultar respuesta' : 'Añadir respuesta'}
                        {showResp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {showResp && (
                        <input
                          type="text"
                          value={respuestas[sol.id] || ''}
                          onChange={(e) => setRespuestas((p) => ({ ...p, [sol.id]: e.target.value }))}
                          placeholder="Escribe aquí tu respuesta (requerida para rechazar)..."
                          className="form-input w-full text-sm"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* ── Footer acciones (solo para cambio_receta) ── */}
                {!esObservacion && (
                  <div
                    className="px-4 py-2.5 border-t flex items-center justify-end gap-2"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-app)' }}
                  >
                    <button
                      onClick={() => handleRechazar(sol)}
                      disabled={rechazar.isPending}
                      className="btn btn-outline text-xs py-1 px-3 flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleAprobar(sol)}
                      disabled={aprobar.isPending || checkandoConsolidado === sol.id}
                      className="btn btn-primary text-xs py-1 px-3 flex items-center gap-1.5"
                    >
                      {checkandoConsolidado === sol.id
                        ? <div className="spinner spinner-sm" />
                        : <Check className="w-3.5 h-3.5" />}
                      Aprobar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal sustitución */}
      {sustitucionPendiente && (
        <ModalSustituirReceta
          item={sustitucionPendiente.item}
          consolidadoId={sustitucionPendiente.consolidado.id}
          recetaPreseleccionada={
            sustitucionPendiente.solicitud.receta_solicitada_id
              ? {
                  id:     sustitucionPendiente.solicitud.receta_solicitada_id,
                  nombre: sustitucionPendiente.solicitud.arbol_recetas?.nombre || 'Receta solicitada',
                }
              : null
          }
          motivoInicial={sustitucionPendiente.solicitud.motivo || ''}
          onClose={() => setSustitucionPendiente(null)}
          onSuccess={async () => {
            try {
              await aprobar.mutateAsync({
                solicitudId: sustitucionPendiente.solicitud.id,
                aprobadoPor: user?.id,
                respuesta:   respuestas[sustitucionPendiente.solicitud.id] || 'Aplicado al consolidado',
              });
              notify.success('Solicitud aprobada y cambio aplicado al consolidado');
              supabase.rpc('fn_notif_cambio_receta', { p_solicitud_id: sustitucionPendiente.solicitud.id }).catch(() => {});
            } catch {
              notify.error('Cambio aplicado pero hubo un error al aprobar la solicitud');
            }
            setSustitucionPendiente(null);
          }}
        />
      )}
    </>
  );
}
