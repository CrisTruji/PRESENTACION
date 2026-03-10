// ========================================
// PanelIngredientes - Lista ingredientes de receta
// Incluye selector de variantes locales
// ========================================

import React from 'react';
import { Edit2, AlertCircle, RefreshCw, Star, ChevronRight } from 'lucide-react';
import { useCicloEditorStore } from '../store/useCicloEditorStore';
import { useRecetaConIngredientes, useActualizarReceta, useVariantesLocalesReceta } from '../hooks/useMenuComponentes';
import notify from '@/shared/lib/notifier';

export default function PanelIngredientes() {
  const {
    componenteSeleccionado,
    abrirModalRecetaLocal,
    actualizarRecetaDeComponente,
  } = useCicloEditorStore();

  const recetaId = componenteSeleccionado?.receta_id;
  const menuComponenteId = componenteSeleccionado?.id;

  const { data, isLoading, isError, refetch } = useRecetaConIngredientes(recetaId);
  const actualizarReceta = useActualizarReceta();
  const ingredientes = data?.ingredientes || [];

  // Receta base = si es local → su parent, si es estándar → ella misma
  const recetaBaseId = data?.es_local ? data.parent_id : data?.id;
  const { data: variantes } = useVariantesLocalesReceta(recetaBaseId);
  const tieneVariantes = variantes && variantes.length > 0;

  const cambiarAVariante = (nuevaRecetaId) => {
    if (!menuComponenteId || nuevaRecetaId === recetaId) return;
    actualizarReceta.mutate(
      { menuComponenteId, recetaId: nuevaRecetaId },
      {
        onSuccess: () => {
          actualizarRecetaDeComponente(nuevaRecetaId);
          notify.success('Variante aplicada');
        },
        onError: () => notify.error('No se pudo cambiar la variante'),
      }
    );
  };

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
      {/* Header */}
      <div className="mb-4 pb-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h3 className="text-base font-semibold text-primary mb-1">
            🧪 Ingredientes — {data?.nombre || (isLoading ? 'Cargando...' : 'Sin nombre')}
          </h3>
          <p className="text-sm text-text-muted">
            {data?.es_local ? (
              <span className="inline-flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-accent" />
                Receta Local
              </span>
            ) : (
              'Receta Estándar'
            )}
            {data?.rendimiento && ` · Rendimiento: ${data.rendimiento} porciones`}
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

      {/* Selector de variante local */}
      {(tieneVariantes || data?.es_local) && !isLoading && (
        <div className="mb-4 p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-surface)' }}>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-accent" />
            Variantes locales disponibles
          </p>
          <div className="flex flex-wrap gap-2">
            {/* Opción receta estándar */}
            <button
              onClick={() => cambiarAVariante(recetaBaseId)}
              disabled={actualizarReceta.isPending || !data?.es_local}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                !data?.es_local
                  ? 'bg-primary text-white border-primary'
                  : 'bg-bg-app text-text-muted border-border hover:border-primary hover:text-primary'
              }`}
            >
              Estándar
            </button>

            {/* Opciones de variantes locales */}
            {variantes?.map((v) => (
              <button
                key={v.id}
                onClick={() => cambiarAVariante(v.id)}
                disabled={actualizarReceta.isPending || v.id === recetaId}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all flex items-center gap-1 ${
                  v.id === recetaId
                    ? 'bg-accent text-white border-accent'
                    : 'bg-bg-app text-text-muted border-border hover:border-accent hover:text-accent'
                }`}
              >
                <Star className="w-3 h-3" />
                {v.codigo_unidad || v.nombre}
              </button>
            ))}

            {actualizarReceta.isPending && (
              <span className="px-2 py-1 text-xs text-text-muted flex items-center gap-1">
                <div className="spinner spinner-sm" />
                Cambiando...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tabla ingredientes */}
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
                    <div className="text-xs text-text-muted font-mono">
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
