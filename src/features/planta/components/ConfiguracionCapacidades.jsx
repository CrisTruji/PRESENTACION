// src/features/planta/components/ConfiguracionCapacidades.jsx
// Pantalla de administración para configurar la capacidad promedio de raciones
// por servicio y unidad operativa. Solo visible para rol "administrador".

import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Save, RotateCcw, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { getCapacidadesPorOperacion, updateCapacidad } from '../services/capacidadesService';
import notify from '@/shared/lib/notifier';

// Etiquetas legibles para cada tipo de servicio
const SERVICIO_LABEL = {
  desayuno:    'Desayuno',
  almuerzo:    'Almuerzo',
  cena:        'Cena',
  cena_ligera: 'Cena ligera',
  nueves:      'Nueves',
  onces:       'Onces',
};

function getServicioLabel(s) {
  return SERVICIO_LABEL[s] || s;
}

// ──────────────────────────────────────────────────────────────
// Componente: fila editable de una operación/servicio
// ──────────────────────────────────────────────────────────────
function FilaCapacidad({ fila, onGuardado }) {
  const [valor, setValor] = useState(String(fila.capacidad_promedio));
  const [descripcion, setDescripcion] = useState(fila.capacidad_descripcion || '');
  const [guardando, setGuardando] = useState(false);
  const [succes, setSucces] = useState(false);

  const cambiado =
    Number(valor) !== fila.capacidad_promedio ||
    descripcion !== (fila.capacidad_descripcion || '');

  async function guardar() {
    const num = parseInt(valor, 10);
    if (isNaN(num) || num < 0) {
      notify.error('Ingrese un número válido (≥ 0)');
      return;
    }
    setGuardando(true);
    try {
      await updateCapacidad(fila.id, num, descripcion);
      setSucces(true);
      setTimeout(() => setSucces(false), 2000);
      onGuardado(fila.id, num, descripcion);
      notify.success(`Capacidad de ${fila.operacion_nombre} / ${getServicioLabel(fila.servicio)} actualizada`);
    } catch (err) {
      console.error(err);
      notify.error('Error al guardar: ' + err.message);
    } finally {
      setGuardando(false);
    }
  }

  function resetear() {
    setValor(String(fila.capacidad_promedio));
    setDescripcion(fila.capacidad_descripcion || '');
  }

  return (
    <tr className={`border-b transition-colors ${cambiado ? 'bg-warning/5' : ''}`}
        style={{ borderColor: 'var(--color-border)' }}>
      {/* Servicio */}
      <td className="px-4 py-2 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
        {getServicioLabel(fila.servicio)}
      </td>

      {/* Capacidad promedio */}
      <td className="px-4 py-2">
        <input
          type="number"
          min="0"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && guardar()}
          className="form-input w-24 text-center"
          placeholder="0"
        />
      </td>

      {/* Descripción */}
      <td className="px-4 py-2">
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="form-input w-full"
          placeholder="Nota opcional…"
          maxLength={120}
        />
      </td>

      {/* Acciones */}
      <td className="px-4 py-2">
        <div className="flex items-center gap-1">
          {succes ? (
            <CheckCircle className="w-5 h-5 text-success" />
          ) : (
            <>
              <button
                onClick={guardar}
                disabled={!cambiado || guardando}
                className="btn btn-primary btn-sm flex items-center gap-1 disabled:opacity-40"
                title="Guardar cambios"
              >
                <Save className="w-3.5 h-3.5" />
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
              {cambiado && (
                <button
                  onClick={resetear}
                  className="btn btn-outline btn-sm"
                  title="Descartar cambios"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ──────────────────────────────────────────────────────────────
// Componente: bloque de una operación con sus servicios
// ──────────────────────────────────────────────────────────────
function BloqueOperacion({ nombreOp, filas, onGuardado }) {
  const totalCapacidad = filas.reduce((s, f) => s + (f.capacidad_promedio || 0), 0);

  return (
    <div className="card mb-4">
      {/* Cabecera de la operación */}
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
            {nombreOp}
          </span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          Total diario estimado: {totalCapacidad} raciones
        </span>
      </div>

      {/* Tabla de servicios */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
              <th className="px-4 py-2 text-left font-medium text-muted">Servicio</th>
              <th className="px-4 py-2 text-left font-medium text-muted">Raciones / día</th>
              <th className="px-4 py-2 text-left font-medium text-muted">Nota</th>
              <th className="px-4 py-2 text-left font-medium text-muted">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <FilaCapacidad key={fila.id} fila={fila} onGuardado={onGuardado} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────────────────────
export default function ConfiguracionCapacidades() {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const datos = await getCapacidadesPorOperacion();
        setFilas(datos);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  // Actualizar la fila en memoria para reflejar el valor guardado sin recargar
  const handleGuardado = useCallback((id, nuevaCapacidad, nuevaDescripcion) => {
    setFilas((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, capacidad_promedio: nuevaCapacidad, capacidad_descripcion: nuevaDescripcion }
          : f
      )
    );
  }, []);

  // Agrupar filas por operación
  const porOperacion = {};
  for (const fila of filas) {
    if (!porOperacion[fila.operacion_nombre]) {
      porOperacion[fila.operacion_nombre] = [];
    }
    porOperacion[fila.operacion_nombre].push(fila);
  }
  const nombresOperacion = Object.keys(porOperacion).sort();

  return (
    <div className="min-h-content p-compact">
      <div className="max-w-5xl mx-auto">

        {/* Encabezado */}
        <div className="section-header">
          <h1 className="section-title">Configuración de Capacidades</h1>
          <p className="section-subtitle">
            Define la cantidad promedio de raciones esperadas por servicio en cada unidad operativa.
            Estos valores se usan como referencia en la Proyección de Materia Prima.
          </p>
        </div>

        {/* Banner informativo */}
        <div className="card mb-6 border-l-4" style={{ borderLeftColor: 'var(--color-primary)' }}>
          <div className="card-body flex gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <p className="font-medium mb-1">¿Para qué sirve este valor?</p>
              <p>
                La <strong>Proyección de Materia Prima</strong> calcula cuánto ingrediente se necesita para
                la semana. Cuando una unidad no tiene historial suficiente de pedidos (menos de 7 días),
                usa este promedio como estimado de raciones diarias.
              </p>
              <p className="mt-1">
                El <strong>total diario estimado</strong> mostrado en cada unidad es la suma de todos sus servicios.
              </p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        {cargando && (
          <div className="text-center py-12 text-muted">Cargando configuración…</div>
        )}

        {error && (
          <div className="card mb-4 border-l-4" style={{ borderLeftColor: 'var(--color-error)' }}>
            <div className="card-body flex gap-2 text-error">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm">Error al cargar: {error}</span>
            </div>
          </div>
        )}

        {!cargando && !error && nombresOperacion.length === 0 && (
          <div className="text-center py-12 text-muted">
            No hay unidades activas configuradas.
          </div>
        )}

        {!cargando && nombresOperacion.map((nombre) => (
          <BloqueOperacion
            key={nombre}
            nombreOp={nombre}
            filas={porOperacion[nombre]}
            onGuardado={handleGuardado}
          />
        ))}
      </div>
    </div>
  );
}
