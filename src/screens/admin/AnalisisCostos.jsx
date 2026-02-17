// src/screens/admin/AnalisisCostos.jsx
// Vista gerencial: comparativo de costos entre meses
import React, { useState, useEffect } from "react";
import { supabase } from "@/shared/api";
import notify from "../../utils/notifier";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Minus,
  Package,
  BarChart3,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  X,
  Loader2,
  Download,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatCOP(valor) {
  if (valor == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

function pct(actual, anterior) {
  if (!anterior || anterior === 0) return null;
  return ((actual - anterior) / anterior) * 100;
}

function PctBadge({ valor }) {
  if (valor == null) return <span className="text-muted text-xs">—</span>;
  const sube = valor > 0;
  const igual = Math.abs(valor) < 0.1;
  if (igual) return (
    <span className="badge badge-primary flex items-center gap-1">
      <Minus size={10} /> 0%
    </span>
  );
  return (
    <span className={`badge flex items-center gap-1 ${sube ? "badge-error" : "badge-success"}`}>
      {sube ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {sube ? "+" : ""}{valor.toFixed(1)}%
    </span>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function AnalisisCostos() {
  const hoy = new Date();
  const [mesA, setMesA] = useState(hoy.getMonth());           // mes base (más reciente)
  const [anioA, setAnioA] = useState(hoy.getFullYear());
  const [mesB, setMesB] = useState(hoy.getMonth() === 0 ? 11 : hoy.getMonth() - 1);
  const [anioB, setAnioB] = useState(hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear());

  const [loading, setLoading] = useState(false);
  const [datos, setDatos] = useState(null);          // { resumenA, resumenB, items }
  const [modalItem, setModalItem] = useState(null);  // para detalle de un ingrediente
  const [busqueda, setBusqueda] = useState("");
  const [soloVariaciones, setSoloVariaciones] = useState(false);
  const [ordenCampo, setOrdenCampo] = useState("variacion_abs");
  const [ordenDir, setOrdenDir] = useState("desc");

  // ── Cargar datos ───────────────────────────────────────────────────────────
  async function cargarComparativo() {
    setLoading(true);
    setDatos(null);
    try {
      // Rangos de fechas para cada período
      const inicioA = new Date(anioA, mesA, 1).toISOString();
      const finA    = new Date(anioA, mesA + 1, 0, 23, 59, 59).toISOString();
      const inicioB = new Date(anioB, mesB, 1).toISOString();
      const finB    = new Date(anioB, mesB + 1, 0, 23, 59, 59).toISOString();

      // Traer movimientos de ambos períodos en paralelo
      // Usamos movimientos_inventario que ya existe en tu DB
      const [{ data: movA, error: errA }, { data: movB, error: errB }] = await Promise.all([
        supabase
          .from("movimientos_inventario")
          .select(`
            producto_id,
            tipo_movimiento,
            cantidad_unidad_base,
            costo_unitario,
            arbol_materia_prima:producto_id ( id, nombre, codigo, tipo_rama, unidad_stock )
          `)
          .eq("tipo_movimiento", "entrada")
          .gte("created_at", inicioA)
          .lte("created_at", finA),
        supabase
          .from("movimientos_inventario")
          .select(`
            producto_id,
            tipo_movimiento,
            cantidad_unidad_base,
            costo_unitario,
            arbol_materia_prima:producto_id ( id, nombre, codigo, tipo_rama, unidad_stock )
          `)
          .eq("tipo_movimiento", "entrada")
          .gte("created_at", inicioB)
          .lte("created_at", finB),
      ]);

      if (errA) throw errA;
      if (errB) throw errB;

      // Agrupar por producto_id y calcular costo promedio + total gastado
      function agrupar(movimientos) {
        const mapa = {};
        for (const m of movimientos || []) {
          if (!m.producto_id) continue;
          if (!mapa[m.producto_id]) {
            mapa[m.producto_id] = {
              producto_id: m.producto_id,
              nombre: m.arbol_materia_prima?.nombre ?? "Sin nombre",
              codigo: m.arbol_materia_prima?.codigo ?? "",
              tipo_rama: m.arbol_materia_prima?.tipo_rama ?? "",
              unidad: m.arbol_materia_prima?.unidad_stock ?? "",
              cantidad_total: 0,
              gasto_total: 0,
              entradas: 0,
              costos: [],
            };
          }
          const item = mapa[m.producto_id];
          const cant = m.cantidad_unidad_base || 0;
          const costo = m.costo_unitario || 0;
          item.cantidad_total += cant;
          item.gasto_total += cant * costo;
          item.entradas += 1;
          item.costos.push(costo);
        }
        // Calcular costo promedio ponderado
        Object.values(mapa).forEach((item) => {
          item.costo_promedio =
            item.cantidad_total > 0 ? item.gasto_total / item.cantidad_total : 0;
        });
        return mapa;
      }

      const mapaA = agrupar(movA);
      const mapaB = agrupar(movB);

      // Unir por producto: cualquiera que aparezca en A o B
      const todosIds = new Set([...Object.keys(mapaA), ...Object.keys(mapaB)]);

      const items = Array.from(todosIds).map((id) => {
        const a = mapaA[id] || null;
        const b = mapaB[id] || null;
        const base = a || b;

        const costoA = a?.costo_promedio ?? null;
        const costoB = b?.costo_promedio ?? null;
        const gastoA = a?.gasto_total ?? 0;
        const gastoB = b?.gasto_total ?? 0;
        const variacionPct = pct(costoA ?? 0, costoB);
        const variacionAbs = costoA != null && costoB != null ? costoA - costoB : null;

        return {
          id,
          nombre: base.nombre,
          codigo: base.codigo,
          tipo_rama: base.tipo_rama,
          unidad: base.unidad,
          // Período A
          costo_a: costoA,
          cantidad_a: a?.cantidad_total ?? 0,
          gasto_a: gastoA,
          entradas_a: a?.entradas ?? 0,
          // Período B
          costo_b: costoB,
          cantidad_b: b?.cantidad_total ?? 0,
          gasto_b: gastoB,
          entradas_b: b?.entradas ?? 0,
          // Variaciones
          variacion_pct: variacionPct,
          variacion_abs: variacionAbs,
        };
      });

      // Resúmenes globales
      const resumenA = {
        gasto_total: items.reduce((s, i) => s + i.gasto_a, 0),
        productos: Object.keys(mapaA).length,
        entradas: (movA || []).length,
      };
      const resumenB = {
        gasto_total: items.reduce((s, i) => s + i.gasto_b, 0),
        productos: Object.keys(mapaB).length,
        entradas: (movB || []).length,
      };

      setDatos({ resumenA, resumenB, items });
      notify.success(`Comparativo cargado: ${items.length} ingredientes`);
    } catch (err) {
      console.error(err);
      notify.error("Error al cargar el comparativo de costos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarComparativo();
  }, []);

  // ── Filtrar y ordenar ──────────────────────────────────────────────────────
  const itemsFiltrados = (datos?.items ?? [])
    .filter((i) => {
      if (busqueda) {
        const t = busqueda.toLowerCase();
        if (!i.nombre.toLowerCase().includes(t) && !i.codigo.toLowerCase().includes(t)) return false;
      }
      if (soloVariaciones && (i.variacion_pct == null || Math.abs(i.variacion_pct) < 1)) return false;
      return true;
    })
    .sort((a, b) => {
      const va = a[ordenCampo] ?? -Infinity;
      const vb = b[ordenCampo] ?? -Infinity;
      if (ordenDir === "asc") return va > vb ? 1 : -1;
      return va < vb ? 1 : -1;
    });

  // Items con mayor alza (top 5 por variación positiva)
  const topAlzas = [...(datos?.items ?? [])]
    .filter((i) => i.variacion_pct != null && i.variacion_pct > 0)
    .sort((a, b) => b.variacion_pct - a.variacion_pct)
    .slice(0, 5);

  // Items con mayor baja (top 5 por variación negativa)
  const topBajas = [...(datos?.items ?? [])]
    .filter((i) => i.variacion_pct != null && i.variacion_pct < 0)
    .sort((a, b) => a.variacion_pct - b.variacion_pct)
    .slice(0, 5);

  function toggleOrden(campo) {
    if (ordenCampo === campo) setOrdenDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setOrdenCampo(campo); setOrdenDir("desc"); }
  }

  const varGastoTotal = pct(datos?.resumenA?.gasto_total, datos?.resumenB?.gasto_total);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-content bg-app">
      <div className="page-container">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="section-header">
              <h1 className="section-title flex items-center gap-2">
                <BarChart3 size={22} className="text-primary" />
                Análisis de Costos
              </h1>
              <p className="section-subtitle">
                Comparativo de costos de materia prima entre dos períodos
              </p>
            </div>
          </div>
        </div>

        {/* ── Selector de períodos ── */}
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <Calendar size={18} />
              Seleccionar Períodos a Comparar
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Período A — base de comparación (más reciente) */}
              <div className="p-4 rounded-base border border-base bg-app">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                  Período A — Mes de referencia
                </p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="form-label">Mes</label>
                    <select
                      className="form-input"
                      value={mesA}
                      onChange={(e) => setMesA(Number(e.target.value))}
                    >
                      {MESES.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="form-label">Año</label>
                    <select
                      className="form-input"
                      value={anioA}
                      onChange={(e) => setAnioA(Number(e.target.value))}
                    >
                      {[hoy.getFullYear(), hoy.getFullYear() - 1, hoy.getFullYear() - 2].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Período B — mes anterior */}
              <div className="p-4 rounded-base border border-base bg-app">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                  Período B — Mes de comparación
                </p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="form-label">Mes</label>
                    <select
                      className="form-input"
                      value={mesB}
                      onChange={(e) => setMesB(Number(e.target.value))}
                    >
                      {MESES.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="form-label">Año</label>
                    <select
                      className="form-input"
                      value={anioB}
                      onChange={(e) => setAnioB(Number(e.target.value))}
                    >
                      {[hoy.getFullYear(), hoy.getFullYear() - 1, hoy.getFullYear() - 2].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={cargarComparativo}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Calculando...</>
                ) : (
                  <><BarChart3 size={16} /> Comparar períodos</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="card p-12 text-center">
            <Loader2 size={36} className="animate-spin mx-auto mb-3 text-primary" />
            <p className="text-muted">Calculando comparativo de costos...</p>
          </div>
        )}

        {/* ── Resultados ── */}
        {!loading && datos && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Gasto Período A */}
              <div className="stats-card">
                <div className="stats-icon">
                  <DollarSign size={22} />
                </div>
                <div className="stats-content">
                  <div className="stats-value text-lg">{formatCOP(datos.resumenA.gasto_total)}</div>
                  <div className="stats-label">
                    Gasto {MESES[mesA]} {anioA}
                  </div>
                </div>
              </div>

              {/* Gasto Período B */}
              <div className="stats-card">
                <div className="stats-icon" style={{ opacity: 0.6 }}>
                  <DollarSign size={22} />
                </div>
                <div className="stats-content">
                  <div className="stats-value text-lg text-muted">{formatCOP(datos.resumenB.gasto_total)}</div>
                  <div className="stats-label">
                    Gasto {MESES[mesB]} {anioB}
                  </div>
                </div>
              </div>

              {/* Variación total */}
              <div className="stats-card">
                <div className={`stats-icon ${varGastoTotal > 0 ? "bg-red-50 text-error" : "bg-green-50 text-success"}`}>
                  {varGastoTotal > 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                </div>
                <div className="stats-content">
                  <div className="flex items-center gap-2">
                    <span className="stats-value text-lg">
                      {varGastoTotal != null ? `${varGastoTotal > 0 ? "+" : ""}${varGastoTotal.toFixed(1)}%` : "—"}
                    </span>
                    <PctBadge valor={varGastoTotal} />
                  </div>
                  <div className="stats-label">Variación en gasto total</div>
                </div>
              </div>

              {/* Ingredientes con alza */}
              <div className="stats-card">
                <div className="stats-icon bg-amber-50 text-warning">
                  <AlertTriangle size={22} />
                </div>
                <div className="stats-content">
                  <div className="stats-value text-lg">
                    {datos.items.filter((i) => i.variacion_pct != null && i.variacion_pct > 5).length}
                  </div>
                  <div className="stats-label">Ingredientes con alza &gt;5%</div>
                </div>
              </div>
            </div>

            {/* ── Top alzas y bajas ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Top alzas */}
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-error flex items-center gap-2">
                    <TrendingUp size={18} /> Mayores Alzas de Precio
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Ingredientes con mayor incremento de costo promedio
                  </p>
                </div>
                <div className="card-body !p-0">
                  {topAlzas.length === 0 ? (
                    <p className="p-4 text-sm text-muted">Sin alzas en este período</p>
                  ) : (
                    <table className="table">
                      <tbody>
                        {topAlzas.map((item) => (
                          <tr key={item.id} className="table-row">
                            <td className="table-cell">
                              <div className="font-medium text-sm">{item.nombre}</div>
                              <div className="text-xs text-muted font-mono">{item.codigo}</div>
                            </td>
                            <td className="table-cell text-right">
                              <div className="text-xs text-muted">{formatCOP(item.costo_b)} → {formatCOP(item.costo_a)}</div>
                              <div className="flex justify-end mt-1">
                                <PctBadge valor={item.variacion_pct} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Top bajas */}
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-success flex items-center gap-2">
                    <TrendingDown size={18} /> Mayores Reducciones de Precio
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Ingredientes con mayor disminución de costo promedio
                  </p>
                </div>
                <div className="card-body !p-0">
                  {topBajas.length === 0 ? (
                    <p className="p-4 text-sm text-muted">Sin reducciones en este período</p>
                  ) : (
                    <table className="table">
                      <tbody>
                        {topBajas.map((item) => (
                          <tr key={item.id} className="table-row">
                            <td className="table-cell">
                              <div className="font-medium text-sm">{item.nombre}</div>
                              <div className="text-xs text-muted font-mono">{item.codigo}</div>
                            </td>
                            <td className="table-cell text-right">
                              <div className="text-xs text-muted">{formatCOP(item.costo_b)} → {formatCOP(item.costo_a)}</div>
                              <div className="flex justify-end mt-1">
                                <PctBadge valor={item.variacion_pct} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* ── Tabla detallada ── */}
            <div className="card">
              <div className="card-header">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-primary">
                      Detalle por Ingrediente
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      {MESES[mesA]} {anioA} vs {MESES[mesB]} {anioB} — {itemsFiltrados.length} ingredientes
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Búsqueda */}
                    <input
                      type="text"
                      placeholder="Buscar ingrediente..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="form-input text-sm !py-1.5 w-48"
                    />
                    {/* Solo variaciones */}
                    <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={soloVariaciones}
                        onChange={(e) => setSoloVariaciones(e.target.checked)}
                        className="rounded"
                      />
                      Solo con variación
                    </label>
                  </div>
                </div>
              </div>

              {/* Cabecera de comparación */}
              <div className="grid grid-cols-2 border-b border-base">
                <div className="p-3 text-center text-xs font-semibold text-primary border-r border-base bg-primary/5">
                  Período A — {MESES[mesA]} {anioA}
                </div>
                <div className="p-3 text-center text-xs font-semibold text-muted bg-app">
                  Período B — {MESES[mesB]} {anioB}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell w-48">Ingrediente</th>
                      {/* Período A */}
                      <th
                        className="table-header-cell text-right cursor-pointer hover:text-primary"
                        onClick={() => toggleOrden("costo_a")}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Costo / U
                          {ordenCampo === "costo_a" && (ordenDir === "asc" ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                        </span>
                      </th>
                      <th
                        className="table-header-cell text-right cursor-pointer hover:text-primary"
                        onClick={() => toggleOrden("gasto_a")}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Gasto total
                          {ordenCampo === "gasto_a" && (ordenDir === "asc" ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                        </span>
                      </th>
                      <th className="table-header-cell text-right text-muted">Cant.</th>
                      {/* Período B */}
                      <th className="table-header-cell text-right">Costo / U</th>
                      <th className="table-header-cell text-right">Gasto total</th>
                      <th className="table-header-cell text-right text-muted">Cant.</th>
                      {/* Variación */}
                      <th
                        className="table-header-cell text-right cursor-pointer hover:text-primary"
                        onClick={() => toggleOrden("variacion_pct")}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Var. %
                          {ordenCampo === "variacion_pct" && (ordenDir === "asc" ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                        </span>
                      </th>
                      <th
                        className="table-header-cell text-right cursor-pointer hover:text-primary"
                        onClick={() => toggleOrden("variacion_abs")}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Var. $
                          {ordenCampo === "variacion_abs" && (ordenDir === "asc" ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                        </span>
                      </th>
                      <th className="table-header-cell text-center">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="table-cell text-center py-10 text-muted">
                          No hay ingredientes que coincidan con los filtros
                        </td>
                      </tr>
                    ) : (
                      itemsFiltrados.map((item) => {
                        const sube = item.variacion_pct != null && item.variacion_pct > 0;
                        const baja = item.variacion_pct != null && item.variacion_pct < 0;
                        return (
                          <tr
                            key={item.id}
                            className={`table-row ${sube && item.variacion_pct > 10 ? "border-l-4 border-l-red-400" : ""} ${baja && item.variacion_pct < -10 ? "border-l-4 border-l-green-400" : ""}`}
                          >
                            <td className="table-cell">
                              <div className="font-medium text-sm">{item.nombre}</div>
                              <div className="text-xs text-muted font-mono">{item.codigo}</div>
                              {item.tipo_rama && (
                                <span className="badge badge-primary text-xs mt-1">{item.tipo_rama}</span>
                              )}
                            </td>
                            {/* Período A */}
                            <td className="table-cell text-right font-semibold">
                              {item.costo_a != null ? (
                                <span>{formatCOP(item.costo_a)}<span className="text-xs text-muted">/{item.unidad}</span></span>
                              ) : <span className="text-muted">—</span>}
                            </td>
                            <td className="table-cell text-right">
                              {item.gasto_a > 0 ? (
                                <span className="text-success font-semibold">{formatCOP(item.gasto_a)}</span>
                              ) : <span className="text-muted">—</span>}
                            </td>
                            <td className="table-cell text-right text-muted text-xs">
                              {item.cantidad_a > 0 ? `${item.cantidad_a.toLocaleString("es-CO", { maximumFractionDigits: 1 })} ${item.unidad}` : "—"}
                            </td>
                            {/* Período B */}
                            <td className="table-cell text-right text-muted">
                              {item.costo_b != null ? (
                                <span>{formatCOP(item.costo_b)}<span className="text-xs">/{item.unidad}</span></span>
                              ) : <span>—</span>}
                            </td>
                            <td className="table-cell text-right text-muted">
                              {item.gasto_b > 0 ? formatCOP(item.gasto_b) : "—"}
                            </td>
                            <td className="table-cell text-right text-muted text-xs">
                              {item.cantidad_b > 0 ? `${item.cantidad_b.toLocaleString("es-CO", { maximumFractionDigits: 1 })} ${item.unidad}` : "—"}
                            </td>
                            {/* Variaciones */}
                            <td className="table-cell text-right">
                              <PctBadge valor={item.variacion_pct} />
                            </td>
                            <td className="table-cell text-right">
                              {item.variacion_abs != null ? (
                                <span className={item.variacion_abs > 0 ? "text-error font-semibold" : "text-success font-semibold"}>
                                  {item.variacion_abs > 0 ? "+" : ""}{formatCOP(item.variacion_abs)}
                                </span>
                              ) : <span className="text-muted">—</span>}
                            </td>
                            <td className="table-cell text-center">
                              <button
                                onClick={() => setModalItem(item)}
                                className="btn btn-icon btn-outline"
                                title="Ver detalle"
                              >
                                <Eye size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer con totales */}
              <div className="card-footer">
                <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-sm">
                  <span className="text-muted">
                    {itemsFiltrados.length} de {datos.items.length} ingredientes
                  </span>
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-muted">Total {MESES[mesA]}: </span>
                      <span className="font-semibold text-primary">{formatCOP(datos.resumenA.gasto_total)}</span>
                    </div>
                    <div>
                      <span className="text-muted">Total {MESES[mesB]}: </span>
                      <span className="font-semibold text-muted">{formatCOP(datos.resumenB.gasto_total)}</span>
                    </div>
                    <div>
                      <span className="text-muted">Diferencia: </span>
                      <span className={`font-semibold ${datos.resumenA.gasto_total > datos.resumenB.gasto_total ? "text-error" : "text-success"}`}>
                        {formatCOP(datos.resumenA.gasto_total - datos.resumenB.gasto_total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Modal Detalle Ingrediente ── */}
        {modalItem && (
          <ModalDetalleIngrediente
            item={modalItem}
            mesA={mesA} anioA={anioA}
            mesB={mesB} anioB={anioB}
            onClose={() => setModalItem(null)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Modal Detalle ────────────────────────────────────────────────────────────

function ModalDetalleIngrediente({ item, mesA, anioA, mesB, anioB, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-card shadow-card w-full max-w-lg">
        <div className="card-header flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-primary">{item.nombre}</h3>
            <p className="text-xs text-muted font-mono">{item.codigo}</p>
          </div>
          <button onClick={onClose} className="btn btn-icon btn-outline">
            <X size={18} />
          </button>
        </div>

        <div className="card-body">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Columna A */}
            <div className="p-4 rounded-base bg-primary/5 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wider">
                {MESES[mesA]} {anioA}
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted">Costo promedio / unidad</p>
                  <p className="font-bold text-lg">
                    {item.costo_a != null ? formatCOP(item.costo_a) : "Sin datos"}
                    <span className="text-xs font-normal text-muted ml-1">/{item.unidad}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Cantidad comprada</p>
                  <p className="font-semibold">{item.cantidad_a.toLocaleString("es-CO", { maximumFractionDigits: 2 })} {item.unidad}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Gasto total</p>
                  <p className="font-semibold text-success">{formatCOP(item.gasto_a)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Número de entradas</p>
                  <p className="font-semibold">{item.entradas_a}</p>
                </div>
              </div>
            </div>

            {/* Columna B */}
            <div className="p-4 rounded-base bg-app border border-base">
              <p className="text-xs font-semibold text-muted mb-3 uppercase tracking-wider">
                {MESES[mesB]} {anioB}
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted">Costo promedio / unidad</p>
                  <p className="font-bold text-lg text-secondary">
                    {item.costo_b != null ? formatCOP(item.costo_b) : "Sin datos"}
                    <span className="text-xs font-normal text-muted ml-1">/{item.unidad}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Cantidad comprada</p>
                  <p className="font-semibold text-secondary">{item.cantidad_b.toLocaleString("es-CO", { maximumFractionDigits: 2 })} {item.unidad}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Gasto total</p>
                  <p className="font-semibold text-secondary">{formatCOP(item.gasto_b)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Número de entradas</p>
                  <p className="font-semibold text-secondary">{item.entradas_b}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen variación */}
          <div className={`p-4 rounded-base border ${item.variacion_pct > 0 ? "bg-red-50 border-red-200" : item.variacion_pct < 0 ? "bg-green-50 border-green-200" : "bg-app border-base"}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Resumen de Variación</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">Diferencia en costo unitario</p>
                <p className={`text-xl font-bold ${item.variacion_abs > 0 ? "text-error" : item.variacion_abs < 0 ? "text-success" : "text-muted"}`}>
                  {item.variacion_abs != null ? `${item.variacion_abs > 0 ? "+" : ""}${formatCOP(item.variacion_abs)}` : "—"}
                  <span className="text-sm font-normal ml-1">/{item.unidad}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-secondary">Variación porcentual</p>
                <div className="flex justify-end mt-1">
                  <PctBadge valor={item.variacion_pct} />
                </div>
              </div>
            </div>
            {item.gasto_a > 0 && item.gasto_b > 0 && (
              <div className="mt-3 pt-3 border-t border-base">
                <p className="text-sm text-secondary">Impacto en gasto total del período</p>
                <p className={`font-semibold ${item.gasto_a > item.gasto_b ? "text-error" : "text-success"}`}>
                  {item.gasto_a > item.gasto_b ? "+" : ""}{formatCOP(item.gasto_a - item.gasto_b)}
                  <span className="text-xs text-muted font-normal ml-1">respecto al período anterior</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="card-footer flex justify-end">
          <button onClick={onClose} className="btn btn-primary">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
