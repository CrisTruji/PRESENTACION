// ========================================
// PanelGramajeBASE - Editar gramajes base por componente
// Tabla: Componente | Gramaje | Unidad | Descripción
// ========================================

import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';
import { useGramajeBASEComponentes, useGuardarGramajeBASEComponentes } from '../hooks/useMenuComponentes';
import { useComponentesPlato } from '../hooks/useComponentesPlato';
import notify from '@/utils/notifier';

export default function PanelGramajeBASE({ operacionId, operacionNombre }) {
  const { data: gramajeBASE, isLoading: cargandoGramajes, isError, refetch } = useGramajeBASEComponentes(operacionId);
  const { data: componentes, isLoading: cargandoComponentes } = useComponentesPlato();
  const guardarGramajes = useGuardarGramajeBASEComponentes();

  const [valores, setValores] = useState([]);

  // Inicializar tabla cuando llegan los datos
  useEffect(() => {
    if (componentes && gramajeBASE !== undefined) {
      const nuevosValores = componentes.map((cp) => {
        const gramaje = gramajeBASE?.find((g) => g.componente_id === cp.id);
        return {
          componente_id: cp.id,
          componente_nombre: cp.nombre,
          componente_codigo: cp.codigo,
          gramaje: gramaje?.gramaje || 0,
          unidad_medida: gramaje?.unidad_medida || 'gr',
          descripcion: gramaje?.descripcion || '',
        };
      });
      setValores(nuevosValores.sort((a, b) => a.componente_nombre.localeCompare(b.componente_nombre)));
    }
  }, [componentes, gramajeBASE, operacionId]);

  const actualizarValor = (componenteId, campo, valor) => {
    setValores((prev) =>
      prev.map((v) => (v.componente_id === componenteId ? { ...v, [campo]: valor } : v))
    );
  };

  const handleGuardar = () => {
    const datosGramajes = valores.map((v) => ({
      componente_id: v.componente_id,
      gramaje: parseFloat(v.gramaje) || 0,
      unidad_medida: v.unidad_medida,
      descripcion: v.descripcion || null,
    }));

    guardarGramajes.mutate(
      { operacionId, gramajes: datosGramajes },
      {
        onSuccess: (res) => {
          if (res.error) {
            notify.error('Error al guardar gramajes base');
            return;
          }
          notify.success('Gramajes base guardados correctamente');
        },
      }
    );
  };

  const isLoading = cargandoGramajes || cargandoComponentes;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="text-base font-semibold text-primary mb-1">⚖️ Gramajes Base por Componente</h3>
        <p className="text-sm text-text-muted">
          Operación: <span className="font-medium text-primary">{operacionNombre || 'Cargando...'}</span>
        </p>
        <p className="text-xs text-text-muted mt-2">
          Establece los gramajes predeterminados para cada componente en esta operación.
          Las variaciones por tipo de dieta se calcularán como % de estos valores.
        </p>
      </div>

      {/* Error state */}
      {isError && (
        <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-error">Error al cargar gramajes</p>
            <button onClick={() => refetch()} className="btn btn-outline text-xs mt-2 flex items-center gap-2">
              <RefreshCw className="w-3 h-3" />
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="py-8 text-center">
          <div className="spinner spinner-sm mx-auto"></div>
          <p className="mt-3 text-sm text-text-muted">Cargando gramajes...</p>
        </div>
      ) : (
        <>
          {/* Tabla de gramajes */}
          <div className="overflow-x-auto border rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="table-header">Componente</th>
                  <th className="table-header text-right">Gramaje</th>
                  <th className="table-header">Unidad</th>
                  <th className="table-header">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {valores.map((v) => (
                  <tr key={v.componente_id} className="hover:bg-bg-surface/50 transition-colors">
                    <td className="table-cell">
                      <div className="font-medium text-primary text-sm">{v.componente_nombre}</div>
                      <div className="text-xs text-text-muted">{v.componente_codigo}</div>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          value={v.gramaje}
                          onChange={(e) =>
                            actualizarValor(v.componente_id, 'gramaje', e.target.value)
                          }
                          placeholder="0"
                          className="form-input w-24 text-sm text-right"
                          min="0"
                          step="0.5"
                        />
                      </div>
                    </td>
                    <td className="table-cell">
                      <select
                        value={v.unidad_medida}
                        onChange={(e) =>
                          actualizarValor(v.componente_id, 'unidad_medida', e.target.value)
                        }
                        className="form-input w-20 text-sm"
                      >
                        <option value="gr">gr</option>
                        <option value="ml">ml</option>
                        <option value="oz">oz</option>
                        <option value="cc">cc</option>
                        <option value="taza">taza</option>
                        <option value="cucharada">cda.</option>
                      </select>
                    </td>
                    <td className="table-cell">
                      <input
                        type="text"
                        value={v.descripcion}
                        placeholder="Ej: Para almuerzo, ensalada mixta..."
                        onChange={(e) =>
                          actualizarValor(v.componente_id, 'descripcion', e.target.value)
                        }
                        className="form-input w-full text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Botones de acción */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                // Reset a valores originales (recargar)
                refetch();
              }}
              className="btn btn-outline flex items-center gap-2"
              title="Descartar cambios"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Descartar</span>
            </button>
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
                  <span>Guardar Gramajes Base</span>
                </>
              )}
            </button>
          </div>

          {/* Info adicional */}
          <div className="mt-6 p-4 bg-bg-surface rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs text-text-muted">
              💡 <strong>Consejo:</strong> Estos gramajes son los valores base. Cada tipo de dieta podrá tener variaciones
              porcentuales configuradas en el paso de "Gramajes por Tipo de Dieta".
            </p>
          </div>
        </>
      )}
    </div>
  );
}
