// ========================================
// CostosServicio.jsx — Jefe de Planta / Admin
// Muestra el costo de cada receta del servicio del día
// Fuentes de datos (en orden de prioridad):
//   1. consolidados_produccion → consolidado_items (cantidad real)
//   2. pedidos_servicio → pedido_items_servicio (cantidad del pedido)
//   3. ciclo activo → modo estimado (sin cantidad)
// ========================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Calendar, Building2, Utensils, RefreshCw,
  AlertTriangle, TrendingUp, Info, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/shared/api';
import notify from '@/shared/lib/notifier';

const HOY = new Date().toISOString().split('T')[0];

const SERVICIOS = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'cena',     label: 'Cena' },
];

// ── Formatear precio en COP ──
const fmtCOP = (n) => {
  if (n == null || n === 0) return '—';
  return `$${Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
};

// ── Componente badge de fuente ──
function FuenteBadge({ fuente, consolidadoId }) {
  const conf = {
    consolidado: { bg: 'bg-success/10', text: 'text-success', label: `Consolidado #${consolidadoId?.slice(-6) || ''}` },
    pedido:      { bg: 'bg-primary/10', text: 'text-primary',  label: 'Pedido del día' },
    ciclo:       { bg: 'bg-warning/10', text: 'text-warning',  label: 'Estimado – ciclo activo' },
  };
  const c = conf[fuente] || conf.ciclo;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <Info className="w-3 h-3" />
      {c.label}
    </span>
  );
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function CostosServicio() {
  const [operaciones, setOperaciones]     = useState([]);
  const [opSeleccionada, setOpSeleccionada] = useState('');
  const [fecha, setFecha]                 = useState(HOY);
  const [servicio, setServicio]           = useState('almuerzo');
  const [datos, setDatos]                 = useState(null);
  // datos shape: { fuente, consolidadoId, items }
  // items: [{ receta_id, receta_nombre, receta_codigo, componente_nombre, componente_orden, costo_porcion, cantidad, costo_total }]
  const [cargando, setCargando]           = useState(false);

  // ── Cargar operaciones al inicio ──
  useEffect(() => {
    supabase
      .from('operaciones')
      .select('id, codigo, nombre')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => {
        if (data?.length) {
          setOperaciones(data);
          setOpSeleccionada(data[0].id);
        }
      });
  }, []);

  // ── Carga de datos principal ──
  const cargarDatos = useCallback(async () => {
    if (!opSeleccionada || !fecha || !servicio) return;

    setCargando(true);
    setDatos(null);

    try {
      // ── FUENTE 1: Consolidado ──
      // Nota: consolidados_produccion no tiene operacion_id (UNIQUE por fecha+servicio)
      const { data: consol } = await supabase
        .from('consolidados_produccion')
        .select('id')
        .eq('fecha', fecha)
        .eq('servicio', servicio)
        .maybeSingle();

      if (consol?.id) {
        const { data: items, error: itemsErr } = await supabase
          .from('consolidado_items')
          .select(`
            cantidad_total,
            arbol_recetas (id, codigo, nombre, costo_porcion),
            componentes_plato (nombre, orden)
          `)
          .eq('consolidado_id', consol.id)
          .order('created_at', { ascending: true });

        if (!itemsErr && items?.length) {
          const result = items.map((it) => {
            const cp    = it.arbol_recetas?.costo_porcion || 0;
            const cant  = it.cantidad_total || 0;
            return {
              receta_id:        it.arbol_recetas?.id,
              receta_nombre:    it.arbol_recetas?.nombre || '—',
              receta_codigo:    it.arbol_recetas?.codigo || '—',
              componente_nombre: it.componentes_plato?.nombre || '—',
              componente_orden:  it.componentes_plato?.orden ?? 99,
              costo_porcion:    cp,
              cantidad:         cant,
              costo_total:      cp * cant,
            };
          });
          result.sort((a, b) => a.componente_orden - b.componente_orden);
          setDatos({ fuente: 'consolidado', consolidadoId: consol.id, items: result });
          return;
        }
      }

      // ── FUENTE 2: Pedido del día ──
      const { data: pedido } = await supabase
        .from('pedidos_servicio')
        .select('id')
        .eq('fecha', fecha)
        .eq('servicio', servicio)
        .eq('operacion_id', opSeleccionada)
        .in('estado', ['enviado', 'aprobado', 'consolidado'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pedido?.id) {
        const { data: pedItems, error: pedErr } = await supabase
          .from('pedido_items_servicio')
          .select(`
            cantidad,
            menu_componentes (
              arbol_recetas (id, codigo, nombre, costo_porcion),
              componentes_plato (nombre, orden)
            )
          `)
          .eq('pedido_id', pedido.id);

        if (!pedErr && pedItems?.length) {
          // Agrupar por receta_id sumando cantidades
          const mapaRecetas = {};
          for (const pi of pedItems) {
            const ar  = pi.menu_componentes?.arbol_recetas;
            const cp2 = pi.menu_componentes?.componentes_plato;
            if (!ar?.id) continue;
            if (!mapaRecetas[ar.id]) {
              mapaRecetas[ar.id] = {
                receta_id:        ar.id,
                receta_nombre:    ar.nombre || '—',
                receta_codigo:    ar.codigo || '—',
                componente_nombre: cp2?.nombre || '—',
                componente_orden:  cp2?.orden ?? 99,
                costo_porcion:    ar.costo_porcion || 0,
                cantidad:         0,
                costo_total:      0,
              };
            }
            const cant2 = pi.cantidad || 0;
            mapaRecetas[ar.id].cantidad    += cant2;
            mapaRecetas[ar.id].costo_total += (ar.costo_porcion || 0) * cant2;
          }
          const result2 = Object.values(mapaRecetas).sort(
            (a, b) => a.componente_orden - b.componente_orden,
          );
          if (result2.length) {
            setDatos({ fuente: 'pedido', consolidadoId: null, items: result2 });
            return;
          }
        }
      }

      // ── FUENTE 3: Ciclo activo (modo estimado) ──
      // cantidad_ciclos está en operaciones, no en ciclos_menu
      const { data: ciclo } = await supabase
        .from('ciclos_menu')
        .select('id, nombre, dia_actual_ciclo, fecha_inicio, operaciones(cantidad_ciclos)')
        .eq('operacion_id', opSeleccionada)
        .eq('activo', true)
        .eq('estado', 'activo')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ciclo) {
        // Calcular qué día del ciclo corresponde a la fecha
        // cantidad_ciclos viene del join a operaciones
        const cantidadCiclos = ciclo.operaciones?.cantidad_ciclos || 1;
        const inicio  = new Date(ciclo.fecha_inicio);
        const target  = new Date(fecha);
        const diffDias = Math.round((target - inicio) / 86400000);
        const diaBase  = (ciclo.dia_actual_ciclo || 1);
        let diaCiclo   = ((diffDias + diaBase - 1) % cantidadCiclos) + 1;
        if (diaCiclo <= 0) diaCiclo += cantidadCiclos;

        const { data: cds } = await supabase
          .from('ciclo_dia_servicios')
          .select(`
            id,
            menu_componentes (
              id,
              receta_id,
              arbol_recetas (id, codigo, nombre, costo_porcion),
              componentes_plato (nombre, orden)
            )
          `)
          .eq('ciclo_id', ciclo.id)
          .eq('numero_dia', diaCiclo)
          .eq('servicio', servicio);

        if (cds?.length) {
          const result3 = [];
          for (const cdsRow of cds) {
            for (const mc of cdsRow.menu_componentes || []) {
              const ar3 = mc.arbol_recetas;
              const cp3 = mc.componentes_plato;
              if (!ar3) continue;
              result3.push({
                receta_id:        ar3.id,
                receta_nombre:    ar3.nombre || '—',
                receta_codigo:    ar3.codigo || '—',
                componente_nombre: cp3?.nombre || '—',
                componente_orden:  cp3?.orden ?? 99,
                costo_porcion:    ar3.costo_porcion || 0,
                cantidad:         null, // modo estimado, sin cantidad
                costo_total:      null,
              });
            }
          }
          result3.sort((a, b) => a.componente_orden - b.componente_orden);
          if (result3.length) {
            setDatos({ fuente: 'ciclo', consolidadoId: null, items: result3 });
            return;
          }
        }
      }

      // Sin datos en ninguna fuente
      setDatos({ fuente: null, consolidadoId: null, items: [] });
    } catch (err) {
      console.error('Error cargando costos de servicio:', err);
      notify.error('Error al cargar los datos');
      setDatos({ fuente: null, consolidadoId: null, items: [] });
    } finally {
      setCargando(false);
    }
  }, [opSeleccionada, fecha, servicio]);

  // Carga automática cuando cambian los filtros
  useEffect(() => {
    if (opSeleccionada) cargarDatos();
  }, [opSeleccionada, fecha, servicio, cargarDatos]);

  // ── Cálculos de resumen ──
  const items = datos?.items || [];
  const itemsConCosto   = items.filter((i) => i.costo_porcion > 0);
  const totalServicio   = items.reduce((s, i) => s + (i.costo_total || 0), 0);
  const promCostoPorcion = itemsConCosto.length
    ? itemsConCosto.reduce((s, i) => s + i.costo_porcion, 0) / itemsConCosto.length
    : 0;
  const tieneCantidades = datos?.fuente !== 'ciclo';

  return (
    <div className="min-h-content p-compact">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="section-header">
          <h1 className="section-title flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Costos por Servicio
          </h1>
          <p className="section-subtitle">
            Costo de cada receta e impacto económico del servicio
          </p>
        </div>

        {/* ── Filtros ── */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="flex flex-wrap gap-4 items-end">

              {/* Operación */}
              <div className="flex-1 min-w-40">
                <label className="form-label flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Operación
                </label>
                <div className="relative">
                  <select
                    className="form-select pr-8 w-full"
                    value={opSeleccionada}
                    onChange={(e) => setOpSeleccionada(e.target.value)}
                  >
                    {operaciones.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.nombre}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="form-label flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Fecha
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>

              {/* Servicio */}
              <div>
                <label className="form-label flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5" /> Servicio
                </label>
                <div className="relative">
                  <select
                    className="form-select pr-8"
                    value={servicio}
                    onChange={(e) => setServicio(e.target.value)}
                  >
                    {SERVICIOS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                </div>
              </div>

              {/* Botón actualizar */}
              <button
                onClick={cargarDatos}
                disabled={cargando || !opSeleccionada}
                className="btn btn-outline flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* ── Estado: cargando ── */}
        {cargando && (
          <div className="card">
            <div className="card-body flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-primary mr-3" />
              <span className="text-muted">Calculando costos del servicio…</span>
            </div>
          </div>
        )}

        {/* ── Estado: sin datos ── */}
        {!cargando && datos && !items.length && (
          <div className="card">
            <div className="card-body text-center py-12">
              <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-3" />
              <p className="font-medium text-base mb-1">Sin datos para esta selección</p>
              <p className="text-muted text-sm">
                No se encontró consolidado, pedido ni ciclo activo para{' '}
                <strong>{SERVICIOS.find((s) => s.value === servicio)?.label}</strong>{' '}
                del {fecha}.
              </p>
            </div>
          </div>
        )}

        {/* ── Contenido principal ── */}
        {!cargando && datos && items.length > 0 && (
          <>
            {/* Stats + badge fuente */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
              {/* Fuente */}
              <div className="card col-span-2 sm:col-span-1">
                <div className="card-body py-3">
                  <p className="text-xs text-muted mb-1">Fuente de datos</p>
                  <FuenteBadge fuente={datos.fuente} consolidadoId={datos.consolidadoId} />
                </div>
              </div>

              {/* # Recetas */}
              <div className="card">
                <div className="card-body py-3">
                  <p className="text-xs text-muted mb-0.5">Recetas</p>
                  <p className="text-xl font-bold text-primary">{items.length}</p>
                </div>
              </div>

              {/* Costo promedio por porción */}
              <div className="card">
                <div className="card-body py-3">
                  <p className="text-xs text-muted mb-0.5">Costo/porc. promedio</p>
                  <p className="text-xl font-bold text-primary">
                    {promCostoPorcion > 0 ? fmtCOP(promCostoPorcion) : '—'}
                  </p>
                </div>
              </div>

              {/* Total servicio */}
              {tieneCantidades && (
                <div className="card border-primary/30">
                  <div className="card-body py-3">
                    <p className="text-xs text-muted mb-0.5">Total servicio</p>
                    <p className="text-xl font-bold text-success">
                      {totalServicio > 0 ? fmtCOP(totalServicio) : '—'}
                    </p>
                  </div>
                </div>
              )}

              {/* Modo estimado: aviso */}
              {!tieneCantidades && (
                <div className="card bg-warning/5 border-warning/20">
                  <div className="card-body py-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                    <p className="text-xs text-warning">
                      Modo estimado: no hay pedido ni consolidado. Las cantidades no están disponibles.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Tabla */}
            <div className="card">
              <div className="card-body p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                          Componente
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                          Receta
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                          Costo/Porción
                        </th>
                        {tieneCantidades && (
                          <>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                              Cantidad
                            </th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                              Total
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr
                          key={`${item.receta_id}-${idx}`}
                          className="border-b border-border last:border-0 hover:bg-surface transition-colors"
                        >
                          {/* Componente */}
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                              {item.componente_nombre}
                            </span>
                          </td>

                          {/* Receta */}
                          <td className="px-4 py-3">
                            <p className="font-medium">{item.receta_nombre}</p>
                            <p className="text-xs text-muted font-mono">{item.receta_codigo}</p>
                          </td>

                          {/* Costo por porción */}
                          <td className="px-4 py-3 text-right">
                            {item.costo_porcion > 0 ? (
                              <span className="font-semibold text-primary">
                                {fmtCOP(item.costo_porcion)}
                              </span>
                            ) : (
                              <span
                                className="text-xs font-medium text-warning"
                                title="Registra facturas de recepción para calcular el costo automáticamente"
                              >
                                Sin costo
                              </span>
                            )}
                          </td>

                          {/* Cantidad */}
                          {tieneCantidades && (
                            <td className="px-4 py-3 text-right tabular-nums">
                              {item.cantidad != null ? (
                                <span className="font-medium">{item.cantidad}</span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                          )}

                          {/* Total */}
                          {tieneCantidades && (
                            <td className="px-4 py-3 text-right tabular-nums">
                              {item.costo_total > 0 ? (
                                <span className="font-semibold text-success">
                                  {fmtCOP(item.costo_total)}
                                </span>
                              ) : item.costo_porcion === 0 ? (
                                <span className="text-xs text-warning">—</span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>

                    {/* Fila de total */}
                    {tieneCantidades && totalServicio > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-border bg-surface">
                          <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-right">
                            TOTAL SERVICIO
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium">
                            {items.reduce((s, i) => s + (i.cantidad || 0), 0)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-bold text-success text-base">
                            {fmtCOP(totalServicio)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Aviso recetas sin costo */}
                {items.some((i) => i.costo_porcion === 0) && (
                  <div className="border-t border-border px-4 py-3 flex items-start gap-2 bg-warning/5">
                    <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                    <p className="text-xs text-warning">
                      Algunas recetas aparecen como "Sin costo" porque aún no se han registrado
                      facturas de recepción de sus materias primas. El costo se calcula automáticamente
                      al recepcionar insumos en el módulo de Almacén.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Indicador de costo promedio por porción con breakdown */}
            {tieneCantidades && totalServicio > 0 && (
              <div className="card mt-3">
                <div className="card-body py-3 flex flex-wrap gap-4 items-center">
                  <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted">Costo total del servicio</p>
                    <p className="font-bold text-lg text-primary">{fmtCOP(totalServicio)}</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div>
                    <p className="text-xs text-muted">Recetas con costo asignado</p>
                    <p className="font-semibold">
                      {itemsConCosto.length} / {items.length}
                    </p>
                  </div>
                  {itemsConCosto.length < items.length && (
                    <>
                      <div className="h-8 w-px bg-border" />
                      <div className="flex items-center gap-1 text-warning text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {items.length - itemsConCosto.length} receta(s) sin costo excluida(s) del total
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
