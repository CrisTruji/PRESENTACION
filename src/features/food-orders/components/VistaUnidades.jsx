// ========================================
// VistaUnidades - Tab: pedidos por unidad con detalle completo
// Muestra recetas pedidas, cantidades por dieta y estado de envío
// Para operaciones carta_menu (Eiren): tabla especial con columnas Opcion A / Opcion B
// ========================================

import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { usePedidosPorFecha } from '../hooks/usePedidos';
import { useConsolidadoStore } from '../store/useConsolidadoStore';
import { ETIQUETAS_ESTADO_PEDIDO } from '@/shared/types/menu';

export default function VistaUnidades() {
  const { filtroFecha, filtroServicio, filtroUnidad } = useConsolidadoStore();
  const { data: pedidos, isLoading } = usePedidosPorFecha(filtroFecha, filtroServicio);
  const [expandidos, setExpandidos] = useState({});

  const toggleExpandir = (id) =>
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="spinner spinner-sm mx-auto" />
        <p className="mt-3 text-sm text-text-muted">Cargando pedidos...</p>
      </div>
    );
  }

  if (!pedidos || pedidos.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-text-muted">No hay pedidos para esta fecha y servicio</p>
      </div>
    );
  }

  const pedidosFiltrados = filtroUnidad
    ? pedidos.filter((p) => p.operacion_id === filtroUnidad)
    : pedidos;

  if (pedidosFiltrados.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-text-muted">Esta unidad no tiene pedidos para la fecha y servicio seleccionados</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pedidosFiltrados.map((pedido) => {
        const items = pedido.pedido_items_servicio || [];
        const totalPorciones = items.reduce((sum, i) => sum + (i.cantidad || 0), 0);
        const esCartaMenu = pedido.operaciones?.tipo_operacion === 'carta_menu';

        // ── Agrupacion para unidades CICLICAS (comportamiento actual) ──
        const porComponente = {};
        if (!esCartaMenu) {
          for (const item of items) {
            if (!item.cantidad || item.cantidad === 0) continue;
            const comp = item.menu_componentes?.componentes_plato;
            const receta = item.menu_componentes?.arbol_recetas;
            const dieta = item.tipos_dieta;
            if (!comp || !dieta) continue;

            const compKey = comp.codigo;
            if (!porComponente[compKey]) {
              porComponente[compKey] = {
                nombre: comp.nombre,
                orden: comp.orden ?? 99,
                receta: receta?.nombre || '—',
                dietas: {},
                total: 0,
              };
            }
            porComponente[compKey].dietas[dieta.codigo] =
              (porComponente[compKey].dietas[dieta.codigo] || 0) + item.cantidad;
            porComponente[compKey].total += item.cantidad;
          }
        }

        // ── Agrupacion para CARTA MENU (Eiren): por componente → opcion A/B → dieta ──
        const porComponenteCarta = {};
        if (esCartaMenu) {
          for (const item of items) {
            if (!item.cantidad || item.cantidad === 0) continue;
            const mc = item.menu_componentes;
            const comp = mc?.componentes_plato;
            const dieta = item.tipos_dieta;
            if (!comp || !dieta) continue;

            const compKey = comp.codigo;
            const opcion = item.opcion_seleccionada || 'sin_opcion';

            if (!porComponenteCarta[compKey]) {
              const opciones = mc.opciones_carta;
              porComponenteCarta[compKey] = {
                nombre: comp.nombre,
                orden: comp.orden ?? 99,
                tieneOpciones: Array.isArray(opciones) && opciones.length >= 2,
                nombreOpcionA: Array.isArray(opciones) ? opciones.find((o) => o.opcion === 'A')?.nombre || 'Opción A' : '',
                nombreOpcionB: Array.isArray(opciones) ? opciones.find((o) => o.opcion === 'B')?.nombre || 'Opción B' : '',
                recetaFija: mc.arbol_recetas?.nombre || '—',
                opcionA: {},
                opcionB: {},
                sinOpcion: {},
                totalA: 0,
                totalB: 0,
                total: 0,
              };
            }

            const bucket = opcion === 'A' ? 'opcionA' : opcion === 'B' ? 'opcionB' : 'sinOpcion';
            porComponenteCarta[compKey][bucket][dieta.codigo] =
              (porComponenteCarta[compKey][bucket][dieta.codigo] || 0) + item.cantidad;
            if (opcion === 'A') porComponenteCarta[compKey].totalA += item.cantidad;
            else if (opcion === 'B') porComponenteCarta[compKey].totalB += item.cantidad;
            porComponenteCarta[compKey].total += item.cantidad;
          }
        }

        const componentes = Object.values(porComponente).sort((a, b) => a.orden - b.orden);
        const componentesCarta = Object.values(porComponenteCarta).sort((a, b) => a.orden - b.orden);
        const expandido = expandidos[pedido.id];

        return (
          <div key={pedido.id}
               className="border rounded-xl overflow-hidden"
               style={{ borderColor: 'var(--color-border)' }}>

            {/* ── Cabecera del pedido ── */}
            <div
              onClick={() => toggleExpandir(pedido.id)}
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-app transition-colors bg-bg-surface"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {expandido
                  ? <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
                }
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">
                    {pedido.operaciones?.nombre || 'Unidad'}
                  </p>
                  <p className="text-xs text-text-muted font-mono">
                    {pedido.operaciones?.codigo}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Total porciones */}
                <span className="text-xs text-text-muted">
                  <span className="font-semibold text-primary">{totalPorciones}</span> porciones
                </span>

                {/* Hora envío */}
                {pedido.hora_envio && (
                  <span className="text-xs font-mono text-text-muted">
                    {new Date(pedido.hora_envio).toLocaleTimeString('es-CO', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                )}

                {/* En hora */}
                {pedido.hora_envio ? (
                  pedido.enviado_en_hora ? (
                    <span className="flex items-center gap-1 text-xs text-success font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" /> A tiempo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-error font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Tardío
                    </span>
                  )
                ) : null}

                {/* Estado badge */}
                <span className={`badge text-xs ${
                  pedido.estado === 'enviado'      ? 'badge-success'   :
                  pedido.estado === 'consolidado'  ? 'badge-primary'   :
                  pedido.estado === 'borrador'     ? 'badge-warning'   :
                  'badge-secondary'
                }`}>
                  {ETIQUETAS_ESTADO_PEDIDO[pedido.estado] || pedido.estado}
                </span>
              </div>
            </div>

            {/* ── Detalle expandido ── */}
            {expandido && (
              <div className="border-t bg-bg-app"
                   style={{ borderColor: 'var(--color-border)' }}>

                {/* ── Tabla CICLICA (comportamiento actual) ── */}
                {!esCartaMenu && (
                  componentes.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-text-muted text-center">
                      Sin items registrados
                    </p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                          <th className="text-left px-4 py-2 text-text-muted font-semibold uppercase">Componente</th>
                          <th className="text-left px-4 py-2 text-text-muted font-semibold uppercase">Receta</th>
                          <th className="text-left px-4 py-2 text-text-muted font-semibold uppercase">Dietas</th>
                          <th className="text-right px-4 py-2 text-text-muted font-semibold uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {componentes.map((comp, idx) => (
                          <tr key={idx}
                              className="border-b last:border-0 hover:bg-bg-surface transition-colors"
                              style={{ borderColor: 'var(--color-border)' }}>
                            <td className="px-4 py-2.5 font-semibold text-primary capitalize">
                              {comp.nombre}
                            </td>
                            <td className="px-4 py-2.5 text-text-secondary truncate max-w-[180px]">
                              {comp.receta}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(comp.dietas).map(([codigo, cant]) => (
                                  <span key={codigo}
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">
                                    {codigo}: <span className="font-bold">{cant}</span>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-primary">
                              {comp.total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                          <td colSpan={3} className="px-4 py-2 text-right text-xs text-text-muted font-semibold uppercase">
                            Total porciones
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-primary">
                            {totalPorciones}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )
                )}

                {/* ── Tabla CARTA MENU (Eiren): columnas Opcion A / Opcion B ── */}
                {esCartaMenu && (
                  componentesCarta.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-text-muted text-center">
                      Sin items registrados
                    </p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                          <th className="text-left px-4 py-2 text-text-muted font-semibold uppercase w-28">Componente</th>
                          <th className="text-left px-4 py-2 font-semibold uppercase"
                              style={{ color: '#4F46E5' }}>
                            Opción A
                          </th>
                          <th className="text-left px-4 py-2 font-semibold uppercase"
                              style={{ color: '#0D9488' }}>
                            Opción B
                          </th>
                          <th className="text-right px-4 py-2 text-text-muted font-semibold uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {componentesCarta.map((comp, idx) => (
                          <tr key={idx}
                              className="border-b last:border-0 hover:bg-bg-surface transition-colors"
                              style={{ borderColor: 'var(--color-border)' }}>
                            {/* Componente */}
                            <td className="px-4 py-2.5 font-semibold text-primary capitalize align-top">
                              {comp.nombre}
                            </td>

                            {/* Opcion A */}
                            <td className="px-4 py-2.5 align-top">
                              {comp.tieneOpciones ? (
                                <div>
                                  <p className="text-text-muted mb-1 truncate max-w-[160px]"
                                     style={{ color: '#4F46E5', opacity: 0.8 }}>
                                    {comp.nombreOpcionA}
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {Object.keys(comp.opcionA).length === 0 ? (
                                      <span className="text-text-muted italic">—</span>
                                    ) : (
                                      Object.entries(comp.opcionA).map(([codigo, cant]) => (
                                        <span key={codigo}
                                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                                              style={{ backgroundColor: 'rgba(99,102,241,0.10)', color: '#4F46E5' }}>
                                          {codigo}: <span className="font-bold ml-0.5">{cant}</span>
                                        </span>
                                      ))
                                    )}
                                  </div>
                                  {comp.totalA > 0 && (
                                    <p className="mt-1 text-xs font-bold" style={{ color: '#4F46E5' }}>
                                      Subtotal: {comp.totalA}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-text-muted italic">
                                  Fija: {comp.recetaFija}
                                </span>
                              )}
                            </td>

                            {/* Opcion B */}
                            <td className="px-4 py-2.5 align-top">
                              {comp.tieneOpciones ? (
                                <div>
                                  <p className="text-text-muted mb-1 truncate max-w-[160px]"
                                     style={{ color: '#0D9488', opacity: 0.8 }}>
                                    {comp.nombreOpcionB}
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {Object.keys(comp.opcionB).length === 0 ? (
                                      <span className="text-text-muted italic">—</span>
                                    ) : (
                                      Object.entries(comp.opcionB).map(([codigo, cant]) => (
                                        <span key={codigo}
                                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                                              style={{ backgroundColor: 'rgba(20,184,166,0.10)', color: '#0D9488' }}>
                                          {codigo}: <span className="font-bold ml-0.5">{cant}</span>
                                        </span>
                                      ))
                                    )}
                                  </div>
                                  {comp.totalB > 0 && (
                                    <p className="mt-1 text-xs font-bold" style={{ color: '#0D9488' }}>
                                      Subtotal: {comp.totalB}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-text-muted italic">—</span>
                              )}
                            </td>

                            {/* Total */}
                            <td className="px-4 py-2.5 text-right font-bold text-primary align-top">
                              {comp.total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                          <td colSpan={3} className="px-4 py-2 text-right text-xs text-text-muted font-semibold uppercase">
                            Total porciones
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-primary">
                            {totalPorciones}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )
                )}

                {/* Observaciones */}
                {pedido.observaciones && (
                  <div className="px-4 py-2 border-t text-xs text-text-muted"
                       style={{ borderColor: 'var(--color-border)' }}>
                    <span className="font-semibold">Obs:</span> {pedido.observaciones}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
