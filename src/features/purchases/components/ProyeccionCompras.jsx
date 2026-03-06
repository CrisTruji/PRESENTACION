// ========================================
// ProyeccionCompras
// Pantalla de proyección automática de compras
// basada en ciclos de menú activos vs. stock actual
// ========================================

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ShoppingCart, TrendingUp, Download, RefreshCw, Info } from 'lucide-react';
import { useProyeccionCompras } from '../hooks/useProyeccionCompras';
import { useRouter } from '@/router';

// ── Configuración de días ──────────────────────────────────────
const OPCIONES_DIAS = [
  { value: 7,  label: '7 días' },
  { value: 14, label: '14 días' },
  { value: 30, label: '30 días' },
];

// ── Meta de prioridad ─────────────────────────────────────────
const PRIORIDAD_META = {
  critico: {
    label: 'Crítico',
    badge: 'bg-error/15 text-error border border-error/30',
    row:   'bg-error/5',
    icon:  AlertTriangle,
  },
  bajo: {
    label: 'Bajo',
    badge: 'bg-warning/15 text-warning border border-warning/30',
    row:   'bg-warning/5',
    icon:  AlertTriangle,
  },
  ok: {
    label: 'Ok',
    badge: 'bg-success/15 text-success border border-success/30',
    row:   '',
    icon:  CheckCircle,
  },
};

