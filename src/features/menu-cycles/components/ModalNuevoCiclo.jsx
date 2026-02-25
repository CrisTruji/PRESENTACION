// ========================================
// ModalNuevoCiclo - Modal para crear un nuevo ciclo de menu
// Se abre desde ChefDashboard cuando se hace click en "Nuevo Ciclo"
// ========================================

import React, { useState } from 'react';
import { X, Calendar, Save } from 'lucide-react';
import { useCrearCiclo } from '../hooks/useCiclos';
import { useCicloEditorStore } from '../store/useCicloEditorStore';
import { useOperaciones } from '../hooks/useOperaciones';
import notify from '@/shared/lib/notifier';

export default function ModalNuevoCiclo({ onClose }) {
  const { data: operaciones } = useOperaciones();
  const crearCiclo = useCrearCiclo();
  const { seleccionarCiclo, seleccionarOperacion, cerrarModalNuevoCiclo } = useCicloEditorStore();

  const hoy = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    operacion_id: '',
    nombre: '',
    fecha_inicio: hoy,
    dia_actual: 1,
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // Autocompletar nombre al seleccionar operacion
    if (field === 'operacion_id') {
      const op = operaciones?.find((o) => o.id === value);
      if (op && !form.nombre) {
        const year = new Date().getFullYear();
        setForm((prev) => ({ ...prev, operacion_id: value, nombre: `Menú ${op.nombre} ${year}` }));
      }
    }
  };

  const handleCrear = () => {
    if (!form.operacion_id) {
      notify.warning('Selecciona una operación');
      return;
    }
    if (!form.nombre.trim()) {
      notify.warning('Ingresa un nombre para el ciclo');
      return;
    }
    if (!form.fecha_inicio) {
      notify.warning('Ingresa la fecha de inicio');
      return;
    }

    crearCiclo.mutate(
      {
        operacionId: form.operacion_id,
        nombre: form.nombre.trim(),
        fechaInicio: form.fecha_inicio,
        diaActual: parseInt(form.dia_actual, 10) || 1,
      },
      {
        onSuccess: (res) => {
          if (res.error) {
            notify.error('Error al crear ciclo: ' + res.error.message);
            return;
          }
          const cicloCreado = res.data;
          const operacionSel = operaciones?.find((o) => o.id === form.operacion_id);

          // Seleccionar la operacion y el ciclo recién creado para abrir el editor
          if (operacionSel) seleccionarOperacion(operacionSel);
          if (cicloCreado) seleccionarCiclo(cicloCreado);

          notify.success('Ciclo creado exitosamente');
          cerrarModalNuevoCiclo();
          if (onClose) onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
      <div className="card w-full max-w-md my-auto">
        {/* Header */}
        <div className="card-header border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-primary">Nuevo Ciclo de Menú</h3>
          </div>
          <button
            onClick={() => { cerrarModalNuevoCiclo(); if (onClose) onClose(); }}
            className="p-1.5 text-text-muted hover:text-primary hover:bg-bg-surface rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="card-body space-y-4">
          {/* Operacion */}
          <div>
            <label className="form-label">Operación *</label>
            <select
              value={form.operacion_id}
              onChange={(e) => handleChange('operacion_id', e.target.value)}
              className="form-input w-full"
            >
              <option value="">Seleccionar operación...</option>
              {operaciones?.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.nombre} ({op.cantidad_ciclos} días)
                </option>
              ))}
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label className="form-label">Nombre del ciclo *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Ej: Menú Coordinadora 2026"
              className="form-input w-full"
            />
          </div>

          {/* Fecha inicio */}
          <div>
            <label className="form-label">Fecha de inicio *</label>
            <input
              type="date"
              value={form.fecha_inicio}
              onChange={(e) => handleChange('fecha_inicio', e.target.value)}
              className="form-input w-full"
            />
            <p className="text-xs text-text-muted mt-1">
              Día real del calendario en que inicia el ciclo
            </p>
          </div>

          {/* Dia actual del ciclo */}
          <div>
            <label className="form-label">Día actual del ciclo</label>
            <input
              type="number"
              min="1"
              max="30"
              value={form.dia_actual}
              onChange={(e) => handleChange('dia_actual', e.target.value)}
              className="form-input w-full"
            />
            <p className="text-xs text-text-muted mt-1">
              Si el ciclo ya está en curso, ingresa en qué día va (usualmente 1)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="card-footer border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => { cerrarModalNuevoCiclo(); if (onClose) onClose(); }}
            className="btn btn-outline text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleCrear}
            disabled={crearCiclo.isPending}
            className="btn btn-primary text-sm flex items-center gap-2"
          >
            {crearCiclo.isPending ? (
              <>
                <div className="spinner spinner-sm"></div>
                <span>Creando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Crear y Editar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
