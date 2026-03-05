// src/features/admin/components/CostosPorUnidad.jsx
// Pantalla "Costos por Unidad" — muestra raciones y costo estimado
// por operación y servicio para un mes seleccionado.

import React, { useState, useMemo } from 'react';
import {
  Building2, Calendar, Utensils, TrendingUp,
  Info, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useCostosPorUnidad } from '../hooks/useCostosPorUnidad';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function mesARango(mes) {
  // 'YYYY-MM' → { inicio: 'YYYY-MM-01', fin: 'YYYY-MM-DD (último día)' }
  const [y, m] = mes.split('-').map(Number);
  const ultimo = new Date(y, m, 0).getDate(); // día 0 del mes siguiente = último del actual
  return {
    inicio: `${mes}-01`,
    fin:    `${mes}-${String(ultimo).padStart(2, '0')}`,
  };
}

const SERVICIO_LABEL = {
  desayuno:    'Desayuno',
  almuerzo:    'Almuerzo',
  cena:        'Cena',
  cena_ligera: 'Cena ligera',
  nueves:      'Nueves',
  onces:       'Onces',
};

function fmtRaciones(n) {
  return Number(n || 0).toLocaleString('es-CO');
}

function fmtMoney(n) {
  const num = Number(n || 0);
  if (num === 0) return '—';
  return '$' + num.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

// ── Subcomponente: fila agrupada por operación ────────────────────────────

function FilaOperacion({ nombre, filas }) {
  const [expandido, setExpandido] = useState(true);
  const totalRaciones = filas.reduce((s, f) => s + Number(f.total_raciones || 0), 0);
  const totalCosto    = filas.reduce((s, f) => s + Number(f.costo_estimado || 0), 0);
  const tieneCosto    = totalCosto > 0;

  return (
    <>
      {/* Fila de encabezado de operación */}
      <tr
        className="cursor-pointer hover:bg-primary/5 transition-colors border-b font-semibold"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
        onClick={() => setExpandido(!expandido)}
      >
        <td className="px-4 py-2 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          {expandido ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          <Building2 className="w-4 h-4 text-primary" />
          {nombre}
        </td>
        <td className="px-4 py-2 text-center text-muted text-sm italic">
          {filas.length} servicio{filas.length !== 1 ? 's' : ''}
        </td>
        <td className="px-4 py-2 text-right font-bold text-primary">
          {fmtRaciones(totalRaciones)}
        </td>
        <td className="px-4 py-2 text-right font-bold text-primary">
          {tieneCosto ? fmtMoney(totalCosto) : <span className="text-muted font-normal text-xs">Pendiente</span>}
        </td>
      </tr>

      {/* Filas de detalle por servicio */}
      {expandido && filas.map((fila) => (
        <tr
          key={`${fila.operacion_id}-${fila.servicio}`}
          className="border-b text-sm"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <td className="px-4 py-1.5 pl-12 text-secondary flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5 text-muted" />
            {SERVICIO_LABEL[fila.servicio] || fila.servicio}
          </td>
          <td />
          <td className="px-4 py-1.5 text-right text-secondary">
            {fmtRaciones(fila.total_raciones)}
          </td>
          <td className="px-4 py-1.5 text-right text-secondary">
            {fmtMoney(fila.costo_estimado)}
          </td>
        </tr>
      ))}
    </>
  );
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function CostosPorUnidad() {
  const [mes, setMes] = useState(getMesActual());
  const [filtroServicio, setFiltroServicio] = useState('todos');

  const { inicio, fin } = mesARango(mes);
  const { data = [], isLoading, error } = useCostosPorUnidad(inicio, fin);

  // Filtrar por servicio si se selecciona uno
  const datosFiltrados = useMemo(() => {
    if (filtroServicio === 'todos') return data;
    return data.filter((r) => r.servicio === filtroServicio);
  }, [data, filtroServicio]);

  // Agrupar por operación
  const porOperacion = useMemo(() => {
    const mapa = {};
    for (const fila of datosFiltrados) {
      if (!mapa[fila.operacion_nombre]) mapa[fila.operacion_nombre] = [];
      mapa[fila.operacion_nombre].push(fila);
    }
    return mapa;
  }, [datosFiltrados]);

  const nombresOp = Object.keys(porOperacion).sort();

  // Totales globales
  const totalRaciones = data.reduce((s, r) => s + Number(r.total_raciones || 0), 0);
  const totalCosto    = data.reduce((s, r) => s + Number(r.costo_estimado || 0), 0);
  const tieneCosto    = totalCosto > 0;

  // Servicios únicos para el filtro
  const serviciosUnicos = [...new Set(data.map((r) => r.servicio))].sort();

  return (
    <div className="min-h-content p-compact">
      <div className="max-w-6xl mx-auto">

        {/* Encabezado */}
        <div className="section-header">
          <h1 className="section-title">Costos por Unidad</h1>
          <p className="section-subtitle">
            Raciones servidas y costo estimado por operación y servicio en el período seleccionado.
          </p>
        </div>

        {/* Filtros */}
        <div className="card mb-4">
          <div className="card-body flex flex-wrap gap-4 items-end">
            <div>
              <label className="form-label flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Mes
              </label>
              <input
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5" /> Servicio
              </label>
              <select
                value={filtroServicio}
                onChange={(e) => setFiltroServicio(e.target.value)}
                className="form-input"
              >
                <option value="todos">Todos</option>
                {serviciosUnicos.map((s) => (
                  <option key={s} value={s}>{SERVICIO_LABEL[s] || s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {!isLoading && data.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="stats-card">
              <div className="stats-icon bg-primary/10 text-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{nombresOp.length}</div>
                <div className="stats-label">Operaciones</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon bg-success/10 text-success">
                <Utensils className="w-5 h-5" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{fmtRaciones(totalRaciones)}</div>
                <div className="stats-label">Raciones totales</div>
              </div>
            </div>
            <div className="stats-card col-span-2">
              <div className="stats-icon bg-warning/10 text-warning">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="stats-content">
                <div className="stats-value">
                  {tieneCosto ? fmtMoney(totalCosto) : '—'}
                </div>
                <div className="stats-label">Costo estimado total</div>
              </div>
            </div>
          </div>
        )}

        {/* Aviso de costos */}
        {!isLoading && !tieneCosto && data.length > 0 && (
          <div className="card mb-4 border-l-4" style={{ borderLeftColor: 'var(--color-warning)' }}>
            <div className="card-body flex gap-3">
              <Info className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <strong>Costo estimado pendiente.</strong> El costo se calcula cuando los pedidos
                incluyen el componente de menú con su receta asociada. Las raciones mostradas
                son correctas y provienen directamente de los pedidos.
              </p>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="card">
          {isLoading && (
            <div className="card-body py-16 text-center text-muted">Cargando datos…</div>
          )}

          {error && (
            <div className="card-body flex gap-2 text-error py-8">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">Error: {error.message}</span>
            </div>
          )}

          {!isLoading && !error && data.length === 0 && (
            <div className="card-body py-16 text-center">
              <Building2 className="w-12 h-12 text-muted mx-auto mb-3 opacity-30" />
              <p className="text-muted font-medium">Sin pedidos en el período seleccionado.</p>
              <p className="text-sm text-muted mt-1">
                Los coordinadores de unidad deben enviar pedidos para que aparezcan aquí.
              </p>
            </div>
          )}

          {!isLoading && !error && data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
                  >
                    <th className="px-4 py-3 text-left font-semibold text-muted">Operación / Servicio</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted">Desglose</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted">Raciones</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted">Costo estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {nombresOp.map((nombre) => (
                    <FilaOperacion
                      key={nombre}
                      nombre={nombre}
                      filas={porOperacion[nombre]}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-3 font-bold" style={{ color: 'var(--color-text)' }}>
                      Total
                    </td>
                    <td />
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      {fmtRaciones(totalRaciones)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      {tieneCosto ? fmtMoney(totalCosto) : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
