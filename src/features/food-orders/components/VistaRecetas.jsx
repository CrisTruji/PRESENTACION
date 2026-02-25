// ========================================
// VistaRecetas - Tab: consolidado por receta
// Muestra cada receta con desglose por dieta, por unidad, y alertas de stock
// ========================================

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, RefreshCw, Scale, Ruler, DollarSign, Clock } from 'lucide-react';
import { useVistaRecetas } from '../hooks/useConsolidado';
import { useSustituirReceta } from '../hooks/useConsolidado';
import { useConsolidadoStore } from '../store/useConsolidadoStore';
import { useAuth } from '@/features/auth';
import notify from '@/shared/lib/notifier';

export default function VistaRecetas({ consolidadoId, onCambiarReceta }) {
  const { data: items, isLoading } = useVistaRecetas(consolidadoId);
  const [expandidos, setExpandidos] = useState({});
  const [gramajesToggle, setGramajesToggle] = useState({});
  const { consolidadoActual } = useConsolidadoStore();
  const sustituirReceta = useSustituirReceta();
  const { user } = useAuth();

  const toggleExpanded = (id) => {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="spinner spinner-sm mx-auto"></div>
        <p className="mt-3 text-sm text-text-muted">Cargando consolidado...</p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-text-muted">No hay items consolidados</p>
      </div>
    );
  }

  const handleUsarSugerencia = (item, sugerenciaRecetaId, sugerenciaNombre) => {
    if (!consolidadoId) return;
    sustituirReceta.mutate(
      {
        consolidadoId,
        recetaOriginalId: item.receta_id || item.arbol_recetas?.id,
        recetaNuevaId: sugerenciaRecetaId,
        motivo: `Sustitución por stock insuficiente → ${sugerenciaNombre}`,
        supervisorId: user?.id,
      },
      {
        onSuccess: (res) => {
          if (res.error) {
            notify.error('Error al sustituir: ' + res.error.message);
            return;
          }
          notify.success(`Receta cambiada a "${sugerenciaNombre}"`);
        },
      }
    );
  };

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const tieneAlertaStock = item.alerta_stock || false;
        const sugerencias = item.sugerencias_alternativas || [];
        const ingredientesInsuficientes = item.ingredientes_insuficientes || [];

        return (
          <div
            key={item.id}
            className={`border rounded-lg overflow-hidden ${
              tieneAlertaStock
                ? 'border-error/40'
                : ''
            }`}
            style={!tieneAlertaStock ? { borderColor: 'var(--color-border)' } : undefined}
          >
            {/* Header */}
            <div
              onClick={() => toggleExpanded(item.id)}
              className={`px-4 py-3 cursor-pointer hover:bg-bg-app transition-colors border-b ${
                tieneAlertaStock ? 'bg-error/5' : 'bg-bg-surface'
              }`}
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {expandidos[item.id] ? (
                    <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-primary truncate">
                        {item.arbol_recetas?.nombre || 'Receta'}
                      </h4>
                      <span className="badge badge-primary text-xs flex-shrink-0">
                        {item.componentes_plato?.nombre || ''}
                      </span>
                      {tieneAlertaStock && (
                        <span className="badge text-xs flex-shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error, #EF4444)' }}>
                          <AlertTriangle className="w-3 h-3 mr-1 inline" />
                          Stock insuficiente
                        </span>
                      )}
                      {/* Botón Ver gramajes */}
                      {(item.menu_componentes?.gramajes_componente_menu || []).length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setGramajesToggle((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                          }}
                          className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors font-medium border border-accent/30 rounded px-2 py-0.5 bg-accent/5 hover:bg-accent/10 flex-shrink-0"
                        >
                          <Ruler className="w-3 h-3" />
                          {gramajesToggle[item.id] ? 'Ocultar gramajes ▲' : 'Ver gramajes ▼'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      Total: <span className="font-semibold text-primary">{item.cantidad_total}</span> porciones
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCambiarReceta?.(item);
                  }}
                  className="btn btn-outline text-xs py-1 px-2 ml-2 flex-shrink-0"
                >
                  Cambiar
                </button>
              </div>
            </div>

            {/* Detalles expandidos */}
            {expandidos[item.id] && (
              <div className="px-4 py-4 space-y-4 bg-bg-app">

                {/* Alerta de stock insuficiente */}
                {tieneAlertaStock && ingredientesInsuficientes.length > 0 && (
                  <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                    <div className="px-3 py-2 bg-error/10">
                      <h5 className="text-xs font-semibold text-error flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Ingredientes con stock insuficiente
                      </h5>
                    </div>
                    <div className="p-3 space-y-2">
                      {ingredientesInsuficientes.map((ing, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-error">{ing.nombre}</span>
                            <span className="text-error font-mono">
                              Falta: {Math.abs(ing.diferencia)}{ing.unidad_medida}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <span>Necesario: {ing.total_requerido}{ing.unidad_medida}</span>
                            <span>•</span>
                            <span>Disponible: {ing.stock_actual}{ing.unidad_medida}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Sugerencias alternativas */}
                    {sugerencias.length > 0 && (
                      <div className="px-3 pb-3 border-t" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
                        <h5 className="text-xs font-semibold text-text-secondary mt-3 mb-2 flex items-center gap-1">
                          <RefreshCw className="w-3.5 h-3.5" />
                          Sugerencias alternativas:
                        </h5>
                        <div className="space-y-2">
                          {sugerencias.map((sug, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2.5 bg-bg-surface rounded-lg border"
                              style={{ borderColor: 'var(--color-border)' }}
                            >
                              <div>
                                <div className="text-sm font-medium text-primary">{sug.nombre}</div>
                                <div className="text-xs text-text-muted">
                                  {sug.stock_disponible && (
                                    <span>Stock: {sug.stock_disponible}{sug.unidad_medida} </span>
                                  )}
                                  {sug.costo_diferencia && (
                                    <span className={sug.costo_diferencia > 0 ? 'text-warning' : 'text-success'}>
                                      • Costo: {sug.costo_diferencia > 0 ? '+' : ''}{sug.costo_diferencia}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleUsarSugerencia(item, sug.id, sug.nombre)}
                                disabled={sustituirReceta.isPending}
                                className="btn btn-outline text-xs py-1 px-2 flex-shrink-0"
                                style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}
                              >
                                {sustituirReceta.isPending ? (
                                  <div className="spinner spinner-sm" />
                                ) : (
                                  'Usar esta'
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tabla de gramajes colapsable */}
                {gramajesToggle[item.id] && (
                  <TablaGramajes item={item} />
                )}

                {/* Desglose por dieta + gramajes */}
                {item.desglose_dietas && Object.keys(item.desglose_dietas).length > 0 && (
                  <DesgloseDietasGramajes item={item} />
                )}

                {/* Desglose por unidad */}
                {item.desglose_unidades && Object.keys(item.desglose_unidades).length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-text-secondary uppercase mb-2">
                      Por unidad:
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(item.desglose_unidades).map(([unidad, cantidad]) => (
                        cantidad > 0 && (
                          <span
                            key={unidad}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-accent/10 border border-accent text-accent font-medium"
                          >
                            <span>{unidad}:</span>
                            <span className="ml-1 font-bold">{cantidad}</span>
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Total MP estimado */}
                <TotalMPEstimado item={item} />

                {/* Costo por dieta (próximamente) */}
                <CostoPorDieta item={item} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ========================================
// COMPONENTE: DesgloseDietasGramajes
// Cruza desglose_dietas (porciones por dieta) con gramajes_componente_menu
// Muestra: Dieta | Gramaje | Porciones | Total
// ========================================
function DesgloseDietasGramajes({ item }) {
  // gramajes_componente_menu puede venir como array desde menu_componentes
  const gramajes = item.menu_componentes?.gramajes_componente_menu || [];

  // Construir mapa: codigo_dieta → { gramaje, unidad_medida, nombre }
  const gramajeMap = {};
  for (const g of gramajes) {
    if (g.excluir) continue;
    const codigo = g.tipos_dieta?.codigo;
    if (codigo) {
      gramajeMap[codigo] = {
        gramaje: g.gramaje || 0,
        unidad_medida: g.unidad_medida || 'g',
        nombre: g.tipos_dieta?.nombre || codigo,
      };
    }
  }

  // Cruzar con desglose_dietas
  const filas = Object.entries(item.desglose_dietas || {})
    .filter(([, cant]) => cant > 0)
    .map(([codigoDieta, porciones]) => {
      const info = gramajeMap[codigoDieta];
      const gramaje = info?.gramaje || 0;
      const unidad = info?.unidad_medida || 'g';
      const totalGramos = gramaje * porciones;
      return {
        codigo: codigoDieta,
        nombre: info?.nombre || codigoDieta,
        gramaje,
        unidad,
        porciones,
        totalGramos,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  if (filas.length === 0) return null;

  const tieneAlgunGramaje = filas.some((f) => f.gramaje > 0);

  return (
    <div>
      <h5 className="text-xs font-semibold text-text-secondary uppercase mb-2 flex items-center gap-1">
        <Scale className="w-3.5 h-3.5" />
        Desglose por dieta
        {tieneAlgunGramaje && (
          <span className="ml-1 text-text-muted normal-case font-normal">(con gramajes)</span>
        )}
      </h5>
      <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-bg-surface border-b" style={{ borderColor: 'var(--color-border)' }}>
              <th className="text-left px-3 py-2 text-text-muted font-medium">Dieta</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium">Gramaje</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium">Porciones</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium">Total MP</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, idx) => {
              const totalKg = fila.totalGramos / 1000;
              return (
                <tr
                  key={fila.codigo}
                  className={idx % 2 === 0 ? 'bg-bg-app' : 'bg-bg-surface'}
                >
                  <td className="px-3 py-1.5 font-medium text-primary">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: `hsl(${(idx * 47) % 360}, 60%, 55%)` }}
                      />
                      {fila.nombre}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right text-text-secondary">
                    {fila.gramaje > 0 ? (
                      <span className="font-mono">{fila.gramaje} {fila.unidad}</span>
                    ) : (
                      <span className="text-text-muted italic">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-primary">
                    {fila.porciones}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    {fila.gramaje > 0 ? (
                      <span className="text-accent font-semibold">
                        {totalKg >= 1
                          ? `${totalKg.toFixed(2)} kg`
                          : `${fila.totalGramos.toFixed(0)} g`}
                      </span>
                    ) : (
                      <span className="text-text-muted italic">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Totales */}
          <tfoot>
            <tr className="border-t font-semibold bg-bg-surface" style={{ borderColor: 'var(--color-border)' }}>
              <td className="px-3 py-2 text-text-secondary">Total</td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2 text-right font-mono text-primary">
                {filas.reduce((s, f) => s + f.porciones, 0)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-accent">
                {(() => {
                  const totalG = filas.reduce((s, f) => s + f.totalGramos, 0);
                  const totalKg = totalG / 1000;
                  return totalKg >= 1
                    ? `${totalKg.toFixed(2)} kg`
                    : `${totalG.toFixed(0)} g`;
                })()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ========================================
// COMPONENTE: TablaGramajes
// Tabla de solo lectura con gramajes por tipo de dieta.
// Equivale a la tabla Excel que maneja el supervisor.
// Se muestra/oculta con el botón "Ver gramajes" del header.
// ========================================
function TablaGramajes({ item }) {
  const gramajes = item.menu_componentes?.gramajes_componente_menu || [];

  if (gramajes.length === 0) {
    return (
      <div className="px-3 py-3 text-center text-xs text-text-muted italic border rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
        Sin gramajes configurados para este componente
      </div>
    );
  }

  // Ordenar: primero incluidas, luego excluidas
  const filas = [...gramajes].sort((a, b) => {
    if (!!a.excluir !== !!b.excluir) return a.excluir ? 1 : -1;
    return (a.tipos_dieta?.nombre || '').localeCompare(b.tipos_dieta?.nombre || '');
  });

  return (
    <div>
      <h5 className="text-xs font-semibold text-text-secondary uppercase mb-2 flex items-center gap-1">
        <Ruler className="w-3.5 h-3.5 text-accent" />
        Gramajes por tipo de dieta
        <span className="text-text-muted normal-case font-normal ml-1">(solo lectura)</span>
      </h5>
      <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-accent)', opacity: 1 }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'color-mix(in srgb, var(--color-accent) 6%, transparent)' }}>
              <th className="text-left px-3 py-2 text-text-muted font-medium">Dieta</th>
              <th className="text-center px-3 py-2 text-text-muted font-medium">Código</th>
              <th className="text-right px-3 py-2 text-text-muted font-medium">Gramaje</th>
              <th className="text-center px-3 py-2 text-text-muted font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {filas.map((g, idx) => {
              const excluida = !!g.excluir;
              return (
                <tr
                  key={idx}
                  className={excluida ? 'opacity-50' : ''}
                  style={{ backgroundColor: idx % 2 === 0 ? 'var(--color-bg-app)' : 'var(--color-bg-surface)' }}
                >
                  <td className="px-3 py-1.5 font-medium text-primary">
                    {g.tipos_dieta?.nombre || '—'}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <span className="font-mono text-xs bg-bg-surface border rounded px-1.5 py-0.5 text-text-secondary" style={{ borderColor: 'var(--color-border)' }}>
                      {g.tipos_dieta?.codigo || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold">
                    {excluida ? (
                      <span className="text-text-muted">—</span>
                    ) : g.gramaje > 0 ? (
                      <span className="text-accent">{g.gramaje} {g.unidad_medida || 'g'}</span>
                    ) : (
                      <span className="text-text-muted italic">sin definir</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    {excluida ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-error/10 text-error border border-error/20">
                        Excluida
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                        Incluida
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========================================
// COMPONENTE: TotalMPEstimado
// Suma todos los totales (gramaje × porciones) de todas las dietas
// Muestra un resumen visual de MP total necesario para este componente
// ========================================
function TotalMPEstimado({ item }) {
  const gramajes = item.menu_componentes?.gramajes_componente_menu || [];
  const desglose = item.desglose_dietas || {};

  // Si no hay gramajes configurados, no mostrar nada
  if (gramajes.length === 0) return null;

  const gramajeMap = {};
  for (const g of gramajes) {
    if (g.excluir) continue;
    const codigo = g.tipos_dieta?.codigo;
    if (codigo) {
      gramajeMap[codigo] = g.gramaje || 0;
    }
  }

  // Calcular total de gramos
  let totalGramos = 0;
  let porcionesConGramaje = 0;
  let porcionesTotales = 0;

  for (const [codigo, porciones] of Object.entries(desglose)) {
    if (porciones <= 0) continue;
    porcionesTotales += porciones;
    const gramaje = gramajeMap[codigo];
    if (gramaje != null && gramaje > 0) {
      totalGramos += gramaje * porciones;
      porcionesConGramaje += porciones;
    }
  }

  if (totalGramos === 0) return null;

  const totalKg = totalGramos / 1000;
  const cobertura = porcionesTotales > 0
    ? Math.round((porcionesConGramaje / porcionesTotales) * 100)
    : 0;

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 rounded-lg border"
      style={{ borderColor: 'var(--color-accent)', backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)' }}
    >
      <div className="flex items-center gap-2">
        <Scale className="w-4 h-4 text-accent" />
        <span className="text-sm font-semibold text-primary">MP total estimado</span>
        {cobertura < 100 && (
          <span className="text-xs text-text-muted">
            ({cobertura}% de porciones con gramaje)
          </span>
        )}
      </div>
      <div className="text-right">
        <span className="text-base font-bold text-accent font-mono">
          {totalKg >= 1
            ? `${totalKg.toFixed(2)} kg`
            : `${totalGramos.toFixed(0)} g`}
        </span>
        {totalKg >= 1 && (
          <span className="ml-2 text-xs text-text-muted font-mono">
            ({totalGramos.toFixed(0)} g)
          </span>
        )}
      </div>
    </div>
  );
}

// ========================================
// COMPONENTE: CostoPorDieta
// Placeholder "Próximamente" para el cálculo de costo por tipo de dieta.
// El cálculo usa: costo_porcion_estandar × (gramaje_dieta / gramaje_promedio_dietas)
// donde costo_porcion_estandar = Σ (cant_ing / rendimiento) × (costo_promedio / factor_unidad)
// Requiere que arbol_materia_prima.costo_promedio esté actualizado desde facturas de recepción.
// ========================================
function CostoPorDieta({ item }) {
  // Solo mostrar si hay gramajes configurados (tiene sentido mostrar el placeholder)
  const gramajes = item.menu_componentes?.gramajes_componente_menu || [];
  if (gramajes.filter((g) => !g.excluir).length === 0) return null;

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 6%, transparent)' }}
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Costo por tipo de dieta</span>
        </div>
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-warning, #F59E0B) 15%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-warning, #F59E0B) 40%, transparent)',
            color: 'var(--color-warning, #F59E0B)',
          }}
        >
          <Clock className="w-3 h-3" />
          Próximamente
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 bg-bg-app">
        <p className="text-xs text-text-muted leading-relaxed">
          Este módulo calculará el <strong className="text-text-secondary">costo por porción</strong> según
          el tipo de dieta y los gramajes configurados, usando los precios promedio de
          materia prima de los últimos 3 meses.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-text-muted bg-bg-surface border rounded px-2 py-0.5" style={{ borderColor: 'var(--color-border)' }}>
            <Scale className="w-3 h-3" />
            Gramajes configurados: {gramajes.filter((g) => !g.excluir && g.gramaje > 0).length}
          </span>
          {item.arbol_recetas?.receta_ingredientes?.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-text-muted bg-bg-surface border rounded px-2 py-0.5" style={{ borderColor: 'var(--color-border)' }}>
              <Ruler className="w-3 h-3" />
              Ingredientes: {item.arbol_recetas.receta_ingredientes.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
