// ========================================
// PedidoCartaMenu - Formulario para operaciones tipo carta_menu (Eiren)
// Muestra por cada tipo de dieta las cantidades y la opcion A/B por componente
// Los componentes con opciones_carta configuradas permiten escoger A o B
// Los componentes sin opciones muestran la receta fija
// ========================================

import React, { useMemo } from 'react';
import { usePedidoStore } from '../store/usePedidoStore';
import { useTiposDieta } from '@features/menu-cycles';

// ----------------------------------------
// Colores por opcion
// ----------------------------------------
const COLOR_A = { bg: 'rgba(99,102,241,0.10)', border: '#6366F1', text: '#4F46E5' };
const COLOR_B = { bg: 'rgba(20,184,166,0.10)', border: '#14B8A6', text: '#0D9488' };

// ----------------------------------------
// Sub-componente: selector de opcion A/B para un componente con carta
// ----------------------------------------
function SelectorOpcion({ opciones, opcionActual, onChange }) {
  const opcionA = opciones.find((o) => o.opcion === 'A');
  const opcionB = opciones.find((o) => o.opcion === 'B');

  return (
    <div className="flex gap-2 flex-wrap">
      {opcionA && (
        <button
          type="button"
          onClick={() => onChange('A')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
          style={
            opcionActual === 'A'
              ? { backgroundColor: COLOR_A.bg, borderColor: COLOR_A.border, color: COLOR_A.text }
              : { backgroundColor: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }
          }
        >
          <span
            className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
            style={{ borderColor: opcionActual === 'A' ? COLOR_A.border : 'var(--color-border)' }}
          >
            {opcionActual === 'A' && (
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_A.border }} />
            )}
          </span>
          <span>A: {opcionA.nombre || 'Opción A'}</span>
        </button>
      )}
      {opcionB && (
        <button
          type="button"
          onClick={() => onChange('B')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
          style={
            opcionActual === 'B'
              ? { backgroundColor: COLOR_B.bg, borderColor: COLOR_B.border, color: COLOR_B.text }
              : { backgroundColor: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }
          }
        >
          <span
            className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
            style={{ borderColor: opcionActual === 'B' ? COLOR_B.border : 'var(--color-border)' }}
          >
            {opcionActual === 'B' && (
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_B.border }} />
            )}
          </span>
          <span>B: {opcionB.nombre || 'Opción B'}</span>
        </button>
      )}
    </div>
  );
}

