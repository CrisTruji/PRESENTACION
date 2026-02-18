// ========================================
// AlertaStock - Alerta inline de stock insuficiente
// ========================================

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function AlertaStock({ ingrediente }) {
  if (!ingrediente || ingrediente.estado_stock !== 'INSUFICIENTE') return null;

  return (
    <div className="alert alert-error rounded-lg flex items-start gap-3 p-3">
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">
            {ingrediente.nombre}
          </span>
          <span className="text-xs font-medium whitespace-nowrap">
            Faltante: {Math.abs(ingrediente.diferencia)} {ingrediente.unidad_medida}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs mt-1 opacity-90">
          <span>Necesario: {ingrediente.total_requerido} {ingrediente.unidad_medida}</span>
          <span>•</span>
          <span>Disponible: {ingrediente.stock_actual} {ingrediente.unidad_medida}</span>
        </div>
      </div>
    </div>
  );
}
