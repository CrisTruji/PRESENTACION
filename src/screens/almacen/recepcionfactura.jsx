// src/screens/almacen/recepcionfactura.jsx
import React, { useEffect, useState } from "react";
import { useRouter } from "../../context/roleroutercontext";
import {
  getSolicitudesCompradas,
  getProveedoresConSolicitudesPendientes,
  registrarRecepcionFactura,
  subirPDFFactura
} from "../../services/facturas";

export default function RecepcionFactura() {
  const { navigate } = useRouter();

  // Estados principales
  const [solicitudes, setSolicitudes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proveedorFiltro, setProveedorFiltro] = useState("todos");

  // Modal de registro
  const [modalAbierto, setModalAbierto] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Formulario de factura
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaFactura, setFechaFactura] = useState("");
  const [archivoPDF, setArchivoPDF] = useState(null);
  const [itemsRecepcion, setItemsRecepcion] = useState([]);

  // Notificaciones
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    try {
      const [sols, provs] = await Promise.all([
        getSolicitudesCompradas(),
        getProveedoresConSolicitudesPendientes()
      ]);
      setSolicitudes(sols);
      setProveedores(provs);
    } catch (error) {
      showNotification('error', 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  function showNotification(type, message) {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000);
  }

  // Filtrar solicitudes por proveedor
  const solicitudesFiltradas = proveedorFiltro === "todos"
    ? solicitudes
    : solicitudes.filter(s => s.proveedores?.id === parseInt(proveedorFiltro));

  // ============================================================
  // ABRIR MODAL DE REGISTRO
  // ============================================================

  function abrirModalRegistro(solicitud) {
    setSolicitudSeleccionada(solicitud);
    
    // Inicializar items con valores por defecto
    const itemsIniciales = solicitud.solicitud_items.map(item => ({
      item_id: item.id,
      catalogo_producto_id: item.catalogo_productos.id,
      nombre: item.catalogo_productos.nombre,
      cantidad_solicitada: item.cantidad_solicitada,
      cantidad_recibida: item.cantidad_solicitada, // Por defecto, todo llegó
      unidad: item.unidad,
      precio_unitario: 0,
      observacion: ''
    }));

    setItemsRecepcion(itemsIniciales);
    setNumeroFactura("");
    setFechaFactura(new Date().toISOString().split('T')[0]);
    setArchivoPDF(null);
    setModalAbierto(true);
  }

  // ============================================================
  // ACTUALIZAR ITEM
  // ============================================================

  function actualizarItem(index, campo, valor) {
    setItemsRecepcion(prev => {
      const nuevo = [...prev];
      nuevo[index][campo] = valor;
      return nuevo;
    });
  }

  // ============================================================
  // CALCULAR TOTALES
  // ============================================================

  const totalFactura = itemsRecepcion.reduce((sum, item) => {
    return sum + (item.cantidad_recibida * item.precio_unitario);
  }, 0);

  const hayFaltantes = itemsRecepcion.some(
    item => item.cantidad_recibida < item.cantidad_solicitada
  );

  // ============================================================
  // GUARDAR RECEPCIÓN
  // ============================================================

  async function guardarRecepcion() {
    // Validaciones
    if (!numeroFactura.trim()) {
      showNotification('warning', 'El número de factura es obligatorio');
      return;
    }

    if (!fechaFactura) {
      showNotification('warning', 'La fecha de factura es obligatoria');
      return;
    }

    const todosConPrecio = itemsRecepcion.every(item => item.precio_unitario > 0);
    if (!todosConPrecio) {
      showNotification('warning', 'Todos los productos deben tener precio');
      return;
    }

    // Validar faltantes con motivo
    const faltantesSinMotivo = itemsRecepcion.filter(
      item => item.cantidad_recibida < item.cantidad_solicitada && !item.observacion?.trim()
    );

    if (faltantesSinMotivo.length > 0) {
      showNotification('warning', 'Los productos con faltante deben tener un motivo');
      return;
    }

    setGuardando(true);

    try {
      let pdfUrl = null;

      // Subir PDF si existe
      if (archivoPDF) {
        const resultado = await subirPDFFactura(archivoPDF, solicitudSeleccionada.id);
        pdfUrl = resultado.url;
      }

      // Registrar recepción
      await registrarRecepcionFactura({
        solicitud_id: solicitudSeleccionada.id,
        proveedor_id: solicitudSeleccionada.proveedores?.id, // ← AGREGADO
        numero_factura: numeroFactura,
        fecha_factura: fechaFactura,
        pdf_url: pdfUrl,
        items: itemsRecepcion,
        total_factura: totalFactura
      });

      showNotification('success', 'Recepción registrada correctamente');
      
      setModalAbierto(false);
      cargarDatos();

    } catch (error) {
      showNotification('error', error.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  // ============================================================
  // MANEJO DE ARCHIVO PDF
  // ============================================================

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        showNotification('error', 'Solo se permiten archivos PDF');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showNotification('error', 'El archivo no debe superar 5MB');
        return;
      }
      setArchivoPDF(file);
    }
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          📦 Recepción de Facturas
        </h1>
        <p className="text-gray-600">
          Registra las facturas de las solicitudes compradas
        </p>
      </div>

      {/* Filtro por proveedor */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filtrar por proveedor:
        </label>
        <select
          value={proveedorFiltro}
          onChange={(e) => setProveedorFiltro(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos los proveedores</option>
          {proveedores.map(prov => (
            <option key={prov.id} value={prov.id}>
              {prov.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de solicitudes */}
      {solicitudesFiltradas.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl">✅</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay solicitudes pendientes
          </h3>
          <p className="text-gray-500">
            {proveedorFiltro === "todos" 
              ? "Todas las facturas han sido registradas."
              : "Este proveedor no tiene solicitudes pendientes."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {solicitudesFiltradas.map(sol => (
            <div
              key={sol.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-blue-600">#{sol.id}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">
                        {sol.proveedores?.nombre || 'Sin proveedor'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Comprada el {new Date(sol.fecha_solicitud).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-3">
                    <span className="flex items-center gap-1">
                      <span>📦</span>
                      {sol.solicitud_items?.length || 0} productos
                    </span>
                    <span className="flex items-center gap-1">
                      <span>👤</span>
                      {sol.email_creador || 'N/A'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => abrirModalRegistro(sol)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Registrar Recepción
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de registro */}
      {modalAbierto && solicitudSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full my-8">
            <div className="p-6">
              {/* Header del modal */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    📄 Registrar Recepción
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Solicitud #{solicitudSeleccionada.id} - {solicitudSeleccionada.proveedores?.nombre}
                  </p>
                </div>
                <button
                  onClick={() => setModalAbierto(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={guardando}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Datos de la factura */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-4">📋 Datos de la Factura</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de factura *
                    </label>
                    <input
                      type="text"
                      value={numeroFactura}
                      onChange={(e) => setNumeroFactura(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="F-12345"
                      disabled={guardando}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de factura *
                    </label>
                    <input
                      type="date"
                      value={fechaFactura}
                      onChange={(e) => setFechaFactura(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      disabled={guardando}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PDF de la factura
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={guardando}
                  />
                  {archivoPDF && (
                    <p className="text-sm text-green-600 mt-1">
                      ✅ {archivoPDF.name} ({(archivoPDF.size / 1024).toFixed(0)} KB)
                    </p>
                  )}
                </div>
              </div>

              {/* Productos */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-4">📦 Productos Recibidos</h3>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {itemsRecepcion.map((item, index) => {
                    const esFaltante = item.cantidad_recibida < item.cantidad_solicitada;
                    
                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 ${
                          esFaltante ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-gray-800">{item.nombre}</h4>
                          {esFaltante && (
                            <span className="text-xs px-2 py-1 bg-red-200 text-red-800 rounded">
                              ⚠️ Faltante
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs text-gray-600">Solicitado</label>
                            <p className="font-medium">{item.cantidad_solicitada} {item.unidad}</p>
                          </div>

                          <div>
                            <label className="text-xs text-gray-600 block mb-1">Recibido *</label>
                            <input
                              type="number"
                              value={item.cantidad_recibida}
                              onChange={(e) => actualizarItem(index, 'cantidad_recibida', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              min="0"
                              max={item.cantidad_solicitada}
                              step="0.01"
                              disabled={guardando}
                            />
                          </div>

                          <div>
                            <label className="text-xs text-gray-600 block mb-1">Precio/unidad *</label>
                            <input
                              type="number"
                              value={item.precio_unitario}
                              onChange={(e) => actualizarItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              min="0"
                              step="0.01"
                              placeholder="$"
                              disabled={guardando}
                            />
                          </div>

                          <div>
                            <label className="text-xs text-gray-600">Subtotal</label>
                            <p className="font-semibold text-green-600">
                              ${(item.cantidad_recibida * item.precio_unitario).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {esFaltante && (
                          <div className="mt-3">
                            <label className="text-xs text-gray-600 block mb-1">Motivo del faltante *</label>
                            <input
                              type="text"
                              value={item.observacion}
                              onChange={(e) => actualizarItem(index, 'observacion', e.target.value)}
                              className="w-full px-2 py-1 border-2 border-red-300 rounded text-sm"
                              placeholder="Ej: No había stock, llegó dañado..."
                              disabled={guardando}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total y advertencias */}
              <div className="p-4 bg-gray-100 rounded-lg mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-semibold">Total Factura:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${totalFactura.toLocaleString()}
                  </span>
                </div>
                
                {hayFaltantes && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Esta recepción tiene productos faltantes y se marcará como <strong>parcial</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarRecepcion}
                  disabled={guardando}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold text-white ${
                    guardando
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {guardando ? 'Guardando...' : '💾 Guardar Recepción'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}