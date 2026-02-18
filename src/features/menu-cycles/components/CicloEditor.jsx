// ========================================
// CicloEditor - Layout 3 paneles (master)
// ========================================

import React, { useEffect } from 'react';
import { ChevronLeft, Save, Plus } from 'lucide-react';
import { useCicloEditorStore } from '../store/useCicloEditorStore';
import { useCicloCompleto } from '../hooks/useCiclos';
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

  const { data: ciclo, isLoading } = useCicloCompleto(cicloSeleccionado?.id);
  const { data: diaServicios } = useDiaServicios(cicloSeleccionado?.id, diaSeleccionado);
  const { data: componentesPlato } = useComponentesPlato();

  // Seleccionar primer servicio por defecto
  useEffect(() => {
    if (!servicioSeleccionado && SERVICIOS.length > 0) {
      seleccionarServicio(SERVICIOS[0].value);
    }
  }, [servicioSeleccionado]);

  const cicloDiaServicio = diaServicios?.find(
    (ds) => ds.servicio === servicioSeleccionado
  );

  const { data: componentesMenu } = useComponentesDia(cicloDiaServicio?.id);
  const asignarComponente = useAsignarComponente();
  const eliminarComponente = useEliminarComponente();

  const [showSelectorReceta, setShowSelectorReceta] = React.useState(false);
  const [componenteParaAsignar, setComponenteParaAsignar] = React.useState(null);

  const handleAgregarPlato = (componenteId) => {
    setComponenteParaAsignar(componenteId);
    setShowSelectorReceta(true);
  };

  const handleSeleccionarReceta = (receta) => {
    if (!cicloDiaServicio?.id || !componenteParaAsignar) return;
    asignarComponente.mutate({
      cicloDiaServicioId: cicloDiaServicio.id,
      componenteId: componenteParaAsignar,
      recetaId: receta.id,
    });
    setShowSelectorReceta(false);
    setComponenteParaAsignar(null);
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="spinner spinner-lg mx-auto" />
        <p className="mt-4 text-muted">Cargando ciclo...</p>
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
              <h1 className="section-title">
                {ciclo?.nombre || cicloSeleccionado?.nombre || 'Editor de Ciclo'}
              </h1>
              <p className="section-subtitle">
                Día {diaSeleccionado} • {SERVICIOS.find(s => s.value === servicioSeleccionado)?.label ?? servicioSeleccionado ?? ''}
              </p>
            </div>
          </div>
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
                {/* Vista: Menu del dia (lista de componentes) */}
                {panelActivo === 'calendario' && (
                  <div>
                    <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                      <h3 className="text-base font-semibold text-primary">
                        {SERVICIOS.find(s => s.value === servicioSeleccionado)?.label ?? servicioSeleccionado ?? ''} - Día {diaSeleccionado}
                      </h3>
                    </div>

                    {componentesMenu && componentesMenu.length > 0 ? (
                      <div className="space-y-3 mb-4">
                        {componentesMenu.map((comp) => (
                          <ComponenteSlot
                            key={comp.id}
                            componente={comp.componentes_plato}
                            receta={comp.arbol_recetas}
                            esLocal={comp.arbol_recetas?.es_local}
                            seleccionado={componenteSeleccionado?.id === comp.id}
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

                    {/* Botones para agregar componentes */}
                    {componentesPlato && componentesPlato.length > 0 && (
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
                                disabled={yaAsignado}
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
          onClose={() => setShowSelectorReceta(false)}
        />
      )}

      {modalRecetaLocal && componenteSeleccionado?.receta_id && (
        <ModalRecetaLocal
          recetaId={componenteSeleccionado.receta_id}
          onClose={cerrarModalRecetaLocal}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
