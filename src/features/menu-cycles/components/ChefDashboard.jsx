// ========================================
// ChefDashboard - Dashboard principal del Chef
// Estilo: AdminDashboard pattern (page-container + stats-card + card)
// ========================================

import React, { useState } from 'react';
import {
  Plus, Calendar, CheckCircle, AlertCircle, Edit, Eye, RefreshCw, Copy,
} from 'lucide-react';
import { useOperacionesConCiclo } from '../hooks/useOperaciones';
import { useCicloEditorStore } from '../store/useCicloEditorStore';
import { useCrearCiclo } from '../hooks/useCiclos';
import ProgressBar from './ProgressBar';
import MiniCalendario from './MiniCalendario';
import CicloEditor from './CicloEditor';
import ModalNuevoCiclo from './ModalNuevoCiclo';
import notify from '@/utils/notifier';

export default function ChefDashboard() {
  const { data: operaciones, isLoading, error, refetch } = useOperacionesConCiclo();
  const {
    cicloSeleccionado,
    modalNuevoCiclo,
    seleccionarCiclo,
    seleccionarOperacion,
    abrirModalNuevoCiclo,
    cerrarModalNuevoCiclo,
    reset,
  } = useCicloEditorStore();

  const crearCiclo = useCrearCiclo();

  // Si hay ciclo seleccionado, mostrar editor
  if (cicloSeleccionado) {
    return <CicloEditor onVolver={reset} />;
  }

  // Estadisticas
  const totalOperaciones = operaciones?.length || 0;
  const ciclosActivos = operaciones?.filter((o) => o.cicloActivo).length || 0;
  const enProgreso = operaciones?.filter(
    (o) => o.cicloActivo && o.cicloActivo.progreso < 100
  ).length || 0;
  const sinConfigurar = totalOperaciones - ciclosActivos;

  const handleEditarCiclo = (operacion) => {
    seleccionarOperacion(operacion);
    if (operacion.cicloActivo) {
      // Si ya tiene ciclo, abrir el editor directamente
      seleccionarCiclo(operacion.cicloActivo);
    } else {
      // Si no tiene ciclo, abrir el modal de creación en vez del editor vacío
      abrirModalNuevoCiclo();
    }
  };

  const handleDuplicarCiclo = (operacion) => {
    if (!operacion.cicloActivo) return;
    const ciclo = operacion.cicloActivo;
    const year = new Date().getFullYear();
    const nombreCopia = `${ciclo.nombre} (Copia)`;
    const hoy = new Date().toISOString().split('T')[0];

    crearCiclo.mutate(
      {
        operacionId: operacion.id,
        nombre: nombreCopia,
        fechaInicio: hoy,
        diaActual: 1,
      },
      {
        onSuccess: (res) => {
          if (res.error) {
            notify.error('Error al duplicar: ' + res.error.message);
            return;
          }
          notify.success(`Ciclo duplicado: "${nombreCopia}". Ahora puedes editarlo.`);
          refetch();
        },
      }
    );
  };

  return (
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="section-header">
              <h1 className="section-title">Gestion de Menus</h1>
              <p className="section-subtitle">
                Configura los ciclos de menu para cada operacion
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="btn btn-outline flex items-center gap-2 text-sm !py-1.5"
              >
                {isLoading ? (
                  <>
                    <div className="spinner spinner-sm"></div>
                    <span>Cargando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Actualizar</span>
                  </>
                )}
              </button>
              <button onClick={abrirModalNuevoCiclo} className="btn btn-primary flex items-center gap-2 text-sm !py-1.5">
                <Plus className="w-4 h-4" />
                <span>Nuevo Ciclo</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid-cards mb-6">
            <div className="stats-card">
              <div className="stats-icon">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{totalOperaciones}</div>
                <div className="stats-label">Total Operaciones</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon bg-success/10 text-success" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--color-success, #10B981)' }}>
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{ciclosActivos}</div>
                <div className="stats-label">Ciclos Activos</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon" style={{ backgroundColor: 'rgba(251,191,36,0.1)', color: '#F59E0B' }}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{enProgreso}</div>
                <div className="stats-label">En Progreso</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon" style={{ backgroundColor: 'rgba(100,116,139,0.1)', color: '#64748B' }}>
                <Calendar className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{sinConfigurar}</div>
                <div className="stats-label">Sin Configurar</div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="p-12 text-center">
            <div className="inline-flex flex-col items-center">
              <div className="spinner spinner-lg mx-auto"></div>
              <p className="mt-4 text-muted">Cargando operaciones...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="card">
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-error mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">Error al cargar</h3>
              <p className="text-muted mb-4">No se pudieron cargar las operaciones</p>
              <button onClick={() => refetch()} className="btn btn-outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && (!operaciones || operaciones.length === 0) && (
          <div className="card">
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-app rounded-card flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-muted" />
              </div>
              <h4 className="text-xl font-semibold text-primary mb-2">Sin operaciones</h4>
              <p className="text-muted mb-6">No hay operaciones registradas en el sistema</p>
            </div>
          </div>
        )}

        {/* Lista de Operaciones */}
        {!isLoading && !error && operaciones && operaciones.length > 0 && (
          <div className="space-y-4">
            {operaciones.map((operacion) => (
              <div key={operacion.id} className="card overflow-hidden">
                {/* Header de la operacion */}
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-primary">
                        {operacion.nombre}
                      </h3>
                      <span className="badge badge-primary">
                        {operacion.cantidad_ciclos} dias
                      </span>
                      {operacion.tipo_operacion === 'carta_menu' && (
                        <span className="badge" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                          Carta-Menu
                        </span>
                      )}
                    </div>
                    {!operacion.cicloActivo && (
                      <button
                        onClick={() => handleEditarCiclo(operacion)}
                        className="btn btn-outline text-sm !py-1.5"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Crear Menu
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenido del ciclo */}
                {operacion.cicloActivo ? (
                  <div className="card-body">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="font-medium text-primary">
                            {operacion.cicloActivo.nombre}
                          </h4>
                          <span className={`badge ${operacion.cicloActivo.progreso >= 100 ? 'badge-success' : 'badge-warning'}`}>
                            {operacion.cicloActivo.progreso >= 100 ? (
                              <><CheckCircle className="w-3 h-3 mr-1" />Completo</>
                            ) : (
                              <><AlertCircle className="w-3 h-3 mr-1" />En Progreso</>
                            )}
                          </span>
                        </div>

                        {/* Barra de progreso */}
                        <ProgressBar
                          progreso={operacion.cicloActivo.progreso}
                          diasCompletos={operacion.cicloActivo.diasCompletos}
                          diasTotales={operacion.cicloActivo.diasTotales || operacion.cantidad_ciclos}
                        />

                        {/* Mini calendario */}
                        <div className="mt-4">
                          <MiniCalendario
                            diasTotales={operacion.cicloActivo.diasTotales || operacion.cantidad_ciclos}
                            diasData={operacion.cicloActivo.diasData || []}
                            onDiaClick={() => handleEditarCiclo(operacion)}
                          />
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="ml-6 flex flex-col gap-2">
                        <button
                          onClick={() => handleEditarCiclo(operacion)}
                          className="btn btn-outline text-sm !py-1.5"
                        >
                          <Edit className="w-4 h-4 mr-1.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDuplicarCiclo(operacion)}
                          disabled={crearCiclo.isPending}
                          className="btn btn-outline text-sm !py-1.5"
                          title="Crear una copia de este ciclo"
                        >
                          {crearCiclo.isPending ? (
                            <div className="spinner spinner-sm mr-1" />
                          ) : (
                            <Copy className="w-4 h-4 mr-1.5" />
                          )}
                          Duplicar
                        </button>
                        <button className="btn btn-outline text-sm !py-1.5">
                          <Eye className="w-4 h-4 mr-1.5" />
                          Ver
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-10 text-center">
                    <Calendar className="mx-auto w-12 h-12 text-muted mb-3" />
                    <h4 className="font-medium text-primary mb-1">Sin ciclo de menu</h4>
                    <p className="text-sm text-muted mb-4">
                      Aun no se ha configurado un menu para esta operacion
                    </p>
                    <button
                      onClick={() => handleEditarCiclo(operacion)}
                      className="btn btn-primary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Menu Ahora
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nuevo Ciclo */}
      {modalNuevoCiclo && (
        <ModalNuevoCiclo onClose={cerrarModalNuevoCiclo} />
      )}
    </div>
  );
}
