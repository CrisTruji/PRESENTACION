// ========================================
// PanelMenuUnidad
// Muestra el menú del día para la unidad seleccionada.
// Aparece inline en ConsolidadoSupervisor cuando hay filtroUnidad.
// Solo lectura — el supervisor puede ver qué recetas corresponden
// a esa unidad para el servicio y fecha seleccionados.
// ========================================

import React, { useState } from 'react';
import { BookOpen, ChevronRight, AlertCircle, Calendar, Eye } from 'lucide-react';
import { useMenuDelDia } from '../hooks/usePedidos';
import { useCicloActivoPorOperacion } from '../hooks/useConsolidado';

// Colores por servicio
const COLORES_SERVICIO = {
  desayuno:  { bg: 'bg-amber-500/10',  text: 'text-amber-600',  border: 'rgba(245,158,11,0.25)' },
  almuerzo:  { bg: 'bg-primary/10',    text: 'text-primary',     border: 'rgba(var(--color-primary-rgb),0.25)' },
  cena:      { bg: 'bg-indigo-500/10', text: 'text-indigo-600',  border: 'rgba(99,102,241,0.25)'  },
  refrigerio:{ bg: 'bg-emerald-500/10',text: 'text-emerald-600', border: 'rgba(16,185,129,0.25)'  },
};

export default function PanelMenuUnidad({ operacionId, fecha, filtroServicio, onVerCicloCompleto }) {
  const [servicioExpandido, setServicioExpandido] = useState(filtroServicio);

  const { data: menu, isLoading, isError, refetch } = useMenuDelDia(operacionId, fecha);
  const { data: cicloActivo } = useCicloActivoPorOperacion(operacionId);

  if (isLoading) {
    return (
      <div className="py-6 text-center">
        <div className="spinner spinner-sm mx-auto" />
        <p className="mt-2 text-xs text-text-muted">Cargando menú...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-4 flex flex-col items-center gap-2 text-center">
        <AlertCircle className="w-5 h-5 text-error" />
        <p className="text-xs text-error">Error al cargar el menú</p>
        <button onClick={() => refetch()} className="text-xs text-primary underline">Reintentar</button>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="py-6 text-center">
        <Calendar className="w-7 h-7 text-text-muted mx-auto mb-2 opacity-40" />
        <p className="text-xs text-text-muted">No hay ciclo activo para esta unidad</p>
      </div>
    );
  }

  // Servicios del día, filtrar si hay filtro de servicio
  const servicios = menu.servicios || [];
  const serviciosVisibles = filtroServicio
    ? servicios.filter((s) => s.servicio === filtroServicio)
    : servicios;

  return (
    <div className="space-y-2">
      {/* Header con info del ciclo */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted">
            {cicloActivo?.nombre || 'Ciclo activo'} —
          </span>
          <span className="badge badge-primary text-xs">Día {menu.diaCiclo}</span>
          <span className="text-xs text-text-muted">· {fecha}</span>
        </div>
        {cicloActivo?.id && onVerCicloCompleto && (
          <button
            onClick={() => onVerCicloCompleto(cicloActivo)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            <Eye className="w-3.5 h-3.5" />
            Ver ciclo completo
          </button>
        )}
      </div>

      {/* Servicios del día */}
      {serviciosVisibles.length === 0 ? (
        <p className="text-xs text-text-muted py-3 text-center">
          Sin menú configurado para {filtroServicio || 'este día'}
        </p>
      ) : (
        serviciosVisibles.map((srv) => {
          const color = COLORES_SERVICIO[srv.servicio] || COLORES_SERVICIO.almuerzo;
          const componentes = (srv.menu_componentes || [])
            .filter((mc) => mc.activo !== false)
            .sort((a, b) => (a.componentes_plato?.orden ?? 99) - (b.componentes_plato?.orden ?? 99));
          const expandido = servicioExpandido === srv.servicio;

          return (
            <div
              key={srv.id}
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${color.border}` }}
            >
              {/* Cabecera de servicio */}
              <button
                onClick={() => setServicioExpandido(expandido ? null : srv.servicio)}
                className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${color.bg} hover:opacity-90`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className={`w-3.5 h-3.5 ${color.text} flex-shrink-0`} />
                  <span className={`text-xs font-semibold capitalize ${color.text}`}>
                    {srv.servicio}
                  </span>
                  <span className="text-xs text-text-muted">
                    · {componentes.length} {componentes.length === 1 ? 'componente' : 'componentes'}
                  </span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 ${color.text} transition-transform ${expandido ? 'rotate-90' : ''}`}
                />
              </button>

              {/* Componentes expandidos */}
              {expandido && (
                <div className="bg-bg-app divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {componentes.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-text-muted text-center">Sin componentes configurados</p>
                  ) : (
                    componentes.map((mc) => {
                      const comp  = mc.componentes_plato;
                      const receta = mc.arbol_recetas;
                      return (
                        <div
                          key={mc.id}
                          className="flex items-center justify-between px-4 py-2.5"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-text-muted font-mono w-5 text-center flex-shrink-0">
                              {comp?.orden ?? '—'}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-primary capitalize truncate">
                                {comp?.nombre || 'Componente'}
                              </p>
                              <p className="text-xs text-text-muted truncate">
                                {receta?.nombre || 'Sin receta'}
                              </p>
                            </div>
                          </div>
                          {receta?.costo_porcion > 0 && (
                            <span className="text-xs text-text-muted font-mono flex-shrink-0 ml-2">
                              ${receta.costo_porcion}/porc.
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
