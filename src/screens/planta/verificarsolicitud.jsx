// src/screens/planta/verificarsolicitud.jsx
import React, { useEffect, useState } from "react";
import { useRouter } from "../../context/roleroutercontext";
import { useAuth } from "../../context/auth";
import { 
  getSolicitudById,
  actualizarItem,
  eliminarItem,
  agregarItemsSolicitud,
  reenviarSolicitud
} from "../../services/solicitudes";
import { 
  ESTADOS_SOLICITUD,
  ESTADOS_ITEM,
  ETIQUETAS_ESTADO_ITEM,
  getEstadoClasses,
  getEstadoIcon 
} from "../../lib/estados";

export default function VerificarSolicitud() {
  const { currentScreen, navigate } = useRouter();
  const { roleName } = useAuth();
  const id = currentScreen?.params?.id;

  // Estados
  const [solicitud, setSolicitud] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  // Modo edición
  const [itemEditando, setItemEditando] = useState(null);
  const [formEdicion, setFormEdicion] = useState({});

  // Modal de confirmación
  const [modalReenvio, setModalReenvio] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(null);

  // Permisos
  const esJefeDePlanta = roleName === 'jefe_de_planta';
  const esDevuelta = solicitud && [
    ESTADOS_SOLICITUD.DEVUELTA_JEFE_PLANTA,
    ESTADOS_SOLICITUD.RECHAZADO_AUXILIAR
  ].includes(solicitud.estado);
  const puedeEditar = esJefeDePlanta && esDevuelta;

  // Cargar solicitud
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    cargarSolicitud();
  }, [id]);

  async function cargarSolicitud() {
    try {
      const data = await getSolicitudById(id);
      setSolicitud(data);
      setItems(data?.solicitud_items || []);
    } catch (err) {
      showNotification('error', 'Error al cargar la solicitud');
    } finally {
      setLoading(false);
    }
  }

  function showNotification(type, message) {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000);
  }

  // ============================================================
  // EDICIÓN DE ITEM
  // ============================================================

  function iniciarEdicion(item) {
    setItemEditando(item.id);
    setFormEdicion({
      cantidad_solicitada: item.cantidad_solicitada,
      unidad: item.unidad,
      observaciones: item.observaciones || ''
    });
  }

  function cancelarEdicion() {
    setItemEditando(null);
    setFormEdicion({});
  }

  async function guardarEdicion(itemId) {
    if (!formEdicion.cantidad_solicitada || formEdicion.cantidad_solicitada <= 0) {
      showNotification('warning', 'La cantidad debe ser mayor a 0');
      return;
    }

    try {
      await actualizarItem(itemId, formEdicion);
      
      setItems(prev =>
        prev.map(item =>
          item.id === itemId
            ? { ...item, ...formEdicion }
            : item
        )
      );

      showNotification('success', 'Producto actualizado');
      cancelarEdicion();
    } catch (error) {
      showNotification('error', 'Error al actualizar el producto');
    }
  }

  // ============================================================
  // ELIMINAR ITEM
  // ============================================================

  async function confirmarEliminar() {
    if (!modalEliminar) return;

    try {
      await eliminarItem(modalEliminar.id);
      
      setItems(prev => prev.filter(item => item.id !== modalEliminar.id));
      
      showNotification('success', 'Producto eliminado');
      setModalEliminar(null);
    } catch (error) {
      showNotification('error', 'Error al eliminar el producto');
    }
  }

  // ============================================================
  // REENVIAR SOLICITUD
  // ============================================================

  async function handleReenviar() {
    if (items.length === 0) {
      showNotification('error', 'La solicitud debe tener al menos un producto');
      return;
    }

    setModalReenvio(false);
    setGuardando(true);

    try {
      const resultado = await reenviarSolicitud(id);
      
      showNotification('success', resultado.mensaje);
      
      setTimeout(() => {
        navigate('solicitudes_planta');
      }, 2000);
    } catch (error) {
      showNotification('error', error.message || 'Error al reenviar');
      setGuardando(false);
    }
  }

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================

  const stats = {
    total: items.length,
    rechazados: items.filter(i => i.estado_item === ESTADOS_ITEM.RECHAZADO_AUXILIAR).length,
    aprobados: items.filter(i => i.estado_item === ESTADOS_ITEM.APROBADO_AUXILIAR).length
  };

  // ============================================================
  // LOADING / ERROR
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando solicitud...</p>
        </div>
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-red-600 text-2xl">❌</span>
        </div>
        <h3 className="text-xl font-semibold mb-2">Solicitud no encontrada</h3>
        <button
          onClick={() => navigate('solicitudes_planta')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Volver a solicitudes
        </button>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Notificación */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 
          notification.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'
        } text-white max-w-md`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {puedeEditar ? '✏️ Corregir Solicitud' : '📋 Ver Solicitud'} #{solicitud.id}
            </h1>
            <p className="text-gray-600 mt-1">
              {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              getEstadoClasses(solicitud.estado, 'solicitud')
            }`}>
              {getEstadoIcon(solicitud.estado, 'solicitud')} {solicitud.estado}
            </span>
            <button
              onClick={() => navigate('solicitudes_planta')}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              disabled={guardando}
            >
              ← Volver
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Proveedor</p>
            <p className="font-medium">{solicitud.proveedor?.nombre || 'Sin proveedor'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Creada por</p>
            <p className="font-medium">{solicitud.email_creador || 'N/A'}</p>
          </div>
        </div>

        {solicitud.observaciones && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Observaciones:</strong> {solicitud.observaciones}
            </p>
          </div>
        )}
      </div>

      {/* Alerta de corrección */}
      {puedeEditar && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-5 mb-6">
          <div className="flex gap-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="font-bold text-red-900 mb-2">
                Esta solicitud fue devuelta para corrección
              </h3>
              <p className="text-sm text-red-800 mb-3">
                Revisa los motivos de rechazo, corrige los productos señalados y reenvía la solicitud.
              </p>
              <ul className="text-sm text-red-700 space-y-1">
                <li>✏️ Puedes editar las cantidades y observaciones</li>
                <li>🗑️ Puedes eliminar productos rechazados</li>
                <li>➕ Puedes agregar nuevos productos (próximamente)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      {stats.rechazados > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <p className="text-green-700 text-sm">Aprobados</p>
            <p className="text-2xl font-bold text-green-800">{stats.aprobados}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4">
            <p className="text-red-700 text-sm">Rechazados</p>
            <p className="text-2xl font-bold text-red-800">{stats.rechazados}</p>
          </div>
        </div>
      )}

      {/* Lista de productos */}
      <div className="space-y-4 mb-6">
        {items.map(item => {
          const esRechazado = item.estado_item === ESTADOS_ITEM.RECHAZADO_AUXILIAR;
          const estaEditando = itemEditando === item.id;

          return (
            <div
              key={item.id}
              className={`bg-white rounded-lg shadow p-5 border-2 ${
                esRechazado ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            >
              {estaEditando ? (
                // MODO EDICIÓN
                <div>
                  <h3 className="font-bold text-lg mb-4">
                    Editando: {item.catalogo_productos?.nombre}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Cantidad *</label>
                      <input
                        type="number"
                        value={formEdicion.cantidad_solicitada}
                        onChange={(e) => setFormEdicion(prev => ({
                          ...prev,
                          cantidad_solicitada: parseFloat(e.target.value)
                        }))}
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Unidad *</label>
                      <input
                        type="text"
                        value={formEdicion.unidad}
                        onChange={(e) => setFormEdicion(prev => ({
                          ...prev,
                          unidad: e.target.value
                        }))}
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Observaciones</label>
                    <textarea
                      value={formEdicion.observaciones}
                      onChange={(e) => setFormEdicion(prev => ({
                        ...prev,
                        observaciones: e.target.value
                      }))}
                      rows="2"
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="Agrega detalles adicionales..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => guardarEdicion(item.id)}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      ✅ Guardar
                    </button>
                    <button
                      onClick={cancelarEdicion}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // MODO VISTA
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-800">
                        {item.catalogo_productos?.nombre || 'Producto sin nombre'}
                      </h3>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-gray-600">
                          <strong>Cantidad:</strong> {item.cantidad_solicitada} {item.unidad}
                        </p>
                        {item.catalogo_productos?.categoria && (
                          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                            {item.catalogo_productos.categoria}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badge de estado */}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      getEstadoClasses(item.estado_item, 'item')
                    }`}>
                      {getEstadoIcon(item.estado_item, 'item')} {ETIQUETAS_ESTADO_ITEM[item.estado_item]}
                    </span>
                  </div>

                  {/* Observaciones del producto */}
                  {item.observaciones && (
                    <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Observación:</p>
                      <p className="text-sm text-gray-700">{item.observaciones}</p>
                    </div>
                  )}

                  {/* Motivo de rechazo */}
                  {esRechazado && item.motivo_rechazo && (
                    <div className="mb-3 p-4 bg-red-100 rounded-lg border-2 border-red-300">
                      <p className="text-xs text-red-600 font-bold mb-1">⚠️ MOTIVO DE RECHAZO:</p>
                      <p className="text-sm text-red-900 font-medium">{item.motivo_rechazo}</p>
                    </div>
                  )}

                  {/* Acciones */}
                  {puedeEditar && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => iniciarEdicion(item)}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex items-center gap-1"
                        disabled={guardando}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      
                      {esRechazado && (
                        <button
                          onClick={() => setModalEliminar(item)}
                          className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 text-sm flex items-center gap-1"
                          disabled={guardando}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Botón de reenvío */}
      {puedeEditar && (
        <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-4 shadow-lg rounded-t-lg">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {items.length === 0 ? (
                <span className="text-red-600 font-medium">⚠️ Debes tener al menos un producto</span>
              ) : (
                <span className="text-green-600 font-medium">✅ Listo para reenviar</span>
              )}
            </p>
            
            <button
              onClick={() => setModalReenvio(true)}
              disabled={guardando || items.length === 0}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
                guardando || items.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 hover:shadow-lg'
              }`}
            >
              {guardando ? 'Reenviando...' : '📤 Reenviar Solicitud'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmación de reenvío */}
      {modalReenvio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Confirmar reenvío</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de que deseas reenviar esta solicitud? Los productos serán revisados nuevamente por el auxiliar de compras.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-sm text-blue-800">
                ℹ️ La solicitud volverá a estado <strong>pendiente</strong> y todos los productos serán marcados para nueva revisión.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModalReenvio(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleReenviar}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirmar reenvío
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-red-900 mb-4">Eliminar producto</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de que deseas eliminar este producto?
            </p>
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="font-medium text-red-900">{modalEliminar.catalogo_productos?.nombre}</p>
              <p className="text-sm text-red-700 mt-1">
                Cantidad: {modalEliminar.cantidad_solicitada} {modalEliminar.unidad}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModalEliminar(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}