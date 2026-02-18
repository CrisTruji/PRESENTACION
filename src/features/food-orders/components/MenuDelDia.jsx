// ========================================
// MenuDelDia - Vista read-only del menu del dia (sidebar en PedidoServicioForm)
// Muestra las recetas del ciclo activo + gramajes por tipo de dieta
// ========================================

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function MenuDelDia({ menuData, diaCiclo }) {
  const [expandidos, setExpandidos] = useState({});
  const servicios = menuData?.servicios || [];

  const toggleExpanded = (id) => {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // undefined = query en curso (loading) | null = query terminó sin datos (sin ciclo activo)
  if (menuData === undefined) {
    return (
      <div className="card p-6 text-center">
        <div className="spinner spinner-sm mx-auto mb-3"></div>
        <p className="text-sm text-text-muted">Cargando menú del día...</p>
      </div>
    );
  }

  if (menuData === null) {
    return (
      <div className="card p-6 text-center">
        <p className="text-2xl mb-2">📋</p>
        <p className="text-sm font-medium text-primary mb-1">Sin menú configurado</p>
        <p className="text-xs text-text-muted">
          El chef aún no ha activado un ciclo de menú para esta operación
        </p>
      </div>
    );
  }

  return (
    <div className="card sticky top-4">
      <div className="card-header border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="text-base font-semibold text-primary">📋 Menú del Día</h3>
        <p className="text-sm text-text-muted mt-1">
          {menuData.ciclo?.nombre ? `${menuData.ciclo.nombre} • ` : ''}Día {diaCiclo || menuData.diaCiclo || '—'}
        </p>
      </div>

      <div className="card-body space-y-4">
        {servicios.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-text-muted">
              No hay menú configurado para este día
            </p>
            <p className="text-xs text-text-muted mt-1">
              El chef aún no ha configurado el ciclo de menú
            </p>
          </div>
        ) : (
          servicios.map((srv) => (
            <div
              key={srv.id}
              className="pb-4 border-b last:pb-0 last:border-b-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                🍽️ {srv.servicio?.charAt(0).toUpperCase() + srv.servicio?.slice(1) || srv.servicio}
              </h4>
              <div className="space-y-2">
                {(srv.menu_componentes || []).map((mc) => {
                  const gramajes = mc.gramajes_componente_menu || [];
                  const isOpen = expandidos[mc.id];

                  return (
                    <div
                      key={mc.id}
                      className="rounded-lg border overflow-hidden"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      {/* Header del plato */}
                      <div
                        className="p-2.5 bg-bg-surface border-l-2"
                        style={{ borderColor: 'var(--color-primary)' }}
                      >
                        <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-0.5">
                          {mc.componentes_plato?.nombre || 'Componente'}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-primary truncate flex-1 mr-2">
                            {mc.arbol_recetas?.nombre || 'Sin receta'}
                          </div>
                          {gramajes.length > 0 && (
                            <button
                              onClick={() => toggleExpanded(mc.id)}
                              className="flex-shrink-0 text-text-muted hover:text-primary transition-colors"
                              title={isOpen ? 'Ocultar gramajes' : 'Ver gramajes por dieta'}
                            >
                              {isOpen ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                        {mc.arbol_recetas?.es_local && (
                          <span className="inline-block text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium mt-1">
                            Receta local
                          </span>
                        )}
                      </div>

                      {/* Gramajes expandibles */}
                      {isOpen && gramajes.length > 0 && (
                        <div className="px-2.5 py-2 bg-bg-app border-t" style={{ borderColor: 'var(--color-border)' }}>
                          <p className="text-xs font-medium text-text-secondary mb-1.5">
                            ⚖️ Gramajes por dieta:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {gramajes
                              .filter((g) => !g.excluir && g.gramaje > 0)
                              .map((g) => (
                                <span
                                  key={g.tipo_dieta_id}
                                  className="text-xs px-2 py-0.5 rounded-full bg-bg-surface border font-mono"
                                  style={{ borderColor: 'var(--color-border)' }}
                                >
                                  {g.tipos_dieta?.codigo || g.tipo_dieta_id?.substring(0, 2)}: {g.gramaje}
                                  {g.unidad_medida || 'gr'}
                                </span>
                              ))}
                            {gramajes
                              .filter((g) => g.excluir)
                              .map((g) => (
                                <span
                                  key={g.tipo_dieta_id}
                                  className="text-xs px-2 py-0.5 rounded-full bg-error/10 text-error border border-error/20 line-through"
                                >
                                  {g.tipos_dieta?.codigo || g.tipo_dieta_id?.substring(0, 2)}: excluido
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Mostrar resumen de gramajes sin expandir (formato compacto) */}
                      {!isOpen && gramajes.length > 0 && (
                        <div
                          className="px-2.5 py-1.5 bg-bg-app border-t"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <p className="text-xs text-text-muted truncate">
                            {gramajes
                              .filter((g) => !g.excluir && g.gramaje > 0)
                              .slice(0, 3)
                              .map((g) => `${g.tipos_dieta?.codigo || '??'}: ${g.gramaje}${g.unidad_medida || 'gr'}`)
                              .join(' • ')}
                            {gramajes.filter((g) => !g.excluir && g.gramaje > 0).length > 3 && '…'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
