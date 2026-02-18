// ========================================
// PanelCalendario - Grid de dias + selector servicio
// ========================================

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Plus } from 'lucide-react';
import { useCicloEditorStore } from '../store/useCicloEditorStore';
import { useDiaServicios } from '../hooks/useCiclos';
import { useComponentesDia, useAsignarComponente, useEliminarComponente } from '../hooks/useMenuComponentes';
import { useComponentesPlato } from '../hooks/useComponentesPlato';
import { SERVICIOS } from '@/shared/types/menu';
import ComponenteSlot from './ComponenteSlot';
import SelectorReceta from './SelectorReceta';

export default function PanelCalendario({ ciclo }) {
  const {
    diaSeleccionado,
    servicioSeleccionado,
    seleccionarDia,
    seleccionarServicio,
    seleccionarComponente,
    cambiarPanel,
  } = useCicloEditorStore();

  const [showSelectorReceta, setShowSelectorReceta] = useState(false);
  const [componenteParaAsignar, setComponenteParaAsignar] = useState(null);

  const totalDias = ciclo?.operaciones?.cantidad_ciclos || ciclo?.cantidad_dias || 20;

  // Obtener servicios del dia seleccionado
  const { data: diaServicios } = useDiaServicios(ciclo?.id, diaSeleccionado);

  // Encontrar el ciclo_dia_servicio_id para el servicio seleccionado
  const cicloDiaServicio = diaServicios?.find(
    (ds) => ds.servicio === servicioSeleccionado
  );

  // Obtener componentes del dia+servicio
  const { data: componentes } = useComponentesDia(cicloDiaServicio?.id);
  const { data: componentesPlato } = useComponentesPlato();

  const asignarComponente = useAsignarComponente();
  const eliminarComponente = useEliminarComponente();

  const handleAgregarPlato = (componenteId) => {
    setComponenteParaAsignar(componenteId);
    setShowSelectorReceta(true);
  };

  const handleSeleccionarReceta = (receta) => {
    if (!cicloDiaServicio?.id || !componenteParaAsignar) return;
    asignarComponente.mutate({
      cicloDiaServicioId: cicloDiaServicio.id,
      componenteId: componenteParaAsignar,
      recetaId: receta.id,
    });
    setShowSelectorReceta(false);
    setComponenteParaAsignar(null);
  };

  const handleEliminar = (menuComponenteId) => {
    eliminarComponente.mutate(menuComponenteId);
  };

  const handleClickGramajes = (comp) => {
    seleccionarComponente(comp);
    cambiarPanel('gramajes');
  };

  const handleClickIngredientes = (comp) => {
    seleccionarComponente(comp);
    cambiarPanel('ingredientes');
  };

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

      {/* Separador */}
      <div className="border-t" style={{ borderColor: 'var(--color-border)' }}></div>

      {/* Selector de servicio */}
      <div>
        <label className="form-label">🍽️ Servicio</label>
        <div className="space-y-2">
          {SERVICIOS.map((srv) => (
            <button
              key={srv.value}
              onClick={() => seleccionarServicio(srv.value)}
              className={`w-full px-3 py-2 rounded-md text-sm font-medium text-left transition-all ${
                srv.value === servicioSeleccionado
                  ? 'bg-primary text-white'
                  : 'bg-bg-surface text-text-primary border border-border hover:border-primary hover:bg-bg-app'
              }`}
            >
              {srv.label}
            </button>
          ))}
        </div>
      </div>

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

      {/* Selector receta modal */}
      {showSelectorReceta && (
        <SelectorReceta
          onSelect={handleSeleccionarReceta}
          onClose={() => setShowSelectorReceta(false)}
        />
      )}
    </div>
  );
}
