// ========================================
// ComponenteSlot - Slot de un componente/plato en el menu
// ========================================

import React from 'react';
import { Percent, Edit2, X } from 'lucide-react';

export default function ComponenteSlot({
  componente,
  receta,
  esLocal = false,
  onClickGramajes,
  onClickIngredientes,
  onEliminar,
  seleccionado = false,
}) {
  return (
    <div
      className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
        seleccionado
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-bg-surface'
      }`}
    >
      <div className="flex items-center min-w-0 gap-3">
        <div className="flex-shrink-0">
          <span className="badge badge-primary text-xs">
            {componente?.nombre || 'Sin componente'}
          </span>
        </div>
        <div className="min-w-0">
          {receta ? (
            <>
              <h4 className="text-sm font-semibold text-primary truncate">{receta.nombre}</h4>
              <p className="text-xs text-text-muted">
                {esLocal ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent"></span>
                    Receta Local
                  </span>
                ) : (
                  `Código: ${receta.codigo || '—'}`
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-text-muted italic">Sin receta asignada</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
        {receta && (
          <>
            <button
              onClick={onClickGramajes}
              className="p-2 text-text-muted hover:text-primary hover:bg-bg-surface rounded-md transition-colors"
              title="Editar gramajes"
            >
              <Percent className="w-4 h-4" />
            </button>
            <button
              onClick={onClickIngredientes}
              className="p-2 text-text-muted hover:text-primary hover:bg-bg-surface rounded-md transition-colors"
              title="Ver ingredientes"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </>
        )}
        <button
          onClick={onEliminar}
          className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-md transition-colors"
          title="Eliminar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
