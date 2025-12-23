// src/screens/aux_compras/verdetallessolicitudes.jsx
import React, { useEffect, useState } from "react";
import { useRouter } from "../../context/roleroutercontext";
import { 
  getSolicitudById, 
  cerrarRevisionAuxiliar,
  aprobarItemsAuxiliar,
  rechazarItemsAuxiliar
} from "../../services/solicitudes";
import { 
  ESTADOS_ITEM, 
  ETIQUETAS_ESTADO_ITEM,
  getEstadoClasses,
  getEstadoIcon 
} from "../../lib/estados";

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
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
        <h3 className="text-xl font-semibold mb-2">Solicitud no encontrada</h3>
        <button
          onClick={() => navigate("gestion_aux")}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
      {/* Notificación */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg animate-float ${
          notification.type === 'success' ? 'bg-green-500' : 
          notification.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'
        } text-white max-w-md`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' && '✅'}
            {notification.type === 'error' && '❌'}
            {notification.type === 'warning' && '⚠️'}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Revisión de Solicitud #{solicitud.id}
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
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            disabled={guardando}
          >
            ← Volver
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Proveedor</p>
            <p className="font-medium text-gray-800">
              {solicitud.proveedor?.nombre || 'Sin proveedor'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Creada por</p>
            <p className="font-medium text-gray-800">
              {solicitud.email_creador || 'N/A'}
            </p>
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

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm mb-1">Total de productos</p>
          <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-green-700 text-sm mb-1">Se aprobarán</p>
          <p className="text-3xl font-bold text-green-800">{stats.aprobados}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-red-700 text-sm mb-1">Se rechazarán</p>
          <p className="text-3xl font-bold text-red-800">{stats.rechazados}</p>
        </div>
      </div>

      {/* Instrucción */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-5 mb-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <span className="text-4xl">💡</span>
          </div>
          <div>
            <h3 className="font-bold text-blue-900 mb-2 text-lg">
              ✅ Todos los productos están pre-aprobados por defecto
            </h3>
            <p className="text-blue-800 mb-2">
              Solo marca los que quieras <strong>rechazar</strong> y escribe el motivo.
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
              className={`bg-white rounded-lg shadow-md p-5 border-2 transition-all ${
                estaRechazado 
                  ? 'border-red-400 bg-red-50' 
                  : 'border-green-300 bg-green-50'
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
                      className="w-6 h-6 text-red-600 rounded focus:ring-2 focus:ring-red-500"
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

                    {/* Badge de estado visual */}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      estaRechazado 
                        ? 'bg-red-100 text-red-800 border border-red-300' 
                        : 'bg-green-100 text-green-800 border border-green-300'
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
                        className="w-full px-3 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
              <span className="font-medium text-red-600">
                ⚠️ Se devolverá la solicitud al jefe de planta
              </span>
            )}
            {stats.rechazados === 0 && (
              <span className="font-medium text-green-600">
                ✅ La solicitud será aprobada completamente
              </span>
            )}
          </div>

          <button
            onClick={() => setMostrarModalConfirmacion(true)}
            disabled={guardando}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
              guardando
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
            }`}
          >
            {guardando ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Confirmar revisión
              </h3>
              <p className="text-gray-600">
                Estás a punto de cerrar esta revisión con el siguiente resultado:
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Productos aprobados:</span>
                <span className="font-bold text-green-600">{stats.aprobados}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Productos rechazados:</span>
                <span className="font-bold text-red-600">{stats.rechazados}</span>
              </div>
            </div>

            {stats.rechazados > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ La solicitud será devuelta al jefe de planta para correcciones.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarModalConfirmacion(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarRevision}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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