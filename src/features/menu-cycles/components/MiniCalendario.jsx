// ========================================
// MiniCalendario - Vista thumbnail de dias del ciclo
// ========================================

import React from 'react';
import { CheckCircle } from 'lucide-react';

export default function MiniCalendario({ diasTotales = 20, diasData = [], onDiaClick }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: diasTotales }, (_, i) => {
        const diaNum = i + 1;
        const diaInfo = diasData.find((d) => d.numero_dia === diaNum);
        const completo = diaInfo?.completo || false;

        return (
          <button
            key={diaNum}
            onClick={() => onDiaClick?.(diaNum)}
            className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-semibold border transition-all ${
              completo
                ? 'bg-success/10 border-success text-success'
                : 'bg-bg-surface border-border text-text-muted hover:border-primary hover:text-primary'
            }`}
            title={`Día ${diaNum}${completo ? ' - Completo' : ' - Pendiente'}`}
          >
            {completo ? <CheckCircle className="w-3.5 h-3.5" /> : diaNum}
          </button>
        );
      })}
    </div>
  );
}
