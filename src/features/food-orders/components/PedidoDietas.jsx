// ========================================
// PedidoDietas - Grid 2 col cantidades por tipo de dieta
// ========================================

import React from 'react';
import { usePedidoStore } from '../store/usePedidoStore';
import { useTiposDieta } from '@features/menu-cycles';

// Colores visuales por código de dieta
const DIETA_COLORS = {
  NR: { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.35)', text: '#64748b' },
  HP: { bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.35)',  text: '#f97316' },
  RE: { bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.35)',  text: '#a855f7' },
  VE: { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.35)',   text: '#22c55e' },
  LQ: { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)',  text: '#3b82f6' },
  DI: { bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.35)',   text: '#b45309' },
  PE: { bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.35)',  text: '#ec4899' },
  BL: { bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.35)',   text: '#0891b2' },
};

export default function PedidoDietas() {
  const { items, actualizarItem, inicializarItems, menuDelDia } = usePedidoStore();
  const { data: tiposDieta, isLoading } = useTiposDieta();

  const totalPorciones = items.reduce((sum, i) => sum + (i.cantidad || 0), 0);

  const tiposDietaFiltrados = React.useMemo(() => {
    if (!tiposDieta) return [];
    if (!menuDelDia?.servicios?.length) return tiposDieta;
    const conGramaje = tiposDieta.filter((td) =>
      menuDelDia.servicios.some((srv) =>
        srv.menu_componentes?.some((mc) =>
          mc.gramajes_componente_menu?.some(
            (g) => g.tipo_dieta_id === td.id && !g.excluir && g.gramaje > 0
          )
        )
      )
    );
    return conGramaje.length > 0 ? conGramaje : tiposDieta;
  }, [tiposDieta, menuDelDia]);

  React.useEffect(() => {
    if (tiposDietaFiltrados.length > 0 && items.length === 0) {
      inicializarItems(tiposDietaFiltrados);
    }
  }, [tiposDietaFiltrados]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="spinner spinner-sm mx-auto" />
        <p className="mt-2 text-sm text-text-muted">Cargando tipos de dieta...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grid 2 columnas */}
      <div className="grid grid-cols-2 gap-2">
        {tiposDietaFiltrados?.map((dieta) => {
          const item     = items.find((i) => i.tipo_dieta_id === dieta.id);
          const cantidad = item?.cantidad || 0;
          const col      = DIETA_COLORS[dieta.codigo] || {};
          const activo   = cantidad > 0;

          return (
            <label
              key={dieta.id}
              className="flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition-all"
              style={{
                borderColor: activo ? (col.border || 'var(--color-primary)') : 'var(--color-border)',
                background:  activo ? (col.bg    || 'var(--color-bg-surface)') : 'var(--color-bg-surface)',
              }}
            >
              {/* Código + nombre */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-bold uppercase leading-none"
                  style={{ color: col.text || 'var(--color-text-secondary)' }}
                >
                  {dieta.codigo}
                </p>
                <p className="text-xs text-text-muted truncate mt-0.5 leading-tight">
                  {dieta.nombre}
                </p>
              </div>

              {/* Input numérico */}
              <input
                type="number"
                min="0"
                value={cantidad === 0 ? '' : cantidad}
                placeholder="0"
                onChange={(e) =>
                  actualizarItem(dieta.id, 'cantidad', parseInt(e.target.value) || 0)
                }
                onClick={(e) => e.stopPropagation()}
                className="w-14 py-1.5 rounded-lg text-center text-sm font-bold focus:outline-none transition-colors"
                style={{
                  background:  'var(--color-bg-app)',
                  border:      `1px solid ${activo ? (col.border || 'var(--color-primary)') : 'var(--color-border)'}`,
                  color:       activo ? (col.text || 'var(--color-text-primary)') : 'var(--color-text-primary)',
                }}
              />
              <span className="text-xs text-text-muted w-3 flex-shrink-0">p.</span>
            </label>
          );
        })}
      </div>

      {/* Total porciones */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl border"
        style={{
          background:  totalPorciones > 0 ? 'rgba(99,102,241,0.08)' : 'var(--color-bg-surface)',
          borderColor: totalPorciones > 0 ? 'rgba(99,102,241,0.25)' : 'var(--color-border)',
        }}
      >
        <span className="text-sm font-semibold text-text-secondary">Total porciones</span>
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color: totalPorciones > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
        >
          {totalPorciones}
        </span>
      </div>

      {/* Observaciones */}
      <div>
        <label className="form-label">Observaciones generales</label>
        <textarea
          rows="2"
          className="form-input w-full text-sm"
          placeholder="Notas adicionales sobre este pedido..."
        />
      </div>
    </div>
  );
}
