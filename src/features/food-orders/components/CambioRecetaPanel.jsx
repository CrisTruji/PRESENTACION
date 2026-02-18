// ========================================
// CambioRecetaPanel - Panel aprobar/rechazar solicitudes
// ========================================

import React, { useState } from 'react';
import { Check, X, MessageSquare } from 'lucide-react';
import { useSolicitudesPendientes, useAprobarSolicitud, useRechazarSolicitud } from '../hooks/useSolicitudesCambio';
import { useAuth } from '@/context/auth';
import notify from '@/utils/notifier';

export default function CambioRecetaPanel() {
  const { data: solicitudes, isLoading } = useSolicitudesPendientes();
  const aprobar = useAprobarSolicitud();
  const rechazar = useRechazarSolicitud();
  const { user } = useAuth();

  const [respuestas, setRespuestas] = useState({});
  const [mostrarRespuesta, setMostrarRespuesta] = useState({});

  const handleAprobar = (solicitudId) => {
    aprobar.mutate(
      {
        solicitudId,
        aprobadoPor: user?.id,
        respuesta: respuestas[solicitudId] || null,
      },
      {
        onSuccess: (res) => {
          if (res.error) {
            notify.error('Error al aprobar');
            return;
          }
          notify.success('Solicitud aprobada');
        },
      }
    );
  };

  const handleRechazar = (solicitudId) => {
    if (!respuestas[solicitudId]?.trim()) {
      notify.warning('Debes indicar un motivo para rechazar');
      return;
    }
    rechazar.mutate(
      {
        solicitudId,
        aprobadoPor: user?.id,
        respuesta: respuestas[solicitudId],
      },
      {
        onSuccess: (res) => {
          if (res.error) {
            notify.error('Error al rechazar');
            return;
          }
          notify.success('Solicitud rechazada');
        },
      }
    );
  };

  if (isLoading) return null;
  if (!solicitudes || solicitudes.length === 0) return null;

  return (
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
                  onClick={() => handleAprobar(sol.id)}
                  disabled={aprobar.isPending}
                  className="btn btn-primary text-xs py-1 px-2 flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aprobar</span>
                </button>
                <button
                  onClick={() => handleRechazar(sol.id)}
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
  );
}
