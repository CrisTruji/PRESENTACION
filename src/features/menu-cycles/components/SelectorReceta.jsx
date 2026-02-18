// ========================================
// SelectorReceta - Buscador/picker de recetas
// ========================================

import React, { useState, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';
import { useBuscarRecetas } from '../hooks/useMenuComponentes';

export default function SelectorReceta({ onSelect, onClose, recetaActualId = null }) {
  const [busqueda, setBusqueda] = useState('');
  const [debouncedBusqueda, setDebouncedBusqueda] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBusqueda(busqueda), 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const { data: recetas, isLoading } = useBuscarRecetas(debouncedBusqueda);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="card-header flex items-center justify-between border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-lg font-semibold text-primary">Seleccionar Receta</h3>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-primary hover:bg-bg-surface rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="form-input pl-10 w-full"
              autoFocus
            />
          </div>
        </div>

        {/* Lista de recetas */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="spinner spinner-sm mx-auto"></div>
              <p className="mt-3 text-sm text-text-muted">Buscando recetas...</p>
            </div>
          ) : !recetas || recetas.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-text-muted">
                {busqueda ? 'No se encontraron recetas' : 'Escribe para buscar recetas'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {recetas.map((receta) => (
                <button
                  key={receta.id}
                  onClick={() => onSelect(receta)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center justify-between ${
                    receta.id === recetaActualId
                      ? 'bg-primary/10 border border-primary text-primary'
                      : 'border border-transparent hover:border-border hover:bg-bg-surface'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold text-primary">{receta.nombre}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {receta.codigo && `${receta.codigo} • `}
                      {receta.es_local && (
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent"></span>
                          Local •{' '}
                        </span>
                      )}
                      {receta.costo_porcion
                        ? `$${Number(receta.costo_porcion).toLocaleString('es-CO')}/porción`
                        : 'Sin costo'}
                    </div>
                  </div>
                  {receta.id === recetaActualId && (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
