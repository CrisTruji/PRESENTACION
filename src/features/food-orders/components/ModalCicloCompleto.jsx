// ========================================
// ModalCicloCompleto
// Vista de solo lectura del ciclo completo de una unidad.
// El supervisor selecciona un día y ve:
//   - Panel izquierdo: componentes del menú por servicio
//   - Panel derecho: ingredientes de cada receta con gramajes
// ========================================

import React, { useState, useMemo } from 'react';
import {
  X,
  CalendarDays,
  BookOpen,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Utensils,
  FlaskConical,
  Scale,
} from 'lucide-react';
import { useCicloCompleto } from '@/features/menu-cycles';
import { supabase } from '@/shared/api';

// Etiquetas de servicio en español
const ETIQUETA_SERVICIO = {
  desayuno:    'Desayuno',
  nueves:      'Nueves',
  almuerzo:    'Almuerzo',
  onces:       'Onces',
  cena:        'Cena',
  cena_ligera: 'Cena ligera',
  refrigerio:  'Refrigerio',
};

// Orden de servicios
const ORDEN_SERVICIO = {
  desayuno: 0, nueves: 1, almuerzo: 2, onces: 3, cena: 4, cena_ligera: 5, refrigerio: 6,
};

// Colores por servicio
const COLORES_SERVICIO = {
  desayuno:    { bg: 'bg-amber-500/10',   text: 'text-amber-600',   border: 'rgba(245,158,11,0.3)'  },
  nueves:      { bg: 'bg-orange-400/10',  text: 'text-orange-500',  border: 'rgba(249,115,22,0.3)'  },
  almuerzo:    { bg: 'bg-primary/10',     text: 'text-primary',     border: 'rgba(99,102,241,0.3)'  },
  onces:       { bg: 'bg-emerald-400/10', text: 'text-emerald-600', border: 'rgba(52,211,153,0.3)'  },
  cena:        { bg: 'bg-indigo-500/10',  text: 'text-indigo-600',  border: 'rgba(99,102,241,0.3)'  },
  cena_ligera: { bg: 'bg-slate-400/10',   text: 'text-slate-500',   border: 'rgba(148,163,184,0.3)' },
  refrigerio:  { bg: 'bg-teal-400/10',    text: 'text-teal-600',    border: 'rgba(45,212,191,0.3)'  },
};
const colorDefault = { bg: 'bg-bg-surface', text: 'text-text-secondary', border: 'var(--color-border)' };

