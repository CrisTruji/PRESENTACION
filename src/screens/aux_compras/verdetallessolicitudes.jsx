// src/screens/aux_compras/verdetallessolicitudes.jsx
import React, { useEffect, useState } from "react";
import { useRouter } from "../../context/roleroutercontext";
import { 
  getSolicitudById, 
  cerrarRevisionAuxiliar,
  aprobarItemsAuxiliar,
  rechazarItemsAuxiliar
} from "../../services/solicitudes";

export default function VerDetallesSolicitud() {
  const { currentScreen, navigate } = useRouter();
  const id = currentScreen?.params?.id;

  // Estados básicos
  const [solicitud, setSolicitud] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  // Items que el auxiliar quiere RECHAZAR (por defecto ninguno = todos aprobados)
  const [itemsRechazados, setItemsRechazados] = useState([]);
  
  // Motivos de rechazo por item
  const [motivos, setMotivos] = useState({});

  // Modal de confirmación
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);

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
  // LÓGICA DE RECHAZO
  // ============================================================

  // Toggle rechazo de un item
  function toggleRechazo(itemId) {
    setItemsRechazados(prev => {
      if (prev.includes(itemId)) {
        // Si lo deselecciona, limpiar su motivo
        setMotivos(m => {
          const nuevo = { ...m };
          delete nuevo[itemId];
          return nuevo;
        });
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  }

  // Actualizar motivo de un item
  function actualizarMotivo(itemId, motivo) {
    setMotivos(prev => ({
      ...prev,
      [itemId]: motivo
    }));
  }

  // Validar antes de cerrar revisión
  function validarRevision() {
    // Si hay items rechazados sin motivo
    const rechazadosSinMotivo = itemsRechazados.filter(
      id => !motivos[id]?.trim()
    );

    if (rechazadosSinMotivo.length > 0) {
      showNotification('warning', 'Debes agregar un motivo a todos los ítems rechazados');
      return false;
    }

    return true;
  }

  // ============================================================
  // CERRAR REVISIÓN
  // ============================================================

  async function handleCerrarRevision() {
    if (!validarRevision()) return;

    setMostrarModalConfirmacion(false);
    setGuardando(true);

    try {
      // 1. Aprobar los items que NO están rechazados
      const itemsAprobados = items
        .filter(item => !itemsRechazados.includes(item.id))
        .map(item => item.id);

      if (itemsAprobados.length > 0) {
        await aprobarItemsAuxiliar(itemsAprobados);
      }

      // 2. Rechazar los items seleccionados con sus motivos
      if (itemsRechazados.length > 0) {
        for (const itemId of itemsRechazados) {
          await rechazarItemsAuxiliar([itemId], motivos[itemId]);
        }
      }

      // 3. Cerrar la revisión (esto determina el próximo estado)
      const resultado = await cerrarRevisionAuxiliar(id);

      showNotification('success', resultado.mensaje);
      
      setTimeout(() => {
        navigate("gestion_aux");
      }, 2000);

    } catch (error) {
      showNotification('error', error.message || 'Error al cerrar revisión');
      setGuardando(false);
    }
  }

  // ============================================================
  // LOADING / ERROR
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando detalles...</p>
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
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Solicitud no encontrada</h3>
        <button
          onClick={() => navigate("gestion_aux")}
          className="btn-primary"
        >
          Volver a la lista
        </button>
      </div>
    );
  }

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================

  const stats = {
    total: items.length,
    aprobados: items.length - itemsRechazados.length,
    rechazados: itemsRechazados.length
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Notificación - usando el sistema del ejemplo */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 animate-slide-in ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-500 text-green-800' 
            : notification.type === 'error' 
            ? 'bg-red-50 border-red-500 text-red-800' 
            : 'bg-yellow-50 border-yellow-500 text-yellow-800'
        }`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              {notification.type === 'success' && (
                <svg className="w-6 h-6 mr-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="w-6 h-6 mr-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {notification.type === 'warning' && (
                <svg className="w-6 h-6 mr-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              <div>
                <p className="font-semibold">{notification.message}</p>
                <p className="text-sm opacity-75 mt-1">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
            <button 
              onClick={() => setNotification({ show: false, type: '', message: '' })}
              className="ml-4 opacity-50 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                notification.type === 'success' ? 'bg-green-500' : 
                notification.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'
              } animate-progress`}
              style={{ animationDuration: '4000ms' }}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Revisión de Solicitud <span className="text-primary-600">#{solicitud.id}</span>
            </h1>
            <p className="text-gray-600 mt-1">
              {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
          <button
            onClick={() => navigate("gestion_aux")}
            className="btn-outline"
            disabled={guardando}
          >
            ← Volver
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Proveedor</p>
            <p className="font-medium text-gray-900">
              {solicitud.proveedor?.nombre || 'Sin proveedor'}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Creada por</p>
            <p className="font-medium text-gray-900">
              {solicitud.email_creador || 'N/A'}
            </p>
          </div>
        </div>

        {solicitud.observaciones && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <span className="text-blue-600">📝</span>
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">Observaciones:</p>
                <p className="text-blue-800">{solicitud.observaciones}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm mb-1">Total de productos</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="card p-4 border-l-4 border-green-500">
          <p className="text-green-700 text-sm mb-1">Se aprobarán</p>
          <p className="text-3xl font-bold text-green-600">{stats.aprobados}</p>
        </div>
        <div className="card p-4 border-l-4 border-red-500">
          <p className="text-red-700 text-sm mb-1">Se rechazarán</p>
          <p className="text-3xl font-bold text-red-600">{stats.rechazados}</p>
        </div>
      </div>

      {/* Instrucción */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 mb-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-xl text-blue-600">💡</span>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-blue-900 mb-2 text-lg">
              ✅ Todos los productos están pre-aprobados por defecto
            </h3>
            <p className="text-blue-800 mb-2">
              Solo marca los que quieras <strong className="text-red-600">rechazar</strong> y escribe el motivo.
            </p>
            <p className="text-sm text-blue-700">
              Los productos sin marcar se aprobarán automáticamente al cerrar la revisión.
            </p>
          </div>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="space-y-4 mb-6">
        {items.map(item => {
          const estaRechazado = itemsRechazados.includes(item.id);
          
          return (
            <div
              key={item.id}
              className={`card p-5 border-2 transition-all ${
                estaRechazado 
                  ? 'border-red-300' 
                  : 'border-green-300'
              }`}
            >
              {/* Header del item */}
              <div className="flex items-start gap-4">
                {/* Checkbox de rechazo */}
                <div className="flex-shrink-0 pt-1">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={estaRechazado}
                      onChange={() => toggleRechazo(item.id)}
                      className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                      disabled={guardando}
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {estaRechazado ? 'Rechazar' : 'Aprobar'}
                    </span>
                  </label>
                </div>

                {/* Contenido del producto */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {item.catalogo_productos?.nombre || 'Producto sin nombre'}
                      </h3>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-gray-600">
                          <strong>Cantidad:</strong> {item.cantidad_solicitada} {item.unidad}
                        </p>
                        {item.catalogo_productos?.categoria && (
                          <span className="badge-primary text-xs">
                            {item.catalogo_productos.categoria}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badge de estado visual */}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      estaRechazado 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {estaRechazado ? '❌ Se rechazará' : '✅ Se aprobará'}
                    </span>
                  </div>

                  {/* Observaciones del producto */}
                  {item.observaciones && (
                    <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Observación del solicitante:</p>
                      <p className="text-sm text-gray-700">{item.observaciones}</p>
                    </div>
                  )}

                  {/* Input de motivo de rechazo */}
                  {estaRechazado && (
                    <div className="mt-3 p-4 bg-white rounded-lg border-2 border-red-200">
                      <label className="block text-sm font-medium text-red-900 mb-2">
                        ⚠️ Motivo del rechazo *
                      </label>
                      <textarea
                        value={motivos[item.id] || ''}
                        onChange={(e) => actualizarMotivo(item.id, e.target.value)}
                        rows="3"
                        className="form-input w-full border-red-300 focus:border-red-500 focus:ring-red-500"
                        placeholder="Ej: Precio muy alto, producto no disponible, cantidad excesiva..."
                        disabled={guardando}
                      />
                      {!motivos[item.id]?.trim() && (
                        <p className="text-xs text-red-600 mt-1">
                          * Este campo es obligatorio para rechazar el producto
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel de acciones */}
      <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-4 shadow-lg rounded-t-lg">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="text-sm text-gray-600">
            {stats.rechazados > 0 && (
              <span className="font-medium text-yellow-700">
                ⚠️ Se devolverá la solicitud al jefe de planta
              </span>
            )}
            {stats.rechazados === 0 && (
              <span className="font-medium text-green-700">
                ✅ La solicitud será aprobada completamente
              </span>
            )}
          </div>

          <button
            onClick={() => setMostrarModalConfirmacion(true)}
            disabled={guardando}
            className="btn-primary"
          >
            {guardando ? (
              <span className="flex items-center gap-2">
                <div className="spinner-sm"></div>
                Guardando...
              </span>
            ) : (
              '✅ Cerrar revisión'
            )}
          </button>
        </div>
      </div>

      {/* Modal de confirmación */}
      {mostrarModalConfirmacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Confirmar revisión
              </h3>
              <p className="text-gray-600">
                Estás a punto de cerrar esta revisión con el siguiente resultado:
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  <span className="text-sm text-gray-600">Productos aprobados:</span>
                </div>
                <span className="font-bold text-green-600">{stats.aprobados}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-red-600">❌</span>
                  <span className="text-sm text-gray-600">Productos rechazados:</span>
                </div>
                <span className="font-bold text-red-600">{stats.rechazados}</span>
              </div>
            </div>

            {stats.rechazados > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600">⚠️</span>
                  <p className="text-sm text-yellow-800">
                    La solicitud será devuelta al jefe de planta para correcciones.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarModalConfirmacion(false)}
                className="btn-outline flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarRevision}
                className="btn-primary flex-1"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}