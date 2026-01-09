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
        proveedor_id: solicitudSeleccionada.proveedores?.id,
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
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando solicitudes...</p>
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
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-hard transition-all duration-300 ${
          notification.type === 'success' ? 'alert-success' : 
          notification.type === 'error' ? 'alert-error' : 'alert-warning'
        } max-w-md`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {notification.type === 'error' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {notification.type === 'warning' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.347 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
            <span className="flex-1">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              📦 Recepción de Facturas
            </h1>
            <p className="text-gray-600">
              Registra las facturas de las solicitudes compradas
            </p>
          </div>
        </div>

        {/* Filtro por proveedor */}
        <div className="card p-4 md:p-6 mb-6">
          <label className="form-label">
            Filtrar por proveedor:
          </label>
          <select
            value={proveedorFiltro}
            onChange={(e) => setProveedorFiltro(e.target.value)}
            className="form-select w-full md:w-64"
          >
            <option value="todos">Todos los proveedores</option>
            {proveedores.map(prov => (
              <option key={prov.id} value={prov.id}>
                {prov.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de solicitudes */}
      {solicitudesFiltradas.length === 0 ? (
        <div className="card p-8 md:p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-3xl">✅</span>
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
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solicitud
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creada por
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {solicitudesFiltradas.map(sol => (
                  <tr
                    key={sol.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* ID - HE MODIFICADO ESTO: Eliminada redundancia */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="font-bold text-blue-600 text-sm">#{sol.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Fecha */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(sol.fecha_solicitud).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(sol.fecha_solicitud).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>

                    {/* Proveedor */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {sol.proveedores?.nombre || 'No especificado'}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {sol.proveedores?.id || 'N/A'}
                      </div>
                    </td>

                    {/* Creada por */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {sol.email_creador || 'N/A'}
                      </div>
                    </td>

                    {/* Items */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="badge-primary text-sm">
                        {sol.solicitud_items?.length || 0} productos
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => abrirModalRegistro(sol)}
                        className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Registrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de registro - HE MODIFICADO COMPLETAMENTE ESTA SECCIÓN */}
      {modalAbierto && solicitudSeleccionada && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="card max-w-6xl w-full my-8">
            {/* Header del modal - HE MODIFICADO ESTO: Header más suave */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <span className="text-blue-600">📄</span>
                    Registrar Recepción
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">
                      Solicitud <span className="font-medium">#{solicitudSeleccionada.id}</span>
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-600">
                      Proveedor: <span className="font-medium">{solicitudSeleccionada.proveedores?.nombre}</span>
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-600">
                      {solicitudSeleccionada.solicitud_items?.length || 0} productos
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setModalAbierto(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  disabled={guardando}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Datos de la factura */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  📋 Información de la Factura
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-group">
                    <label className="form-label">
                      Número de factura <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={numeroFactura}
                      onChange={(e) => setNumeroFactura(e.target.value)}
                      className="form-input"
                      placeholder="Ej: F-2023-00123"
                      disabled={guardando}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Fecha de factura <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={fechaFactura}
                      onChange={(e) => setFechaFactura(e.target.value)}
                      className="form-input"
                      disabled={guardando}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Subir PDF de factura
                    </label>
                    <div className="relative">
                      <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer transition-colors">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <span className="text-sm text-gray-700">
                            {archivoPDF ? archivoPDF.name : 'Seleccionar archivo PDF'}
                          </span>
                          <span className="text-xs text-gray-500 block">
                            {archivoPDF ? `${(archivoPDF.size / 1024).toFixed(0)} KB` : 'Máx. 5MB'}
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                          disabled={guardando}
                        />
                      </label>
                      {archivoPDF && (
                        <button
                          type="button"
                          onClick={() => setArchivoPDF(null)}
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Productos - HE MODIFICADO ESTO: Diseño más compacto */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800">
                    📦 Detalle de Productos Recibidos
                  </h3>
                  <div className="text-sm text-gray-600">
                    Total: <span className="font-semibold text-blue-600">{itemsRecepcion.length}</span> productos
                  </div>
                </div>
                
                {/* Tabla de productos más compacta */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Producto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Solicitado
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recibido
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Precio Unit.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subtotal
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Diferencia
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Observación
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {itemsRecepcion.map((item, index) => {
                        const esFaltante = item.cantidad_recibida < item.cantidad_solicitada;
                        const subtotal = item.cantidad_recibida * item.precio_unitario;
                        const diferencia = item.cantidad_solicitada - item.cantidad_recibida;
                        
                        return (
                          <tr key={index} className={esFaltante ? 'bg-red-50' : ''}>
                            <td className="px-4 py-3">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.nombre}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                  <span>Unidad: {item.unidad}</span>
                                  <span>•</span>
                                  <span>ID: {item.catalogo_producto_id}</span>
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900 font-medium">
                                {item.cantidad_solicitada}
                              </div>
                            </td>
                            
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.cantidad_recibida}
                                onChange={(e) => actualizarItem(index, 'cantidad_recibida', parseFloat(e.target.value) || 0)}
                                className="form-input text-sm w-24"
                                min="0"
                                max={item.cantidad_solicitada}
                                step="0.01"
                                disabled={guardando}
                              />
                            </td>
                            
                            <td className="px-4 py-3">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                <input
                                  type="number"
                                  value={item.precio_unitario}
                                  onChange={(e) => actualizarItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                                  className="form-input text-sm pl-8 w-32"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  disabled={guardando}
                                />
                              </div>
                            </td>
                            
                            <td className="px-4 py-3">
                              <div className={`px-3 py-2 rounded ${
                                subtotal > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                              }`}>
                                <div className="text-sm font-semibold text-green-700">
                                  ${subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-4 py-3">
                              <div className={`px-3 py-2 rounded text-center ${
                                diferencia === 0 
                                  ? 'bg-gray-100 text-gray-600' 
                                  : 'bg-red-50 border border-red-200 text-red-700'
                              }`}>
                                <div className="text-sm font-medium">
                                  {diferencia}
                                  {diferencia !== 0 && (
                                    <span className="text-xs ml-1">({item.unidad})</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-4 py-3">
                              {esFaltante ? (
                                <input
                                  type="text"
                                  value={item.observacion}
                                  onChange={(e) => actualizarItem(index, 'observacion', e.target.value)}
                                  className="form-input text-sm w-full border-red-300"
                                  placeholder="Motivo del faltante..."
                                  disabled={guardando}
                                />
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Resumen y totales */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Resumen</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Productos procesados:</span>
                        <span className="font-medium">{itemsRecepcion.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Productos con faltante:</span>
                        <span className={`font-medium ${
                          hayFaltantes ? 'text-red-600' : 'text-gray-700'
                        }`}>
                          {itemsRecepcion.filter(item => item.cantidad_recibida < item.cantidad_solicitada).length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Estado de recepción:</span>
                        <span className={`badge ${
                          hayFaltantes ? 'badge-warning' : 'badge-success'
                        }`}>
                          {hayFaltantes ? '⚠️ Parcial' : '✅ Completa'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-semibold text-gray-800">Total Factura:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${totalFactura.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Incluye {itemsRecepcion.length} productos
                    </div>
                    {hayFaltantes && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-100 rounded text-sm text-yellow-700">
                        ⚠️ Esta recepción será registrada como parcial debido a productos faltantes.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones - HE MODIFICADO ESTO: Diseño más limpio */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setModalAbierto(false)}
                  className="btn-outline flex-1 py-3"
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarRecepcion}
                  disabled={guardando}
                  className={`btn-primary flex-1 py-3 flex items-center justify-center gap-2 ${
                    guardando ? 'opacity-75' : ''
                  }`}
                >
                  {guardando ? (
                    <>
                      <div className="spinner-sm"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Guardar Recepción
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}