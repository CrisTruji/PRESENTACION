// ========================================
// ProgressBar - Barra de progreso del ciclo
// ========================================

import React from 'react';

export default function ProgressBar({ progreso = 0, diasCompletos = 0, diasTotales = 0, size = 'md' }) {
  const completo = progreso >= 100;
  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-text-muted font-medium">
          Días configurados: <span className="text-primary">{diasCompletos}/{diasTotales}</span>
        </span>
        <span className="font-semibold text-primary">
          {progreso}%
        </span>
      </div>
      <div className={`w-full bg-bg-surface rounded-full overflow-hidden border border-border ${heightClass}`}>
        <div
          className={`${heightClass} rounded-full transition-all duration-300 ${
            completo ? 'bg-success' : 'bg-warning'
          }`}
          style={{ width: `${Math.min(progreso, 100)}%` }}
        />
      </div>
    </div>
  );
}
