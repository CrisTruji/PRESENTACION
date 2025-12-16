// src/screens/aux_compras/VerDetallesSolicitud.jsx

import React, { useEffect, useState } from "react";
import { useRouter } from "../../context/roleroutercontext";
import {
  getSolicitudById,
  actualizarEstadoSolicitud,
  rechazarItemAuxiliar
} from "/src/services/solicitudes";

export default function VerDetallesSolicitud() {
  // ===============================
  // ROUTER INTERNO
  // ===============================
  const { currentScreen, navigate } = useRouter();
  const id = currentScreen?.params?.id;

  // ===============================
  // ESTADOS
  // ===============================
  const [solicitud, setSolicitud] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  // MODAL
  const [modal, setModal] = useState({ open: false, item: null });
  const [comentario, setComentario] = useState("");

  // ===============================
  // CARGAR SOLICITUD
  // ===============================
  useEffect(() => {
    if (!id) {
      console.error("ID de solicitud no recibido");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const data = await getSolicitudById(id);
        setSolicitud(data);
        setItems(data?.solicitud_items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  // ===============================
  // NOTIFICACION
  // ===============================
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 4000);
  };

  // ===============================
  // MODAL
  // ===============================
  function abrirModal(item) {
    setComentario("");
    setModal({ open: true, item });
  }

  // ===============================
  // RECHAZAR ITEM
  // ===============================
  async function rechazarItem() {
    const item = modal.item;

    try {
      await rechazarItemAuxiliar(item.id, comentario);

      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? { ...p, estado_item: "rechazado_auxiliar", observaciones: comentario }
            : p
        )
      );

      showNotification('success', 'Producto rechazado exitosamente');
      setModal({ open: false, item: null });
    } catch (error) {
      showNotification('error', 'Error al rechazar el producto');
    }
  }

  // ===============================
  // APROBAR SOLICITUD
  // ===============================
  async function aprobarSolicitud() {
    const existeRechazado = items.some(
      (i) => i.estado_item === "rechazado_auxiliar"
    );

    if (existeRechazado) {
      showNotification('warning', 'No puedes aprobar la solicitud, hay productos rechazados.');
      return;
    }

    try {
      await actualizarEstadoSolicitud(
        id,
        "aprobado_auxiliar",
        "Solicitud aprobada por auxiliar"
      );

      showNotification('success', 'Solicitud aprobada exitosamente');
      setTimeout(() => navigate("gestion_aux"), 1500);
    } catch (error) {
      showNotification('error', 'Error al aprobar la solicitud');
    }
  }

  // ===============================
  // DEVOLVER SOLICITUD
  // ===============================
  async function devolverSolicitud() {
    try {
      await actualizarEstadoSolicitud(
        id,
        "rechazado_auxiliar",
        "Solicitud devuelta por auxiliar"
      );

      showNotification('success', 'Solicitud devuelta al jefe de planta');
      setTimeout(() => navigate("gestion_aux"), 1500);
    } catch (error) {
      showNotification('error', 'Error al devolver la solicitud');
    }
  }

  // ===============================
  // FUNCIONES UTILES
  // ===============================
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'aprobado_auxiliar': return 'bg-green-100 text-green-800';
      case 'rechazado_auxiliar': return 'bg-red-100 text-red-800';
      case 'revisado_auxiliar': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getItemEstadoIcon = (estado) => {
    switch (estado) {
      case 'pendiente': return '⏳';
      case 'aprobado_auxiliar': return '✅';
      case 'rechazado_auxiliar': return '❌';
      case 'revisado_auxiliar': return '🔍';
      default: return '📦';
    }
  };

  // ===============================
  // LOADING
  // ===============================
  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <div className="spinner mb-4"></div>
        <p className="text-gray-600 font-medium">Cargando detalles de la solicitud…</p>
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-red-600 text-2xl">❌</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Solicitud no encontrada</h3>
        <p className="text-gray-600 mb-4">La solicitud que buscas no existe o fue eliminada.</p>
        <button
          onClick={() => navigate("gestion_aux")}
          className="btn-outline"
        >
          Volver a la lista
        </button>
      </div>
    );
  }

  // ===============================
  // UI
  // ===============================
  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Notificación */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 ${
          notification.type === 'success' ? 'alert-success' : 
          notification.type === 'error' ? 'alert-error' : 'alert-warning'
        } shadow-lg max-w-md animate-float`}>
          <div className="flex items-center">
            {notification.type === 'success' && '✅ '}
            {notification.type === 'error' && '❌ '}
            {notification.type === 'warning' && '⚠️ '}
            {notification.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              Solicitud #{solicitud.id}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <span className="text-gray-400">📅</span>
                {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-gray-400">🕒</span>
                {new Date(solicitud.fecha_solicitud).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
          
          <div className="mt-3 md:mt-0">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getEstadoColor(solicitud.estado)}`}>
              {solicitud.estado}
            </span>
          </div>
        </div>

        {/* Información principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-gray-500 mb-1">Proveedor</p>
            <p className="font-medium text-gray-800">
              {solicitud.proveedor?.nombre || 'Sin proveedor asignado'}
            </p>
          </div>
          
          <div className="card p-4">
            <p className="text-sm text-gray-500 mb-1">Creada por</p>
            <p className="font-medium text-gray-800">
              {solicitud.email_creador || 'Usuario no disponible'}
            </p>
          </div>
        </div>

        {/* Observaciones */}
        {solicitud.observaciones && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
              <span className="text-blue-500">💬</span> Observaciones generales
            </p>
            <p className="text-gray-700">{solicitud.observaciones}</p>
          </div>
        )}
      </div>

      {/* Productos */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Productos solicitados ({items.length})
          </h2>
          <div className="text-sm text-gray-600">
            {items.filter(i => i.estado_item === 'rechazado_auxiliar').length} rechazados
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="card p-4 hover-lift"
            >
              {/* Header del producto */}
              <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">
                    {item.catalogo_productos?.nombre || 'Producto sin nombre'}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <span className="text-gray-400">📦</span>
                      {item.cantidad_solicitada} {item.unidad}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(item.estado_item)}`}>
                    {getItemEstadoIcon(item.estado_item)} {item.estado_item}
                  </span>
                </div>
              </div>

              {/* Observaciones del producto */}
              {item.observaciones && (
                <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                  <p className="text-gray-500 text-xs mb-1">Nota:</p>
                  <p>{item.observaciones}</p>
                </div>
              )}

              {/* Acciones */}
              <div className="flex justify-end mt-4">
                {(item.estado_item === "pendiente" || item.estado_item === "revisado_auxiliar") ? (
                  <button
                    onClick={() => abrirModal(item)}
                    className="btn-outline text-sm px-3 py-1.5 flex items-center gap-1.5 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Rechazar
                  </button>
                ) : (
                  <span className="text-gray-400 text-sm">No editable</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel de acciones */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4 md:-mx-6 -mb-4 md:-mb-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={devolverSolicitud}
            className="btn-outline flex-1 sm:flex-none flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Devolver solicitud
          </button>
          
          <button
            onClick={aprobarSolicitud}
            className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Aprobar solicitud
          </button>
        </div>
      </div>

      {/* Modal de rechazo */}
      {modal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="card w-full max-w-md animate-float">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-xl">❌</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Rechazar producto</h3>
                  <p className="text-sm text-gray-600">
                    {modal.item?.catalogo_productos?.nombre}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Motivo del rechazo (opcional)</label>
                <textarea
                  rows="3"
                  className="form-input"
                  placeholder="Ej: Precio muy alto, producto no disponible, etc."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este comentario será visible para el jefe de planta.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setModal({ open: false, item: null })}
                  className="btn-outline px-4 py-2"
                >
                  Cancelar
                </button>

                <button
                  onClick={rechazarItem}
                  className="btn bg-red-500 hover:bg-red-600 text-white px-4 py-2 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Rechazar producto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}