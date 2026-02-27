// ========================================
// RecommendationWidget - Widget de compras recomendadas
// ========================================

import React, { useState } from 'react';
import { ShoppingCart, AlertTriangle, TrendingUp, Package } from 'lucide-react';
import { useRecommendations } from '../hooks/useRecommendations';

const URGENCIA_CONFIG = {
  URGENTE: { label: 'Urgente', cls: 'bg-error/10 text-error' },
  ALTA:    { label: 'Alta',    cls: 'bg-warning/10 text-warning' },
  MEDIA:   { label: 'Media',   cls: 'bg-yellow-100 text-yellow-700' },
};

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

function fmtMoney(n) {
  if (!n) return '$0';
  return '$' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

export default function RecommendationWidget({ diasProyeccion = 7 }) {
  const { data: items = [], isLoading, error } = useRecommendations(diasProyeccion);
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? items : items.slice(0, 8);
  const totalEstimado = items.reduce((s, i) => s + (Number(i.precio_estimado) || 0), 0);

  if (isLoading) {
    return (
      <div className="card mt-4">
        <div className="card-body py-6 text-center">
          <div className="spinner spinner-sm mx-auto mb-2" />
          <p className="text-sm text-muted">Calculando recomendaciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card mt-4">
        <div className="card-body py-4 text-center">
          <p className="text-sm text-muted">No se pudieron cargar las recomendaciones</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card mt-4">
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-primary text-sm">
                Compras Recomendadas — próximos {diasProyeccion} días
              </h3>
              {items.length > 0 && (
                <p className="text-xs text-muted mt-0.5">
                  {items.filter(i => i.urgencia === 'URGENTE').length} urgentes ·{' '}
                  {items.filter(i => i.urgencia === 'ALTA').length} alta prioridad
                </p>
              )}
            </div>
          </div>
          {totalEstimado > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted">Total estimado</p>
              <p className="font-bold text-primary text-sm">{fmtMoney(totalEstimado)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="card-body p-0">
        {items.length === 0 ? (
          <div className="py-10 text-center">
            <Package className="w-10 h-10 text-muted mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium text-muted">Sin recomendaciones urgentes</p>
            <p className="text-xs text-muted mt-1">
              Genera consolidados para obtener recomendaciones basadas en consumo histórico
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-app border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="text-left px-4 py-2 text-muted font-semibold uppercase">Ingrediente</th>
                    <th className="text-right px-3 py-2 text-muted font-semibold uppercase">Stock</th>
                    <th className="text-right px-3 py-2 text-muted font-semibold uppercase">Días rest.</th>
                    <th className="text-right px-3 py-2 text-muted font-semibold uppercase">A comprar</th>
                    <th className="text-right px-3 py-2 text-muted font-semibold uppercase">Est. costo</th>
                    <th className="text-center px-3 py-2 text-muted font-semibold uppercase">Urgencia</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => {
                    const cfg = URGENCIA_CONFIG[item.urgencia] || URGENCIA_CONFIG.MEDIA;
                    return (
                      <tr
                        key={item.producto_id}
                        className="border-b hover:bg-app transition-colors"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-primary truncate max-w-[160px]">{item.nombre}</p>
                          <p className="text-muted font-mono">{item.codigo}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-secondary">
                          {fmt(item.stock_actual)} <span className="text-muted">{item.unidad_medida}</span>
                        </td>
                        <td className={`px-3 py-2.5 text-right font-bold font-mono ${Number(item.dias_restantes) <= 3 ? 'text-error' : 'text-secondary'}`}>
                          {item.dias_restantes === 999 ? '∞' : fmt(item.dias_restantes)}d
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-primary font-mono">
                          {fmt(item.recomendacion_compra)} <span className="text-muted font-normal">{item.unidad_medida}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-secondary font-mono">
                          {fmtMoney(item.precio_estimado)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
                            {item.urgencia === 'URGENTE' && <AlertTriangle className="w-3 h-3" />}
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {items.length > 8 && (
              <div className="px-4 py-3 border-t text-center" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  {expanded ? 'Ver menos' : `Ver todos (${items.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