// ── Exportar a CSV ────────────────────────────────────────────
function exportarCSV(datos, diasAdelante) {
  const encabezados = [
    'Código', 'Nombre', 'Unidad', 'Necesario', 'Stock actual',
    'Déficit', 'Costo estimado (COP)', 'Prioridad', 'Fuente',
  ];
  const filas = datos.map((r) => [
    r.codigo,
    r.nombre,
    r.unidad_medida,
    r.cantidad_requerida,
    r.stock_actual,
    r.deficit,
    r.costo_estimado,
    r.prioridad,
    r.fuente === 'menu' ? 'Ciclo de menú' : 'Stock mínimo',
  ]);

  const csv = [encabezados, ...filas]
    .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `proyeccion-compras-${diasAdelante}dias.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Componente principal ──────────────────────────────────────
export default function ProyeccionCompras() {
  const [diasAdelante, setDiasAdelante] = useState(7);
  const { navigate } = useRouter();
  const { data: items = [], isLoading, isFetching, refetch } = useProyeccionCompras(diasAdelante);

  // Stats
  const criticos    = items.filter((r) => r.prioridad === 'critico');
  const bajos       = items.filter((r) => r.prioridad === 'bajo');
  const oks         = items.filter((r) => r.prioridad === 'ok');
  const costoTotal  = items.reduce((s, r) => s + parseFloat(r.costo_estimado || 0), 0);
  const conDeficit  = items.filter((r) => parseFloat(r.deficit) < 0);

  // Formato moneda COP
  const formatCOP = (n) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  // Formato cantidad
  const formatCant = (n) =>
    parseFloat(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-primary">Proyección de Compras</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Ingredientes necesarios según ciclos de menú activos vs. stock disponible
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de días */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
            {OPCIONES_DIAS.map((op) => (
              <button
                key={op.value}
                onClick={() => setDiasAdelante(op.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  diasAdelante === op.value
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-bg-app'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>

          {/* Botón refrescar */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-bg-app transition-colors border"
            style={{ borderColor: 'var(--color-border)' }}
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          {/* Exportar CSV */}
          <button
            onClick={() => exportarCSV(items, diasAdelante)}
            disabled={items.length === 0}
            className="btn btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* ── Tarjetas de estadísticas ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Críticos"
          value={criticos.length}
          color="error"
          icon={AlertTriangle}
          desc="sin stock o < 20% del necesario"
        />
        <StatCard
          label="Stock bajo"
          value={bajos.length}
          color="warning"
          icon={AlertTriangle}
          desc="entre 20% y 100% del necesario"
        />
        <StatCard
          label="Suficiente"
          value={oks.length}
          color="success"
          icon={CheckCircle}
          desc="stock cubre la proyección"
        />
        <StatCard
          label="Costo estimado"
          value={formatCOP(costoTotal)}
          color="primary"
          icon={TrendingUp}
          desc="para cubrir el déficit total"
          small
        />
      </div>

      {/* ── Tabla ── */}
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>

        {/* Cabecera de tabla */}
        <div
          className="px-4 py-2.5 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-app)' }}
        >
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
            {isLoading ? 'Calculando…' : `${items.length} ingredientes — ${conDeficit.length} con déficit`}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Info className="w-3.5 h-3.5" />
            Proyección para los próximos {diasAdelante} días
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <div className="spinner spinner-lg mx-auto mb-3" />
            <p className="text-sm text-text-muted">Calculando necesidades desde ciclos de menú…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle className="w-10 h-10 text-success mx-auto mb-3 opacity-60" />
            <p className="text-sm font-semibold text-text-secondary">
              Sin ingredientes con déficit proyectado
            </p>
            <p className="text-xs text-text-muted mt-1">
              El stock actual cubre todos los ingredientes del menú para los próximos {diasAdelante} días
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-app)' }}>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted w-24">Prioridad</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Ingrediente</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted w-20">Unidad</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted w-28">Necesario</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted w-28">En stock</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted w-28">Déficit</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted w-36">Costo est.</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-text-muted w-24">Fuente</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const meta        = PRIORIDAD_META[item.prioridad] || PRIORIDAD_META.ok;
                  const Icon        = meta.icon;
                  const tieneDeficit = parseFloat(item.deficit) < 0;

                  return (
                    <tr
                      key={item.materia_prima_id}
                      className={`border-b transition-colors hover:bg-bg-app/60 ${meta.row}`}
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      {/* Prioridad */}
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </span>
                      </td>

                      {/* Ingrediente */}
                      <td className="px-4 py-2.5">
                        <p className="text-sm font-medium text-primary truncate max-w-[260px]">{item.nombre}</p>
                        <p className="text-xs text-text-muted font-mono">{item.codigo}</p>
                      </td>

                      {/* Unidad */}
                      <td className="px-4 py-2.5 text-right text-xs text-text-muted font-mono">
                        {item.unidad_medida}
                      </td>

                      {/* Necesario */}
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-primary">
                        {formatCant(item.cantidad_requerida)}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-text-secondary">
                        {formatCant(item.stock_actual)}
                      </td>

                      {/* Déficit */}
                      <td className={`px-4 py-2.5 text-right font-mono text-sm font-semibold ${
                        tieneDeficit ? 'text-error' : 'text-success'
                      }`}>
                        {tieneDeficit ? '' : '+'}{formatCant(item.deficit)}
                      </td>

                      {/* Costo estimado */}
                      <td className="px-4 py-2.5 text-right text-sm text-text-secondary">
                        {parseFloat(item.costo_estimado) > 0
                          ? formatCOP(item.costo_estimado)
                          : <span className="text-text-muted text-xs">—</span>
                        }
                      </td>

                      {/* Fuente */}
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          item.fuente === 'menu'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-bg-app text-text-muted border'
                        }`}
                          style={item.fuente !== 'menu' ? { borderColor: 'var(--color-border)' } : {}}
                          title={item.fuente === 'menu' ? 'Calculado desde ciclo de menú' : 'Stock por debajo del mínimo'}
                        >
                          {item.fuente === 'menu' ? 'Menú' : 'Stock min.'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer CTA ── */}
      {items.length > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl border bg-primary/5"
             style={{ borderColor: 'var(--color-primary-muted, rgba(var(--color-primary-rgb,0,100,200),0.2))' }}>
          <div>
            <p className="text-sm font-semibold text-primary">
              {conDeficit.length > 0
                ? `${conDeficit.length} ingrediente${conDeficit.length > 1 ? 's' : ''} requieren reposición`
                : 'Stock suficiente para todos los ingredientes'
              }
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Crea una solicitud de compra seleccionando los ingredientes con déficit
            </p>
          </div>
          <button
            onClick={() => navigate('crear_solicitud')}
            className="btn btn-primary text-sm py-2 px-4 flex items-center gap-2 flex-shrink-0"
          >
            <ShoppingCart className="w-4 h-4" />
            Crear solicitud
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sub-componente StatCard ───────────────────────────────────
function StatCard({ label, value, color, icon: Icon, desc, small = false }) {
  const colors = {
    error:   { bg: 'bg-error/10',   border: 'border-error/20',   text: 'text-error',   icon: 'text-error' },
    warning: { bg: 'bg-warning/10', border: 'border-warning/20', text: 'text-warning', icon: 'text-warning' },
    success: { bg: 'bg-success/10', border: 'border-success/20', text: 'text-success', icon: 'text-success' },
    primary: { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary', icon: 'text-primary' },
  };
  const c = colors[color] || colors.primary;

  return (
    <div className={`rounded-xl p-4 border ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${c.icon}`} />
        <span className="text-xs text-text-muted font-medium">{label}</span>
      </div>
      <p className={`font-bold ${small ? 'text-base' : 'text-2xl'} ${c.text}`}>{value}</p>
      {desc && <p className="text-xs text-text-muted mt-0.5 leading-tight">{desc}</p>}
    </div>
  );
}
