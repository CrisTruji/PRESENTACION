// src/features/presupuesto/components/CierreCostosMensual.jsx
// Vista de cierre mensual: consolida facturas + producción + gasto por categoría.
// Disponible para rol administrador y jefe_de_planta.

import React, { useState } from 'react';
import {
  Calendar, FileText, Package, TrendingUp,
  Download, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useCierreCostos } from '../hooks/useCierreCostos';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtMoney(n) {
  return '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString('es-CO');
}

function fmtFecha(fecha) {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

const SERVICIO_LABEL = {
  desayuno: 'Desayuno', almuerzo: 'Almuerzo',
  cena: 'Cena', cena_ligera: 'Cena ligera',
};

// ── Sección colapsable genérica ───────────────────────────────────────────────

function Seccion({ titulo, icon: Icon, badge, color = 'primary', children }) {
  const [abierto, setAbierto] = useState(true);
  return (
    <div className="card mb-4">
      <button
        onClick={() => setAbierto(!abierto)}
        className="card-header w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 text-${color}`} />
          <span className={`font-semibold text-${color}`}>{titulo}</span>
          {badge !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full bg-${color}/10 text-${color} font-medium`}>
              {badge}
            </span>
          )}
        </div>
        {abierto ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </button>
      {abierto && <div className="card-body pt-0">{children}</div>}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────

export default function CierreCostosMensual() {
  const [mes, setMes] = useState(getMesActual());
  const [exportando, setExportando] = useState(false);

  const { facturas, consolidados, gastoReal, isLoading, errors } = useCierreCostos(mes);

  // Totales
  const totalFacturas     = facturas.reduce((s, f) => s + Number(f.valor_total || 0), 0);
  const totalPorciones    = consolidados.reduce((s, c) => s + Number(c.total_porciones || 0), 0);
  const totalGastoCat     = gastoReal.reduce((s, g) => s + Number(g.gasto_total || 0), 0);
  const consolidadosFin   = consolidados.filter((c) => c.estado === 'finalizado').length;

  // Exportar a PDF con jsPDF (importación dinámica — patrón de exportador.js)
  async function exportarPDF() {
    setExportando(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const titulo = `Cierre de Costos — ${mes}`;
      const generado = `Generado: ${new Date().toLocaleString('es-CO')}`;

      // Encabezado
      doc.setFontSize(16);
      doc.setTextColor(13, 148, 136); // teal
      doc.text(titulo, 14, 18);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(generado, 14, 25);

      let y = 32;

      // ── Sección 1: Facturas ──────────────────────────────────────────────
      doc.setFontSize(12);
      doc.setTextColor(30);
      doc.text('1. Resumen de Compras', 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['N° Factura', 'Proveedor', 'Fecha', 'Valor']],
        body: facturas.map((f) => [
          f.numero_factura || '—',
          f.proveedor_nombre,
          fmtFecha(f.fecha_factura),
          fmtMoney(f.valor_total),
        ]),
        foot: [['', '', 'Total', fmtMoney(totalFacturas)]],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [13, 148, 136] },
        footStyles: { fontStyle: 'bold', fillColor: [241, 245, 249] },
        margin: { left: 14, right: 14 },
      });

      // ── Sección 2: Producción ────────────────────────────────────────────
      y = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(12);
      doc.text('2. Producción Real', 14, y);
      y += 4;

      // Agrupar consolidados por fecha y servicio
      const consolidadosAgrupados = {};
      for (const c of consolidados) {
        const k = c.fecha;
        if (!consolidadosAgrupados[k]) consolidadosAgrupados[k] = {};
        consolidadosAgrupados[k][c.servicio] = (consolidadosAgrupados[k][c.servicio] || 0) + Number(c.total_porciones || 0);
      }

      const consolidadoBody = Object.entries(consolidadosAgrupados)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, servicios]) => [
          fmtFecha(fecha),
          fmtNum(servicios.desayuno || 0),
          fmtNum(servicios.almuerzo || 0),
          fmtNum(servicios.cena || 0),
          fmtNum(Object.values(servicios).reduce((s, v) => s + v, 0)),
        ]);

      autoTable(doc, {
        startY: y,
        head: [['Fecha', 'Desayuno', 'Almuerzo', 'Cena', 'Total día']],
        body: consolidadoBody.length ? consolidadoBody : [['Sin datos', '', '', '', '']],
        foot: [['', '', '', 'Total raciones', fmtNum(totalPorciones)]],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59] },
        footStyles: { fontStyle: 'bold', fillColor: [241, 245, 249] },
        margin: { left: 14, right: 14 },
      });

      // ── Sección 3: Gasto por categoría ───────────────────────────────────
      y = doc.lastAutoTable.finalY + 8;
      if (y > 250) { doc.addPage(); y = 14; }
      doc.setFontSize(12);
      doc.text('3. Gasto por Categoría', 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Categoría', 'Facturas', 'Gasto real']],
        body: gastoReal.map((g) => [g.categoria, g.cantidad_facturas, fmtMoney(g.gasto_total)]),
        foot: [['Total', gastoReal.reduce((s, g) => s + Number(g.cantidad_facturas || 0), 0), fmtMoney(totalGastoCat)]],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [100, 116, 139] },
        footStyles: { fontStyle: 'bold', fillColor: [241, 245, 249] },
        margin: { left: 14, right: 14 },
      });

      doc.save(`cierre-costos-${mes}.pdf`);
    } catch (err) {
      console.error('Error exportando PDF:', err);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="min-h-content p-compact">
      <div className="max-w-5xl mx-auto">

        {/* Encabezado */}
        <div className="section-header flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="section-title">Cierre de Costos Mensual</h1>
            <p className="section-subtitle">
              Consolida facturas, producción real y gasto por categoría al cierre del mes.
            </p>
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
            <button
              onClick={exportarPDF}
              disabled={exportando || isLoading}
              className="btn btn-outline flex items-center gap-2 text-sm !py-1.5 disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              {exportando ? 'Generando…' : 'Exportar PDF'}
            </button>
          </div>
        </div>

        {/* Errores */}
        {errors.length > 0 && (
          <div className="card mb-4 border-l-4" style={{ borderLeftColor: 'var(--color-error)' }}>
            <div className="card-body flex gap-2 text-error">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="text-sm">{errors.join(' | ')}</div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        {!isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="stats-card">
              <div className="stats-icon bg-primary/10 text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{facturas.length}</div>
                <div className="stats-label">Facturas</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon bg-warning/10 text-warning">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="stats-content">
                <div className="stats-value text-base">{fmtMoney(totalFacturas)}</div>
                <div className="stats-label">Total compras</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon bg-success/10 text-success">
                <Package className="w-5 h-5" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{fmtNum(totalPorciones)}</div>
                <div className="stats-label">Raciones producidas</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon bg-primary/10 text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{consolidadosFin}</div>
                <div className="stats-label">Consolidados finalizados</div>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-16 text-muted">Cargando cierre de costos…</div>
        )}

        {!isLoading && (
          <>
            {/* ── Sección 1: Compras / Facturas ── */}
            <Seccion
              titulo="Resumen de Compras"
              icon={FileText}
              badge={`${facturas.length} facturas · ${fmtMoney(totalFacturas)}`}
              color="primary"
            >
              {facturas.length === 0 ? (
                <p className="text-muted text-sm py-4 text-center">Sin facturas registradas en este mes.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                        <th className="px-3 py-2 text-left font-medium text-muted">N° Factura</th>
                        <th className="px-3 py-2 text-left font-medium text-muted">Proveedor</th>
                        <th className="px-3 py-2 text-center font-medium text-muted">Fecha</th>
                        <th className="px-3 py-2 text-center font-medium text-muted">Estado</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturas.map((f) => (
                        <tr key={f.id} className="border-b text-sm" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="px-3 py-1.5 text-secondary">{f.numero_factura || '—'}</td>
                          <td className="px-3 py-1.5" style={{ color: 'var(--color-text)' }}>{f.proveedor_nombre}</td>
                          <td className="px-3 py-1.5 text-center text-secondary">{fmtFecha(f.fecha_factura)}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              f.estado_recepcion === 'recibido'
                                ? 'bg-success/10 text-success'
                                : 'bg-warning/10 text-warning'
                            }`}>
                              {f.estado_recepcion || 'pendiente'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right font-semibold text-primary">{fmtMoney(f.valor_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="px-3 py-2" colSpan={4} style={{ color: 'var(--color-text)' }}>Total</td>
                        <td className="px-3 py-2 text-right text-primary">{fmtMoney(totalFacturas)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Seccion>

            {/* ── Sección 2: Producción Real ── */}
            <Seccion
              titulo="Producción Real"
              icon={Package}
              badge={`${consolidados.length} consolidados · ${fmtNum(totalPorciones)} raciones`}
              color="success"
            >
              {consolidados.length === 0 ? (
                <p className="text-muted text-sm py-4 text-center">Sin consolidados de producción en este mes.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                        <th className="px-3 py-2 text-left font-medium text-muted">Fecha</th>
                        <th className="px-3 py-2 text-left font-medium text-muted">Servicio</th>
                        <th className="px-3 py-2 text-center font-medium text-muted">Estado</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">Porciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consolidados.map((c) => (
                        <tr key={c.id} className="border-b text-sm" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="px-3 py-1.5 text-secondary">{fmtFecha(c.fecha)}</td>
                          <td className="px-3 py-1.5" style={{ color: 'var(--color-text)' }}>
                            {SERVICIO_LABEL[c.servicio] || c.servicio}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              c.estado === 'finalizado'
                                ? 'bg-success/10 text-success'
                                : c.estado === 'en_proceso'
                                ? 'bg-warning/10 text-warning'
                                : 'bg-muted/10 text-muted'
                            }`}>
                              {c.estado || 'pendiente'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right font-semibold text-primary">
                            {fmtNum(c.total_porciones)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="px-3 py-2" colSpan={3} style={{ color: 'var(--color-text)' }}>Total raciones producidas</td>
                        <td className="px-3 py-2 text-right text-primary">{fmtNum(totalPorciones)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Seccion>

            {/* ── Sección 3: Gasto por Categoría ── */}
            <Seccion
              titulo="Gasto por Categoría"
              icon={TrendingUp}
              badge={gastoReal.length > 0 ? fmtMoney(totalGastoCat) : 'Sin datos'}
              color="warning"
            >
              {gastoReal.length === 0 ? (
                <p className="text-muted text-sm py-4 text-center">Sin facturas categorizadas en este mes.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                        <th className="px-3 py-2 text-left font-medium text-muted">Categoría</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">Facturas</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">Gasto real</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">% del total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gastoReal.map((g) => {
                        const pct = totalGastoCat > 0
                          ? Math.round((Number(g.gasto_total) / totalGastoCat) * 100)
                          : 0;
                        return (
                          <tr key={g.categoria} className="border-b text-sm" style={{ borderColor: 'var(--color-border)' }}>
                            <td className="px-3 py-1.5 font-medium" style={{ color: 'var(--color-text)' }}>
                              {g.categoria}
                            </td>
                            <td className="px-3 py-1.5 text-right text-secondary">{g.cantidad_facturas}</td>
                            <td className="px-3 py-1.5 text-right font-semibold text-primary">{fmtMoney(g.gasto_total)}</td>
                            <td className="px-3 py-1.5 text-right text-secondary">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="px-3 py-2" style={{ color: 'var(--color-text)' }}>Total</td>
                        <td className="px-3 py-2 text-right text-secondary">
                          {gastoReal.reduce((s, g) => s + Number(g.cantidad_facturas || 0), 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-primary">{fmtMoney(totalGastoCat)}</td>
                        <td className="px-3 py-2 text-right text-secondary">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Seccion>
          </>
        )}
      </div>
    </div>
  );
}
