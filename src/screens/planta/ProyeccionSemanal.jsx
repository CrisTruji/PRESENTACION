// ========================================
// ProyeccionSemanal.jsx — Jefe de Planta
// Replica la lógica de los archivos Excel (RESUMEN DIETAS + DESAYUNO DIETAS):
// Tab 1: Resumen Dietas por unidad y servicio
// Tab 2: Consolidado dietas (matriz dieta × unidad)
// Tab 3: Proyección semanal de materia prima
// Tab 4: Generar solicitud de compra para déficits
// ========================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart2, Table2, TrendingUp, ShoppingCart,
  RefreshCw, AlertTriangle, CheckCircle, Package,
  ChevronDown, ChevronUp, Plus, Minus, Send,
  Calendar, Building2, Utensils, Info,
} from 'lucide-react';
import { supabase } from '@/shared/api';
import { crearSolicitud, agregarItemsSolicitud } from '../../services/solicitudes';
import { getProveedores } from '../../services/proveedores';
import { useAuth } from '../../context/auth';
import notify from '../../utils/notifier';

// ── Promedios base (hardcodeados como punto de partida) ──
const PROMEDIOS_BASE = {
  'COORDINADORA': 170,
  'CARVAL': 65,
  'PRESENTES': 18,
  'IDIME': 120,
  'RED HUMANA': 35,
  'VIRREY SOLIS': 40,
  'ALCALA': 20,
  'EIREN': 80,
  'BRUNE': 25,
  'VENTAS': 70,
};

const HOY = new Date().toISOString().split('T')[0];
const SERVICIOS = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'cena', label: 'Cena' },
];

