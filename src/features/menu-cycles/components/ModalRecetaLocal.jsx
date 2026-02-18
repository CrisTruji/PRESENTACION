// ========================================
// ModalRecetaLocal - Modal para crear variante local
// ========================================

import React, { useState } from 'react';
import { X, Save, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useRecetaConIngredientes, useCrearRecetaLocal } from '../hooks/useMenuComponentes';
import { useCicloEditorStore } from '../store/useCicloEditorStore';
import notify from '@/utils/notifier';

export default function ModalRecetaLocal({ recetaId, onClose, onSuccess }) {
  const { data: recetaData, isLoading } = useRecetaConIngredientes(recetaId);
  const crearLocal = useCrearRecetaLocal();
  const { cerrarModalRecetaLocal } = useCicloEditorStore();

  const [ingredientes, setIngredientes] = useState([]);
  const [inicializado, setInicializado] = useState(false);

  // Inicializar ingredientes cuando llegan los datos
  if (recetaData?.ingredientes && !inicializado) {
    setIngredientes(
      recetaData.ingredientes.map((ing) => ({
        ...ing,
        cantidad_nueva: ing.cantidad_requerida,
        modificado: false,
      }))
    );
    setInicializado(true);
  }

  const actualizarIngrediente = (index, campo, valor) => {
    const nuevos = [...ingredientes];
    nuevos[index] = {
      ...nuevos[index],
      [campo]: valor,
      modificado: campo === 'cantidad_nueva'
        ? valor !== nuevos[index].cantidad_requerida
        : nuevos[index].modificado,
    };
    setIngredientes(nuevos);
  };

  const tieneModificaciones = ingredientes.some((ing) => ing.modificado);

  const handleGuardar = async () => {
    if (!tieneModificaciones) {
      notify.warning('No hay modificaciones para guardar');
      return;
    }

    const ingredientesModificados = ingredientes
      .filter((ing) => ing.modificado)
      .map((ing) => ({
        materia_prima_id: ing.materia_prima_id,
        cantidad_requerida: parseFloat(ing.cantidad_nueva),
        unidad_medida: ing.unidad_medida,
      }));

    crearLocal.mutate(
      { recetaEstandarId: recetaId, ingredientesModificados },
      {
        onSuccess: (response) => {
          if (response.error) {
            notify.error('Error al crear receta local: ' + response.error.message);
            return;
          }
          notify.success('Receta local creada exitosamente');
          onSuccess?.(response.data);
          cerrarModalRecetaLocal();
          onClose?.();
        },
        onError: (err) => {
          notify.error('Error: ' + err.message);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="card-header border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h3 className="text-lg font-semibold text-primary">Crear Receta Local</h3>
            <p className="text-sm text-text-muted mt-0.5">
              Basada en: {recetaData?.nombre || 'Cargando...'}
            </p>
          </div>
          <button onClick={onClose || cerrarModalRecetaLocal} className="p-1.5 text-text-muted hover:text-primary hover:bg-bg-surface rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-4 mt-4 p-3 alert alert-info rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Al modificar ingredientes se creará una <strong>Receta Local</strong> vinculada
              a la receta estándar. Los cambios solo aplican para este menú.
            </p>
          </div>
        </div>

        {/* Tabla ingredientes */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="spinner spinner-sm mx-auto"></div>
              <p className="mt-3 text-sm text-text-muted">Cargando ingredientes...</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="table-header">Ingrediente</th>
                    <th className="table-header text-right">Original</th>
                    <th className="table-header text-right">Nueva Cant.</th>
                    <th className="table-header">Unidad</th>
                    <th className="table-header text-right">Cambio</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientes.map((ing, idx) => {
                    const cambio = ing.cantidad_requerida
                      ? ((ing.cantidad_nueva - ing.cantidad_requerida) / ing.cantidad_requerida * 100).toFixed(0)
                      : 0;

                    return (
                      <tr
                        key={ing.id || idx}
                        className={ing.modificado ? 'bg-warning/10' : ''}
                      >
                        <td className="table-cell">
                          <div>
                            <span className="text-sm text-primary font-medium">
                              {ing.arbol_materia_prima?.nombre || 'Ingrediente'}
                            </span>
                            {ing.modificado && (
                              <span className="ml-2 badge badge-warning text-xs">Modificado</span>
                            )}
                          </div>
                        </td>
                        <td className="table-cell text-right text-sm text-text-muted font-mono">
                          {ing.cantidad_requerida}
                        </td>
                        <td className="table-cell text-right">
                          <input
                            type="number"
                            step="0.1"
                            value={ing.cantidad_nueva}
                            onChange={(e) =>
                              actualizarIngrediente(idx, 'cantidad_nueva', parseFloat(e.target.value) || 0)
                            }
                            className="form-input w-24 text-sm text-right"
                          />
                        </td>
                        <td className="table-cell text-sm text-text-muted">
                          {ing.unidad_medida}
                        </td>
                        <td className="table-cell text-right">
                          {ing.modificado ? (
                            <span
                              className={`text-sm font-semibold ${
                                Number(cambio) > 0 ? 'text-success' : 'text-warning'
                              }`}
                            >
                              {Number(cambio) > 0 ? '+' : ''}{cambio}%
                            </span>
                          ) : (
                            <span className="text-sm text-text-muted">Base</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="card-footer border-t flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={onClose || cerrarModalRecetaLocal}
            className="btn btn-outline"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!tieneModificaciones || crearLocal.isPending}
            className="btn btn-primary flex items-center gap-2"
          >
            {crearLocal.isPending ? (
              <>
                <div className="spinner spinner-sm"></div>
                <span>Creando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar como Local</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
