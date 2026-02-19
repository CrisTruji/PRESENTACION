// ========================================
// MiniCalendario - Vista thumbnail de dias del ciclo
// Verde: dia completo (todos los servicios) | Amarillo: parcial | Gris: sin configurar
// ========================================

import React from 'react';
import { CheckCircle } from 'lucide-react';

export default function MiniCalendario({ diasTotales = 20, diasData = [], onDiaClick }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: diasTotales }, (_, i) => {
        const diaNum = i + 1;
        const diaInfo = diasData.find((d) => d.numero_dia === diaNum);
        const completo = diaInfo?.completo === true;
        // Día parcial: existe en diasData pero no está completo y tiene al menos 1 servicio
        const parcial = !completo && diaInfo && diaInfo.servicios?.some((s) => s.completo);

        let clases = 'bg-bg-surface border-border text-text-muted hover:border-primary hover:text-primary';
        let titulo = `Día ${diaNum} — Sin configurar`;
        let estiloExtra = {};

        if (completo) {
          clases = 'bg-success/10 border-success text-success';
          titulo = `Día ${diaNum} — Completo`;
        } else if (parcial) {
          clases = 'border-warning text-warning';
          estiloExtra = { backgroundColor: 'rgba(245,158,11,0.08)', borderColor: '#F59E0B', color: '#D97706' };
          titulo = `Día ${diaNum} — En progreso`;
        }

        return (
          <button
            key={diaNum}
            onClick={() => onDiaClick?.(diaNum)}
            className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-semibold border transition-all ${clases}`}
            style={estiloExtra}
            title={titulo}
          >
            {completo ? <CheckCircle className="w-3.5 h-3.5" /> : diaNum}
          </button>
        );
      })}
    </div>
  );
}
