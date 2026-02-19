// ========================================
// PanelCalendario - Grid de dias (selector de día)
// El selector de servicio vive en el panel central (CicloEditor)
// ========================================

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCicloEditorStore } from '../store/useCicloEditorStore';
import { useDiaServicios } from '../hooks/useCiclos';

export default function PanelCalendario({ ciclo }) {
  const {
    diaSeleccionado,
    servicioSeleccionado,
    seleccionarDia,
  } = useCicloEditorStore();

  const totalDias = ciclo?.operaciones?.cantidad_ciclos || ciclo?.cantidad_dias || 20;

  // Obtener el estado de completitud de los servicios del día seleccionado
  const { data: diaServicios } = useDiaServicios(ciclo?.id, diaSeleccionado);

  return (
    <div className="space-y-5">
      {/* Selector de dia (grid) */}
      <div>
        <label className="form-label">📅 Seleccionar Día</label>
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: totalDias }, (_, i) => {
            const dia = i + 1;
            return (
              <button
                key={dia}
                onClick={() => seleccionarDia(dia)}
                className={`h-8 rounded-md flex items-center justify-center text-xs font-medium transition-all ${
                  dia === diaSeleccionado
                    ? 'bg-primary text-white'
                    : 'bg-bg-surface text-text-primary border border-border hover:border-primary hover:text-primary'
                }`}
              >
                {dia}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resumen de servicios del día */}
      {diaServicios && diaServicios.length > 0 && (
        <>
          <div className="border-t" style={{ borderColor: 'var(--color-border)' }}></div>
          <div>
            <label className="form-label">📊 Estado del día {diaSeleccionado}</label>
            <div className="space-y-1.5">
              {diaServicios.map((ds) => (
                <div
                  key={ds.id}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs border transition-all ${
                    ds.servicio === servicioSeleccionado
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-bg-surface'
                  }`}
                >
                  <span className={`font-medium capitalize ${ds.servicio === servicioSeleccionado ? 'text-primary' : 'text-text-primary'}`}>
                    {ds.servicio.replace('_', ' ')}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    ds.completo
                      ? 'bg-success/15 text-success'
                      : 'bg-bg-app text-text-muted'
                  }`}>
                    {ds.completo ? '✓' : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Navegacion de dias */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => seleccionarDia(Math.max(1, diaSeleccionado - 1))}
          disabled={diaSeleccionado === 1}
          className="p-2 text-text-muted hover:text-primary disabled:opacity-50 transition-colors rounded-md hover:bg-bg-surface"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-medium text-text-muted">
          Día {diaSeleccionado}/{totalDias}
        </span>
        <button
          onClick={() => seleccionarDia(Math.min(totalDias, diaSeleccionado + 1))}
          disabled={diaSeleccionado === totalDias}
          className="p-2 text-text-muted hover:text-primary disabled:opacity-50 transition-colors rounded-md hover:bg-bg-surface"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
