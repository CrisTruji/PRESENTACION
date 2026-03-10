// ========================================
// SelectorReceta - Buscador de recetas estándar
// Solo recetas estándar (es_local=false, código '3')
// Las variantes locales se seleccionan desde PanelIngredientes
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
  const hayBusqueda = busqueda.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="card-header flex items-center justify-between border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h3 className="text-lg font-semibold text-primary">Seleccionar Receta</h3>
            <p className="text-xs text-text-muted mt-0.5">Solo recetas estándar — las variantes locales se gestionan en Ingredientes</p>
          </div>
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

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-2">
          {!hayBusqueda ? (
            <div className="p-8 text-center">
              <Search className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-sm text-text-muted">Escribe para buscar recetas estándar</p>
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center">
              <div className="spinner spinner-sm mx-auto"></div>
              <p className="mt-3 text-sm text-text-muted">Buscando...</p>
            </div>
          ) : !recetas || recetas.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-text-muted">No se encontraron recetas para "{busqueda}"</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recetas.map((receta) => (
                <button
                  key={receta.id}
                  onClick={() => onSelect(receta)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center justify-between ${
                    receta.id === recetaActualId
                      ? 'bg-primary/10 border border-primary'
                      : 'border border-transparent hover:border-border hover:bg-bg-surface'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold text-primary">{receta.nombre}</div>
                    <div className="text-xs text-text-muted font-mono mt-0.5">
                      {receta.codigo}
                      {receta.costo_porcion
                        ? ` · $${Number(receta.costo_porcion).toLocaleString('es-CO')}/porción`
                        : ''}
                    </div>
                  </div>
                  {receta.id === recetaActualId && <Check className="w-4 h-4 flex-shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
