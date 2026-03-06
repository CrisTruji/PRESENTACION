// ========================================
// SemaforoOperativo — Widget de estado del día
// ========================================
// Tabla matricial: Operación × Servicio
// Colores: 🟢 enviado / 🟡 pendiente / 🔴 vencido / — no aplica
// Se actualiza cada 5 min via refetchInterval (datos)
// La hora local se recalcula cada 60s para cambiar amarillo→rojo sin refetch

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, RefreshCw, X, Info } from 'lucide-react';
import { useSemaforoOperativo } from '../hooks/useSemaforoOperativo';

// Orden canónico de los servicios (de mañana a noche)
const ORDEN_SERVICIOS = ['desayuno', 'nueves', 'almuerzo', 'onces', 'cena', 'cena_ligera'];

// Etiquetas para mostrar en la cabecera de la tabla
const ETIQUETA = {
  desayuno:    'Desayuno',
  nueves:      'Nueves',
  almuerzo:    'Almuerzo',
  onces:       'Onces',
  cena:        'Cena',
  cena_ligera: 'C. Ligera',
};

// ─── Clases Tailwind por estado ─────────────────────────────
const BG_ESTADO = {
  enviado:   'bg-success text-white',
  pendiente: 'bg-warning text-white',
  vencido:   'bg-error text-white',
};

const ICONO_ESTADO = {
  enviado:   '✓',
  pendiente: '·',
  vencido:   '!',
};

// ─── Helpers ────────────────────────────────────────────────

/**
 * Calcula el estado de una celda (enviado, pendiente, vencido)
 * @param {string} horaLimite  "HH:MM" (de servicios_unidad)
 * @param {boolean} tienePedido  si existe un pedido no borrador hoy
 * @param {Date}   ahora        hora actual (actualizada cada 60s)
 */
function calcularEstado(horaLimite, tienePedido, ahora) {
  if (tienePedido) return 'enviado';
  if (!horaLimite) return 'vencido';
  const [h, m] = horaLimite.split(':').map(Number);
  const limite = new Date(ahora);
  limite.setHours(h, m, 0, 0);
  return ahora < limite ? 'pendiente' : 'vencido';
}

