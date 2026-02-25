// ========================================
// ModalRecetaLocal - Modal para crear/actualizar variante local
// Permite modificar cantidades, eliminar ingredientes y agregar nuevos
// Restricción: una sola receta local por unidad por receta estándar (upsert)
// ========================================

import React, { useState } from 'react';
import { X, Save, AlertCircle, Plus, Trash2, Search } from 'lucide-react';
import { useRecetaConIngredientes, useCrearRecetaLocal, useActualizarReceta } from '../hooks/useMenuComponentes';
import { useCicloEditorStore } from '../store/useCicloEditorStore';
import { supabase } from '@/shared/api';
import notify from '@/shared/lib/notifier';

// ----------------------------------------
// BuscadorMateriaPrima — busca ingredientes en arbol_materia_prima
// ----------------------------------------
function BuscadorMateriaPrima({ onSeleccionar }) {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const buscar = async (valor) => {
    setTermino(valor);
    if (valor.length < 2) { setResultados([]); return; }
    setBuscando(true);
    const { data } = await supabase
      .from('arbol_materia_prima')
      .select('id, codigo, nombre, unidad_medida')
      .ilike('nombre', `%${valor}%`)
      .eq('activo', true)
      .eq('nivel_actual', 5)
      .limit(10)
      .order('nombre');
    setResultados(data || []);
    setBuscando(false);
  };

  const seleccionar = (mp) => {
    onSeleccionar(mp);
    setTermino('');
    setResultados([]);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border rounded-lg px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
        <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
        <input
          type="text"
          placeholder="Buscar ingrediente para agregar..."
          value={termino}
          onChange={(e) => buscar(e.target.value)}
          className="flex-1 text-sm bg-transparent outline-none text-primary placeholder-text-muted"
          autoFocus
        />
        {buscando && <div className="spinner spinner-sm" />}
      </div>
      {resultados.length > 0 && (
        <div
          className="absolute z-10 mt-1 w-full border rounded-lg shadow-lg bg-bg-surface overflow-hidden"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {resultados.map((mp) => (
            <button
              key={mp.id}
              onClick={() => seleccionar(mp)}
              className="w-full text-left px-4 py-2.5 hover:bg-bg-app transition-colors border-b last:border-0 text-sm"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="font-medium text-primary">{mp.nombre}</span>
              <span className="ml-2 text-xs text-text-muted">({mp.unidad_medida || 'g'})</span>
              <span className="ml-2 text-xs text-text-muted font-mono">{mp.codigo}</span>
            </button>
          ))}
        </div>
      )}
      {termino.length >= 2 && !buscando && resultados.length === 0 && (
        <p className="text-xs text-text-muted mt-1 px-1">Sin resultados para "{termino}"</p>
      )}
    </div>
  );
}

