// ========================================
// VistaRecetas - Tab: consolidado por receta
// Muestra cada receta con desglose por dieta, por unidad, y alertas de stock
// ========================================

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { useVistaRecetas } from '../hooks/useConsolidado';
import { useSustituirReceta } from '../hooks/useConsolidado';
import { useConsolidadoStore } from '../store/useConsolidadoStore';
import { useAuth } from '@/context/auth';
import notify from '@/utils/notifier';

export default function VistaRecetas({ consolidadoId, onCambiarReceta }) {
  const { data: items, isLoading } = useVistaRecetas(consolidadoId);
  const [expandidos, setExpandidos] = useState({});
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

                {/* Desglose por dieta */}
                {item.desglose_dietas && Object.keys(item.desglose_dietas).length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-text-secondary uppercase mb-2">
                      Por tipo de dieta:
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(item.desglose_dietas).map(([dieta, cantidad]) => (
                        cantidad > 0 && (
                          <div
                            key={dieta}
                            className="bg-bg-surface rounded-lg p-2.5 border"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            <div className="text-xs font-medium text-text-secondary uppercase">{dieta}</div>
                            <div className="text-base font-bold text-primary mt-1">{cantidad}</div>
                            <div className="text-xs text-text-muted">porciones</div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
