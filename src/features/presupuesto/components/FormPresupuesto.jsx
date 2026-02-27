// ========================================
// FormPresupuesto - Modal crear/editar presupuesto
// ========================================

import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useCrearPresupuesto, useActualizarPresupuesto } from '../hooks/usePresupuesto';
import { useAuth } from '@/features/auth';
import notify from '@/shared/lib/notifier';

const CATEGORIAS = ['Proteínas', 'Verduras', 'Granos', 'Lácteos', 'Condimentos', 'Otros'];

export default function FormPresupuesto({ mes, presupuesto, onClose, onSaved }) {
  const { user } = useAuth();
  const crearMutation = useCrearPresupuesto();
  const actualizarMutation = useActualizarPresupuesto();
  const isEditing = !!presupuesto?.id;

  const [mesInput, setMesInput] = useState(mes);
  const [total, setTotal] = useState(presupuesto?.presupuestado || '');
  const [notas, setNotas] = useState(presupuesto?.notas || '');
  const [items, setItems] = useState(() => {
    if (presupuesto?.presupuesto_items?.length) {
      return presupuesto.presupuesto_items.map((i) => ({
        categoria: i.categoria,
        monto: String(i.monto_presupuestado),
      }));
    }
    return CATEGORIAS.map((c) => ({ categoria: c, monto: '' }));
  });

  const handleItemChange = (index, valor) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, monto: valor } : it)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!total || Number(total) <= 0) {
      notify.error('El presupuesto total debe ser mayor a 0');
      return;
    }

    const payload = {
      mes: mesInput,
      presupuestado: Number(total),
      notas,
      creado_por: user?.id,
      items: items
        .filter((i) => i.monto && Number(i.monto) > 0)
        .map((i) => ({ categoria: i.categoria, monto_presupuestado: Number(i.monto) })),
    };

    try {
      if (isEditing) {
        await actualizarMutation.mutateAsync({ id: presupuesto.id, ...payload });
        notify.success('Presupuesto actualizado');
      } else {
        await crearMutation.mutateAsync(payload);
        notify.success('Presupuesto creado');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      notify.error('Error guardando presupuesto');
    }
  };

  const isPending = crearMutation.isPending || actualizarMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-card shadow-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-primary">
                {isEditing ? 'Editar Presupuesto' : 'Crear Presupuesto'}
              </h3>
              <button type="button" onClick={onClose} className="text-muted hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="form-label">Mes</label>
                <input
                  type="month"
                  value={mesInput}
                  onChange={(e) => setMesInput(e.target.value)}
                  className="form-input"
                  required
                  disabled={isEditing}
                />
              </div>

              <div>
                <label className="form-label">Presupuesto total ($)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  className="form-input"
                  placeholder="Ej: 5000000"
                  required
                />
              </div>

              <div>
                <label className="form-label">Notas (opcional)</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="form-input"
                  rows={2}
                  placeholder="Observaciones del presupuesto..."
                />
              </div>

              <div>
                <label className="form-label">Desglose por categoría (opcional)</label>
                <div className="space-y-2 mt-2">
                  {items.map((item, i) => (
                    <div key={item.categoria} className="flex items-center gap-3">
                      <span className="text-sm text-secondary w-28 shrink-0">{item.categoria}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.monto}
                        onChange={(e) => handleItemChange(i, e.target.value)}
                        className="form-input flex-1 !py-1.5 text-sm"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={onClose} className="btn btn-outline flex-1">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <><div className="spinner spinner-sm" /><span>Guardando...</span></>
                ) : (
                  <><Save className="w-4 h-4" /><span>Guardar</span></>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
