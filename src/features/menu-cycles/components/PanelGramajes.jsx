// ========================================
// PanelGramajes - Tabla dietas x gramajes
// ========================================

import React, { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { useCicloEditorStore } from '../store/useCicloEditorStore';
import { useGramajes, useGuardarGramajes } from '../hooks/useMenuComponentes';
import { useTiposDieta } from '../hooks/useTiposDieta';
import notify from '@/shared/lib/notifier';

export default function PanelGramajes() {
  const { componenteSeleccionado } = useCicloEditorStore();
  const menuComponenteId = componenteSeleccionado?.id;

  const { data: gramajes, isLoading: cargandoGramajes } = useGramajes(menuComponenteId);
  const { data: tiposDieta } = useTiposDieta();
  const guardarGramajes = useGuardarGramajes();

  const [valores, setValores] = useState([]);

  // Inicializar valores cuando llegan los datos
  useEffect(() => {
    if (tiposDieta && gramajes !== undefined) {
      const nuevosValores = tiposDieta.map((td) => {
        const gramaje = gramajes?.find((g) => g.tipo_dieta_id === td.id);
        return {
          tipo_dieta_id: td.id,
          codigo: td.codigo,
          nombre: td.nombre,
          categoria: td.categoria,
          gramaje: gramaje?.gramaje || 0,
          unidad_medida: gramaje?.unidad_medida || 'gr',
          porcentaje_modificacion: gramaje?.porcentaje_modificacion || null,
          excluir: gramaje?.excluir || false,
          observaciones: gramaje?.observaciones || '',
        };
      });
      setValores(nuevosValores);
    }
  }, [tiposDieta, gramajes, menuComponenteId]);

  const actualizarValor = (tipoDietaId, campo, valor) => {
    setValores((prev) =>
      prev.map((v) => (v.tipo_dieta_id === tipoDietaId ? { ...v, [campo]: valor } : v))
    );
  };

  const handleGuardar = () => {
    const datosGramajes = valores.map((v) => ({
      tipo_dieta_id: v.tipo_dieta_id,
      gramaje: parseFloat(v.gramaje) || 0,
      unidad_medida: v.unidad_medida,
      porcentaje_modificacion: v.porcentaje_modificacion,
      excluir: v.excluir,
      observaciones: v.observaciones || null,
    }));

    guardarGramajes.mutate(
      { menuComponenteId, gramajes: datosGramajes },
      {
        onSuccess: (res) => {
          if (res.error) {
            notify.error('Error al guardar gramajes');
            return;
          }
          notify.success('Gramajes guardados');
        },
      }
    );
  };

  if (!componenteSeleccionado) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted">Selecciona un plato para configurar gramajes</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="text-base font-semibold text-primary mb-1">⚖️ Gramajes por Tipo de Dieta</h3>
        <p className="text-sm text-text-muted">
          Plato: <span className="font-medium text-primary">
            {componenteSeleccionado?.arbol_recetas?.nombre || 'Sin receta'}
          </span>
        </p>
      </div>

      {cargandoGramajes ? (
        <div className="py-8 text-center">
          <div className="spinner spinner-sm mx-auto"></div>
          <p className="mt-3 text-sm text-text-muted">Cargando gramajes...</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="table-header">Tipo de Dieta</th>
                  <th className="table-header text-right">Gramaje</th>
                  <th className="table-header text-right">% Mod.</th>
                  <th className="table-header text-center">Estado</th>
                  <th className="table-header">Notas</th>
                </tr>
              </thead>
              <tbody>
                {valores.map((v) => (
                  <tr
                    key={v.tipo_dieta_id}
                    className={v.excluir ? 'opacity-60 bg-bg-surface/50' : ''}
                  >
                    <td className="table-cell">
                      <div className="font-medium text-primary text-sm">{v.nombre}</div>
                      <div className="text-xs text-text-muted">{v.codigo}</div>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={v.gramaje}
                          disabled={v.excluir}
                          onChange={(e) =>
                            actualizarValor(v.tipo_dieta_id, 'gramaje', e.target.value)
                          }
                          className="form-input w-20 text-sm text-right"
                        />
                        <span className="text-xs text-text-muted whitespace-nowrap">{v.unidad_medida}</span>
                      </div>
                    </td>
                    <td className="table-cell text-right">
                      {v.excluir ? (
                        <span className="text-text-muted text-sm">—</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={v.porcentaje_modificacion || ''}
                            placeholder="100"
                            onChange={(e) =>
                              actualizarValor(
                                v.tipo_dieta_id,
                                'porcentaje_modificacion',
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                            className="form-input w-16 text-sm text-right"
                          />
                          <span className="text-xs text-text-muted">%</span>
                        </div>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={v.excluir}
                          onChange={(e) =>
                            actualizarValor(v.tipo_dieta_id, 'excluir', e.target.checked)
                          }
                          className="rounded"
                        />
                        <span className={`text-xs font-medium ${v.excluir ? 'text-error' : 'text-success'}`}>
                          {v.excluir ? 'Excluido' : 'Incluido'}
                        </span>
                      </label>
                    </td>
                    <td className="table-cell">
                      <input
                        type="text"
                        value={v.observaciones}
                        placeholder="Notas..."
                        onChange={(e) =>
                          actualizarValor(v.tipo_dieta_id, 'observaciones', e.target.value)
                        }
                        className="form-input w-full text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-end">
            <button
              onClick={handleGuardar}
              disabled={guardarGramajes.isPending}
              className="btn btn-primary flex items-center gap-2"
            >
              {guardarGramajes.isPending ? (
                <>
                  <div className="spinner spinner-sm"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Gramajes</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
