// ========================================
// SolicitudCambioModal - Cambio receta u Observación
// Props: pedidoId, menuComponentes, tiposDieta, onClose
// ========================================

import React, { useState } from 'react';
import { X, Send, FileEdit, MessageSquare } from 'lucide-react';
import { useCrearSolicitudCambio } from '../hooks/useSolicitudesCambio';
import { useBuscarRecetas } from '@features/menu-cycles';
import notify from '@/shared/lib/notifier';

const TABS = [
  { key: 'cambio_receta', label: 'Cambio de receta', icon: FileEdit },
  { key: 'observacion',   label: 'Observación',       icon: MessageSquare },
];

export default function SolicitudCambioModal({
  pedidoId,
  menuComponentes = [],
  tiposDieta = [],
  onClose,
}) {
  const [tab, setTab] = useState('cambio_receta');

  // ── Tab cambio_receta ──────────────────────────────
  const [componenteId,        setComponenteId]        = useState('');
  const [tipoDietaId,         setTipoDietaId]         = useState('');
  const [busqueda,            setBusqueda]            = useState('');
  const [recetaSeleccionada,  setRecetaSeleccionada]  = useState(null);
  const [motivoCambio,        setMotivoCambio]        = useState('');

  // ── Tab observacion ───────────────────────────────
  const [observacion,         setObservacion]         = useState('');
  const [referenciaPaciente,  setReferenciaPaciente]  = useState('');
  const [componenteObsId,     setComponenteObsId]     = useState('');

  const crearSolicitud = useCrearSolicitudCambio();
  const { data: recetas } = useBuscarRecetas(busqueda);

  // ── Validación por tab ────────────────────────────
  const puedeEnviarCambio = motivoCambio.trim().length > 0;
  const puedeEnviarObs    = observacion.trim().length > 0;
  const puedeEnviar       = tab === 'cambio_receta' ? puedeEnviarCambio : puedeEnviarObs;

  const handleEnviar = () => {
    if (tab === 'cambio_receta') {
      if (!motivoCambio.trim()) {
        notify.warning('Debes indicar el motivo del cambio');
        return;
      }
      crearSolicitud.mutate(
        {
          pedido_id:           pedidoId,
          menu_componente_id:  componenteId || null,
          receta_solicitada_id: recetaSeleccionada?.id || null,
          motivo:              motivoCambio.trim(),
          tipo_solicitud:      'cambio_receta',
          tipo_dieta_id:       tipoDietaId || null,
          paciente_info:       null,
        },
        {
          onSuccess: (res) => {
            if (res.error) { notify.error('Error al enviar: ' + res.error.message); return; }
            notify.success('Solicitud de cambio enviada al supervisor');
            onClose();
          },
        }
      );
    } else {
      if (!observacion.trim()) {
        notify.warning('Debes escribir la observación');
        return;
      }
      crearSolicitud.mutate(
        {
          pedido_id:           pedidoId,
          menu_componente_id:  componenteObsId || null,
          receta_solicitada_id: null,
          motivo:              observacion.trim(),
          tipo_solicitud:      'observacion',
          tipo_dieta_id:       null,
          paciente_info:       referenciaPaciente.trim()
            ? { referencia: referenciaPaciente.trim() }
            : null,
        },
        {
          onSuccess: (res) => {
            if (res.error) { notify.error('Error al enviar: ' + res.error.message); return; }
            notify.success('Observación enviada al supervisor');
            onClose();
          },
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* ── Header ─────────────────────────────────── */}
        <div
          className="card-header border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-lg font-semibold text-primary">Solicitar al Supervisor</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-primary hover:bg-bg-surface rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Tabs ───────────────────────────────────── */}
        <div
          className="flex border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Body scrollable ────────────────────────── */}
        <div className="card-body overflow-y-auto flex-1 space-y-4">

          {tab === 'cambio_receta' && (
            <>
              {/* Componente */}
              {menuComponentes.length > 0 && (
                <div>
                  <label className="form-label">Componente a cambiar</label>
                  <select
                    value={componenteId}
                    onChange={(e) => setComponenteId(e.target.value)}
                    className="form-input w-full text-sm"
                  >
                    <option value="">— Seleccionar componente —</option>
                    {menuComponentes.map((mc) => (
                      <option key={mc.id} value={mc.id}>
                        {mc.componentes_plato?.nombre || mc.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dieta */}
              {tiposDieta.length > 0 && (
                <div>
                  <label className="form-label">Para qué dieta</label>
                  <select
                    value={tipoDietaId}
                    onChange={(e) => setTipoDietaId(e.target.value)}
                    className="form-input w-full text-sm"
                  >
                    <option value="">— Todas las dietas —</option>
                    {tiposDieta.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Receta sugerida */}
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
                    <div className="mt-2 p-2 bg-primary/10 rounded-lg border border-primary/30 text-sm flex items-center gap-2">
                      <span className="text-success">✓</span>
                      <span className="text-primary font-medium">{recetaSeleccionada.nombre}</span>
                      <button
                        onClick={() => { setRecetaSeleccionada(null); setBusqueda(''); }}
                        className="ml-auto text-text-muted hover:text-primary"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {busqueda && recetas && recetas.length > 0 && !recetaSeleccionada && (
                    <div
                      className="mt-1 border rounded-lg max-h-40 overflow-y-auto bg-bg-surface"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      {recetas.slice(0, 6).map((receta) => (
                        <button
                          key={receta.id}
                          onClick={() => { setRecetaSeleccionada(receta); setBusqueda(receta.nombre); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-bg-app transition-colors border-b last:border-b-0"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <span className="font-medium text-primary">{receta.nombre}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="form-label">Motivo del cambio *</label>
                <textarea
                  rows="3"
                  value={motivoCambio}
                  onChange={(e) => setMotivoCambio(e.target.value)}
                  placeholder="Describe por qué necesitas cambiar esta receta..."
                  className="form-input w-full text-sm"
                />
              </div>
            </>
          )}

          {tab === 'observacion' && (
            <>
              {/* Observación */}
              <div>
                <label className="form-label">Observación para cocina *</label>
                <textarea
                  rows="3"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Ej: Paciente en cuarto 302 prefiere carne bien cocida..."
                  className="form-input w-full text-sm"
                />
                <p className="text-xs text-text-muted mt-1">
                  Nota informativa — no afecta inventario ni requiere aprobación
                </p>
              </div>

              {/* Referencia paciente */}
              <div>
                <label className="form-label">Paciente / referencia (opcional)</label>
                <input
                  type="text"
                  value={referenciaPaciente}
                  onChange={(e) => setReferenciaPaciente(e.target.value)}
                  placeholder="Ej: María García · Cuarto 301"
                  className="form-input w-full text-sm"
                />
              </div>

              {/* Componente (opcional) */}
              {menuComponentes.length > 0 && (
                <div>
                  <label className="form-label">Componente al que aplica (opcional)</label>
                  <select
                    value={componenteObsId}
                    onChange={(e) => setComponenteObsId(e.target.value)}
                    className="form-input w-full text-sm"
                  >
                    <option value="">— General —</option>
                    {menuComponentes.map((mc) => (
                      <option key={mc.id} value={mc.id}>
                        {mc.componentes_plato?.nombre || mc.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────── */}
        <div
          className="card-footer border-t flex items-center justify-end gap-2 flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button onClick={onClose} className="btn btn-outline text-sm">
            Cancelar
          </button>
          <button
            onClick={handleEnviar}
            disabled={!puedeEnviar || crearSolicitud.isPending}
            className="btn btn-primary text-sm flex items-center gap-2"
          >
            {crearSolicitud.isPending ? (
              <>
                <div className="spinner spinner-sm" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar al Supervisor</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
