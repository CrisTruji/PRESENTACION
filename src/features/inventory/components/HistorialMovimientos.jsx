// ========================================
// HistorialMovimientos — Drawer lateral
// Muestra el historial de movimientos de un ingrediente específico.
// Fuentes: ajustes_stock_manual (manual) + movimientos_inventario (facturas)
// ========================================

import React, { useState } from 'react';
import {
  X,
  ArrowUp,
  ArrowDown,
  Activity,
  Download,
  ClipboardList,
} from 'lucide-react';
import { useHistorialMovimientos } from '@/features/inventory';
import { exportarExcel } from '@/features/informes/services/exportador';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function getFechaRango(dias) {
  const hoy   = new Date();
  const desde = new Date(hoy);
  desde.setDate(hoy.getDate() - dias);
  return {
    desde: desde.toISOString().slice(0, 10),
    hasta: hoy.toISOString().slice(0, 10),
  };
}

const TIPO_META = {
  entrada: { label: 'Entrada',  color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20', icon: ArrowUp  },
  salida:  { label: 'Salida',   color: 'text-red-600   dark:text-red-400',    bg: 'bg-red-50   dark:bg-red-900/20',   icon: ArrowDown},
  ajuste:  { label: 'Ajuste',   color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Activity },
};
const tipoMeta = (tipo) => TIPO_META[tipo] ?? TIPO_META['ajuste'];

function fmtFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function fmtNum(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

const MOTIVO_LABEL = {
  merma:              'Merma',
  perdida:            'Pérdida',
  vencimiento:        'Vencimiento',
  ajuste_fisico:      'Ajuste físico',
  consumo_produccion: 'Consumo producción',
  otro:               'Otro',
};

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
export default function HistorialMovimientos({ item, onClose }) {
  const [rango, setRango]   = useState(30); // días
  const { desde, hasta }    = getFechaRango(rango);

  const { data: movimientos, isLoading } = useHistorialMovimientos(item.id, desde, hasta);

  const handleExportar = async () => {
    if (!movimientos || movimientos.length === 0) return;
    const filas = movimientos.map((m) => ({
      'Fecha':          fmtFecha(m.fecha),
      'Tipo':           tipoMeta(m.tipo).label,
      'Motivo':         MOTIVO_LABEL[m.motivo] || m.motivo || '—',
      'Cantidad':       fmtNum(m.cantidad),
      'Unidad':         item.unidad_medida || '—',
      'Stock Anterior': fmtNum(m.stock_anterior),
      'Stock Posterior':fmtNum(m.stock_posterior),
      'Origen':         m.origen || '—',
    }));
    await exportarExcel(
      filas,
      `historial-${item.codigo}-${desde}-${hasta}`,
      `Historial — ${item.nombre}`
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-orange-500" />
            <div>
              <h2 className="font-bold text-gray-800 dark:text-white text-sm leading-tight">
                {item.nombre}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {item.codigo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-5 py-3 border-b dark:border-gray-700 flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">Últimos:</span>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setRango(d)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  rango === d
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {d} días
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button
            onClick={handleExportar}
            disabled={!movimientos || movimientos.length === 0}
            title="Exportar a Excel"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Download size={13} />
            Excel
          </button>
        </div>

        {/* Stock actual resumen */}
        <div className="px-5 py-3 border-b dark:border-gray-700 flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Stock actual</p>
            <p className="text-lg font-bold text-gray-800 dark:text-white">
              {fmtNum(item.stock_actual)}
              <span className="text-xs font-normal text-gray-400 ml-1">{item.unidad_medida}</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Mínimo</p>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              {fmtNum(item.stock_minimo)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Movimientos</p>
            <p className="text-sm font-semibold text-orange-500">
              {isLoading ? '…' : (movimientos?.length ?? 0)}
            </p>
          </div>
        </div>

        {/* Lista de movimientos */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />
            </div>
          ) : !movimientos || movimientos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <ClipboardList size={44} className="mb-3 opacity-30" />
              <p className="text-sm">Sin movimientos en los últimos {rango} días</p>
              <p className="text-xs mt-1 opacity-70">Los ajustes futuros aparecerán aquí</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {movimientos.map((m, idx) => {
                const meta = tipoMeta(m.tipo);
                const Icon = meta.icon;
                const motivoLabel = MOTIVO_LABEL[m.motivo] || m.motivo;
                return (
                  <div
                    key={m.id || idx}
                    className="px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icono tipo */}
                      <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${meta.bg}`}>
                        <Icon size={13} className={meta.color} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={`text-xs font-bold ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                            {fmtFecha(m.fecha)}
                          </span>
                        </div>

                        {/* Cantidad + stock */}
                        <div className="flex items-center gap-2 text-sm mb-1">
                          <span className={`font-semibold tabular-nums ${meta.color}`}>
                            {m.tipo === 'salida' ? '−' : m.tipo === 'entrada' ? '+' : '='}
                            {fmtNum(m.cantidad)} {item.unidad_medida}
                          </span>
                          {m.stock_anterior != null && m.stock_posterior != null && (
                            <span className="text-xs text-gray-400">
                              ({fmtNum(m.stock_anterior)} → {fmtNum(m.stock_posterior)})
                            </span>
                          )}
                        </div>

                        {/* Motivo + origen */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {motivoLabel && motivoLabel !== '—' && (
                            <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded">
                              {motivoLabel}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {m.origen}
                          </span>
                        </div>

                        {/* Notas adicionales */}
                        {m.notas && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                            {m.notas}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
