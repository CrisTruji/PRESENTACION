// ========================================
// VistaIngredientes - Tab: ingredientes totales + alertas stock
// ========================================

import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useIngredientesTotales } from '../hooks/useConsolidado';
import AlertaStock from './AlertaStock';

export default function VistaIngredientes({ consolidadoId }) {
  const { data: ingredientes, isLoading } = useIngredientesTotales(consolidadoId);

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="spinner spinner-sm mx-auto"></div>
        <p className="mt-3 text-sm text-text-muted">Calculando ingredientes...</p>
      </div>
    );
  }

  if (!ingredientes || ingredientes.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-text-muted">No hay ingredientes para calcular</p>
      </div>
    );
  }

  const insuficientes = ingredientes.filter((i) => i.estado_stock === 'INSUFICIENTE');
  const suficientes = ingredientes.filter((i) => i.estado_stock === 'SUFICIENTE');

  return (
    <div className="space-y-6">
      {/* Alertas de stock insuficiente */}
      {insuficientes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-error mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Stock Insuficiente ({insuficientes.length})
          </h4>
          <div className="space-y-2">
            {insuficientes.map((ing) => (
              <AlertaStock key={ing.materia_prima_id} ingrediente={ing} />
            ))}
          </div>
        </div>
      )}

      {/* Tabla completa de ingredientes */}
      <div>
        <h4 className="text-sm font-semibold text-primary mb-3">
          📦 Todos los ingredientes ({ingredientes.length})
        </h4>
        <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <table className="table w-full">
            <thead>
              <tr>
                <th className="table-header">Ingrediente</th>
                <th className="table-header text-right">Requerido</th>
                <th className="table-header text-right">Disponible</th>
                <th className="table-header text-right">Diferencia</th>
                <th className="table-header text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ingredientes.map((ing) => (
                <tr
                  key={ing.materia_prima_id}
                  className={ing.estado_stock === 'INSUFICIENTE' ? 'bg-error/5' : ''}
                >
                  <td className="table-cell">
                    <div className="font-semibold text-primary text-sm">{ing.nombre}</div>
                    <div className="text-xs text-text-muted">{ing.codigo}</div>
                  </td>
                  <td className="table-cell text-right font-mono text-sm">
                    {ing.total_requerido} {ing.unidad_medida}
                  </td>
                  <td className="table-cell text-right font-mono text-sm">
                    {ing.stock_actual} {ing.unidad_medida}
                  </td>
                  <td className={`table-cell text-right font-mono font-semibold text-sm ${
                    ing.diferencia < 0 ? 'text-error' : 'text-success'
                  }`}>
                    {ing.diferencia > 0 ? '+' : ''}{ing.diferencia} {ing.unidad_medida}
                  </td>
                  <td className="table-cell text-center">
                    {ing.estado_stock === 'SUFICIENTE' ? (
                      <CheckCircle className="w-4 h-4 text-success inline" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-error inline" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
