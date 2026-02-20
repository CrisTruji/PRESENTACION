// ========================================
// ModalSustituirReceta
// Permite al supervisor sustituir una receta del consolidado
// Muestra recomendaciones basadas en stock disponible
// ========================================

import React, { useState } from 'react';
import { X, Search, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, ArrowLeftRight } from 'lucide-react';
import { useRecetasAlternativas, useSustituirReceta } from '../hooks/useConsolidado';
import { useConsolidadoStore } from '../store/useConsolidadoStore';
import { useAuth } from '@/context/auth';
import notify from '@/utils/notifier';

export default function ModalSustituirReceta({ item, consolidadoId, onClose, onSuccess }) {
  const [termino, setTermino]       = useState('');
  const [motivo, setMotivo]         = useState('');
  const [expandidos, setExpandidos] = useState({});
  const { user }                    = useAuth();
  const sustituir                   = useSustituirReceta();
  const { cancelarSustitucion }     = useConsolidadoStore();

  const componenteId       = item?.componente_id || null;
  const recetaActualId     = item?.receta_id;
  const recetaActualNombre = item?.arbol_recetas?.nombre || 'Receta actual';
  const componenteNombre   = item?.componentes_plato?.nombre || '';

  const { data: alternativas, isLoading } = useRecetasAlternativas(termino, componenteId);

  const handleCerrar = () => {
    cancelarSustitucion();
    onClose?.();
  };

  const handleSustituir = (recetaNueva) => {
    if (!motivo.trim()) {
      notify.warning('Ingresa el motivo del cambio');
      return;
    }
    sustituir.mutate(
      { consolidadoId, recetaOriginalId: recetaActualId, recetaNuevaId: recetaNueva.id, motivo, supervisorId: user?.id },
      {
        onSuccess: (res) => {
          if (res.error) { notify.error('Error: ' + res.error.message); return; }
          notify.success(`Cambiado a "${recetaNueva.nombre}"`);
          cancelarSustitucion();
          onSuccess?.();
          onClose?.();
        },
      }
    );
  };

  const toggleExpandir = (id) =>
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));

  const recomendadas  = (alternativas || []).filter((r) =>  r.stock_ok && r.id !== recetaActualId);
  const conProblemas  = (alternativas || []).filter((r) => !r.stock_ok && r.id !== recetaActualId);
  const sinResultados = !isLoading && alternativas && recomendadas.length === 0 && conProblemas.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && handleCerrar()}
    >
      <div className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-bg-surface"
           style={{ border: '1px solid var(--color-border)' }}>

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ArrowLeftRight className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary leading-tight">Cambiar receta</h2>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {componenteNombre && (
                  <span className="badge badge-primary text-xs">{componenteNombre}</span>
                )}
                <span className="text-xs text-text-muted truncate max-w-[220px]">{recetaActualNombre}</span>
              </div>
            </div>
          </div>
          <button onClick={handleCerrar}
            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-bg-app transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Motivo ── */}
        <div className="px-5 pb-3">
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo del cambio *  (ej: stock insuficiente)"
            className="form-input w-full text-sm"
            autoFocus
          />
        </div>

        {/* ── Buscador ── */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-bg-app"
               style={{ border: '1px solid var(--color-border)' }}>
            <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar receta por nombre..."
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none text-primary placeholder-text-muted"
            />
            {isLoading && <div className="spinner spinner-sm" />}
          </div>
        </div>

        {/* ── Lista ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4 min-h-0">

          {/* Recomendadas */}
          {recomendadas.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-success flex items-center gap-1.5 mb-2">
                <CheckCircle className="w-3.5 h-3.5" />
                Stock disponible — {recomendadas.length} {recomendadas.length === 1 ? 'opción' : 'opciones'}
              </p>
              <div className="space-y-1.5">
                {recomendadas.map((r) => (
                  <RecetaCard key={r.id} receta={r} expandido={expandidos[r.id]}
                    onToggle={() => toggleExpandir(r.id)}
                    onSeleccionar={() => handleSustituir(r)}
                    cargando={sustituir.isPending} tipo="success" />
                ))}
              </div>
            </section>
          )}

          {/* Con problemas */}
          {conProblemas.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-warning flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Stock insuficiente — {conProblemas.length} {conProblemas.length === 1 ? 'opción' : 'opciones'}
              </p>
              <div className="space-y-1.5">
                {conProblemas.map((r) => (
                  <RecetaCard key={r.id} receta={r} expandido={expandidos[r.id]}
                    onToggle={() => toggleExpandir(r.id)}
                    onSeleccionar={() => handleSustituir(r)}
                    cargando={sustituir.isPending} tipo="warning" />
                ))}
              </div>
            </section>
          )}

          {/* Prompt inicial: escribir para buscar */}
          {!isLoading && !componenteId && termino.length < 2 && (
            <div className="py-10 text-center">
              <Search className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm text-text-muted">Escribe al menos 2 letras para buscar recetas</p>
            </div>
          )}

          {/* Sin resultados luego de buscar */}
          {sinResultados && (termino.length >= 2 || !!componenteId) && (
            <div className="py-10 text-center">
              <Search className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm text-text-muted">
                {termino.length >= 2 ? `Sin resultados para "${termino}"` : 'No hay recetas alternativas disponibles'}
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t flex items-center gap-2"
             style={{ borderColor: 'var(--color-border)' }}>
          <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
          <p className="text-xs text-text-muted">
            Las opciones en <span className="text-success font-semibold">verde</span> tienen
            stock suficiente para todos sus ingredientes.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de receta ──────────────────────────────────────────
function RecetaCard({ receta, expandido, onToggle, onSeleccionar, cargando, tipo }) {
  const isSuccess = tipo === 'success';

  return (
    <div className="rounded-xl overflow-hidden"
         style={{ border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.25)' : 'rgba(234,179,8,0.25)'}` }}>

      {/* Row principal */}
      <div className={`flex items-center gap-3 px-4 py-3 ${isSuccess ? 'bg-success/5' : 'bg-warning/5'}`}>

        {/* Ícono estado */}
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isSuccess ? 'bg-success/15' : 'bg-warning/15'
        }`}>
          {isSuccess
            ? <CheckCircle className="w-3.5 h-3.5 text-success" />
            : <AlertTriangle className="w-3.5 h-3.5 text-warning" />}
        </div>

        {/* Nombre + código */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary truncate leading-tight">{receta.nombre}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-text-muted font-mono">{receta.codigo}</span>
            {receta.costo_porcion > 0 && (
              <span className="text-xs text-text-muted">· ${receta.costo_porcion}/porción</span>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {receta.ingredientes?.length > 0 && (
            <button onClick={onToggle}
              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-bg-app transition-colors"
              title={expandido ? 'Ocultar ingredientes' : 'Ver ingredientes'}>
              {expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={onSeleccionar} disabled={cargando}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              isSuccess
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'border text-text-secondary hover:bg-bg-app'
            }`}
            style={!isSuccess ? { borderColor: 'var(--color-border)' } : {}}>
            {cargando ? <div className="spinner spinner-sm" /> : 'Usar'}
          </button>
        </div>
      </div>

      {/* Ingredientes expandidos */}
      {expandido && receta.ingredientes?.length > 0 && (
        <div className="px-4 py-3 border-t space-y-1.5 bg-bg-app"
             style={{ borderColor: 'var(--color-border)' }}>
          {receta.ingredientes.map((ing, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className={`text-xs flex items-center gap-1.5 ${ing.suficiente ? 'text-text-secondary' : 'text-warning font-medium'}`}>
                {ing.suficiente
                  ? <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                  : <AlertTriangle className="w-3 h-3 text-warning flex-shrink-0" />}
                {ing.nombre}
              </span>
              <span className="text-xs text-text-muted font-mono ml-2 flex-shrink-0">
                {ing.stock_actual} {ing.unidad_medida}
                {!ing.suficiente && (
                  <span className="text-warning"> / necesita {ing.requerido}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