// ── Helper: formato número ──
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('es-CO', { maximumFractionDigits: 1 }) : '—');

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function ProyeccionSemanal() {
  const { user } = useAuth();
  const [tabActiva, setTabActiva] = useState('resumen');
  const [fecha, setFecha] = useState(HOY);
  const [servicio, setServicio] = useState('almuerzo');

  const tabs = [
    { key: 'resumen',     label: 'Resumen Dietas',     icon: Table2 },
    { key: 'consolidado', label: 'Consolidado Dietas',  icon: BarChart2 },
    { key: 'proyeccion',  label: 'Proyección Semanal',  icon: TrendingUp },
    { key: 'solicitud',   label: 'Generar Solicitud',   icon: ShoppingCart },
  ];

  return (
    <div className="min-h-content p-compact">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="section-header">
          <h1 className="section-title">Proyección de Materia Prima</h1>
          <p className="section-subtitle">
            Visualiza dietas por unidad, proyecta necesidades semanales y genera solicitudes de compra
          </p>
        </div>

        {/* Filtros globales */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="form-label flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Fecha
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5" /> Servicio
                </label>
                <select
                  value={servicio}
                  onChange={(e) => setServicio(e.target.value)}
                  className="form-input"
                >
                  {SERVICIOS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="card-header border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex gap-0 flex-wrap">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setTabActiva(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      tabActiva === tab.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-text-muted hover:text-primary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card-body">
            {tabActiva === 'resumen'     && <TabResumenDietas fecha={fecha} servicio={servicio} />}
            {tabActiva === 'consolidado' && <TabConsolidadoDietas fecha={fecha} servicio={servicio} />}
            {tabActiva === 'proyeccion'  && <TabProyeccionSemanal />}
            {tabActiva === 'solicitud'   && <TabGenerarSolicitud userId={user?.id} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// TAB 1 — RESUMEN DIETAS
// Muestra pedidos del día agrupados por unidad y componente
// (equivale a RESUMEN DIETAS.xlsx)
// ========================================
function TabResumenDietas({ fecha, servicio }) {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const { data, error } = await supabase
          .from('pedidos_servicio')
          .select(`
            id, estado, total_porciones,
            operaciones(id, nombre, codigo),
            pedido_items_servicio(
              id, cantidad,
              tipos_dieta(codigo, nombre, categoria),
              menu_componentes(
                id,
                componentes_plato(nombre, orden),
                arbol_recetas(nombre)
              )
            )
          `)
          .eq('fecha', fecha)
          .eq('servicio', servicio)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setPedidos(data || []);
      } catch (err) {
        console.error(err);
        notify.error('Error cargando pedidos');
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [fecha, servicio]);

  if (cargando) return <Spinner texto="Cargando pedidos..." />;

  if (pedidos.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-muted mx-auto mb-3 opacity-40" />
        <p className="text-muted font-medium">Sin pedidos para {fecha} — {servicio}</p>
        <p className="text-sm text-muted mt-1">Los coordinadores aún no han enviado pedidos para este servicio</p>
      </div>
    );
  }

  const totalPorciones = pedidos.reduce((s, p) => s + (p.total_porciones || 0), 0);

  return (
    <div className="space-y-6">
      {/* Resumen ejecutivo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stats-card">
          <div className="stats-icon bg-primary/10 text-primary"><Building2 className="w-5 h-5" /></div>
          <div className="stats-content">
            <div className="stats-value">{pedidos.length}</div>
            <div className="stats-label">Unidades</div>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon bg-success/10 text-success"><Utensils className="w-5 h-5" /></div>
          <div className="stats-content">
            <div className="stats-value">{fmt(totalPorciones)}</div>
            <div className="stats-label">Total porciones</div>
          </div>
        </div>
      </div>

      {/* Tabla por unidad */}
      {pedidos.map((pedido) => {
        const items = pedido.pedido_items_servicio || [];
        // Agrupar por componente
        const porComponente = {};
        for (const item of items) {
          const compNombre = item.menu_componentes?.componentes_plato?.nombre || 'Sin componente';
          const compOrden = item.menu_componentes?.componentes_plato?.orden || 99;
          const receta = item.menu_componentes?.arbol_recetas?.nombre || '—';
          if (!porComponente[compNombre]) {
            porComponente[compNombre] = { nombre: compNombre, orden: compOrden, receta, dietas: {}, total: 0 };
          }
          const codigoDieta = item.tipos_dieta?.codigo || '?';
          porComponente[compNombre].dietas[codigoDieta] = (porComponente[compNombre].dietas[codigoDieta] || 0) + (item.cantidad || 0);
          porComponente[compNombre].total += item.cantidad || 0;
        }
        const componentes = Object.values(porComponente).sort((a, b) => a.orden - b.orden);

        return (
          <div key={pedido.id} className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            {/* Cabecera unidad */}
            <div className="flex items-center justify-between px-4 py-3 bg-bg-surface">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="font-semibold text-primary">{pedido.operaciones?.nombre || 'Sin nombre'}</span>
                <span className="badge badge-primary text-xs">{pedido.estado}</span>
              </div>
              <span className="text-sm font-bold text-primary">{fmt(pedido.total_porciones)} porciones</span>
            </div>
            {/* Tabla componentes */}
            {componentes.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">Sin ítems</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="text-left px-4 py-2 text-text-muted font-semibold uppercase">Componente</th>
                    <th className="text-left px-4 py-2 text-text-muted font-semibold uppercase">Receta</th>
                    <th className="text-left px-4 py-2 text-text-muted font-semibold uppercase">Dietas</th>
                    <th className="text-right px-4 py-2 text-text-muted font-semibold uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {componentes.map((comp, i) => (
                    <tr key={i} className="border-t hover:bg-bg-surface transition-colors" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-4 py-2 font-semibold text-primary capitalize">{comp.nombre}</td>
                      <td className="px-4 py-2 text-text-secondary truncate max-w-[160px]">{comp.receta}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(comp.dietas).map(([cod, cant]) => (
                            <span key={cod} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">
                              {cod}: <strong>{cant}</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-primary">{comp.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ========================================
// TAB 2 — CONSOLIDADO DIETAS
// Matriz: filas = tipos_dieta, columnas = operaciones (unidades)
// (equivale a hoja "Consolidado" de DESAYUNO DIETAS.xlsx)
// ========================================
function TabConsolidadoDietas({ fecha, servicio }) {
  const [matriz, setMatriz] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const { data, error } = await supabase
          .from('pedidos_servicio')
          .select(`
            id,
            operaciones(nombre, codigo),
            pedido_items_servicio(
              cantidad,
              tipos_dieta(id, nombre, codigo)
            )
          `)
          .eq('fecha', fecha)
          .eq('servicio', servicio);

        if (error) throw error;

        // Construir matriz dieta × unidad
        const dietasMap = {};   // { dietaId: { id, nombre, codigo } }
        const unidadesMap = {}; // { opId: nombre }
        const celda = {};       // { "dietaId|opId": total }

        for (const pedido of data || []) {
          const opNombre = pedido.operaciones?.nombre || 'Sin unidad';
          const opId = pedido.operaciones?.codigo || pedido.id;
          unidadesMap[opId] = opNombre;

          for (const item of pedido.pedido_items_servicio || []) {
            const dieta = item.tipos_dieta;
            if (!dieta) continue;
            if (!dietasMap[dieta.id]) dietasMap[dieta.id] = dieta;
            const key = `${dieta.id}|${opId}`;
            celda[key] = (celda[key] || 0) + (item.cantidad || 0);
          }
        }

        setMatriz({ dietasMap, unidadesMap, celda });
      } catch (err) {
        console.error(err);
        notify.error('Error cargando consolidado');
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [fecha, servicio]);

  if (cargando) return <Spinner texto="Calculando consolidado..." />;
  if (!matriz) return null;

  const { dietasMap, unidadesMap, celda } = matriz;
  const dietas = Object.values(dietasMap).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const unidades = Object.entries(unidadesMap).sort((a, b) => a[1].localeCompare(b[1]));

  if (dietas.length === 0) {
    return (
      <div className="text-center py-12">
        <Table2 className="w-12 h-12 text-muted mx-auto mb-3 opacity-40" />
        <p className="text-muted font-medium">Sin datos para {fecha} — {servicio}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 bg-bg-surface text-left px-3 py-2.5 text-text-muted font-semibold uppercase border-b border-r z-10"
                style={{ borderColor: 'var(--color-border)' }}>
              Dieta
            </th>
            {unidades.map(([opId, nombre]) => (
              <th key={opId}
                  className="text-center px-2 py-2.5 text-text-muted font-semibold uppercase border-b"
                  style={{ borderColor: 'var(--color-border)', minWidth: '80px' }}>
                <span className="truncate block max-w-[80px]" title={nombre}>{nombre.split(' ')[0]}</span>
              </th>
            ))}
            <th className="text-right px-3 py-2.5 font-bold text-primary border-b border-l uppercase"
                style={{ borderColor: 'var(--color-border)' }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {dietas.map((dieta) => {
            const totalFila = unidades.reduce((s, [opId]) => s + (celda[`${dieta.id}|${opId}`] || 0), 0);
            return (
              <tr key={dieta.id} className="hover:bg-bg-surface transition-colors border-b"
                  style={{ borderColor: 'var(--color-border)' }}>
                <td className="sticky left-0 bg-bg-app px-3 py-2 font-semibold text-primary border-r"
                    style={{ borderColor: 'var(--color-border)' }}>
                  {dieta.nombre}
                </td>
                {unidades.map(([opId]) => {
                  const val = celda[`${dieta.id}|${opId}`] || 0;
                  return (
                    <td key={opId} className="text-center px-2 py-2 font-mono text-text-secondary">
                      {val > 0 ? <span className="font-semibold text-primary">{val}</span> : <span className="text-text-muted opacity-30">—</span>}
                    </td>
                  );
                })}
                <td className="text-right px-3 py-2 font-bold text-primary border-l"
                    style={{ borderColor: 'var(--color-border)' }}>
                  {totalFila || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t" style={{ borderColor: 'var(--color-border)' }}>
            <td className="sticky left-0 bg-bg-surface px-3 py-2.5 font-bold text-primary uppercase border-r"
                style={{ borderColor: 'var(--color-border)' }}>
              TOTAL
            </td>
            {unidades.map(([opId]) => {
              const totalCol = dietas.reduce((s, d) => s + (celda[`${d.id}|${opId}`] || 0), 0);
              return (
                <td key={opId} className="text-center px-2 py-2.5 font-bold text-primary">
                  {totalCol || '—'}
                </td>
              );
            })}
            <td className="text-right px-3 py-2.5 font-bold text-primary border-l"
                style={{ borderColor: 'var(--color-border)' }}>
              {dietas.reduce((s, d) => s + unidades.reduce((ss, [opId]) => ss + (celda[`${d.id}|${opId}`] || 0), 0), 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ========================================
// TAB 3 — PROYECCIÓN SEMANAL
// Calcula necesidades de MP para la semana basado en promedios
// ========================================
function TabProyeccionSemanal() {
  const [diasHabiles, setDiasHabiles] = useState(5);
  const [promediosReales, setPromediosReales] = useState({});
  const [stockMP, setStockMP] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [expandidos, setExpandidos] = useState({});

  // Calcular promedio real desde pedidos de los últimos 30 días
  useEffect(() => {
    async function calcularPromedios() {
      setCargando(true);
      try {
        const hace30Dias = new Date();
        hace30Dias.setDate(hace30Dias.getDate() - 30);
        const fechaInicio = hace30Dias.toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('pedidos_servicio')
          .select(`
            fecha,
            operaciones(nombre),
            pedido_items_servicio(cantidad)
          `)
          .gte('fecha', fechaInicio)
          .neq('estado', 'borrador');

        if (error) throw error;

        // Agrupar: por unidad, por fecha → total porciones ese día
        const porUnidadFecha = {};
        for (const pedido of data || []) {
          const unidad = pedido.operaciones?.nombre?.toUpperCase() || 'SIN UNIDAD';
          if (!porUnidadFecha[unidad]) porUnidadFecha[unidad] = {};
          const totalDia = (pedido.pedido_items_servicio || []).reduce((s, i) => s + (i.cantidad || 0), 0);
          if (!porUnidadFecha[unidad][pedido.fecha]) porUnidadFecha[unidad][pedido.fecha] = 0;
          porUnidadFecha[unidad][pedido.fecha] += totalDia;
        }

        // Calcular promedio diario por unidad
        const promedios = {};
        for (const [unidad, porFecha] of Object.entries(porUnidadFecha)) {
          const dias = Object.values(porFecha);
          if (dias.length >= 7) {
            promedios[unidad] = {
              valor: Math.round(dias.reduce((s, v) => s + v, 0) / dias.length),
              dias: dias.length,
              calculado: true,
            };
          }
        }
        setPromediosReales(promedios);

        // Stock de materia prima
        const { data: mp } = await supabase
          .from('arbol_materia_prima')
          .select('id, nombre, codigo, stock_actual, unidad_medida')
          .order('nombre');
        setStockMP(mp || []);
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    }
    calcularPromedios();
  }, []);

  // Mezclar promedios: real si ≥7 días, base si no
  const promediosFinales = useMemo(() => {
    const resultado = {};
    for (const [unidad, base] of Object.entries(PROMEDIOS_BASE)) {
      const real = promediosReales[unidad];
      if (real?.calculado) {
        resultado[unidad] = { valor: real.valor, dias: real.dias, calculado: true };
      } else {
        resultado[unidad] = { valor: base, dias: 0, calculado: false };
      }
    }
    return resultado;
  }, [promediosReales]);

  const totalDiario = useMemo(() =>
    Object.values(promediosFinales).reduce((s, p) => s + p.valor, 0)
  , [promediosFinales]);

  const totalSemanal = totalDiario * diasHabiles;

  if (cargando) return <Spinner texto="Calculando proyección..." />;

  return (
    <div className="space-y-6">
      {/* Selector días hábiles */}
      <div className="flex items-center gap-4 p-4 bg-bg-surface rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-sm font-medium text-text-secondary">Días hábiles en la semana:</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setDiasHabiles(d => Math.max(1, d - 1))}
                  className="btn btn-outline !py-1 !px-2"><Minus className="w-3.5 h-3.5" /></button>
          <span className="font-bold text-primary text-lg w-8 text-center">{diasHabiles}</span>
          <button onClick={() => setDiasHabiles(d => Math.min(7, d + 1))}
                  className="btn btn-outline !py-1 !px-2"><Plus className="w-3.5 h-3.5" /></button>
        </div>
        <div className="ml-auto text-sm text-text-muted">
          Total estimado: <span className="font-bold text-primary text-base">{fmt(totalSemanal)}</span> porciones/semana
        </div>
      </div>

      {/* Tabla promedios por unidad */}
      <div>
        <h3 className="text-sm font-semibold text-primary mb-3">Proyección por unidad</h3>
        <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-surface border-b" style={{ borderColor: 'var(--color-border)' }}>
                <th className="text-left px-4 py-2.5 text-text-muted font-semibold uppercase text-xs">Unidad</th>
                <th className="text-right px-4 py-2.5 text-text-muted font-semibold uppercase text-xs">Prom. diario</th>
                <th className="text-right px-4 py-2.5 text-text-muted font-semibold uppercase text-xs">× {diasHabiles} días</th>
                <th className="text-center px-4 py-2.5 text-text-muted font-semibold uppercase text-xs">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(promediosFinales).map(([unidad, data]) => (
                <tr key={unidad} className="border-b hover:bg-bg-surface transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-4 py-2.5 font-semibold text-primary">{unidad}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">{fmt(data.valor)}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-primary">{fmt(data.valor * diasHabiles)}</td>
                  <td className="px-4 py-2.5 text-center">
                    {data.calculado ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-success/10 text-success font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Calculado ({data.dias} días)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-warning/10 text-warning font-medium">
                        <Info className="w-3 h-3" />
                        Estimado
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                <td className="px-4 py-2.5 font-bold text-primary uppercase text-xs">Total</td>
                <td className="px-4 py-2.5 text-right font-bold text-primary">{fmt(totalDiario)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-primary">{fmt(totalSemanal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Stock de materia prima */}
      {stockMP.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary">Estado de Stock — Materia Prima</h3>
            <span className="text-xs text-text-muted">{stockMP.length} ingredientes</span>
          </div>
          <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-bg-surface border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="text-left px-4 py-2.5 text-text-muted font-semibold uppercase">Ingrediente</th>
                  <th className="text-right px-4 py-2.5 text-text-muted font-semibold uppercase">Stock actual</th>
                  <th className="text-center px-4 py-2.5 text-text-muted font-semibold uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {stockMP.slice(0, 20).map((mp) => (
                  <tr key={mp.id} className="border-b hover:bg-bg-surface transition-colors"
                      style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-2 font-medium text-primary">
                      {mp.nombre}
                      <span className="text-text-muted ml-1 font-normal">({mp.codigo})</span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {fmt(mp.stock_actual)} <span className="text-text-muted">{mp.unidad_medida}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {mp.stock_actual > 0 ? (
                        <CheckCircle className="w-4 h-4 text-success inline" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-error inline" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stockMP.length > 20 && (
              <p className="px-4 py-2 text-xs text-text-muted text-center border-t"
                 style={{ borderColor: 'var(--color-border)' }}>
                Mostrando 20 de {stockMP.length} ingredientes
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// TAB 4 — GENERAR SOLICITUD DE COMPRA
// Lista ingredientes con déficit y permite editar cantidades
// antes de generar la solicitud
// ========================================
function TabGenerarSolicitud({ userId }) {
  const [mpConStock, setMpConStock] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cantidades, setCantidades] = useState({});
  const [proveedorPorItem, setProveedorPorItem] = useState({});
  const [proveedorGlobal, setProveedorGlobal] = useState('');
  const [unidadMedica, setUnidadMedica] = useState('0001');
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const [{ data: mp }, provsData] = await Promise.all([
          supabase.from('arbol_materia_prima')
            .select('id, nombre, codigo, stock_actual, stock_minimo, unidad_medida')
            .order('nombre'),
          getProveedores(),
        ]);
        setMpConStock(mp || []);
        setProveedores(provsData?.data || provsData || []);

        // Inicializar cantidades con la diferencia stock_minimo - stock_actual
        const cants = {};
        for (const item of mp || []) {
          const deficit = (item.stock_minimo || 0) - (item.stock_actual || 0);
          if (deficit > 0) cants[item.id] = Math.ceil(deficit);
        }
        setCantidades(cants);
      } catch (err) {
        console.error(err);
        notify.error('Error cargando datos');
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  // Items con déficit (stock_actual < stock_minimo) o seleccionados manualmente
  const itemsDeficit = useMemo(() =>
    mpConStock.filter((mp) => (mp.stock_actual || 0) < (mp.stock_minimo || 0))
  , [mpConStock]);

  // Items incluidos en solicitud (los que tienen cantidad > 0)
  const itemsSeleccionados = useMemo(() => {
    return mpConStock.filter((mp) => (cantidades[mp.id] || 0) > 0);
  }, [mpConStock, cantidades]);

  const handleCantidad = (id, valor) => {
    setCantidades((prev) => ({ ...prev, [id]: Number(valor) || 0 }));
  };

  const handleEnviar = async () => {
    if (!proveedorGlobal) {
      notify.error('Selecciona un proveedor para la solicitud');
      return;
    }
    if (itemsSeleccionados.length === 0) {
      notify.error('No hay ítems con cantidad > 0');
      return;
    }

    setEnviando(true);
    try {
      const solicitud = await crearSolicitud({
        proveedor_id: Number(proveedorGlobal),
        codigo_unidad: unidadMedica,
        created_by: userId,
        observaciones: 'Generado automáticamente desde Proyección Semanal',
      });

      const items = itemsSeleccionados.map((mp) => ({
        presentacion_id: null,
        producto_arbol_id: mp.id,
        nombre: mp.nombre,
        categoria: 'Materia Prima',
        cantidad_solicitada: cantidades[mp.id],
        unidad: mp.unidad_medida || 'kg',
      }));

      await agregarItemsSolicitud(solicitud.id, items);
      notify.success(`Solicitud #${solicitud.id} creada con ${items.length} ítems`);

      // Resetear cantidades
      const cants = {};
      for (const item of mpConStock) {
        const deficit = (item.stock_minimo || 0) - (item.stock_actual || 0);
        if (deficit > 0) cants[item.id] = Math.ceil(deficit);
      }
      setCantidades(cants);
    } catch (err) {
      console.error(err);
      notify.error('Error creando solicitud: ' + (err.message || 'intente de nuevo'));
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <Spinner texto="Cargando stock y proveedores..." />;

  return (
    <div className="space-y-6">
      {/* Configuración de solicitud */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-bg-surface rounded-xl border"
           style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <label className="form-label">Proveedor para la solicitud</label>
          <select
            value={proveedorGlobal}
            onChange={(e) => setProveedorGlobal(e.target.value)}
            className="form-input w-full"
          >
            <option value="">Seleccionar proveedor...</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Código unidad médica</label>
          <input
            type="text"
            value={unidadMedica}
            onChange={(e) => setUnidadMedica(e.target.value)}
            className="form-input w-full"
            placeholder="ej: 0001"
          />
        </div>
      </div>

      {/* Resumen */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-text-muted">
          <span className="font-bold text-error">{itemsDeficit.length}</span> ítems con déficit de stock
        </span>
        <span className="text-text-muted">·</span>
        <span className="text-text-muted">
          <span className="font-bold text-primary">{itemsSeleccionados.length}</span> seleccionados para solicitar
        </span>
      </div>

      {/* Tabla ítems */}
      {mpConStock.length === 0 ? (
        <div className="text-center py-10">
          <Package className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
          <p className="text-muted">No hay datos de materia prima</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-bg-surface border-b" style={{ borderColor: 'var(--color-border)' }}>
                <th className="text-left px-4 py-2.5 text-text-muted font-semibold uppercase">Ingrediente</th>
                <th className="text-right px-4 py-2.5 text-text-muted font-semibold uppercase">Stock actual</th>
                <th className="text-right px-4 py-2.5 text-text-muted font-semibold uppercase">Stock mínimo</th>
                <th className="text-right px-4 py-2.5 text-text-muted font-semibold uppercase">Déficit</th>
                <th className="text-center px-4 py-2.5 text-text-muted font-semibold uppercase">Cantidad a pedir</th>
              </tr>
            </thead>
            <tbody>
              {mpConStock
                .filter((mp) => {
                  const deficit = (mp.stock_minimo || 0) - (mp.stock_actual || 0);
                  return deficit > 0 || (cantidades[mp.id] || 0) > 0;
                })
                .map((mp) => {
                  const deficit = Math.max(0, (mp.stock_minimo || 0) - (mp.stock_actual || 0));
                  return (
                    <tr key={mp.id}
                        className={`border-b hover:bg-bg-surface transition-colors ${deficit > 0 ? 'bg-error/5' : ''}`}
                        style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-4 py-2.5 font-semibold text-primary">
                        {mp.nombre}
                        <span className="text-text-muted ml-1 font-normal">({mp.unidad_medida})</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{fmt(mp.stock_actual)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-text-secondary">{fmt(mp.stock_minimo) || '—'}</td>
                      <td className={`px-4 py-2.5 text-right font-bold font-mono ${deficit > 0 ? 'text-error' : 'text-success'}`}>
                        {deficit > 0 ? `-${fmt(deficit)}` : '✓'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={cantidades[mp.id] || ''}
                          onChange={(e) => handleCantidad(mp.id, e.target.value)}
                          className="form-input !py-1 !px-2 text-center w-24 text-xs"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {mpConStock.filter((mp) => {
            const deficit = (mp.stock_minimo || 0) - (mp.stock_actual || 0);
            return deficit > 0 || (cantidades[mp.id] || 0) > 0;
          }).length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
              <p className="text-success font-medium">¡Todo el stock está en niveles correctos!</p>
              <p className="text-sm text-text-muted mt-1">No hay déficits de stock en este momento.</p>
            </div>
          )}
        </div>
      )}

      {/* Botón generar */}
      {itemsSeleccionados.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleEnviar}
            disabled={enviando || !proveedorGlobal}
            className="btn btn-primary flex items-center gap-2"
          >
            {enviando ? (
              <><div className="spinner spinner-sm" /><span>Generando...</span></>
            ) : (
              <><Send className="w-4 h-4" /><span>Generar Solicitud ({itemsSeleccionados.length} ítems)</span></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Spinner helper ──
function Spinner({ texto }) {
  return (
    <div className="py-12 text-center">
      <div className="spinner spinner-sm mx-auto mb-3" />
      <p className="text-sm text-text-muted">{texto}</p>
    </div>
  );
}
