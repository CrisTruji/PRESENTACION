// ========================================
// CambioRecetaPanel - Panel aprobar/rechazar solicitudes
// ========================================

import React, { useState } from 'react';
import { Check, X, MessageSquare } from 'lucide-react';
import { useSolicitudesPendientes, useAprobarSolicitud, useRechazarSolicitud } from '../hooks/useSolicitudesCambio';
import { useAuth } from '@/features/auth';
import { supabase } from '@/shared/api';
import notify from '@/shared/lib/notifier';
import { consolidadoService } from '../services/consolidadoService';
import ModalSustituirReceta from './ModalSustituirReceta';

export default function CambioRecetaPanel() {
  const { data: solicitudes, isLoading } = useSolicitudesPendientes();
  const aprobar = useAprobarSolicitud();
  const rechazar = useRechazarSolicitud();
  const { user } = useAuth();

  const [respuestas, setRespuestas] = useState({});
  const [mostrarRespuesta, setMostrarRespuesta] = useState({});
  const [checkandoConsolidado, setCheckandoConsolidado] = useState(null); // solicitudId verificando
  const [sustitucionPendiente, setSustitucionPendiente] = useState(null); // { solicitud, consolidado, item }

  const handleAprobar = async (sol) => {
    const fecha   = sol.pedidos_servicio?.fecha;
    const servicio = sol.pedidos_servicio?.servicio;

    // Si la solicitud tiene receta solicitada, intentar enlazar con consolidado activo
    if (fecha && servicio && sol.receta_solicitada_id) {
      setCheckandoConsolidado(sol.id);
      try {
        const { data: consolidado } = await consolidadoService.getConsolidadoPorFecha(fecha, servicio);

        if (consolidado && ['en_revision', 'pendiente'].includes(consolidado.estado)) {
          // Encontrar el consolidado_item que corresponde al componente de la solicitud
          const componentePlatoId = sol.menu_componentes?.componente_id;
          const matchingItem = consolidado.consolidado_items?.find(
            (ci) => ci.componente_id === componentePlatoId,
          ) || consolidado.consolidado_items?.[0];

          if (matchingItem) {
            setSustitucionPendiente({ solicitud: sol, consolidado, item: matchingItem });
            return; // El modal maneja el resto
          }
        }
      } catch (e) {
        console.error('[CambioRecetaPanel] Error verificando consolidado:', e);
      } finally {
        setCheckandoConsolidado(null);
      }
    }

    // Sin consolidado activo: solo aprobar
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

  if (isLoading) return null;
  if (!solicitudes || solicitudes.length === 0) return null;

  return (
    <>
    <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
      <h3 className="text-base font-semibold text-warning mb-3 flex items-center gap-2">
        🔔 Solicitudes de Cambio Pendientes ({solicitudes.length})
      </h3>

      <div className="space-y-3">
        {solicitudes.map((sol) => (
          <div
            key={sol.id}
            className="bg-bg-surface rounded-lg p-4 border"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="badge badge-accent text-xs flex-shrink-0">
                    {sol.pedidos_servicio?.operaciones?.nombre || 'Unidad'}
                  </span>
                  <span className="text-xs text-text-muted flex-shrink-0">
                    {sol.pedidos_servicio?.fecha} • {sol.pedidos_servicio?.servicio}
                  </span>
                </div>
                <div className="text-sm mb-1">
                  <span className="text-text-muted">Cambiar: </span>
                  <span className="font-semibold text-primary">
                    {sol.menu_componentes?.componentes_plato?.nombre}
                    {sol.menu_componentes?.arbol_recetas?.nombre && ` (${sol.menu_componentes.arbol_recetas.nombre})`}
                  </span>
                  {sol.arbol_recetas?.nombre && (
                    <>
                      <span className="text-text-muted mx-1">→</span>
                      <span className="font-semibold text-success">{sol.arbol_recetas.nombre}</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-text-muted">
                  <span className="font-medium">Motivo:</span> {sol.motivo}
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                <button
                  onClick={() =>
                    setMostrarRespuesta((prev) => ({
                      ...prev,
                      [sol.id]: !prev[sol.id],
                    }))
                  }
                  className="p-1.5 text-text-muted hover:text-primary hover:bg-bg-app rounded-md transition-colors"
                  title="Responder"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleAprobar(sol)}
                  disabled={aprobar.isPending || checkandoConsolidado === sol.id}
                  className="btn btn-primary text-xs py-1 px-2 flex items-center gap-1"
                >
                  {checkandoConsolidado === sol.id
                    ? <div className="spinner spinner-sm" />
                    : <Check className="w-3.5 h-3.5" />}
                  <span>Aprobar</span>
                </button>
                <button
                  onClick={() => handleRechazar(sol)}
                  disabled={rechazar.isPending}
                  className="btn btn-outline text-xs py-1 px-2 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Rechazar</span>
                </button>
              </div>
            </div>

            {/* Campo respuesta */}
            {mostrarRespuesta[sol.id] && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <label className="form-label text-xs">Respuesta o motivo de rechazo</label>
                <input
                  type="text"
                  value={respuestas[sol.id] || ''}
                  onChange={(e) =>
                    setRespuestas((prev) => ({ ...prev, [sol.id]: e.target.value }))
                  }
                  placeholder="Escribe aquí tu respuesta..."
                  className="form-input w-full text-sm"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* Modal de sustitución cuando hay consolidado activo */}
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
            supabase
              .rpc('fn_notif_cambio_receta', { p_solicitud_id: sustitucionPendiente.solicitud.id })
              .catch(() => {});
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
