// ========================================
// ModalCicloCompleto
// Vista de solo lectura del ciclo completo de una unidad.
// El supervisor puede revisar todos los días del ciclo sin editar nada.
// ========================================

import React, { useState } from 'react';
import {
  X,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Search,
} from 'lucide-react';
import { useCicloCompleto } from '../../menu-cycles/hooks/useCiclos';

// Etiquetas de servicio en español
const ETIQUETA_SERVICIO = {
  desayuno:   'Desayuno',
  almuerzo:   'Almuerzo',
  cena:       'Cena',
  refrigerio: 'Refrigerio',
};

// Orden preferido de servicios
const ORDEN_SERVICIO = { desayuno: 0, almuerzo: 1, refrigerio: 2, cena: 3 };

// Color según estado del día
function colorDia(completo) {
  return completo
    ? 'bg-success/10 border-success/30 text-success'
    : 'bg-warning/10 border-warning/30 text-warning';
}

export default function ModalCicloCompleto({ ciclo, unidadNombre, onClose }) {
  const [busqueda, setBusqueda]       = useState('');
  const [diasExpandidos, setDias]     = useState({ 1: true }); // Día 1 abierto por defecto

  const { data, isLoading, isError, refetch } = useCicloCompleto(ciclo?.id);

  const toggleDia = (num) =>
    setDias((prev) => ({ ...prev, [num]: !prev[num] }));

  // ── Agrupar dias por numero_dia ─────────────────────────────────
  const diasMap = React.useMemo(() => {
    if (!data?.dias) return {};
    const map = {};
    for (const cds of data.dias) {
      if (!map[cds.numero_dia]) {
        map[cds.numero_dia] = { numero_dia: cds.numero_dia, completo: true, servicios: [] };
      }
      if (!cds.completo) map[cds.numero_dia].completo = false;
      // Ordenar componentes dentro de cada servicio
      const componentes = (cds.menu_componentes || [])
        .filter((mc) => mc.activo !== false)
        .sort((a, b) => (a.componentes_plato?.orden ?? 99) - (b.componentes_plato?.orden ?? 99));
      map[cds.numero_dia].servicios.push({
        servicio: cds.servicio,
        completo: cds.completo,
        componentes,
      });
    }
    // Ordenar servicios dentro de cada día
    for (const dia of Object.values(map)) {
      dia.servicios.sort(
        (a, b) => (ORDEN_SERVICIO[a.servicio] ?? 9) - (ORDEN_SERVICIO[b.servicio] ?? 9)
      );
    }
    return map;
  }, [data]);

  // Filtrar días por búsqueda (nombre receta o componente)
  const diasFiltrados = React.useMemo(() => {
    const todos = Object.values(diasMap).sort((a, b) => a.numero_dia - b.numero_dia);
    if (!busqueda.trim()) return todos;
    const term = busqueda.toLowerCase();
    return todos.filter((dia) =>
      dia.servicios.some((srv) =>
        srv.componentes.some(
          (mc) =>
            mc.componentes_plato?.nombre?.toLowerCase().includes(term) ||
            mc.arbol_recetas?.nombre?.toLowerCase().includes(term)
        )
      )
    );
  }, [diasMap, busqueda]);

  const totalDias   = Object.keys(diasMap).length;
  const diasCompletos = Object.values(diasMap).filter((d) => d.completo).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-bg-surface"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary leading-tight">
                Ciclo completo — {unidadNombre}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {ciclo?.nombre} · {totalDias} días ·{' '}
                <span className={diasCompletos === totalDias ? 'text-success' : 'text-warning'}>
                  {diasCompletos}/{totalDias} configurados
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-bg-app transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Buscador ── */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 bg-bg-app"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar componente o receta..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1 text-xs bg-transparent outline-none text-primary placeholder-text-muted"
            />
          </div>
        </div>

        {/* ── Contenido ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2 min-h-0">
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

          {!isLoading && !isError && diasFiltrados.length === 0 && (
            <div className="py-10 text-center">
              <CalendarDays className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm text-text-muted">
                {busqueda ? `Sin resultados para "${busqueda}"` : 'El ciclo no tiene días configurados'}
              </p>
            </div>
          )}

          {!isLoading && !isError && diasFiltrados.map((dia) => {
            const expandido = !!diasExpandidos[dia.numero_dia];
            return (
              <div
                key={dia.numero_dia}
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--color-border)' }}
              >
                {/* Cabecera del día */}
                <button
                  onClick={() => toggleDia(dia.numero_dia)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-bg-surface hover:bg-bg-app transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${colorDia(dia.completo)}`}>
                      {dia.numero_dia}
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      Día {dia.numero_dia}
                    </span>
                    <div className="flex gap-1">
                      {dia.servicios.map((srv) => (
                        <span
                          key={srv.servicio}
                          className={`text-xs px-1.5 py-0.5 rounded-full border ${
                            srv.completo
                              ? 'bg-success/10 border-success/30 text-success'
                              : 'bg-warning/10 border-warning/30 text-warning'
                          }`}
                        >
                          {ETIQUETA_SERVICIO[srv.servicio] || srv.servicio}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {dia.completo ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-warning" />
                    )}
                    {expandido
                      ? <ChevronUp className="w-4 h-4 text-text-muted" />
                      : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </div>
                </button>

                {/* Detalle del día expandido */}
                {expandido && (
                  <div className="border-t bg-bg-app" style={{ borderColor: 'var(--color-border)' }}>
                    {dia.servicios.map((srv, srvIdx) => (
                      <div
                        key={srv.servicio}
                        className={srvIdx > 0 ? 'border-t' : ''}
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        {/* Sub-cabecera de servicio */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-bg-surface/50">
                          <BookOpen className="w-3 h-3 text-text-muted flex-shrink-0" />
                          <span className="text-xs font-semibold text-text-secondary capitalize">
                            {ETIQUETA_SERVICIO[srv.servicio] || srv.servicio}
                          </span>
                          {!srv.completo && (
                            <span className="text-xs text-warning">(incompleto)</span>
                          )}
                        </div>

                        {/* Componentes del servicio */}
                        {srv.componentes.length === 0 ? (
                          <p className="px-4 py-2 text-xs text-text-muted italic">Sin componentes</p>
                        ) : (
                          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                            {srv.componentes.map((mc) => {
                              const comp   = mc.componentes_plato;
                              const receta = mc.arbol_recetas;
                              return (
                                <div
                                  key={mc.id}
                                  className="flex items-center gap-3 px-4 py-2 hover:bg-bg-surface/60 transition-colors"
                                >
                                  <span className="text-xs text-text-muted font-mono w-4 text-center flex-shrink-0">
                                    {comp?.orden ?? '—'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-primary capitalize truncate">
                                      {comp?.nombre || '—'}
                                    </p>
                                    <p className="text-xs text-text-muted truncate">
                                      {receta?.nombre || 'Sin receta'}
                                      {receta?.codigo && (
                                        <span className="text-text-muted font-mono ml-1 opacity-60">
                                          · {receta.codigo}
                                        </span>
                                      )}
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
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
          <button
            onClick={onClose}
            className="btn btn-outline text-xs !py-1 !px-3"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
