// ========================================
// MenuDelDia - Sidebar compacto del menú del día
// Solo muestra componente + receta (sin gramajes expandibles)
// ========================================

import React from 'react';

export default function MenuDelDia({ menuData, diaCiclo }) {
  const servicios = menuData?.servicios || [];

  if (menuData === undefined) {
    return (
      <div className="card p-5 text-center">
        <div className="spinner spinner-sm mx-auto mb-2" />
        <p className="text-xs text-text-muted">Cargando menú...</p>
      </div>
    );
  }

  if (menuData === null) {
    return (
      <div className="card p-5 text-center">
        <p className="text-2xl mb-2">📋</p>
        <p className="text-sm font-medium text-primary mb-1">Sin menú configurado</p>
        <p className="text-xs text-text-muted">
          El chef aún no ha activado un ciclo de menú
        </p>
      </div>
    );
  }

  // Filtrar solo el servicio que corresponde a la vista actual (opcional, muestra todos si no hay filtro)
  const serviciosFiltrados = servicios.length > 0 ? servicios : [];

  return (
    <div className="card sticky top-4">
      {/* Header compacto */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <div>
            <p className="text-sm font-semibold text-primary leading-none">Menú del Día</p>
            {(diaCiclo || menuData.diaCiclo) && (
              <p className="text-xs text-text-muted mt-0.5">
                {menuData.ciclo?.nombre ? `${menuData.ciclo.nombre} · ` : ''}
                Día {diaCiclo || menuData.diaCiclo}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Componentes por servicio */}
      <div className="p-3 space-y-3">
        {serviciosFiltrados.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-4">
            No hay menú configurado para este día
          </p>
        ) : (
          serviciosFiltrados.map((srv) => (
            <div key={srv.id}>
              {/* Etiqueta servicio */}
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                🍽 {srv.servicio?.charAt(0).toUpperCase() + srv.servicio?.slice(1)}
              </p>

              {/* Componentes */}
              <div className="space-y-1.5">
                {(srv.menu_componentes || []).map((mc) => (
                  <div
                    key={mc.id}
                    className="p-2.5 rounded-lg border-l-2"
                    style={{
                      borderLeftColor: 'var(--color-primary)',
                      background: 'var(--color-bg-surface)',
                    }}
                  >
                    <p
                      className="text-xs font-bold uppercase tracking-wide leading-none mb-0.5"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {mc.componentes_plato?.nombre || 'Componente'}
                    </p>
                    <p className="text-xs font-semibold text-primary truncate">
                      {mc.arbol_recetas?.nombre || 'Sin receta'}
                    </p>
                    {mc.opciones_carta && (
                      <div className="mt-1 space-y-0.5">
                        {(() => {
                          try {
                            const opts = typeof mc.opciones_carta === 'string'
                              ? JSON.parse(mc.opciones_carta)
                              : mc.opciones_carta;
                            return (
                              <>
                                {opts.opcionA && (
                                  <p className="text-xs" style={{ color: 'var(--color-accent)' }}>
                                    A: {opts.opcionA}
                                  </p>
                                )}
                                {opts.opcionB && (
                                  <p className="text-xs" style={{ color: '#a855f7' }}>
                                    B: {opts.opcionB}
                                  </p>
                                )}
                              </>
                            );
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
