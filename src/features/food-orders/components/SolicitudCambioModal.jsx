// ========================================
// SolicitudCambioModal - Modal solicitar cambio receta
// ========================================

import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { useCrearSolicitudCambio } from '../hooks/useSolicitudesCambio';
import { useBuscarRecetas } from '@features/menu-cycles';
import notify from '@/utils/notifier';

export default function SolicitudCambioModal({ pedidoId, menuComponenteId, onClose }) {
  const [motivo, setMotivo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [recetaSeleccionada, setRecetaSeleccionada] = useState(null);

  const crearSolicitud = useCrearSolicitudCambio();
  const { data: recetas } = useBuscarRecetas(busqueda);

  const handleEnviar = () => {
    if (!motivo.trim()) {
      notify.warning('Debes indicar un motivo para el cambio');
      return;
    }

    crearSolicitud.mutate(
      {
        pedido_id: pedidoId,
        menu_componente_id: menuComponenteId,
        receta_solicitada_id: recetaSeleccionada?.id || null,
        motivo: motivo.trim(),
      },
      {
        onSuccess: (res) => {
          if (res.error) {
            notify.error('Error al enviar solicitud: ' + res.error.message);
            return;
          }
          notify.success('Solicitud de cambio enviada');
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card w-full max-w-md">
        {/* Header */}
        <div className="card-header border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-lg font-semibold text-primary">Solicitar Cambio de Receta</h3>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-primary hover:bg-bg-surface rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="card-body space-y-4">
          {/* Motivo */}
          <div>
            <label className="form-label">Motivo del cambio *</label>
            <textarea
              rows="3"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describe por qué necesitas cambiar esta receta..."
              className="form-input w-full text-sm"
            />
          </div>

          {/* Receta sugerida (opcional) */}
          <div>
            <label className="form-label">Receta sugerida (opcional)</label>
            <div className="relative">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setRecetaSeleccionada(null);
                }}
                placeholder="Buscar receta alternativa..."
                className="form-input w-full text-sm"
              />
              {recetaSeleccionada && (
                <div className="mt-2 p-2 bg-primary/10 rounded-lg border border-primary/30 text-sm">
                  <span className="text-primary font-medium">✓ {recetaSeleccionada.nombre}</span>
                </div>
              )}
              {busqueda && recetas && recetas.length > 0 && !recetaSeleccionada && (
                <div className="mt-1 border rounded-lg max-h-40 overflow-y-auto" style={{ borderColor: 'var(--color-border)' }}>
                  {recetas.slice(0, 5).map((receta) => (
                    <button
                      key={receta.id}
                      onClick={() => {
                        setRecetaSeleccionada(receta);
                        setBusqueda(receta.nombre);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-bg-surface transition-colors border-b last:border-b-0"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <span className="font-medium text-primary">{receta.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="card-footer border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={onClose} className="btn btn-outline text-sm">
            Cancelar
          </button>
          <button
            onClick={handleEnviar}
            disabled={!motivo.trim() || crearSolicitud.isPending}
            className="btn btn-primary text-sm flex items-center gap-2"
          >
            {crearSolicitud.isPending ? (
              <>
                <div className="spinner spinner-sm"></div>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar Solicitud</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
