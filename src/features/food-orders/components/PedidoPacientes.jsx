// ========================================
// PedidoPacientes - Tabla de pacientes (Alcala/Presentes)
// ========================================

import React from 'react';
import { Plus, X } from 'lucide-react';
import { usePedidoStore } from '../store/usePedidoStore';
import { useTiposDieta } from '@features/menu-cycles';

export default function PedidoPacientes() {
  const {
    pacientes,
    agregarPaciente,
    actualizarPaciente,
    eliminarPaciente,
    getTotalPacientes,
  } = usePedidoStore();
  const { data: tiposDieta } = useTiposDieta();

  const handleAgregar = () => {
    agregarPaciente({
      nombre: '',
      identificacion: '',
      cuarto: '',
      tipo_dieta_id: tiposDieta?.[0]?.id || null,
      alergias: null,
      observaciones: null,
    });
  };

  // Resumen por dieta
  const resumenDietas = {};
  pacientes.forEach((p) => {
    if (p.tipo_dieta_id) {
      const dieta = tiposDieta?.find((td) => td.id === p.tipo_dieta_id);
      const nombre = dieta?.nombre || 'Sin dieta';
      resumenDietas[nombre] = (resumenDietas[nombre] || 0) + 1;
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Agrega los datos de cada paciente que recibirá este servicio
        </p>
        <button onClick={handleAgregar} className="btn btn-primary text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Agregar Paciente</span>
        </button>
      </div>

      {pacientes.length === 0 ? (
        <div className="text-center py-10">
          <Plus className="w-10 h-10 mx-auto text-text-muted mb-3" />
          <h4 className="text-sm font-semibold text-primary mb-1">No hay pacientes agregados</h4>
          <p className="text-sm text-text-muted mb-4">
            Comienza agregando el primer paciente
          </p>
          <button onClick={handleAgregar} className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Agregar Primer Paciente</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pacientes.map((paciente, idx) => (
            <div key={idx} className="card">
              <div className="card-header flex items-start justify-between">
                <h4 className="text-sm font-semibold text-primary">
                  👤 Paciente #{idx + 1}
                </h4>
                <button
                  onClick={() => eliminarPaciente(idx)}
                  className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="card-body">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Nombre completo *</label>
                    <input
                      type="text"
                      value={paciente.nombre}
                      onChange={(e) => actualizarPaciente(idx, 'nombre', e.target.value)}
                      placeholder="Ej: María García López"
                      className="form-input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="form-label">Identificación *</label>
                    <input
                      type="text"
                      value={paciente.identificacion}
                      onChange={(e) => actualizarPaciente(idx, 'identificacion', e.target.value)}
                      placeholder="Ej: 1234567890"
                      className="form-input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="form-label">Cuarto/Cama *</label>
                    <input
                      type="text"
                      value={paciente.cuarto}
                      onChange={(e) => actualizarPaciente(idx, 'cuarto', e.target.value)}
                      placeholder="Ej: 301A"
                      className="form-input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="form-label">Tipo de dieta *</label>
                    <select
                      value={paciente.tipo_dieta_id || ''}
                      onChange={(e) => actualizarPaciente(idx, 'tipo_dieta_id', e.target.value)}
                      className="form-input w-full text-sm"
                    >
                      <option value="">Seleccionar...</option>
                      {tiposDieta?.map((td) => (
                        <option key={td.id} value={td.id}>
                          {td.nombre} ({td.codigo})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Alergias</label>
                    <input
                      type="text"
                      value={paciente.alergias || ''}
                      onChange={(e) => actualizarPaciente(idx, 'alergias', e.target.value)}
                      placeholder="Ej: Mariscos, Nueces"
                      className="form-input w-full text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Observaciones</label>
                    <textarea
                      rows="1"
                      value={paciente.observaciones || ''}
                      onChange={(e) => actualizarPaciente(idx, 'observaciones', e.target.value)}
                      placeholder="Notas adicionales..."
                      className="form-input w-full text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resumen por dieta */}
      {pacientes.length > 0 && Object.keys(resumenDietas).length > 0 && (
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
          <h4 className="text-sm font-semibold text-primary mb-3">
            📊 Resumen por tipo de dieta:
          </h4>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {Object.entries(resumenDietas).map(([dieta, cantidad]) => (
              <div key={dieta} className="text-center">
                <div className="text-xl font-bold text-primary">
                  {cantidad}
                </div>
                <div className="text-xs text-text-muted">{dieta}</div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t text-center" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-sm font-medium text-text-secondary">Total pacientes: </span>
            <span className="text-lg font-bold text-primary">
              {getTotalPacientes()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
