// ========================================
// GramajeBASEModal - Modal para configurar gramajes base
// ========================================

import React from 'react';
import { X } from 'lucide-react';
import PanelGramajeBASE from './PanelGramajeBASE';

export default function GramajeBASEModal({ operacionId, operacionNombre, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-h-[90vh] flex flex-col max-w-4xl">
        {/* Header */}
        <div className="card-header flex items-center justify-between border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="text-lg font-semibold text-primary">Configurar Gramajes Base</h2>
            <p className="text-xs text-text-muted mt-1">Operación: {operacionNombre}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-primary hover:bg-bg-surface rounded-md transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <PanelGramajeBASE
              operacionId={operacionId}
              operacionNombre={operacionNombre}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