// ── Hook para ingredientes de recetas (lazy, per-día) ──
function useIngredientesRecetas(recetaIds) {
  const [data, setData] = React.useState({});
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!recetaIds || recetaIds.length === 0) return;
    const missing = recetaIds.filter((id) => !data[id]);
    if (missing.length === 0) return;

    setLoading(true);
    supabase
      .from('receta_ingredientes')
      .select(`
        receta_id, cantidad_requerida, unidad_medida,
        arbol_materia_prima(id, nombre, codigo, unidad_medida)
      `)
      .in('receta_id', missing)
      .eq('activo', true)
      .then(({ data: rows }) => {
        const byReceta = {};
        for (const row of rows || []) {
          if (!byReceta[row.receta_id]) byReceta[row.receta_id] = [];
          byReceta[row.receta_id].push(row);
        }
        setData((prev) => ({ ...prev, ...byReceta }));
      })
      .finally(() => setLoading(false));
  }, [JSON.stringify(recetaIds)]);

  return { data, loading };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ModalCicloCompleto({ ciclo, unidadNombre, onClose }) {
  const [diaSeleccionado, setDiaSeleccionado] = useState(1);
  const [servicioActivo, setServicioActivo] = useState(null); // null = todos

  const { data, isLoading, isError, refetch } = useCicloCompleto(ciclo?.id);

  // Construir mapa de días con sus servicios y componentes
  const diasMap = useMemo(() => {
    if (!data?.dias) return {};
    const map = {};
    for (const cds of data.dias) {
      if (!map[cds.numero_dia]) {
        map[cds.numero_dia] = { numero_dia: cds.numero_dia, completo: true, servicios: [] };
      }
      if (!cds.completo) map[cds.numero_dia].completo = false;
      const componentes = (cds.menu_componentes || [])
        .filter((mc) => mc.activo !== false)
        .sort((a, b) => (a.componentes_plato?.orden ?? 99) - (b.componentes_plato?.orden ?? 99));
      map[cds.numero_dia].servicios.push({
        id: cds.id,
        servicio: cds.servicio,
        completo: cds.completo,
        componentes,
      });
    }
    for (const dia of Object.values(map)) {
      dia.servicios.sort(
        (a, b) => (ORDEN_SERVICIO[a.servicio] ?? 9) - (ORDEN_SERVICIO[b.servicio] ?? 9)
      );
    }
    return map;
  }, [data]);

  const diasOrdenados = useMemo(
    () => Object.values(diasMap).sort((a, b) => a.numero_dia - b.numero_dia),
    [diasMap]
  );

  const totalDias = diasOrdenados.length;
  const diasCompletos = diasOrdenados.filter((d) => d.completo).length;

  // Día actualmente seleccionado
  const diaActual = diasMap[diaSeleccionado];

  // Servicios del día (filtrados si hay servicio activo)
  const serviciosDelDia = useMemo(() => {
    if (!diaActual) return [];
    if (!servicioActivo) return diaActual.servicios;
    return diaActual.servicios.filter((s) => s.servicio === servicioActivo);
  }, [diaActual, servicioActivo]);

  // Receta IDs del día para cargar ingredientes
  const recetaIdsDia = useMemo(() => {
    if (!diaActual) return [];
    return [...new Set(
      diaActual.servicios
        .flatMap((s) => s.componentes)
        .map((mc) => mc.arbol_recetas?.id)
        .filter(Boolean)
    )];
  }, [diaActual]);

  const { data: ingredientesMap, loading: loadingIngredientes } = useIngredientesRecetas(recetaIdsDia);

  // Navegar entre días
  const irDia = (num) => {
    const valido = Math.max(1, Math.min(totalDias, num));
    setDiaSeleccionado(valido);
    setServicioActivo(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="w-full max-w-5xl max-h-[94vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-bg-surface"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b"
             style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary leading-tight">
                Ciclo — {unidadNombre}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {ciclo?.nombre} · {totalDias} días ·{' '}
                <span className={diasCompletos === totalDias ? 'text-success' : 'text-warning'}>
                  {diasCompletos}/{totalDias} completos
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-bg-app transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Selector de días ── */}
        {!isLoading && !isError && totalDias > 0 && (
          <div className="px-5 py-3 flex-shrink-0 border-b bg-bg-app"
               style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => irDia(diaSeleccionado - 1)}
                disabled={diaSeleccionado <= 1}
                className="p-1.5 rounded-lg border text-text-muted disabled:opacity-30 hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Chips de días — scroll horizontal en móvil */}
              <div className="flex gap-1.5 overflow-x-auto flex-1 py-0.5">
                {diasOrdenados.map((dia) => (
                  <button
                    key={dia.numero_dia}
                    onClick={() => irDia(dia.numero_dia)}
                    className={`flex-shrink-0 w-9 h-9 rounded-lg text-xs font-bold border transition-all ${
                      dia.numero_dia === diaSeleccionado
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : dia.completo
                          ? 'bg-success/10 border-success/40 text-success hover:border-success'
                          : 'bg-warning/10 border-warning/40 text-warning hover:border-warning'
                    }`}
                  >
                    {dia.numero_dia}
                  </button>
                ))}
              </div>

              <button
                onClick={() => irDia(diaSeleccionado + 1)}
                disabled={diaSeleccionado >= totalDias}
                className="p-1.5 rounded-lg border text-text-muted disabled:opacity-30 hover:text-primary hover:border-primary transition-colors"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="ml-2 flex items-center gap-1.5">
                <span className="text-sm font-bold text-primary">Día {diaSeleccionado}</span>
                {diaActual && (
                  diaActual.completo
                    ? <CheckCircle className="w-4 h-4 text-success" />
                    : <AlertCircle className="w-4 h-4 text-warning" />
                )}
              </div>
            </div>

            {/* Filtro por servicio */}
            {diaActual && diaActual.servicios.length > 1 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <button
                  onClick={() => setServicioActivo(null)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    !servicioActivo
                      ? 'bg-primary text-white border-primary'
                      : 'bg-bg-surface border-border text-text-muted hover:text-primary'
                  }`}
                  style={!servicioActivo ? {} : { borderColor: 'var(--color-border)' }}
                >
                  Todos
                </button>
                {diaActual.servicios.map((srv) => {
                  const c = COLORES_SERVICIO[srv.servicio] || colorDefault;
                  const activo = servicioActivo === srv.servicio;
                  return (
                    <button
                      key={srv.servicio}
                      onClick={() => setServicioActivo(activo ? null : srv.servicio)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors capitalize ${
                        activo ? `${c.bg} ${c.text} font-semibold` : 'bg-bg-surface text-text-muted hover:text-primary'
                      }`}
                      style={{ borderColor: activo ? c.border : 'var(--color-border)' }}
                    >
                      {ETIQUETA_SERVICIO[srv.servicio] || srv.servicio}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Contenido principal ── */}
        <div className="flex-1 overflow-hidden min-h-0">
          {isLoading && (
            <div className="py-12 text-center">
              <div className="spinner spinner-sm mx-auto" />
              <p className="mt-3 text-xs text-text-muted">Cargando ciclo...</p>
            </div>
          )}

          {isError && (
            <div className="py-8 text-center flex flex-col items-center gap-2">
              <AlertCircle className="w-6 h-6 text-error" />
              <p className="text-sm text-error">Error al cargar el ciclo</p>
              <button onClick={() => refetch()} className="text-xs text-primary underline">Reintentar</button>
            </div>
          )}

          {!isLoading && !isError && !diaActual && (
            <div className="py-10 text-center">
              <CalendarDays className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm text-text-muted">Selecciona un día para ver el menú</p>
            </div>
          )}

          {!isLoading && !isError && diaActual && (
            // Split view: izquierda = componentes, derecha = ingredientes
            <div className="flex h-full divide-x overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>

              {/* ── Panel izquierdo: Componentes del menú ── */}
              <div className="w-1/2 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Utensils className="w-3.5 h-3.5 text-text-muted" />
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Componentes del menú
                  </h3>
                </div>

                {serviciosDelDia.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6">Sin menú para este filtro</p>
                ) : (
                  serviciosDelDia.map((srv) => {
                    const c = COLORES_SERVICIO[srv.servicio] || colorDefault;
                    return (
                      <div
                        key={srv.id}
                        className="rounded-xl overflow-hidden"
                        style={{ border: `1px solid ${c.border}` }}
                      >
                        {/* Cabecera de servicio */}
                        <div className={`flex items-center justify-between px-3 py-2 ${c.bg}`}>
                          <div className="flex items-center gap-2">
                            <BookOpen className={`w-3.5 h-3.5 ${c.text} flex-shrink-0`} />
                            <span className={`text-xs font-bold capitalize ${c.text}`}>
                              {ETIQUETA_SERVICIO[srv.servicio] || srv.servicio}
                            </span>
                            <span className="text-xs text-text-muted">
                              · {srv.componentes.length} componente{srv.componentes.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {srv.completo
                            ? <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
                            : <AlertCircle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                          }
                        </div>

                        {/* Lista de componentes */}
                        {srv.componentes.length === 0 ? (
                          <p className="px-3 py-2.5 text-xs text-text-muted italic text-center">Sin componentes</p>
                        ) : (
                          <div className="bg-bg-app divide-y" style={{ borderColor: 'var(--color-border)' }}>
                            {srv.componentes.map((mc) => {
                              const comp   = mc.componentes_plato;
                              const receta = mc.arbol_recetas;
                              return (
                                <div key={mc.id} className="flex items-center gap-2.5 px-3 py-2.5">
                                  <span className="text-xs text-text-muted font-mono w-5 text-center flex-shrink-0">
                                    {comp?.orden ?? '—'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-primary capitalize truncate">
                                      {comp?.nombre || 'Componente'}
                                    </p>
                                    <p className="text-xs text-text-muted truncate">
                                      {receta?.nombre || 'Sin receta asignada'}
                                    </p>
                                  </div>
                                  {receta?.costo_porcion > 0 && (
                                    <span className="text-xs text-text-muted font-mono flex-shrink-0">
                                      ${receta.costo_porcion}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* ── Panel derecho: Ingredientes de las recetas ── */}
              <div className="w-1/2 overflow-y-auto p-4 space-y-3 bg-bg-app">
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical className="w-3.5 h-3.5 text-text-muted" />
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Ingredientes (materia prima)
                  </h3>
                  {loadingIngredientes && (
                    <div className="spinner spinner-sm ml-auto" />
                  )}
                </div>

                {serviciosDelDia.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6">—</p>
                ) : (
                  serviciosDelDia.map((srv) => {
                    const c = COLORES_SERVICIO[srv.servicio] || colorDefault;
                    const componentesConReceta = srv.componentes.filter((mc) => mc.arbol_recetas?.id);

                    if (componentesConReceta.length === 0) return null;

                    return (
                      <div key={srv.id} className="space-y-2">
                        {/* Sub-cabecera servicio */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${c.bg}`}
                             style={{ border: `1px solid ${c.border}` }}>
                          <span className={`text-xs font-bold capitalize ${c.text}`}>
                            {ETIQUETA_SERVICIO[srv.servicio] || srv.servicio}
                          </span>
                        </div>

                        {componentesConReceta.map((mc) => {
                          const comp   = mc.componentes_plato;
                          const receta = mc.arbol_recetas;
                          const ings   = ingredientesMap[receta.id] || [];

                          return (
                            <div
                              key={mc.id}
                              className="rounded-xl overflow-hidden"
                              style={{ border: '1px solid var(--color-border)' }}
                            >
                              {/* Cabecera receta */}
                              <div className="flex items-center gap-2 px-3 py-2 bg-bg-surface border-b"
                                   style={{ borderColor: 'var(--color-border)' }}>
                                <Scale className="w-3 h-3 text-text-muted flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-primary truncate">
                                    {receta.nombre}
                                  </p>
                                  <p className="text-xs text-text-muted capitalize">
                                    {comp?.nombre || ''}
                                  </p>
                                </div>
                              </div>

                              {/* Lista ingredientes */}
                              {ings.length === 0 ? (
                                <p className="px-3 py-2 text-xs text-text-muted italic">
                                  {loadingIngredientes ? 'Cargando...' : 'Sin ingredientes registrados'}
                                </p>
                              ) : (
                                <table className="w-full text-xs">
                                  <tbody>
                                    {ings.map((ing, idx) => {
                                      const mp = ing.arbol_materia_prima;
                                      return (
                                        <tr
                                          key={idx}
                                          className="border-b last:border-0 hover:bg-bg-surface/60 transition-colors"
                                          style={{ borderColor: 'var(--color-border)' }}
                                        >
                                          <td className="px-3 py-1.5 text-text-secondary">
                                            {mp?.nombre || '—'}
                                          </td>
                                          <td className="px-3 py-1.5 text-right font-mono font-semibold text-primary whitespace-nowrap">
                                            {ing.cantidad_requerida}
                                            <span className="text-text-muted font-normal ml-1">
                                              {ing.unidad_medida || mp?.unidad_medida || ''}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="px-5 py-3 border-t flex items-center justify-between text-xs text-text-muted flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span>
            <span className="text-success font-semibold">{diasCompletos}</span> días completos ·{' '}
            <span className="text-warning font-semibold">{totalDias - diasCompletos}</span> incompletos
          </span>
          <button onClick={onClose} className="btn btn-outline text-xs !py-1 !px-3">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
