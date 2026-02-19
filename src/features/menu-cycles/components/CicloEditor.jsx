// ========================================
// CicloEditor - Layout 3 paneles (master)
// ========================================

import React, { useEffect } from 'react';
import { ChevronLeft, Plus, CheckCircle, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { useCicloEditorStore } from '../store/useCicloEditorStore';
import { useCicloCompleto, useActivarServicio, useProgresoCiclo } from '../hooks/useCiclos';
import { useComponentesDia, useEliminarComponente } from '../hooks/useMenuComponentes';
import PanelCalendario from './PanelCalendario';
import PanelGramajes from './PanelGramajes';
import PanelIngredientes from './PanelIngredientes';
import ModalRecetaLocal from './ModalRecetaLocal';
import ComponenteSlot from './ComponenteSlot';
import SelectorReceta from './SelectorReceta';
import { useAsignarComponente } from '../hooks/useMenuComponentes';
import { useDiaServicios } from '../hooks/useCiclos';
import { useComponentesPlato } from '../hooks/useComponentesPlato';
import { SERVICIOS } from '@/shared/types/menu';
import notify from '@/utils/notifier';

export default function CicloEditor({ onVolver }) {
  const {
    cicloSeleccionado,
    diaSeleccionado,
    servicioSeleccionado,
    componenteSeleccionado,
    panelActivo,
    modalRecetaLocal,
    cambiarPanel,
    seleccionarComponente,
    seleccionarServicio,
    cerrarModalRecetaLocal,
  } = useCicloEditorStore();

  const { data: ciclo, isLoading, isError, refetch } = useCicloCompleto(cicloSeleccionado?.id);
  const { data: progreso } = useProgresoCiclo(cicloSeleccionado?.id);
  const activarServicio = useActivarServicio();
  const { data: diaServicios, isLoading: loadingDia } = useDiaServicios(cicloSeleccionado?.id, diaSeleccionado);
  const { data: componentesPlato } = useComponentesPlato();

  // Seleccionar primer servicio por defecto
  useEffect(() => {
    if (!servicioSeleccionado && SERVICIOS.length > 0) {
      seleccionarServicio(SERVICIOS[0].value);
    }
  }, [servicioSeleccionado]);

  // cicloDiaServicio: fila específica de ciclo_dia_servicios para el día+servicio seleccionado
  // Si diaServicios aún no cargó, es undefined (no hay ID incorrecto)
  const cicloDiaServicio = diaServicios?.find(
    (ds) => ds.servicio === servicioSeleccionado
  );

  const { data: componentesMenu, isLoading: loadingComponentes } = useComponentesDia(cicloDiaServicio?.id);
  const asignarComponente = useAsignarComponente();
  const eliminarComponente = useEliminarComponente();

  const [showSelectorReceta, setShowSelectorReceta] = React.useState(false);
  const [componenteParaAsignar, setComponenteParaAsignar] = React.useState(null);
  // Para cambiar receta de un comp ya asignado: guardamos el comp completo
  const [compParaCambiarReceta, setCompParaCambiarReceta] = React.useState(null);

  const handleAgregarPlato = (componenteId) => {
    setComponenteParaAsignar(componenteId);
    setCompParaCambiarReceta(null);
    setShowSelectorReceta(true);
  };

  const handleCambiarReceta = (comp) => {
    setCompParaCambiarReceta(comp);
    setComponenteParaAsignar(null);
    setShowSelectorReceta(true);
  };

  const handleSeleccionarReceta = (receta) => {
    // Caso 1: asignar receta a componente nuevo
    if (componenteParaAsignar) {
      if (!cicloDiaServicio?.id) return;
      asignarComponente.mutate({
        cicloDiaServicioId: cicloDiaServicio.id,
        componenteId: componenteParaAsignar,
        recetaId: receta.id,
      });
    }
    // Caso 2: cambiar receta de un componente ya asignado
    if (compParaCambiarReceta) {
      if (!cicloDiaServicio?.id) return;
      asignarComponente.mutate({
        cicloDiaServicioId: cicloDiaServicio.id,
        componenteId: compParaCambiarReceta.componente_id,
        recetaId: receta.id,
      });
    }
    setShowSelectorReceta(false);
    setComponenteParaAsignar(null);
    setCompParaCambiarReceta(null);
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="spinner spinner-lg mx-auto" />
        <p className="mt-4 text-muted">Cargando ciclo...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-8 h-8 text-error mx-auto mb-3" />
        <p className="text-sm font-medium text-error mb-1">Error al cargar el ciclo</p>
        <p className="text-xs text-text-muted mb-4">Verifica tu conexión e intenta de nuevo</p>
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => refetch()} className="btn btn-outline flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          <button onClick={onVolver} className="btn btn-ghost text-text-muted">
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header con navegacion */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onVolver}
              className="p-2 text-text-muted hover:text-primary hover:bg-bg-surface rounded-lg transition-colors"
              title="Volver"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="section-header">
              <div className="flex items-center gap-2">
                <h1 className="section-title">
                  {ciclo?.nombre || cicloSeleccionado?.nombre || 'Editor de Ciclo'}
                </h1>
                {/* Badge de estado del ciclo */}
                {ciclo?.estado === 'activo' ? (
                  <span className="badge badge-success flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Activo
                  </span>
                ) : ciclo?.estado === 'borrador' ? (
                  <span className="badge" style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#D97706', border: '1px solid rgba(251,191,36,0.3)' }}>
                    Borrador
                  </span>
                ) : null}
              </div>
              <p className="section-subtitle">
                Día {diaSeleccionado} • {SERVICIOS.find(s => s.value === servicioSeleccionado)?.label ?? servicioSeleccionado ?? ''}
              </p>
            </div>
          </div>

          {/* Botón Activar Servicio — activa el servicio actualmente seleccionado */}
          {servicioSeleccionado && (
            <button
              onClick={() => {
                activarServicio.mutate(
                  { cicloId: cicloSeleccionado.id, servicio: servicioSeleccionado },
                  {
                    onSuccess: (res) => {
                      if (res.error) {
                        notify.error(res.error.message || 'No se pudo activar el servicio');
                        return;
                      }
                      const srv = SERVICIOS.find(s => s.value === servicioSeleccionado)?.label ?? servicioSeleccionado;
                      notify.success(`¡${srv} activado! Los coordinadores ya pueden hacer pedidos.`);
                      refetch();
                    },
                  }
                );
              }}
              disabled={activarServicio.isPending}
              className="btn btn-primary flex items-center gap-2"
              title={`Activar el servicio de ${SERVICIOS.find(s => s.value === servicioSeleccionado)?.label} para producción`}
            >
              {activarServicio.isPending ? (
                <>
                  <div className="spinner spinner-sm" />
                  <span>Activando...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>
                    Activar {SERVICIOS.find(s => s.value === servicioSeleccionado)?.label ?? 'Servicio'}
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Layout 3 columnas */}
        <div className="grid grid-cols-12 gap-6">
          {/* Columna izquierda: Calendario */}
          <div className="col-span-3">
            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-semibold text-primary">📅 Calendario</h3>
              </div>
              <div className="card-body">
                <PanelCalendario ciclo={ciclo} />
              </div>
            </div>
          </div>

          {/* Columna central y derecha: Menu del dia + Tabs */}
          <div className="col-span-9">
            <div className="card">
              {/* Tabs */}
              <div className="card-header border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex gap-0">
                  {[
                    { key: 'calendario', label: '📋 Menú del Día' },
                    { key: 'gramajes', label: '⚖️ Gramajes' },
                    { key: 'ingredientes', label: '🧪 Ingredientes' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => cambiarPanel(tab.key)}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        panelActivo === tab.key
                          ? 'border-primary text-primary'
                          : 'border-transparent text-text-muted hover:text-primary'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card-body">
                {/* Selector de servicio — visible en todas las tabs */}
                <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {SERVICIOS.map((srv) => (
                      <button
                        key={srv.value}
                        onClick={() => seleccionarServicio(srv.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          srv.value === servicioSeleccionado
                            ? 'bg-primary text-white border-primary'
                            : 'bg-bg-surface text-text-muted border-border hover:border-primary hover:text-primary'
                        }`}
                      >
                        {srv.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vista: Menu del dia (lista de componentes) */}
                {panelActivo === 'calendario' && (
                  <div>
                    <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                      <h3 className="text-base font-semibold text-primary">
                        {SERVICIOS.find(s => s.value === servicioSeleccionado)?.label ?? servicioSeleccionado ?? ''} — Día {diaSeleccionado}
                      </h3>
                    </div>

                    {/* Cargando servicios del día */}
                    {loadingDia || loadingComponentes ? (
                      <div className="flex items-center justify-center py-10 gap-2 text-text-muted">
                        <div className="spinner spinner-sm" />
                        <span className="text-sm">Cargando...</span>
                      </div>
                    ) : !cicloDiaServicio ? (
                      <div className="text-center py-8 text-text-muted text-sm">
                        Este servicio no está configurado para el Día {diaSeleccionado}
                      </div>
                    ) : componentesMenu && componentesMenu.length > 0 ? (
                      <div className="space-y-3 mb-4">
                        {componentesMenu.map((comp) => (
                          <ComponenteSlot
                            key={comp.id}
                            componente={comp.componentes_plato}
                            receta={comp.arbol_recetas}
                            esLocal={comp.arbol_recetas?.es_local}
                            seleccionado={componenteSeleccionado?.id === comp.id}
                            onCambiarReceta={() => handleCambiarReceta(comp)}
                            onClickGramajes={() => {
                              seleccionarComponente(comp);
                              cambiarPanel('gramajes');
                            }}
                            onClickIngredientes={() => {
                              seleccionarComponente(comp);
                              cambiarPanel('ingredientes');
                            }}
                            onEliminar={() => eliminarComponente.mutate(comp.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Plus className="h-10 w-10 mx-auto text-text-muted mb-3" />
                        <h4 className="text-sm font-medium text-primary mb-1">No hay platos configurados</h4>
                        <p className="text-sm text-text-muted">
                          Agrega los platos que conformarán este servicio
                        </p>
                      </div>
                    )}

                    {/* Botones para agregar componentes — solo si el slot del servicio existe */}
                    {cicloDiaServicio && componentesPlato && componentesPlato.length > 0 && (
                      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <p className="text-xs font-medium text-text-secondary mb-3">Agregar componente:</p>
                        <div className="flex flex-wrap gap-2">
                          {componentesPlato.map((cp) => {
                            const yaAsignado = componentesMenu?.some(
                              (cm) => cm.componente_id === cp.id
                            );
                            return (
                              <button
                                key={cp.id}
                                onClick={() => handleAgregarPlato(cp.id)}
                                disabled={yaAsignado || !cicloDiaServicio?.id}
                                className={`btn text-xs py-1 ${
                                  yaAsignado
                                    ? 'btn-outline opacity-50 cursor-not-allowed'
                                    : 'btn-outline hover:border-primary hover:text-primary'
                                }`}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                {cp.nombre}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Vista: Gramajes */}
                {panelActivo === 'gramajes' && <PanelGramajes />}

                {/* Vista: Ingredientes */}
                {panelActivo === 'ingredientes' && <PanelIngredientes />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      {showSelectorReceta && (
        <SelectorReceta
          onSelect={handleSeleccionarReceta}
          onClose={() => {
            setShowSelectorReceta(false);
            setComponenteParaAsignar(null);
            setCompParaCambiarReceta(null);
          }}
          recetaActualId={compParaCambiarReceta?.receta_id ?? null}
        />
      )}

      {modalRecetaLocal && componenteSeleccionado?.receta_id && (
        <ModalRecetaLocal
          recetaId={componenteSeleccionado.receta_id}
          menuComponenteId={componenteSeleccionado.id}
          onClose={cerrarModalRecetaLocal}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