// ----------------------------------------
// Componente principal
// ----------------------------------------
export default function PedidoCartaMenu() {
  const {
    items,
    menuDelDia,
    actualizarItem,
    actualizarOpcionItem,
    inicializarItems,
  } = usePedidoStore();

  const { data: tiposDieta, isLoading } = useTiposDieta();

  // Obtener componentes del dia actual del servicio seleccionado
  // menuDelDia.servicios = array de ciclo_dia_servicios, cada uno con menu_componentes[]
  const componentesDelDia = useMemo(() => {
    if (!menuDelDia?.servicios?.length) return [];
    // Aplanar todos los menu_componentes de todos los servicios del dia
    // Para Eiren normalmente hay un solo servicio por pedido
    const todos = menuDelDia.servicios.flatMap((srv) => srv.menu_componentes || []);
    // Deduplicar por id y ordenar por el orden del componente_plato
    const mapa = {};
    todos.forEach((mc) => {
      if (!mapa[mc.id]) mapa[mc.id] = mc;
    });
    return Object.values(mapa).sort(
      (a, b) => (a.componentes_plato?.orden ?? 99) - (b.componentes_plato?.orden ?? 99)
    );
  }, [menuDelDia]);

  // Tipos de dieta relevantes (todos o los que tengan gramaje)
  const tiposDietaFiltrados = useMemo(() => {
    if (!tiposDieta) return [];
    return tiposDieta;
  }, [tiposDieta]);

  // Inicializar items base (por tipo de dieta) si estan vacios
  React.useEffect(() => {
    if (tiposDietaFiltrados.length > 0 && items.length === 0) {
      inicializarItems(tiposDietaFiltrados);
    }
  }, [tiposDietaFiltrados]);

  // Calcular resumen de opciones por componente
  const resumenOpciones = useMemo(() => {
    const mapa = {};
    for (const mc of componentesDelDia) {
      const opciones = mc.opciones_carta;
      if (!Array.isArray(opciones) || opciones.length < 2) continue;
      let totalA = 0;
      let totalB = 0;
      for (const item of items) {
        if (item.menu_componente_id === mc.id && item.cantidad > 0) {
          if (item.opcion_seleccionada === 'A') totalA += item.cantidad;
          if (item.opcion_seleccionada === 'B') totalB += item.cantidad;
        }
      }
      mapa[mc.id] = {
        nombreComponente: mc.componentes_plato?.nombre || 'Componente',
        opcionA: opciones.find((o) => o.opcion === 'A')?.nombre || 'Opción A',
        opcionB: opciones.find((o) => o.opcion === 'B')?.nombre || 'Opción B',
        totalA,
        totalB,
      };
    }
    return mapa;
  }, [items, componentesDelDia]);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="spinner spinner-sm mx-auto" />
        <p className="mt-2 text-sm text-muted">Cargando tipos de dieta...</p>
      </div>
    );
  }

  const sinMenuConfigurado = componentesDelDia.length === 0;

  return (
    <div className="space-y-5">

      {/* Aviso si no hay menu del dia configurado */}
      {sinMenuConfigurado && (
        <div className="p-4 rounded-lg border"
          style={{ borderColor: 'var(--color-warning)', backgroundColor: 'rgba(245,158,11,0.08)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--color-warning)' }}>
            ⚠️ No hay menú del día configurado para Eiren en esta fecha. Las cantidades se guardaran sin opciones de carta.
          </p>
        </div>
      )}

      {/* Descripcion */}
      <p className="text-sm text-text-muted">
        Ingresa las cantidades por tipo de dieta. Para los componentes con carta, selecciona la opción que eligió cada grupo.
      </p>

      {/* ── Tabla por tipo de dieta ── */}
      <div className="space-y-3">
        {tiposDietaFiltrados.map((dieta) => {
          // Item base de cantidad para esta dieta (sin componente especifico)
          const itemBase = items.find(
            (i) => i.tipo_dieta_id === dieta.id && !i.menu_componente_id
          );
          const cantidad = itemBase?.cantidad || 0;

          return (
            <div
              key={dieta.id}
              className="border rounded-xl overflow-hidden"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* Cabecera: nombre dieta + cantidad */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ backgroundColor: 'var(--color-bg-surface)' }}
              >
                <div>
                  <span className="text-sm font-semibold text-primary">{dieta.nombre}</span>
                  <span className="ml-2 text-xs text-text-muted">({dieta.codigo})</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-muted">Porciones:</label>
                  <input
                    type="number"
                    min="0"
                    value={cantidad}
                    onChange={(e) =>
                      actualizarItem(dieta.id, 'cantidad', parseInt(e.target.value) || 0)
                    }
                    className="form-input w-20 text-center text-sm"
                  />
                </div>
              </div>

              {/* Opciones por componente — solo si hay porciones > 0 */}
              {cantidad > 0 && componentesDelDia.length > 0 && (
                <div
                  className="px-4 py-3 space-y-3 border-t"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-app)' }}
                >
                  {componentesDelDia.map((mc) => {
                    const opciones = mc.opciones_carta;
                    const tieneOpciones = Array.isArray(opciones) && opciones.length >= 2;
                    const recetaNombre = mc.arbol_recetas?.nombre || '—';

                    // Buscar item de esta combinacion dieta + componente
                    const itemComp = items.find(
                      (i) => i.tipo_dieta_id === dieta.id && i.menu_componente_id === mc.id
                    );
                    const opcionActual = itemComp?.opcion_seleccionada || null;

                    return (
                      <div key={mc.id} className="flex items-start justify-between gap-3 flex-wrap">
                        {/* Nombre del componente */}
                        <div className="flex-shrink-0 w-24">
                          <span className="text-xs font-semibold text-text-secondary capitalize">
                            {mc.componentes_plato?.nombre || 'Componente'}
                          </span>
                        </div>

                        {/* Selector o receta fija */}
                        {tieneOpciones ? (
                          <SelectorOpcion
                            opciones={opciones}
                            opcionActual={opcionActual}
                            onChange={(op) => actualizarOpcionItem(dieta.id, mc.id, op)}
                          />
                        ) : (
                          <span className="text-xs text-text-muted italic">
                            Fija: {recetaNombre}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Resumen total de porciones ── */}
      <div className="p-4 rounded-lg border"
        style={{ borderColor: 'var(--color-primary)', backgroundColor: 'rgba(99,102,241,0.06)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-primary">Total de porciones</span>
          <span className="text-2xl font-bold text-primary">
            {items.filter((i) => !i.menu_componente_id).reduce((s, i) => s + (i.cantidad || 0), 0)}
          </span>
        </div>

        {/* Resumen de opciones por componente con carta */}
        {Object.values(resumenOpciones).some((r) => r.totalA + r.totalB > 0) && (
          <div className="pt-3 border-t space-y-1" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
            <p className="text-xs font-semibold text-primary mb-2">Resumen por opciones:</p>
            {Object.values(resumenOpciones).map((r) => (
              <div key={r.nombreComponente} className="flex items-center gap-3 text-xs">
                <span className="text-text-secondary font-medium w-24 capitalize">{r.nombreComponente}:</span>
                <span
                  className="px-2 py-0.5 rounded font-bold"
                  style={{ backgroundColor: COLOR_A.bg, color: COLOR_A.text }}
                >
                  A ({r.opcionA}): {r.totalA}
                </span>
                <span
                  className="px-2 py-0.5 rounded font-bold"
                  style={{ backgroundColor: COLOR_B.bg, color: COLOR_B.text }}
                >
                  B ({r.opcionB}): {r.totalB}
                </span>
              </div>
            ))}
          </div>
        )}
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
