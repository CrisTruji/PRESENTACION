// src/components/recetas/CostoReceta.jsx
import React, { useState, useEffect } from 'react';
import { costosRecetasService } from '@/features/recipes';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Loader2,
  RefreshCw,
  PieChart,
  BarChart3,
  Package,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

/**
 * Componente para mostrar y calcular costos de una receta
 * @param {Object} props
 * @param {number} props.recetaId - ID de la receta
 * @param {number} props.porciones - Número de porciones de la receta
 * @param {string} props.nombreReceta - Nombre de la receta (opcional)
 * @param {boolean} props.mostrarDesglose - Mostrar desglose de ingredientes (default: true)
 * @param {boolean} props.compacto - Modo compacto sin desglose (default: false)
 * @param {function} props.onCostoCalculado - Callback cuando se calcula el costo
 */
export default function CostoReceta({
  recetaId,
  porciones = 1,
  nombreReceta = '',
  mostrarDesglose = true,
  compacto = false,
  onCostoCalculado
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [costoData, setCostoData] = useState(null);
  const [desgloseExpandido, setDesgloseExpandido] = useState(false);

  useEffect(() => {
    if (recetaId) {
      cargarCostos();
    }
  }, [recetaId]);

  async function cargarCostos() {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await costosRecetasService.getDesgloseCostosReceta(recetaId);

      if (err) {
        setError(err.message || 'Error al calcular costos');
        return;
      }

      setCostoData(data);

      // Callback con el costo calculado
      if (onCostoCalculado && data?.resumen) {
        onCostoCalculado({
          costoTotal: data.resumen.costo_total,
          costoPorPorcion: porciones > 0 ? data.resumen.costo_total / porciones : 0,
          ingredientesConCosto: data.resumen.ingredientes_con_costo,
          ingredientesSinCosto: data.resumen.ingredientes_sin_costo
        });
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  // Modo compacto: solo muestra costo total
  if (compacto) {
    if (loading) {
      return (
        <div className="inline-flex items-center gap-1 text-muted">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-sm">Calculando...</span>
        </div>
      );
    }

    if (error || !costoData) {
      return (
        <div className="inline-flex items-center gap-1 text-error">
          <AlertCircle size={14} />
          <span className="text-sm">Sin costo</span>
        </div>
      );
    }

    const costoPorPorcion = porciones > 0
      ? costoData.resumen.costo_total / porciones
      : 0;

    return (
      <div className="inline-flex items-center gap-2">
        <span className="font-semibold text-success">
          ${costoData.resumen.costo_total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
        </span>
        {porciones > 1 && (
          <span className="text-xs text-muted">
            (${costoPorPorcion.toFixed(2)}/porción)
          </span>
        )}
      </div>
    );
  }

  // Modo completo
  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted">Calculando costos de la receta...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 p-4 bg-error/10 border border-error/20 rounded-base">
          <AlertCircle size={24} className="text-error" />
          <div>
            <h4 className="font-medium text-error">Error al calcular costos</h4>
            <p className="text-sm text-muted">{error}</p>
          </div>
          <button
            onClick={cargarCostos}
            className="ml-auto btn btn-outline btn-sm"
          >
            <RefreshCw size={14} className="mr-1" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!costoData) {
    return null;
  }

  const { desglose, resumen } = costoData;
  const costoPorPorcion = porciones > 0 ? resumen.costo_total / porciones : 0;
  const porcentajeCosteado = parseFloat(resumen.porcentaje_costeado);

  // Ordenar desglose por costo (mayor a menor)
  const desgloseOrdenado = [...desglose].sort((a, b) => b.costo_total - a.costo_total);

  // Top 3 ingredientes más costosos
  const top3Costosos = desgloseOrdenado.slice(0, 3);

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
              <DollarSign size={20} className="text-success" />
            </div>
            <div>
              <h3 className="font-semibold">Costo de la Receta</h3>
              {nombreReceta && (
                <p className="text-sm text-muted">{nombreReceta}</p>
              )}
            </div>
          </div>
          <button
            onClick={cargarCostos}
            className="btn btn-icon btn-outline"
            title="Recalcular"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="card-body">
        {/* Resumen de costos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Costo Total */}
          <div className="bg-success/5 border border-success/20 rounded-base p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-success" />
              <span className="text-sm font-medium text-success">Costo Total</span>
            </div>
            <div className="text-2xl font-bold text-success">
              ${resumen.costo_total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Costo por Porción */}
          <div className="bg-primary/5 border border-primary/20 rounded-base p-4">
            <div className="flex items-center gap-2 mb-2">
              <PieChart size={16} className="text-primary" />
              <span className="text-sm font-medium text-primary">Por Porción</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              ${costoPorPorcion.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted mt-1">
              {porciones} {porciones === 1 ? 'porción' : 'porciones'}
            </div>
          </div>

          {/* Estado del Costeo */}
          <div className={`border rounded-base p-4 ${
            porcentajeCosteado === 100
              ? 'bg-success/5 border-success/20'
              : porcentajeCosteado >= 80
                ? 'bg-warning/5 border-warning/20'
                : 'bg-error/5 border-error/20'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={16} className={
                porcentajeCosteado === 100
                  ? 'text-success'
                  : porcentajeCosteado >= 80
                    ? 'text-warning'
                    : 'text-error'
              } />
              <span className={`text-sm font-medium ${
                porcentajeCosteado === 100
                  ? 'text-success'
                  : porcentajeCosteado >= 80
                    ? 'text-warning'
                    : 'text-error'
              }`}>
                Cobertura
              </span>
            </div>
            <div className={`text-2xl font-bold ${
              porcentajeCosteado === 100
                ? 'text-success'
                : porcentajeCosteado >= 80
                  ? 'text-warning'
                  : 'text-error'
            }`}>
              {porcentajeCosteado}%
            </div>
            <div className="text-xs text-muted mt-1">
              {resumen.ingredientes_con_costo} de {resumen.total_ingredientes} ingredientes
            </div>
          </div>
        </div>

        {/* Barra de progreso de costeo */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted">Ingredientes costeados</span>
            <span className="font-medium">
              {resumen.ingredientes_con_costo}/{resumen.total_ingredientes}
            </span>
          </div>
          <div className="w-full bg-border rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                porcentajeCosteado === 100
                  ? 'bg-success'
                  : porcentajeCosteado >= 80
                    ? 'bg-warning'
                    : 'bg-error'
              }`}
              style={{ width: `${porcentajeCosteado}%` }}
            />
          </div>
        </div>

        {/* Top 3 ingredientes más costosos */}
        {top3Costosos.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-muted mb-3 flex items-center gap-2">
              <TrendingUp size={14} />
              Ingredientes más costosos
            </h4>
            <div className="space-y-2">
              {top3Costosos.map((ing, index) => {
                const porcentajeDelTotal = resumen.costo_total > 0
                  ? ((ing.costo_total / resumen.costo_total) * 100).toFixed(1)
                  : 0;

                return (
                  <div
                    key={ing.ingrediente_id}
                    className="flex items-center gap-3 p-2 bg-surface rounded-base"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-warning/20 text-warning' :
                      index === 1 ? 'bg-muted/20 text-muted' :
                      'bg-primary/20 text-primary'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{ing.producto_nombre}</div>
                      <div className="text-xs text-muted">
                        {ing.cantidad} {ing.unidad} × ${ing.costo_unitario.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-success">
                        ${ing.costo_total.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted">
                        {porcentajeDelTotal}% del total
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ingredientes sin costo */}
        {resumen.ingredientes_sin_costo > 0 && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-base mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-warning mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-warning">
                  {resumen.ingredientes_sin_costo} ingrediente(s) sin costo asignado
                </h4>
                <p className="text-xs text-muted mt-1">
                  Estos ingredientes no tienen costo promedio calculado. Registra facturas con estos productos para actualizar sus costos.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Desglose completo */}
        {mostrarDesglose && desglose.length > 0 && (
          <div>
            <button
              onClick={() => setDesgloseExpandido(!desgloseExpandido)}
              className="w-full flex items-center justify-between p-3 bg-surface rounded-base hover:bg-hover transition-colors"
            >
              <span className="font-medium flex items-center gap-2">
                <Package size={16} />
                Ver desglose completo ({desglose.length} ingredientes)
              </span>
              {desgloseExpandido ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </button>

            {desgloseExpandido && (
              <div className="mt-3 overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Ingrediente</th>
                      <th className="table-header-cell text-center">Cantidad</th>
                      <th className="table-header-cell text-right">Costo Unit.</th>
                      <th className="table-header-cell text-right">Subtotal</th>
                      <th className="table-header-cell text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {desgloseOrdenado.map((ing) => (
                      <tr key={ing.ingrediente_id} className="table-row">
                        <td className="table-cell">
                          <div>
                            <div className="font-medium text-sm">{ing.producto_nombre}</div>
                            <div className="text-xs text-muted">{ing.producto_codigo}</div>
                          </div>
                        </td>
                        <td className="table-cell text-center">
                          <span className="text-sm">
                            {ing.cantidad} {ing.unidad}
                          </span>
                        </td>
                        <td className="table-cell text-right">
                          {ing.costo_unitario > 0 ? (
                            <span className="text-sm">
                              ${ing.costo_unitario.toFixed(2)}/{ing.unidad_stock}
                            </span>
                          ) : (
                            <span className="text-sm text-muted">—</span>
                          )}
                        </td>
                        <td className="table-cell text-right">
                          {ing.costo_total > 0 ? (
                            <span className="font-semibold text-success">
                              ${ing.costo_total.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted">$0.00</span>
                          )}
                        </td>
                        <td className="table-cell text-center">
                          {ing.costo_unitario > 0 ? (
                            <CheckCircle size={16} className="text-success mx-auto" />
                          ) : (
                            <XCircle size={16} className="text-error mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface">
                      <td colSpan={3} className="table-cell font-semibold text-right">
                        Total:
                      </td>
                      <td className="table-cell text-right">
                        <span className="text-lg font-bold text-success">
                          ${resumen.costo_total.toFixed(2)}
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Componente de badge de costo para mostrar en listas
 */
export function CostoBadge({ recetaId, porciones = 1 }) {
  const [costo, setCosto] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      try {
        const { data } = await costosRecetasService.calcularCostoReceta(recetaId);
        setCosto(data);
      } catch (err) {
        console.error('Error calculando costo:', err);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, [recetaId]);

  if (loading) {
    return <Loader2 size={12} className="animate-spin text-muted" />;
  }

  if (costo === null || costo === undefined) {
    return <span className="text-xs text-muted">Sin costo</span>;
  }

  return (
    <span className="badge badge-success text-xs">
      ${costo.toFixed(2)}
    </span>
  );
}
