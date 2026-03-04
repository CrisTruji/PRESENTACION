// ========================================
// DashboardGerencia — Vista ejecutiva para el rol administrador
// Diseño: métricas grandes → gráficas → desglose bajo demanda
// Librerías: recharts (ya disponible en el proyecto)
// ========================================
import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, AlertTriangle, AlertCircle,
  Info, DollarSign, Package, ShoppingCart, BarChart3,
  ChevronDown, ChevronUp, RefreshCw, Minus,
} from 'lucide-react';
import { useGerenciaData } from '../hooks/useGerenciaData';
import { useRouter } from '@/router';

// ── Helpers de formato ────────────────────────────────────

function fmtCOP(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function fmtCOPFull(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n || 0);
}

// ── Colores coherentes con el design system ──────────────

const C = {
  primary:  'var(--color-primary)',
  success:  'var(--color-success, #22c55e)',
  warning:  'var(--color-warning, #f59e0b)',
  error:    'var(--color-error, #ef4444)',
  muted:    'var(--color-text-muted)',
  gasto:    '#6366f1',   // índigo — gasto real
  presup:   '#94a3b8',   // slate  — presupuesto
};

const PIE_COLORS = {
  normal:  '#22c55e',
  bajo:    '#f59e0b',
  agotado: '#ef4444',
  exceso:  '#6366f1',
};

// ── Tooltip personalizado (reutilizable) ─────────────────

// Estilo base compartido para todos los tooltips.
// La animación de escala reemplaza el deslizamiento lateral de Recharts:
// aparece muy pequeño y crece hasta el tamaño final.
// Recharts mueve el tooltip con CSS transition en su wrapper interno.
// isAnimationActive={false} en <Tooltip> desactiva ese movimiento.
// El wrapper tiene `transition: none` via CSS global (ver style.css).
const tooltipStyle = {
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 4px 18px rgba(0,0,0,0.15)',
  animation: 'tooltipPop 0.16s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
  transformOrigin: 'top center',
};

function TooltipMoneda({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <p style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', fontSize: '0.78rem', color: p.color }}>
          {p.name}: {fmtCOPFull(p.value)}
        </p>
      ))}
    </div>
  );
}

function TooltipPorcentaje({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={tooltipStyle}>
      <p style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>
        {p.name}: {p.value} productos
      </p>
    </div>
  );
}

// ── Tarjeta KPI grande ────────────────────────────────────

