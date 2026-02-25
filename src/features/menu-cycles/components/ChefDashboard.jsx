// ========================================
// ChefDashboard - Dashboard principal del Chef
// Estilo: AdminDashboard pattern (page-container + stats-card + card)
// ========================================

import React, { useState } from 'react';
import {
  Plus, Calendar, CheckCircle, AlertCircle, Edit, Eye, RefreshCw, Copy, Gauge, Trash2, X,
} from 'lucide-react';
import { useOperacionesConCiclo } from '../hooks/useOperaciones';
import { useCicloEditorStore } from '../store/useCicloEditorStore';
import { useCrearCiclo, useEliminarCiclo } from '../hooks/useCiclos';
import { useCicloCompleto } from '../hooks/useCiclos';
import ProgressBar from './ProgressBar';
import MiniCalendario from './MiniCalendario';
import CicloEditor from './CicloEditor';
import ModalNuevoCiclo from './ModalNuevoCiclo';
import GramajeBASEModal from './GramajeBASEModal';
import { SERVICIOS } from '@/shared/types/menu';
import notify from '@/shared/lib/notifier';

export default function ChefDashboard() {
  const { data: operaciones, isLoading, error, refetch } = useOperacionesConCiclo();
  const {
    cicloSeleccionado,
    modalNuevoCiclo,
    modalGramajeBASE,
    seleccionarCiclo,
    seleccionarOperacion,
    abrirModalNuevoCiclo,
    cerrarModalNuevoCiclo,
    abrirModalGramajeBASE,
    cerrarModalGramajeBASE,
    reset,
  } = useCicloEditorStore();

  const [operacionParaGramaje, setOperacionParaGramaje] = useState(null);
  const [cicloParaVer, setCicloParaVer] = useState(null);          // { cicloId, operacionNombre }
  const [cicloParaEliminar, setCicloParaEliminar] = useState(null); // { cicloId, nombre }

  const crearCiclo = useCrearCiclo();
  const eliminarCiclo = useEliminarCiclo();

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

  const handleAbrirGramajeModal = (operacion) => {
    setOperacionParaGramaje(operacion);
    abrirModalGramajeBASE();
  };

  const handleVerCiclo = (operacion) => {
    setCicloParaVer({ cicloId: operacion.cicloActivo.id, operacionNombre: operacion.nombre });
  };

  const handleEliminarCiclo = (operacion) => {
    setCicloParaEliminar({
      cicloId: operacion.cicloActivo.id,
      nombre: operacion.cicloActivo.nombre,
      operacionNombre: operacion.nombre,
    });
  };

  const confirmarEliminar = () => {
    if (!cicloParaEliminar) return;
    eliminarCiclo.mutate(cicloParaEliminar.cicloId, {
      onSuccess: (res) => {
        if (res.error) {
          notify.error('Error al eliminar: ' + res.error.message);
          return;
        }
        notify.success(`Ciclo "${cicloParaEliminar.nombre}" eliminado correctamente.`);
        setCicloParaEliminar(null);
        refetch();
      },
    });
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
                          {/* Badge estado del ciclo: Borrador / Activo */}
                          {operacion.cicloActivo.estado === 'activo' ? (
                            <span className="badge badge-success flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Activo
                            </span>
                          ) : (
                            <span className="badge" style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#D97706', border: '1px solid rgba(251,191,36,0.3)' }}>
                              Borrador
                            </span>
                          )}
                          {/* Badge progreso */}
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
                          onClick={() => handleAbrirGramajeModal(operacion)}
                          className="btn btn-outline text-sm !py-1.5"
                          title="Configurar gramajes base por componente"
                        >
                          <Gauge className="w-4 h-4 mr-1.5" />
                          Gramajes
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
                        <button
                          onClick={() => handleVerCiclo(operacion)}
                          className="btn btn-outline text-sm !py-1.5"
                          title="Ver resumen del ciclo por servicio"
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          Ver
                        </button>
                        <button
                          onClick={() => handleEliminarCiclo(operacion)}
                          className="btn btn-outline text-sm !py-1.5 !text-error hover:!border-error"
                          title="Eliminar ciclo completo"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Eliminar
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

      {/* Modal Configurar Gramajes Base */}
      {modalGramajeBASE && operacionParaGramaje && (
        <GramajeBASEModal
          operacionId={operacionParaGramaje.id}
          operacionNombre={operacionParaGramaje.nombre}
          onClose={() => {
            cerrarModalGramajeBASE();
            setOperacionParaGramaje(null);
          }}
        />
      )}

      {/* Modal Ver Ciclo */}
      {cicloParaVer && (
        <ModalVerCiclo
          cicloId={cicloParaVer.cicloId}
          operacionNombre={cicloParaVer.operacionNombre}
          onClose={() => setCicloParaVer(null)}
        />
      )}

      {/* Modal Confirmar Eliminación */}
      {cicloParaEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-sm">
            <div className="card-header">
              <h2 className="text-base font-semibold text-primary">Eliminar ciclo</h2>
            </div>
            <div className="card-body space-y-4">
              <p className="text-sm text-text-primary">
                ¿Estás seguro de que quieres eliminar el ciclo{' '}
                <span className="font-semibold">"{cicloParaEliminar.nombre}"</span> de{' '}
                <span className="font-semibold">{cicloParaEliminar.operacionNombre}</span>?
              </p>
              <p className="text-xs text-error">
                Esta acción eliminará todos los días, servicios y componentes configurados. No se puede deshacer.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setCicloParaEliminar(null)}
                  disabled={eliminarCiclo.isPending}
                  className="btn btn-ghost text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminar}
                  disabled={eliminarCiclo.isPending}
                  className="btn btn-primary bg-error border-error hover:bg-error/90 text-sm flex items-center gap-2"
                >
                  {eliminarCiclo.isPending ? (
                    <><div className="spinner spinner-sm" /> Eliminando...</>
                  ) : (
                    <><Trash2 className="w-4 h-4" /> Eliminar</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// Modal Ver Ciclo — resumen por servicio
// ========================================
function ModalVerCiclo({ cicloId, operacionNombre, onClose }) {
  const { data: ciclo, isLoading } = useCicloCompleto(cicloId);

  // Agrupar días por servicio para mostrar un resumen
  const resumenPorServicio = React.useMemo(() => {
    if (!ciclo?.dias) return {};
    const mapa = {};
    ciclo.dias.forEach((d) => {
      if (!mapa[d.servicio]) mapa[d.servicio] = { total: 0, completos: 0 };
      mapa[d.servicio].total += 1;
      if (d.completo) mapa[d.servicio].completos += 1;
    });
    return mapa;
  }, [ciclo]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="card-header flex items-center justify-between border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="text-base font-semibold text-primary">Resumen del Ciclo</h2>
            <p className="text-xs text-text-muted mt-0.5">{operacionNombre}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-bg-surface text-text-muted hover:text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto card-body space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="spinner spinner-lg" />
            </div>
          ) : ciclo ? (
            <>
              {/* Info del ciclo */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary">{ciclo.nombre}</span>
                <span className={`badge ${ciclo.estado === 'activo' ? 'badge-success' : ''}`}
                  style={ciclo.estado !== 'activo' ? { backgroundColor: 'rgba(251,191,36,0.15)', color: '#D97706' } : {}}>
                  {ciclo.estado === 'activo' ? 'Activo' : 'Borrador'}
                </span>
              </div>

              {/* Progreso por servicio */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Progreso por servicio</p>
                {SERVICIOS.map((srv) => {
                  const info = resumenPorServicio[srv.value];
                  if (!info) return null;
                  const pct = Math.round((info.completos / info.total) * 100);
                  return (
                    <div key={srv.value}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-text-primary">{srv.label}</span>
                        <span className={`text-xs font-semibold ${pct === 100 ? 'text-success' : 'text-text-muted'}`}>
                          {info.completos}/{info.total} días
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-surface overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-success' : 'bg-primary'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detalle por día (tabla compacta) */}
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Detalle por día</p>
                <div className="overflow-x-auto rounded-md border" style={{ borderColor: 'var(--color-border)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-surface)' }}>
                        <th className="px-3 py-2 text-left font-semibold text-text-muted">Día</th>
                        {SERVICIOS.map((s) => resumenPorServicio[s.value] && (
                          <th key={s.value} className="px-2 py-2 text-center font-semibold text-text-muted">{s.label.slice(0, 3)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(
                        { length: ciclo.operaciones?.cantidad_ciclos || 20 },
                        (_, i) => i + 1
                      ).map((dia) => {
                        const diasDelDia = ciclo.dias.filter((d) => d.numero_dia === dia);
                        return (
                          <tr key={dia} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                            <td className="px-3 py-1.5 font-medium text-text-primary">{dia}</td>
                            {SERVICIOS.map((s) => {
                              if (!resumenPorServicio[s.value]) return null;
                              const d = diasDelDia.find((x) => x.servicio === s.value);
                              return (
                                <td key={s.value} className="px-2 py-1.5 text-center">
                                  {d?.completo ? (
                                    <span className="text-success font-bold">✓</span>
                                  ) : (
                                    <span className="text-text-muted">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-text-muted text-center py-8">No se pudo cargar el ciclo</p>
          )}
        </div>

        {/* Footer */}
        <div className="card-header border-t flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={onClose} className="btn btn-outline text-sm">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
