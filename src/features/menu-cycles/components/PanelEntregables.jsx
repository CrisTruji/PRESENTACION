// ========================================
// PanelEntregables — Gestión de materias primas entregables por servicio
// Permite agregar ítems que se sirven sin transformación (tipo_rama='entregable')
// con cálculo económico. El descuento de stock ocurre en el flujo de entregas.
// ========================================

import React, { useState } from 'react';
import { Search, Package, Trash2 } from 'lucide-react';
import { supabase } from '@/shared/api';
import notify from '@/shared/lib/notifier';
import {
  useEntregables,
  useUpsertEntregable,
  useEliminarEntregable,
} from '../hooks/useMenuComponentes';
import { useCicloEditorStore } from '../store/useCicloEditorStore';

// ----------------------------------------
// BuscadorEntregable — busca en arbol_materia_prima tipo_rama='entregable'
// ----------------------------------------
function BuscadorEntregable({ onSeleccionar }) {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const buscar = async (valor) => {
    setTermino(valor);
    if (valor.length < 2) { setResultados([]); return; }
    setBuscando(true);
    const { data } = await supabase
      .from('arbol_materia_prima')
      .select('id, codigo, nombre, unidad_medida, costo_promedio')
      .ilike('nombre', `%${valor}%`)
      .eq('activo', true)
      .eq('nivel_actual', 5)
      .eq('tipo_rama', 'entregable')
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
          placeholder="Buscar materia prima entregable..."
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
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-primary">{mp.nombre}</span>
                  <span className="ml-2 text-xs text-text-muted font-mono">{mp.codigo}</span>
                </div>
                {mp.costo_promedio > 0 && (
                  <span className="text-xs text-text-muted">
                    ${mp.costo_promedio?.toFixed(2)}/{mp.unidad_medida}
                  </span>
                )}
              </div>
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
// FilaEntregable — fila de la tabla
// ----------------------------------------
function FilaEntregable({ entregable, cicloDiaServicioId, onCantidadChange }) {
  const mp = entregable.arbol_materia_prima;
  const eliminarMutation = useEliminarEntregable();

  const handleEliminar = () => {
    eliminarMutation.mutate(entregable.id, {
      onSuccess: () => notify.success('Entregable eliminado'),
      onError: (err) => notify.error(err.message),
    });
  };

  return (
    <tr className="table-row">
      {/* Nombre */}
      <td className="table-cell">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary flex-shrink-0" />
          <div>
            <div className="font-medium text-sm text-primary">{mp?.nombre}</div>
            <div className="text-xs text-text-muted font-mono">{mp?.codigo}</div>
          </div>
        </div>
      </td>

      {/* Cantidad */}
      <td className="table-cell">
        <input
          type="number"
          min="0"
          step="0.1"
          value={entregable.cantidad_por_servicio}
          onChange={(e) => onCantidadChange(entregable, parseFloat(e.target.value) || 0)}
          className="form-input w-24 text-sm text-right"
        />
      </td>

      {/* Unidad */}
      <td className="table-cell text-sm text-text-muted">{entregable.unidad_medida}</td>

      {/* Costo unitario */}
      <td className="table-cell text-sm text-right font-mono">
        ${(entregable.costo_unitario || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
      </td>

      {/* Costo total */}
      <td className="table-cell text-sm text-right font-semibold font-mono text-primary">
        ${(entregable.costo_total || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
      </td>

      {/* Eliminar */}
      <td className="table-cell text-center">
        <button
          onClick={handleEliminar}
          disabled={eliminarMutation.isPending}
          className="p-1.5 text-error/60 hover:text-error hover:bg-error/10 rounded transition-colors disabled:opacity-40"
          title="Eliminar entregable"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ----------------------------------------
// PanelEntregablesContent — principal
// ----------------------------------------
export function PanelEntregablesContent({ cicloDiaServicioId, diaSeleccionado, servicioSeleccionado }) {
  const [mostrarBuscador, setMostrarBuscador] = useState(false);

  const { data: entregables, isLoading } = useEntregables(cicloDiaServicioId);
  const upsertMutation = useUpsertEntregable();

  const handleSeleccionarEntregable = (mp) => {
    if (!cicloDiaServicioId) {
      notify.warning('Selecciona un servicio primero');
      return;
    }
    const yaExiste = entregables?.some((e) => e.materia_prima_id === mp.id);
    if (yaExiste) {
      notify.warning(`${mp.nombre} ya está en la lista de entregables`);
      return;
    }
    upsertMutation.mutate(
      { cicloDiaServicioId, materiaPrimaId: mp.id, cantidad: 1, unidadMedida: mp.unidad_medida },
      {
        onSuccess: (res) => {
          if (res.error) { notify.error(res.error.message); return; }
          notify.success(`${mp.nombre} agregado como entregable`);
          setMostrarBuscador(false);
        },
        onError: (err) => notify.error(err.message),
      }
    );
  };

  const handleCantidadChange = (entregable, nuevaCantidad) => {
    if (!cicloDiaServicioId || nuevaCantidad < 0) return;
    upsertMutation.mutate({
      cicloDiaServicioId,
      materiaPrimaId: entregable.materia_prima_id,
      cantidad: nuevaCantidad,
      unidadMedida: entregable.unidad_medida,
    });
  };

  const costoTotalServicio = (entregables || []).reduce((acc, e) => acc + (e.costo_total || 0), 0);

  if (!cicloDiaServicioId) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        Este servicio no está configurado para el Día {diaSeleccionado}
      </div>
    );
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-4 pb-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h3 className="text-base font-semibold text-primary">
            Entregables — Día {diaSeleccionado}
            {servicioSeleccionado && (
              <span className="ml-2 text-sm font-normal text-text-muted">({servicioSeleccionado})</span>
            )}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Materias primas que se sirven sin transformación
          </p>
        </div>
        {costoTotalServicio > 0 && (
          <div className="text-right">
            <div className="text-xs text-text-muted">Costo total servicio</div>
            <div className="text-lg font-bold text-primary">
              ${costoTotalServicio.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-text-muted">
          <div className="spinner spinner-sm" />
          <span className="text-sm">Cargando entregables...</span>
        </div>
      ) : entregables && entregables.length > 0 ? (
        <div className="border rounded-lg overflow-hidden mb-4" style={{ borderColor: 'var(--color-border)' }}>
          <table className="table w-full">
            <thead>
              <tr>
                <th className="table-header">Ítem</th>
                <th className="table-header text-right">Cantidad/Servicio</th>
                <th className="table-header">Unidad</th>
                <th className="table-header text-right">Costo Unit.</th>
                <th className="table-header text-right">Costo Total</th>
                <th className="table-header text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {entregables.map((ent) => (
                <FilaEntregable
                  key={ent.id}
                  entregable={ent}
                  cicloDiaServicioId={cicloDiaServicioId}
                  onCantidadChange={handleCantidadChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <Package className="w-10 h-10 mx-auto text-text-muted mb-3" />
          <p className="text-sm text-primary font-medium mb-1">No hay entregables configurados</p>
          <p className="text-sm text-text-muted">Agrega ítems que se sirven sin cocinar (bebidas, frutas, etc.)</p>
        </div>
      )}

      {/* Agregar entregable */}
      <div>
        <button
          onClick={() => setMostrarBuscador((v) => !v)}
          className="btn btn-outline text-sm flex items-center gap-2 w-full"
          disabled={!cicloDiaServicioId}
        >
          <Package className="w-4 h-4" />
          {mostrarBuscador ? 'Cancelar' : 'Agregar entregable'}
        </button>
        {mostrarBuscador && (
          <div className="mt-2">
            <BuscadorEntregable onSeleccionar={handleSeleccionarEntregable} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function PanelEntregables() {
  const { diaSeleccionado, servicioSeleccionado } = useCicloEditorStore();
  return <PanelEntregablesContent diaSeleccionado={diaSeleccionado} servicioSeleccionado={servicioSeleccionado} />;
}