function formatHora(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function formatFechaCorta(date) {
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Sub-componente: mini-modal al hacer click en celda ─────
function InfoPopup({ celda, onClose }) {
  const { opNombre, servicio, estado, horaLimite, horaEnvio, capacidad } = celda;
  const labelEstado = {
    enviado:   '✓ Enviado',
    pendiente: '· Pendiente',
    vencido:   '! Vencido',
  }[estado];

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-card shadow-card p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="font-bold text-primary text-lg">{opNombre}</h4>
            <p className="text-sm text-muted capitalize">{ETIQUETA[servicio] || servicio}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-primary ml-2 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Estado visual */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-4 ${BG_ESTADO[estado]}`}>
          {labelEstado}
        </div>

        {/* Detalle */}
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Hora límite</dt>
            <dd className="font-medium text-primary">{horaLimite || '—'}</dd>
          </div>
          {estado === 'enviado' && (
            <div className="flex justify-between">
              <dt className="text-muted">Enviado a las</dt>
              <dd className="font-medium text-primary">{formatHora(horaEnvio)}</dd>
            </div>
          )}
          {capacidad > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Capacidad esperada</dt>
              <dd className="font-medium text-primary">{capacidad} pax</dd>
            </div>
          )}
        </dl>

        <button onClick={onClose} className="mt-5 btn btn-outline w-full text-sm">
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────
export default function SemaforoOperativo() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useSemaforoOperativo();
  const [horaActual, setHoraActual] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState(null);

  // Actualizar hora cada 60s para re-calcular colores sin refetch
  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Construir la matriz operaciones × servicios
  const { operaciones, serviciosEnUso } = useMemo(() => {
    if (!data) return { operaciones: [], serviciosEnUso: [] };

    const { servicios, pedidos } = data;

    // Set de servicios activos en el sistema (en orden canónico)
    const serviciosEnUso = ORDEN_SERVICIOS.filter((s) =>
      servicios.some((su) => su.servicio === s)
    );

    // Mapa rápido de pedidos: "operacion_id|servicio" → pedido
    const pedidoMap = new Map();
    for (const p of pedidos) {
      pedidoMap.set(`${p.operacion_id}|${p.servicio}`, p);
    }

    // Agrupar por operación
    const opMap = new Map();
    for (const su of servicios) {
      const opId = su.operacion_id;
      if (!opMap.has(opId)) {
        opMap.set(opId, {
          id:     su.operaciones?.id   || opId,
          nombre: su.operaciones?.nombre || opId,
          celdas: {},
        });
      }
      const key = `${opId}|${su.servicio}`;
      const pedido = pedidoMap.get(key);
      opMap.get(opId).celdas[su.servicio] = {
        horaLimite:  su.hora_limite,
        capacidad:   su.capacidad_promedio || 0,
        tienePedido: !!pedido,
        horaEnvio:   pedido?.hora_envio || null,
        estado:      calcularEstado(su.hora_limite, !!pedido, horaActual),
      };
    }

    const operaciones = [...opMap.values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es')
    );

    return { operaciones, serviciosEnUso };
  }, [data, horaActual]);

  // Última actualización legible
  const ultimaActualizacion = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    : null;

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body py-10 text-center">
          <div className="spinner spinner-lg mx-auto mb-3" />
          <p className="text-muted text-sm">Cargando semáforo operativo…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        {/* Header */}
        <div className="card-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted" />
              Semáforo Operativo
            </h3>
            <p className="text-xs text-muted mt-0.5 capitalize">
              {formatFechaCorta(horaActual)}
              {ultimaActualizacion && ` · actualizado ${ultimaActualizacion}`}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn btn-outline text-xs !py-1.5 !px-3 flex items-center gap-1.5 self-start sm:self-auto"
            title="Actualizar ahora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Tabla */}
        {operaciones.length === 0 ? (
          <div className="card-body py-8 text-center">
            <p className="text-muted text-sm">No hay operaciones activas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left px-4 py-2.5 font-semibold text-secondary text-xs uppercase tracking-wide">
                    Operación
                  </th>
                  {serviciosEnUso.map((s) => (
                    <th
                      key={s}
                      className="px-3 py-2.5 font-semibold text-secondary text-xs uppercase tracking-wide text-center"
                    >
                      {ETIQUETA[s] || s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operaciones.map((op, i) => (
                  <tr
                    key={op.id}
                    style={{
                      borderBottom: i < operaciones.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}
                  >
                    <td className="px-4 py-2 font-medium text-primary whitespace-nowrap">
                      {op.nombre}
                    </td>
                    {serviciosEnUso.map((servicio) => {
                      const celda = op.celdas[servicio];
                      if (!celda) {
                        return (
                          <td key={servicio} className="px-3 py-2 text-center">
                            <span className="text-muted text-xs">—</span>
                          </td>
                        );
                      }
                      const estado = calcularEstado(celda.horaLimite, celda.tienePedido, horaActual);
                      return (
                        <td key={servicio} className="px-3 py-2 text-center">
                          <button
                            onClick={() =>
                              setSelectedCell({
                                opNombre:   op.nombre,
                                servicio,
                                estado,
                                horaLimite: celda.horaLimite,
                                horaEnvio:  celda.horaEnvio,
                                capacidad:  celda.capacidad,
                              })
                            }
                            className={`w-8 h-8 rounded-full font-bold text-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary ${BG_ESTADO[estado]}`}
                            title={
                              estado === 'enviado'
                                ? `Enviado a las ${formatHora(celda.horaEnvio)}`
                                : `Hora límite: ${celda.horaLimite}`
                            }
                          >
                            {ICONO_ESTADO[estado]}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Leyenda */}
        <div
          className="px-4 py-3 flex flex-wrap gap-4 text-xs text-muted"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-success inline-block" />
            Enviado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-warning inline-block" />
            Pendiente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-error inline-block" />
            Vencido
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-app border border-base inline-block" />
            No aplica
          </span>
          <span className="flex items-center gap-1.5 ml-auto">
            <Info className="w-3.5 h-3.5" />
            Click en celda para detalles · refresca cada 5 min
          </span>
        </div>
      </div>

      {/* Mini-modal */}
      {selectedCell && (
        <InfoPopup celda={selectedCell} onClose={() => setSelectedCell(null)} />
      )}
    </>
  );
}