// ----------------------------------------
// Main Modal
// ----------------------------------------
export default function ModalRecetaLocal({ recetaId, menuComponenteId, onClose, onSuccess }) {
  const { data: recetaData, isLoading } = useRecetaConIngredientes(recetaId);
  const crearLocal = useCrearRecetaLocal();
  const actualizarReceta = useActualizarReceta();
  const { cerrarModalRecetaLocal, cicloSeleccionado } = useCicloEditorStore();

  const [ingredientes, setIngredientes] = useState([]);
  const [inicializado, setInicializado] = useState(false);
  const [mostrarBuscador, setMostrarBuscador] = useState(false);

  // Inicializar ingredientes cuando llegan los datos
  if (recetaData?.ingredientes && !inicializado) {
    setIngredientes(
      recetaData.ingredientes.map((ing) => ({
        ...ing,
        cantidad_nueva: ing.cantidad_requerida,
        modificado: false,
        eliminado: false,
        es_nuevo: false,
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
        ? parseFloat(valor) !== nuevos[index].cantidad_requerida
        : nuevos[index].modificado,
    };
    setIngredientes(nuevos);
  };

  const eliminarIngrediente = (index) => {
    const nuevos = [...ingredientes];
    if (nuevos[index].es_nuevo) {
      nuevos.splice(index, 1);
    } else {
      nuevos[index] = { ...nuevos[index], eliminado: true, modificado: true };
    }
    setIngredientes(nuevos);
  };

  const restaurarIngrediente = (index) => {
    const nuevos = [...ingredientes];
    nuevos[index] = {
      ...nuevos[index],
      eliminado: false,
      cantidad_nueva: nuevos[index].cantidad_requerida,
      modificado: false,
    };
    setIngredientes(nuevos);
  };

  const agregarIngrediente = (mp) => {
    const yaExiste = ingredientes.some(
      (ing) => ing.materia_prima_id === mp.id && !ing.eliminado
    );
    if (yaExiste) {
      notify.warning(`${mp.nombre} ya está en la receta`);
      return;
    }
    setIngredientes((prev) => [
      ...prev,
      {
        id: null,
        materia_prima_id: mp.id,
        arbol_materia_prima: { id: mp.id, nombre: mp.nombre, unidad_medida: mp.unidad_medida },
        cantidad_requerida: 0,
        cantidad_nueva: 0,
        unidad_medida: mp.unidad_medida || 'g',
        modificado: true,
        eliminado: false,
        es_nuevo: true,
      },
    ]);
    setMostrarBuscador(false);
  };

  const ingredientesVisibles = ingredientes.filter((ing) => !ing.eliminado);
  const ingredientesEliminados = ingredientes.filter((ing) => ing.eliminado && !ing.es_nuevo);
  const tieneModificaciones = ingredientes.some((ing) => ing.modificado || ing.eliminado);

  // Código de unidad del ciclo activo (para la restricción 1-local-por-unidad)
  const codigoUnidad = cicloSeleccionado?.operacion?.codigo || null;

  const handleGuardar = () => {
    const nuevosInvalidos = ingredientes.filter(
      (i) => i.es_nuevo && !i.eliminado && (!i.cantidad_nueva || i.cantidad_nueva <= 0)
    );
    if (nuevosInvalidos.length > 0) {
      notify.warning('Los ingredientes nuevos deben tener una cantidad mayor a 0');
      return;
    }
    if (!tieneModificaciones) {
      notify.warning('No hay modificaciones para guardar');
      return;
    }

    const ingredientesModificados = ingredientes
      .filter((ing) => ing.modificado || ing.eliminado)
      .map((ing) => ({
        materia_prima_id: ing.materia_prima_id,
        cantidad_requerida: parseFloat(ing.cantidad_nueva) || 0,
        unidad_medida: ing.unidad_medida,
        eliminado: ing.eliminado || false,
        es_nuevo: ing.es_nuevo || false,
      }));

    crearLocal.mutate(
      { recetaEstandarId: recetaId, codigoUnidad, ingredientesModificados },
      {
        onSuccess: async (response) => {
          if (response.error) {
            notify.error('Error al guardar receta local: ' + response.error.message);
            return;
          }
          const recetaLocal = response.data;

          if (menuComponenteId && recetaLocal?.id) {
            actualizarReceta.mutate(
              { menuComponenteId, recetaId: recetaLocal.id },
              {
                onSuccess: () => {
                  notify.success('Variante local guardada y aplicada al plato');
                  onSuccess?.(recetaLocal);
                  cerrarModalRecetaLocal();
                  onClose?.();
                },
                onError: () => {
                  notify.warning('Receta local guardada, pero no se pudo vincular automáticamente. Reasígnala manualmente.');
                  cerrarModalRecetaLocal();
                  onClose?.();
                },
              }
            );
          } else {
            notify.success('Receta local guardada exitosamente');
            onSuccess?.(recetaLocal);
            cerrarModalRecetaLocal();
            onClose?.();
          }
        },
        onError: (err) => {
          notify.error('Error: ' + err.message);
        },
      }
    );
  };

  const esEdicion = recetaData?.es_local === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="card-header border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h3 className="text-lg font-semibold text-primary">
              {esEdicion ? 'Actualizar Receta Local' : 'Crear Receta Local'}
            </h3>
            <p className="text-sm text-text-muted mt-0.5">
              Basada en: {recetaData?.nombre || 'Cargando...'}
              {codigoUnidad && (
                <span className="ml-2 badge badge-primary text-xs">{codigoUnidad.toUpperCase()}</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose || cerrarModalRecetaLocal}
            className="p-1.5 text-text-muted hover:text-primary hover:bg-bg-surface rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-4 mt-4 p-3 alert alert-info rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              {esEdicion
                ? 'Editando variante local existente. Los cambios reemplazarán la versión anterior.'
                : 'Se creará una Receta Local solo para esta unidad y menú. Si ya existe una variante local para esta unidad, se actualizará automáticamente.'}
            </p>
          </div>
        </div>

        {/* Tabla ingredientes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="spinner spinner-sm mx-auto"></div>
              <p className="mt-3 text-sm text-text-muted">Cargando ingredientes...</p>
            </div>
          ) : (
            <>
              {/* Tabla ingredientes activos */}
              <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Ingrediente</th>
                      <th className="table-header text-right">Original</th>
                      <th className="table-header text-right">Nueva Cant.</th>
                      <th className="table-header">Unidad</th>
                      <th className="table-header text-right">Cambio</th>
                      <th className="table-header text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredientesVisibles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="table-cell text-center text-sm text-text-muted py-6">
                          No hay ingredientes activos. Agrega uno con el botón de abajo.
                        </td>
                      </tr>
                    ) : (
                      ingredientesVisibles.map((ing) => {
                        const idxReal = ingredientes.indexOf(ing);
                        const cambio = ing.es_nuevo
                          ? null
                          : ing.cantidad_requerida
                            ? ((ing.cantidad_nueva - ing.cantidad_requerida) / ing.cantidad_requerida * 100).toFixed(0)
                            : 0;

                        return (
                          <tr
                            key={ing.id || `new-${idxReal}`}
                            className={ing.es_nuevo ? 'bg-success/5' : ing.modificado ? 'bg-warning/10' : ''}
                          >
                            <td className="table-cell">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-primary font-medium">
                                  {ing.arbol_materia_prima?.nombre || 'Ingrediente'}
                                </span>
                                {ing.es_nuevo && (
                                  <span className="badge badge-success text-xs">Nuevo</span>
                                )}
                                {ing.modificado && !ing.es_nuevo && (
                                  <span className="badge badge-warning text-xs">Modificado</span>
                                )}
                              </div>
                            </td>
                            <td className="table-cell text-right text-sm text-text-muted font-mono">
                              {ing.es_nuevo ? '—' : ing.cantidad_requerida}
                            </td>
                            <td className="table-cell text-right">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={ing.cantidad_nueva}
                                onChange={(e) =>
                                  actualizarIngrediente(idxReal, 'cantidad_nueva', parseFloat(e.target.value) || 0)
                                }
                                className="form-input w-24 text-sm text-right"
                              />
                            </td>
                            <td className="table-cell text-sm text-text-muted">
                              {ing.unidad_medida}
                            </td>
                            <td className="table-cell text-right">
                              {ing.es_nuevo ? (
                                <span className="text-xs text-success font-semibold">+Nuevo</span>
                              ) : ing.modificado ? (
                                <span
                                  className={`text-sm font-semibold ${
                                    Number(cambio) > 0
                                      ? 'text-success'
                                      : Number(cambio) < 0
                                        ? 'text-warning'
                                        : 'text-text-muted'
                                  }`}
                                >
                                  {Number(cambio) > 0 ? '+' : ''}{cambio}%
                                </span>
                              ) : (
                                <span className="text-sm text-text-muted">Base</span>
                              )}
                            </td>
                            <td className="table-cell text-center">
                              <button
                                onClick={() => eliminarIngrediente(idxReal)}
                                className="p-1 text-error/60 hover:text-error hover:bg-error/10 rounded transition-colors"
                                title="Quitar ingrediente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Ingredientes eliminados */}
              {ingredientesEliminados.length > 0 && (
                <div
                  className="border border-dashed rounded-lg overflow-hidden"
                  style={{ borderColor: 'rgba(239,68,68,0.4)' }}
                >
                  <div className="px-4 py-2 bg-error/5">
                    <span className="text-xs font-semibold text-error">
                      A eliminar ({ingredientesEliminados.length})
                    </span>
                  </div>
                  <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {ingredientesEliminados.map((ing) => {
                      const idxReal = ingredientes.indexOf(ing);
                      return (
                        <div
                          key={`del-${idxReal}`}
                          className="px-4 py-2 flex items-center justify-between bg-error/5"
                        >
                          <span className="text-sm text-error line-through">
                            {ing.arbol_materia_prima?.nombre} — {ing.cantidad_requerida} {ing.unidad_medida}
                          </span>
                          <button
                            onClick={() => restaurarIngrediente(idxReal)}
                            className="text-xs text-text-muted hover:text-primary underline"
                          >
                            Restaurar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Agregar ingrediente nuevo */}
              <div>
                <button
                  onClick={() => setMostrarBuscador((v) => !v)}
                  className="btn btn-outline text-sm flex items-center gap-2 w-full"
                >
                  <Plus className="w-4 h-4" />
                  {mostrarBuscador ? 'Cancelar búsqueda' : 'Agregar ingrediente'}
                </button>
                {mostrarBuscador && (
                  <div className="mt-2">
                    <BuscadorMateriaPrima onSeleccionar={agregarIngrediente} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="card-footer border-t flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="text-xs text-text-muted">
            {tieneModificaciones
              ? `${ingredientes.filter(i => i.modificado && !i.eliminado).length} modificados · ${ingredientesEliminados.length} a eliminar · ${ingredientes.filter(i => i.es_nuevo).length} nuevos`
              : 'Sin cambios aún'}
          </div>
          <div className="flex items-center gap-2">
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
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{esEdicion ? 'Actualizar Local' : 'Guardar como Local'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