function KPICard({ label, value, subtext, icon, color = C.primary, alert = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card p-5 ${alert ? 'ring-1 ring-error/40' : ''} ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      style={{ transition: 'box-shadow 0.2s' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div style={{ flex: 1 }}>
          <p className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold" style={{ color: alert ? C.error : 'var(--color-text-primary)' }}>
            {value}
          </p>
          {subtext && <p className="text-xs text-muted mt-1">{subtext}</p>}
        </div>
        <div
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: alert ? 'rgba(239,68,68,0.1)' : `color-mix(in srgb, ${color} 12%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: alert ? C.error : color,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Alerta banner ─────────────────────────────────────────

function AlertaBanner({ tipo, texto }) {
  const cfg = {
    error:   { bg: 'bg-error/10 border-error/30',   icon: <AlertCircle  size={16} className="text-error"   />, text: 'text-error'   },
    warning: { bg: 'bg-warning/10 border-warning/30', icon: <AlertTriangle size={16} className="text-warning" />, text: 'text-warning' },
    info:    { bg: 'bg-primary/10 border-primary/30', icon: <Info          size={16} className="text-primary" />, text: 'text-primary' },
  }[tipo] || {};
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.icon}
      {texto}
    </div>
  );
}

// ── Sección con desglose colapsable ──────────────────────

function Seccion({ titulo, subtitulo, children, desglose, labelDesglose = 'Ver detalle', onIr }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-primary">{titulo}</h3>
            {subtitulo && <p className="text-xs text-muted mt-0.5">{subtitulo}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {onIr && (
              <button
                onClick={onIr}
                className="btn btn-outline text-xs !py-1 !px-3"
              >
                Ir al módulo →
              </button>
            )}
            {desglose && (
              <button
                onClick={() => setAbierto(v => !v)}
                className="btn btn-outline text-xs !py-1 !px-3 flex items-center gap-1"
              >
                {abierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {abierto ? 'Ocultar' : labelDesglose}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="card-body">
        {children}
        {desglose && abierto && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            {desglose}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Vista principal ───────────────────────────────────────

export default function DashboardGerencia() {
  const { navigate } = useRouter();
  const {
    isLoading, gastosPorMes, distInventario,
    costos, solicitudes, alertas, pctPresupuesto, mesActual,
  } = useGerenciaData();

  // ── Loading ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-content bg-app">
        <div className="page-container">
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-4" />
              <p className="text-muted">Cargando resumen gerencial…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Datos calculados para las KPIs ─────────────────────
  const mesLabel  = gastosPorMes[gastosPorMes.length - 1]?.label || '';
  const gastoMes  = mesActual?.gasto  || 0;
  const presupMes = mesActual?.presupuesto || 0;
  const disponible = presupMes - gastoMes;

  const totalSolicitudes = Object.values(solicitudes).reduce((s, v) => s + v, 0);
  const solicPendientes  = (solicitudes['pendiente'] || 0) + (solicitudes['revision_aux'] || 0);

  const pierData = [
    { name: 'Normal',  value: distInventario.normal  },
    { name: 'Bajo',    value: distInventario.bajo    },
    { name: 'Agotado', value: distInventario.agotado },
    { name: 'Exceso',  value: distInventario.exceso  },
  ].filter(d => d.value > 0);

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="min-h-content bg-app">
      <div className="page-container" style={{ maxWidth: 1200 }}>

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="section-header">
              <h1 className="section-title flex items-center gap-2">
                <BarChart3 size={24} className="text-primary" />
                Resumen Gerencial
              </h1>
              <p className="section-subtitle">
                Visión consolidada del negocio — últimos 6 meses
              </p>
            </div>
          </div>
        </div>

        {/* ── Alertas ── */}
        {alertas.length > 0 && (
          <div className="flex flex-col gap-2 mb-6">
            {alertas.map((a, i) => <AlertaBanner key={i} tipo={a.tipo} texto={a.texto} />)}
          </div>
        )}

        {/* ── KPIs grandes ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KPICard
            label={`Gasto ${mesLabel}`}
            value={fmtCOP(gastoMes)}
            subtext="Facturas del mes actual"
            icon={<DollarSign size={20} />}
            color={C.gasto}
            onClick={() => navigate('presupuesto')}
          />
          <KPICard
            label="Presupuesto disponible"
            value={fmtCOP(Math.abs(disponible))}
            subtext={disponible < 0 ? '⚠ Excedido' : `${pctPresupuesto ?? '—'}% utilizado`}
            icon={pctPresupuesto >= 80 ? <AlertTriangle size={20} /> : <TrendingDown size={20} />}
            color={pctPresupuesto >= 80 ? C.error : C.success}
            alert={pctPresupuesto >= 80}
            onClick={() => navigate('presupuesto')}
          />
          <KPICard
            label="Valor inventario"
            value={fmtCOP(distInventario.valorTotal)}
            subtext={`${distInventario.agotado} agotados · ${distInventario.bajo} bajo mínimo`}
            icon={<Package size={20} />}
            color={distInventario.agotado > 0 ? C.error : C.success}
            alert={distInventario.agotado > 0}
            onClick={() => navigate('inventario')}
          />
          <KPICard
            label="Solicitudes pendientes"
            value={solicPendientes}
            subtext={`${totalSolicitudes} totales en sistema`}
            icon={<ShoppingCart size={20} />}
            color={solicPendientes > 5 ? C.warning : C.primary}
            onClick={() => navigate('gestion_aux')}
          />
        </div>

        {/* ── Gráfica 1: Gasto vs Presupuesto (6 meses) ── */}
        <div className="mb-6">
          <Seccion
            titulo="Gasto real vs Presupuesto"
            subtitulo="Comparativo mensual de los últimos 6 meses"
            labelDesglose="Ver tabla de meses"
            onIr={() => navigate('presupuesto')}
            desglose={
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Mes</th>
                      <th className="table-header-cell text-right">Presupuesto</th>
                      <th className="table-header-cell text-right">Gasto real</th>
                      <th className="table-header-cell text-right">Diferencia</th>
                      <th className="table-header-cell text-right">% Uso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastosPorMes.map(m => {
                      const diff = m.presupuesto - m.gasto;
                      const pct  = m.presupuesto > 0 ? Math.round((m.gasto / m.presupuesto) * 100) : null;
                      return (
                        <tr key={m.mes} className="table-row">
                          <td className="table-cell font-medium">{m.label}</td>
                          <td className="table-cell text-right text-muted">{fmtCOPFull(m.presupuesto)}</td>
                          <td className="table-cell text-right font-semibold">{fmtCOPFull(m.gasto)}</td>
                          <td className="table-cell text-right">
                            <span style={{ color: diff >= 0 ? C.success : C.error, fontWeight: 600 }}>
                              {diff >= 0 ? '+' : ''}{fmtCOPFull(diff)}
                            </span>
                          </td>
                          <td className="table-cell text-right">
                            {pct != null
                              ? <span style={{ color: pct >= 90 ? C.error : pct >= 70 ? C.warning : C.success }}>{pct}%</span>
                              : <span className="text-muted">—</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={gastosPorMes} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtCOP(v)} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<TooltipMoneda />} isAnimationActive={false} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="presupuesto" name="Presupuesto" fill={C.presup} radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="gasto"       name="Gasto real"  fill={C.gasto}  radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </Seccion>
        </div>

        {/* ── Fila 2: Inventario + Costos ingredientes ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* Distribución de inventario (pastel) */}
          <Seccion
            titulo="Estado del inventario"
            subtitulo="Distribución actual por nivel de stock"
            onIr={() => navigate('inventario')}
            labelDesglose="Ver productos críticos"
            desglose={
              <div className="space-y-2">
                {[
                  { key: 'agotado', label: 'Agotados',   color: PIE_COLORS.agotado },
                  { key: 'bajo',    label: 'Bajo mínimo', color: PIE_COLORS.bajo   },
                  { key: 'exceso',  label: 'Exceso',      color: PIE_COLORS.exceso },
                  { key: 'normal',  label: 'Normal',      color: PIE_COLORS.normal },
                ].map(cat => (
                  <div key={cat.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color }} />
                      <span style={{ fontSize: '0.83rem', color: 'var(--color-text-secondary)' }}>{cat.label}</span>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.83rem', color: cat.color }}>
                      {distInventario[cat.key]} productos
                    </span>
                  </div>
                ))}
              </div>
            }
          >
            {pierData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pierData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {pierData.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[entry.name.toLowerCase()] || C.primary} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipPorcentaje />} isAnimationActive={false} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p className="text-muted text-sm">Sin datos de inventario</p>
              </div>
            )}
          </Seccion>

          {/* Top ingredientes por gasto (barras horizontales) */}
          <Seccion
            titulo="Top ingredientes por gasto"
            subtitulo="Mes actual — mayor impacto en costos"
            onIr={() => navigate('analisis_costos')}
            labelDesglose="Ver variaciones de precio"
            desglose={
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Ingrediente</th>
                      <th className="table-header-cell text-right">Gasto mes</th>
                      <th className="table-header-cell text-right">Var. precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costos.map((c, i) => (
                      <tr key={i} className="table-row">
                        <td className="table-cell text-sm font-medium">{c.nombre}</td>
                        <td className="table-cell text-right">{fmtCOPFull(c.gastoMes)}</td>
                        <td className="table-cell text-right">
                          {c.var_pct != null ? (
                            <span style={{ color: c.var_pct > 0 ? C.error : C.success, fontWeight: 600, fontSize: '0.8rem' }}>
                              {c.var_pct > 0 ? '+' : ''}{c.var_pct.toFixed(1)}%
                            </span>
                          ) : <span className="text-muted text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                    {costos.length === 0 && (
                      <tr><td colSpan={3} className="table-cell text-center text-muted py-6">Sin compras registradas este mes</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            }
          >
            {costos.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={costos.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fmtCOP(v)} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nombre" width={90} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v.length > 12 ? v.slice(0, 12) + '…' : v}
                  />
                  <Tooltip content={<TooltipMoneda />} isAnimationActive={false} />
                  <Bar dataKey="gastoMes" name="Gasto" fill={C.gasto} radius={[0, 4, 4, 0]} maxBarSize={22}
                    label={({ x, y, width, height, value }) => (
                      <text x={x + width + 4} y={y + height / 2 + 4} fontSize={9} fill="var(--color-text-muted)">{fmtCOP(value)}</text>
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p className="text-muted text-sm">Sin compras registradas este mes</p>
              </div>
            )}
          </Seccion>
        </div>

        {/* ── Gráfica 3: Tendencia de gasto (línea) ── */}
        <div className="mb-6">
          <Seccion
            titulo="Tendencia de gasto"
            subtitulo="Evolución mes a mes — gasto real vs presupuesto"
          >
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={gastosPorMes} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtCOP(v)} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<TooltipMoneda />} isAnimationActive={false} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="presupuesto" name="Presupuesto" stroke={C.presup} strokeWidth={2} strokeDasharray="5 4" dot={false} />
                <Line type="monotone" dataKey="gasto"       name="Gasto real"  stroke={C.gasto}  strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </Seccion>
        </div>

        {/* ── Embudo de solicitudes ── */}
        <div className="mb-6">
          <Seccion
            titulo="Estado de solicitudes"
            subtitulo="Distribución actual de todas las solicitudes en el sistema"
            onIr={() => navigate('gestion_aux')}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: ['pendiente', 'revision_aux'],          label: 'En revisión',  color: C.warning },
                { key: ['aprobado_auxiliar', 'en_proceso'],    label: 'Aprobadas',    color: C.primary },
                { key: ['comprado', 'completado'],             label: 'Completadas',  color: C.success },
                { key: ['rechazado', 'rechazado_auxiliar'],    label: 'Rechazadas',   color: C.error   },
              ].map(grupo => {
                const total = grupo.key.reduce((s, k) => s + (solicitudes[k] || 0), 0);
                return (
                  <div key={grupo.label} className="card p-4 text-center">
                    <p style={{ fontSize: '2rem', fontWeight: 700, color: grupo.color }}>{total}</p>
                    <p className="text-xs text-muted mt-1">{grupo.label}</p>
                  </div>
                );
              })}
            </div>
          </Seccion>
        </div>

      </div>
    </div>
  );
}
