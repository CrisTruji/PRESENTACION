// ========================================
// DashboardPresupuesto - Pantalla de control presupuestario
// ========================================

import React, { useState } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle, Edit, Plus, Calendar, Sparkles } from 'lucide-react';
import { usePresupuestoMes, useGastoReal } from '../hooks/usePresupuesto';
import { presupuestoService } from '../services/presupuestoService';
import FormPresupuesto from './FormPresupuesto';
import notify from '@/shared/lib/notifier';

function getMesActual() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}`;
}

function fmtMoney(n) {
  return '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function BarraProgreso({ porcentaje }) {
  const color =
    porcentaje >= 90 ? 'bg-error' :
    porcentaje >= 70 ? 'bg-warning' : 'bg-success';

  return (
    <div className="w-full bg-app rounded-full h-3 overflow-hidden">
      <div
        className={`h-3 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(porcentaje, 100)}%` }}
      />
    </div>
  );
}

function getMesAnterior(mes) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function DashboardPresupuesto() {
  const [mes, setMes] = useState(getMesActual());
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [autoEstimando, setAutoEstimando] = useState(false);
  // Presupuesto "sintético" pre-llenado desde historial anterior
  const [presupuestoAuto, setPresupuestoAuto] = useState(null);

  const { data: presupuesto, isLoading, refetch } = usePresupuestoMes(mes);
  const { data: gastoReal = [] } = useGastoReal(mes);

  const totalGasto = gastoReal.reduce((s, g) => s + Number(g.gasto_total || 0), 0);
  const totalPresupuestado = Number(presupuesto?.presupuestado || 0);
  const disponible = totalPresupuestado - totalGasto;
  const porcentaje = totalPresupuestado > 0 ? Math.round((totalGasto / totalPresupuestado) * 100) : 0;

  // Varianza por categoría: cruza presupuesto_items con gastoReal
  const itemsPresupuesto = presupuesto?.presupuesto_items || [];
  const varianzaRows = (() => {
    const gastoMap = {};
    for (const g of gastoReal) gastoMap[g.categoria] = Number(g.gasto_total || 0);

    const cats = new Set([
      ...itemsPresupuesto.map((i) => i.categoria),
      ...gastoReal.map((g) => g.categoria),
    ]);
    return [...cats].sort().map((cat) => {
      const presup = Number(itemsPresupuesto.find((i) => i.categoria === cat)?.monto_presupuestado || 0);
      const real   = gastoMap[cat] || 0;
      const diff   = presup - real;
      const pct    = presup > 0 ? Math.round((real / presup) * 100) : null;
      return { cat, presup, real, diff, pct };
    });
  })();

  const handleSaved = () => {
    refetch();
    setEditMode(false);
    setPresupuestoAuto(null);
  };

  // Auto-estimar desde el gasto del mes anterior
  async function autoEstimar() {
    setAutoEstimando(true);
    try {
      const mesAnt = getMesAnterior(mes);
      const { data, error } = await presupuestoService.getGastoReal(mesAnt);
      if (error) throw error;
      const items = (data || []).map((g) => ({
        categoria: g.categoria,
        monto_presupuestado: Number(g.gasto_total || 0),
      }));
      const total = items.reduce((s, i) => s + i.monto_presupuestado, 0);
      if (total === 0) {
        notify.warning('No hay gasto registrado en el mes anterior para estimar.');
        return;
      }
      setPresupuestoAuto({ presupuesto_items: items, presupuestado: total });
      setEditMode(false);
      setShowForm(true);
      notify.success(`Valores estimados desde ${mesAnt}. Revisa y ajusta antes de guardar.`);
    } catch (err) {
      notify.error('Error al obtener historial: ' + err.message);
    } finally {
      setAutoEstimando(false);
    }
  }

  return (
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="section-header">
              <h1 className="section-title">Control de Presupuesto</h1>
              <p className="section-subtitle">Comparativo presupuestado vs. gasto real mensual</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted" />
                <input
                  type="month"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  className="form-input !py-1.5 text-sm"
                />
              </div>
              {presupuesto ? (
                <button
                  onClick={() => { setEditMode(true); setPresupuestoAuto(null); setShowForm(true); }}
                  className="btn btn-outline flex items-center gap-2 text-sm !py-1.5"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={autoEstimar}
                    disabled={autoEstimando}
                    className="btn btn-outline flex items-center gap-2 text-sm !py-1.5"
                    title="Pre-llenar con el gasto real del mes anterior"
                  >
                    <Sparkles className="w-4 h-4" />
                    {autoEstimando ? 'Estimando…' : 'Auto-estimar'}
                  </button>
                  <button
                    onClick={() => { setEditMode(false); setPresupuestoAuto(null); setShowForm(true); }}
                    className="btn btn-primary flex items-center gap-2 text-sm !py-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Crear presupuesto
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <div className="spinner spinner-lg mx-auto mb-4" />
            <p className="text-muted">Cargando...</p>
          </div>
        ) : !presupuesto ? (
          <div className="card">
            <div className="card-body py-20 text-center">
              <DollarSign className="w-16 h-16 text-muted mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-semibold text-primary mb-2">Sin presupuesto para este mes</h3>
              <p className="text-muted mb-6">Crea un presupuesto para comenzar el control financiero</p>
              <button
                onClick={() => { setEditMode(false); setShowForm(true); }}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear presupuesto del mes
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Alerta si supera el 80% */}
            {porcentaje >= 80 && (
              <div className="mb-4 p-4 rounded-xl flex items-center gap-3 bg-warning/10 border border-warning/30">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                <p className="text-sm font-medium text-warning">
                  Llevas el <strong>{porcentaje}%</strong> del presupuesto. Revisa el gasto antes de fin de mes.
                </p>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid-cards mb-6">
              <div className="stats-card">
                <div className="stats-icon bg-primary/10 text-primary">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="stats-content">
                  <div className="stats-value text-xl">{fmtMoney(totalPresupuestado)}</div>
                  <div className="stats-label">Presupuestado</div>
                </div>
              </div>

              <div className="stats-card">
                <div className={`stats-icon ${porcentaje >= 90 ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'}`}>
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="stats-content">
                  <div className="stats-value text-xl">{fmtMoney(totalGasto)}</div>
                  <div className="stats-label">Gastado</div>
                </div>
              </div>

              <div className="stats-card">
                <div className={`stats-icon ${disponible < 0 ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="stats-content">
                  <div className={`stats-value text-xl ${disponible < 0 ? 'text-error' : ''}`}>
                    {fmtMoney(Math.abs(disponible))}
                    {disponible < 0 && <span className="text-xs ml-1">sobre</span>}
                  </div>
                  <div className="stats-label">Disponible</div>
                </div>
              </div>

              <div className="stats-card">
                <div className={`stats-icon ${porcentaje >= 90 ? 'bg-error/10 text-error' : porcentaje >= 70 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                  <span className="font-bold text-lg">{porcentaje}%</span>
                </div>
                <div className="stats-content">
                  <div className="mt-2">
                    <BarraProgreso porcentaje={porcentaje} />
                  </div>
                  <div className="stats-label mt-1">% utilizado</div>
                </div>
              </div>
            </div>

            {/* Tabla de varianza por categoría */}
            {(gastoReal.length > 0 || itemsPresupuesto.length > 0) ? (
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold text-primary">Varianza por categoría</h3>
                  <p className="text-xs text-muted mt-0.5">
                    Presupuestado vs. gasto real · {gastoReal.reduce((s,r)=>s+Number(r.cantidad_facturas||0),0)} facturas registradas
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell">Categoría</th>
                        <th className="table-header-cell text-right">Presupuestado</th>
                        <th className="table-header-cell text-right">Real</th>
                        <th className="table-header-cell text-right">Diferencia</th>
                        <th className="table-header-cell">Avance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {varianzaRows.map(({ cat, presup, real, diff, pct }) => {
                        const colorDiff = diff < 0 ? 'text-error' : diff === 0 ? 'text-muted' : 'text-success';
                        const colorBar  = pct !== null && pct >= 90 ? 'bg-error'
                                        : pct !== null && pct >= 70 ? 'bg-warning' : 'bg-success';
                        return (
                          <tr key={cat} className="table-row">
                            <td className="table-cell font-medium text-primary">{cat}</td>
                            <td className="table-cell text-right text-secondary">
                              {presup > 0 ? fmtMoney(presup) : <span className="text-muted">—</span>}
                            </td>
                            <td className="table-cell text-right font-bold text-primary">
                              {real > 0 ? fmtMoney(real) : <span className="text-muted text-sm font-normal">Sin datos</span>}
                            </td>
                            <td className={`table-cell text-right font-semibold ${colorDiff}`}>
                              {presup > 0 ? (diff > 0 ? '-' : diff < 0 ? '+' : '') : '—'}
                              {presup > 0 ? fmtMoney(Math.abs(diff)) : ''}
                            </td>
                            <td className="table-cell min-w-[120px]">
                              {pct !== null ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-app rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-2 rounded-full transition-all ${colorBar}`}
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted w-8 text-right">{pct}%</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted">Sin presupuesto</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="table-cell font-bold text-primary">Total</td>
                        <td className="table-cell text-right font-bold text-secondary">
                          {fmtMoney(totalPresupuestado)}
                        </td>
                        <td className="table-cell text-right font-bold text-primary">
                          {fmtMoney(totalGasto)}
                        </td>
                        <td className={`table-cell text-right font-bold ${disponible < 0 ? 'text-error' : 'text-success'}`}>
                          {disponible < 0 ? '+' : '-'}{fmtMoney(Math.abs(disponible))}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <BarraProgreso porcentaje={porcentaje} />
                            <span className="text-xs text-muted w-8 text-right">{porcentaje}%</span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-body py-10 text-center">
                  <p className="text-muted">No hay facturas ni ítems de presupuesto para este mes aún.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal — usa presupuesto real (editar) o sintético (auto-estimar) */}
      {showForm && (
        <FormPresupuesto
          mes={mes}
          presupuesto={editMode ? presupuesto : (presupuestoAuto || null)}
          onClose={() => { setShowForm(false); setPresupuestoAuto(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
