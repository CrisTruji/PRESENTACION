// ========================================
// PedidoServicioForm - Pantalla principal pedido unidad
// Estilo: AdminDashboard pattern (page-container + stats-card + card)
// ========================================

import React, { useEffect, useState } from 'react';
import {
  Calendar, Clock, CheckCircle, AlertCircle, Send, Save, RefreshCw, Plus,
} from 'lucide-react';
import { usePedidoStore } from '../store/usePedidoStore';
import {
  usePedidoDelDia,
  useMenuDelDia,
  useCrearPedido,
  useEnviarPedido,
  useGuardarItems,
  useDiaCiclo,
} from '../hooks/usePedidos';
import { useGuardarPacientes } from '../hooks/usePedidoPacientes';
import { useOperaciones } from '@features/menu-cycles';
import { OPERACIONES_CON_PACIENTES, SERVICIOS } from '@/shared/types/menu';
import MenuDelDia from './MenuDelDia';
import PedidoDietas from './PedidoDietas';
import PedidoPacientes from './PedidoPacientes';
import PedidoCartaMenu from './PedidoCartaMenu';
import SolicitudCambioModal from './SolicitudCambioModal';
import notify from '@/shared/lib/notifier';
import { useAuth } from '@/features/auth';

export default function PedidoServicioForm() {
  const { user } = useAuth();
  const {
    operacionActual,
    fechaPedido,
    servicioPedido,
    pedidoActual,
    items,
    pacientes,
    horaLimite,
    puedeEditar,
    setOperacion,
    setFecha,
    setServicio,
    setPedido,
    setMenuDelDia: setMenuStore,
    setHoraLimite,
  } = usePedidoStore();

  const [showSolicitudCambio, setShowSolicitudCambio] = useState(false);

  const { data: operaciones } = useOperaciones();
  const { data: pedidoExistente, refetch: refetchPedido, isError: errorPedido } = usePedidoDelDia(
    operacionActual?.id, fechaPedido, servicioPedido
  );
  const { data: menuDelDia } = useMenuDelDia(operacionActual?.id, fechaPedido);
  const { data: diaCiclo, isLoading: loadingDiaCiclo } = useDiaCiclo(operacionActual?.id, fechaPedido);

  const crearPedido = useCrearPedido();
  const enviarPedido = useEnviarPedido();
  const guardarItems = useGuardarItems();
  const guardarPacientes = useGuardarPacientes();

  // Flujo carta-menu: tipo_operacion === 'carta_menu' (Eiren)
  const esCartaMenu = operacionActual?.tipo_operacion === 'carta_menu';
  // Flujo pacientes obligatorio: Alcala / Presentes
  const requierePacientesObligatorio = operacionActual
    ? OPERACIONES_CON_PACIENTES.includes(operacionActual.codigo?.toLowerCase())
    : false;
  // Legado: requierePacientes mantiene compatibilidad con los handlers
  const requierePacientes = requierePacientesObligatorio;

  useEffect(() => {
    if (pedidoExistente) {
      setPedido(pedidoExistente);
      // Cargar items existentes al store para que los inputs muestren los valores guardados
      if (pedidoExistente.pedido_items_servicio?.length > 0) {
        const itemsStore = pedidoExistente.pedido_items_servicio.map((pi) => ({
          tipo_dieta_id: pi.tipo_dieta_id,
          cantidad: pi.cantidad || 0,
          gramaje_aplicado: pi.gramaje_aplicado || null,
          observaciones: pi.observaciones || null,
        }));
        usePedidoStore.getState().setItems(itemsStore);
      }
    }
  }, [pedidoExistente]);
  useEffect(() => { if (menuDelDia) setMenuStore(menuDelDia); }, [menuDelDia]);

  const ahora = new Date();
  const horaActual = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const enHora = !horaLimite || horaActual <= horaLimite;

  const handleCrearPedido = () => {
    if (!operacionActual || !fechaPedido || !servicioPedido) {
      notify.warning('Selecciona operacion, fecha y servicio');
      return;
    }
    crearPedido.mutate(
      { operacion_id: operacionActual.id, fecha: fechaPedido, servicio: servicioPedido },
      {
        onSuccess: (res) => {
          if (res.error) { notify.error('Error: ' + res.error.message); return; }
          setPedido(res.data);
          notify.success('Pedido creado');
        },
      }
    );
  };

  const handleGuardarBorrador = () => {
    if (!pedidoActual?.id) return;
    guardarItems.mutate(
      { pedidoId: pedidoActual.id, items },
      {
        onSuccess: (res) => {
          if (res.error) { notify.error('Error al guardar items'); return; }
          // Guardar pacientes siempre que haya datos (todos los roles pueden registrar pacientes)
          if (pacientes.length > 0) {
            guardarPacientes.mutate({ pedidoId: pedidoActual.id, pacientes }, {
              onSuccess: () => notify.success('Borrador guardado'),
            });
          } else { notify.success('Borrador guardado'); }
        },
      }
    );
  };

  const handleEnviarPedido = () => {
    if (!pedidoActual?.id) return;
    guardarItems.mutate(
      { pedidoId: pedidoActual.id, items },
      {
        onSuccess: () => {
          const enviar = () => {
            enviarPedido.mutate(pedidoActual.id, {
              onSuccess: (res) => {
                if (res.error) { notify.error('Error: ' + res.error.message); return; }
                notify.success('Pedido enviado exitosamente');
                refetchPedido();
              },
            });
          };
          // Guardar pacientes siempre que haya datos (todos los roles pueden registrar pacientes)
          if (pacientes.length > 0) {
            guardarPacientes.mutate({ pedidoId: pedidoActual.id, pacientes }, { onSuccess: enviar });
          } else { enviar(); }
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
              <h1 className="section-title">
                Pedido de Servicio
              </h1>
              <p className="section-subtitle">
                {operacionActual
                  ? `${operacionActual.nombre} — ${servicioPedido ? (SERVICIOS.find(s => s.value === servicioPedido)?.label ?? servicioPedido) : 'Selecciona servicio'}`
                  : 'Selecciona una operacion para comenzar'}
              </p>
            </div>

            {pedidoActual && (
              <button
                onClick={() => refetchPedido()}
                className="btn btn-outline flex items-center gap-2 text-sm !py-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Actualizar</span>
              </button>
            )}
          </div>
        </div>

        {/* Selectores */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Operacion</label>
                <select
                  value={operacionActual?.id || ''}
                  onChange={(e) => {
                    const op = operaciones?.find((o) => o.id === e.target.value);
                    setOperacion(op || null);
                  }}
                  className="form-input"
                >
                  <option value="">Seleccionar operacion...</option>
                  {operaciones?.map((op) => (
                    <option key={op.id} value={op.id}>{op.nombre} ({op.codigo})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">
                  Fecha
                  {/* Badge informativo: día del ciclo activo para la fecha seleccionada */}
                  {operacionActual && !loadingDiaCiclo && (
                    diaCiclo !== null && diaCiclo !== undefined ? (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                        Día {diaCiclo} del ciclo
                      </span>
                    ) : (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                        Sin ciclo activo
                      </span>
                    )
                  )}
                </label>
                <input
                  type="date"
                  value={fechaPedido}
                  onChange={(e) => setFecha(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Servicio</label>
                <select
                  value={servicioPedido || ''}
                  onChange={(e) => setServicio(e.target.value)}
                  className="form-input"
                >
                  <option value="">Seleccionar servicio...</option>
                  {SERVICIOS.map((srv) => (
                    <option key={srv.value} value={srv.value}>{srv.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Alerta hora limite */}
        {operacionActual && servicioPedido && (
          <div className={`alert mb-6 ${enHora ? 'alert-success' : 'alert-error'}`}>
            {enHora ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <div>
              <p className="text-sm font-medium">
                {enHora
                  ? `Hora actual: ${horaActual}${horaLimite ? ` — Hora limite: ${horaLimite}` : ''}`
                  : `Hora limite pasada${horaLimite ? ` (${horaLimite})` : ''}. El pedido se marcara como tardio.`}
              </p>
            </div>
          </div>
        )}

        {/* Estado del pedido existente */}
        {pedidoActual && (
          <div className="card mb-6">
            <div className="card-body !py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`badge ${
                    pedidoActual.estado === 'enviado' ? 'badge-success' :
                    pedidoActual.estado === 'consolidado' ? 'badge-primary' :
                    'badge-warning'
                  }`}>
                    {pedidoActual.estado?.toUpperCase()}
                  </span>
                  {pedidoActual.hora_envio && (
                    <span className="text-sm text-muted">
                      Enviado: {new Date(pedidoActual.hora_envio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <span className="text-sm text-muted">
                    Dia ciclo: {pedidoActual.dia_ciclo_calculado}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenido principal */}
        {operacionActual && servicioPedido && (
          <div className="grid grid-cols-12 gap-6">
            {/* Menu del dia - columna izquierda */}
            <div className="col-span-12 md:col-span-4">
              <MenuDelDia
                menuData={menuDelDia}
                diaCiclo={pedidoActual?.dia_ciclo_calculado || menuDelDia?.diaCiclo}
              />
            </div>

            {/* Formulario - columna derecha */}
            <div className="col-span-12 md:col-span-8">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-primary">
                    {esCartaMenu
                      ? 'Carta de Menú — Opciones por Componente'
                      : requierePacientesObligatorio
                        ? 'Lista de Pacientes'
                        : 'Cantidades por Tipo de Dieta'}
                  </h3>
                  <p className="text-sm text-muted mt-0.5">
                    {esCartaMenu
                      ? 'Ingresa las cantidades y la opción elegida por cada grupo de dieta'
                      : requierePacientesObligatorio
                        ? 'Agrega los datos de cada paciente que recibira este servicio'
                        : 'Ingresa la cantidad de porciones que necesitas para cada tipo de dieta'}
                  </p>
                </div>

                <div className="card-body">
                  {errorPedido ? (
                    <div className="p-10 text-center">
                      <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
                      <h4 className="text-lg font-semibold text-error mb-1">Error de conexión</h4>
                      <p className="text-sm text-muted mb-4">No se pudo cargar el pedido. Verifica tu conexión.</p>
                      <button onClick={() => refetchPedido()} className="btn btn-outline flex items-center gap-2 mx-auto">
                        <RefreshCw className="w-4 h-4" />
                        Reintentar
                      </button>
                    </div>
                  ) : !pedidoActual ? (
                    <div className="p-10 text-center">
                      <div className="w-20 h-20 bg-app rounded-card flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-10 h-10 text-muted" />
                      </div>
                      <h4 className="text-xl font-semibold text-primary mb-2">No hay pedido para este dia</h4>
                      <p className="text-muted mb-6">Crea un nuevo pedido para comenzar a ingresar cantidades</p>
                      <button
                        onClick={handleCrearPedido}
                        disabled={crearPedido.isPending}
                        className="btn btn-primary"
                      >
                        {crearPedido.isPending && <div className="spinner spinner-sm"></div>}
                        <Plus className="w-4 h-4 mr-2" />
                        Crear Pedido
                      </button>
                    </div>
                  ) : esCartaMenu ? (
                    /* ── Eiren: carta-menu con opciones A/B por componente + pacientes opcionales ── */
                    <>
                      <PedidoCartaMenu />
                      <PedidoPacientes opcional={true} />
                    </>
                  ) : requierePacientesObligatorio ? (
                    /* ── Alcala/Presentes: solo pacientes obligatorios ── */
                    <PedidoPacientes />
                  ) : (
                    /* ── Otras unidades: cantidades por dieta + pacientes opcionales ── */
                    <>
                      <PedidoDietas />
                      <PedidoPacientes opcional={true} />
                    </>
                  )}
                </div>

                {/* Footer acciones */}
                {pedidoActual && puedeEditar && (
                  <div className="card-footer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleGuardarBorrador}
                          disabled={guardarItems.isPending}
                          className="btn btn-outline text-sm"
                        >
                          {guardarItems.isPending ? <div className="spinner spinner-sm"></div> : <Save className="w-4 h-4 mr-1.5" />}
                          Guardar Borrador
                        </button>
                        <button
                          onClick={() => setShowSolicitudCambio(true)}
                          className="btn btn-outline text-sm"
                          style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                        >
                          Solicitar Cambio
                        </button>
                      </div>
                      <button
                        onClick={handleEnviarPedido}
                        disabled={enviarPedido.isPending}
                        className="btn btn-primary"
                      >
                        {enviarPedido.isPending ? <div className="spinner spinner-sm"></div> : <Send className="w-4 h-4 mr-2" />}
                        Enviar Pedido
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {showSolicitudCambio && pedidoActual && (
          <SolicitudCambioModal
            pedidoId={pedidoActual.id}
            menuComponenteId={null}
            onClose={() => setShowSolicitudCambio(false)}
          />
        )}
      </div>
    </div>
  );
}
