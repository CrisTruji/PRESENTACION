// ========================================
// PanelIngredientes - Lista ingredientes de receta
// ========================================

import React from 'react';
import { Edit2, AlertCircle, RefreshCw } from 'lucide-react';
import { useCicloEditorStore } from '../store/useCicloEditorStore';
import { useRecetaConIngredientes } from '../hooks/useMenuComponentes';

export default function PanelIngredientes() {
  const { componenteSeleccionado, abrirModalRecetaLocal } = useCicloEditorStore();
  const recetaId = componenteSeleccionado?.receta_id;

  // getRecetaConIngredientes retorna { ...receta, ingredientes } (estructura plana)
  // data?.receta siempre sería undefined — leer campos directamente desde data
  const { data, isLoading, isError, refetch } = useRecetaConIngredientes(recetaId);
  const ingredientes = data?.ingredientes || [];

  if (!componenteSeleccionado) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted">Selecciona un plato para ver sus ingredientes</p>
      </div>
    );
  }

  if (!recetaId) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted">El plato seleccionado no tiene receta asignada</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-8 h-8 text-error mx-auto mb-3" />
        <p className="text-sm font-medium text-error mb-1">Error al cargar ingredientes</p>
        <p className="text-xs text-text-muted mb-4">Verifica tu conexión e intenta de nuevo</p>
        <button onClick={() => refetch()} className="btn btn-outline flex items-center gap-2 mx-auto">
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 pb-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h3 className="text-base font-semibold text-primary mb-1">
            🧪 Ingredientes - {data?.nombre || (isLoading ? 'Cargando...' : 'Sin nombre')}
          </h3>
          <p className="text-sm text-text-muted">
            {data?.es_local ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-accent"></span>
                Receta Local
              </span>
            ) : (
              'Receta Estándar'
            )}
            {data?.rendimiento && ` • Rendimiento: ${data.rendimiento} porciones`}
          </p>
        </div>
        <button
          onClick={abrirModalRecetaLocal}
          className="btn btn-outline text-sm flex items-center gap-2 whitespace-nowrap"
        >
          <Edit2 className="w-4 h-4" />
          <span>Crear Variante</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center">
          <div className="spinner spinner-sm mx-auto"></div>
          <p className="mt-3 text-sm text-text-muted">Cargando ingredientes...</p>
        </div>
      ) : ingredientes.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-text-muted">Esta receta no tiene ingredientes registrados</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <table className="table w-full">
            <thead>
              <tr>
                <th className="table-header">Ingrediente</th>
                <th className="table-header text-right">Cantidad</th>
                <th className="table-header">Unidad</th>
              </tr>
            </thead>
            <tbody>
              {ingredientes.map((ing) => (
                <tr key={ing.id}>
                  <td className="table-cell">
                    <div className="font-medium text-primary text-sm">
                      {ing.arbol_materia_prima?.nombre || 'Ingrediente desconocido'}
                    </div>
                    <div className="text-xs text-text-muted">
                      {ing.arbol_materia_prima?.codigo}
                    </div>
                  </td>
                  <td className="table-cell text-right font-mono text-sm">
                    {ing.cantidad_requerida}
                  </td>
                  <td className="table-cell text-text-muted text-sm">
                    {ing.unidad_medida}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Costo estimado */}
      {data?.costo_porcion && (
        <div className="mt-6 p-4 bg-bg-surface rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary font-medium">Costo por porción:</span>
            <span className="font-semibold text-primary text-lg">
              ${Number(data.costo_porcion).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
