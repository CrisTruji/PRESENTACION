// src/screens/compras/gestioncompras.jsx
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/auth";
import { getSolicitudes, getSolicitudConItems, actualizarEstadoSolicitud } from "../../services/solicitudes";
import { crearPedido, agregarItemsPedido } from "../../services/pedidos";

export default function GestionCompras() {
  const { user, profile } = useAuth?.() || {};
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState(null);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  async function fetchSolicitudes() {
    setLoading(true);
    try {
      const data = await getSolicitudes();
      // filtramos por estado que corresponda al flujo de compras
      const porComprar = (data || []).filter(s => 
        s.estado === "aprobado_auxiliar" || s.estado === "en_compra" || s.estado === "en_proceso"
      );
      setSolicitudes(porComprar);
    } catch (e) {
      console.error(e);
      toast.error("Error cargando solicitudes");
    } finally {
      setLoading(false);
    }
  }

  async function verDetalle(id) {
    try {
      const s = await getSolicitudConItems(id);
      setDetalle(s);
    } catch (e) {
      console.error(e);
      toast.error("Error cargando detalle");
    }
  }

  async function generarPedido(solicitud) {
    if (!user?.id) {
      toast.error("No se puede identificar el usuario");
      return;
    }

    try {
      setGenerando(true);
      
      // crear pedido con tracking del usuario
      const pedido = await crearPedido({
        solicitud_id: solicitud.id,
        proveedor_id: solicitud.proveedor_id,
        created_by: user.id  // ✅ Registrar quién creó el pedido
      });

      // preparar items: usar items de la solicitud
      const items = (detalle?.items || []).map(it => ({
        catalogo_producto_id: it.catalogo_producto_id,
        cantidad: it.cantidad_solicitada,
        precio_unitario: null
      }));

      await agregarItemsPedido(pedido.id, items);

      // ✅ actualizar estado con tracking
      await actualizarEstadoSolicitud(
        solicitud.id, 
        "comprado",
        `Pedido generado por ${profile?.nombre || user.email}`,
        user.id  // Registrar quién cambió el estado
      );

      toast.success("Pedido generado correctamente");
      setDetalle(null);
      fetchSolicitudes();
    } catch (e) {
      console.error(e);
      toast.error("Error generando pedido");
    } finally {
      setGenerando(false);
    }
  }

  // Función para contar items aprobados vs rechazados
  const contarEstadosItems = (items) => {
    if (!items || items.length === 0) return { aprobados: 0, rechazados: 0, total: 0 };
    
    const aprobados = items.filter(it => 
      it.estado_item === 'aprobado_auxiliar'
    ).length;
    
    const rechazados = items.filter(it => 
      it.estado_item === 'rechazado_auxiliar'
    ).length;
    
    return { aprobados, rechazados, total: items.length };
  };

  // Función para determinar el color del badge según estado
  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case "aprobado":
      case "aprobado_auxiliar":
        return "green";
      case "rechazado":
      case "rechazado_auxiliar":
        return "red";
      case "pendiente":
      case "en_revision":
        return "yellow";
      case "en_proceso":
      case "en_compra":
        return "blue";
      case "comprado":
      case "completado":
        return "purple";
      default:
        return "gray";
    }
  };

  // Función para obtener el texto del estado legible
  const getEstadoTexto = (estado) => {
    if (!estado) return "Sin estado";
    
    const estadoMap = {
      "pendiente": "Pendiente",
      "en_revision": "En revisión",
      "aprobado": "Aprobado",
      "aprobado_auxiliar": "Aprobado",
      "rechazado": "Rechazado",
      "rechazado_auxiliar": "Rechazado",
      "en_compra": "En compra",
      "comprado": "Comprado",
      "completado": "Completado",
      "cancelado": "Cancelado"
    };
    
    return estadoMap[estado.toLowerCase()] || estado;
  };

  // Función para contar solicitudes por estado
  const contarPorEstado = (estado) => {
    return solicitudes.filter(s => 
      s.estado?.toLowerCase() === estado?.toLowerCase()
    ).length;
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="spinner mb-4"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header con estadísticas */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Gestión de Compras
            </h1>
            <p className="text-gray-600">
              Convierte solicitudes aprobadas en pedidos de compra
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
              <span className="text-primary-600">📋</span>
              Solicitudes: {solicitudes.length}
            </span>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Pendientes compra</p>
                <p className="text-2xl font-bold text-gray-800">
                  {contarPorEstado("aprobado_auxiliar")}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">📝</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {solicitudes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-gray-400 text-xl">📦</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay solicitudes para comprar
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            No hay solicitudes aprobadas pendientes de conversión a pedidos.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solicitud
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha y Hora
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creada por
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items Aprobados
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {solicitudes.map((sol) => {
                  const estadoColor = getEstadoColor(sol.estado);
                  const estadoTexto = getEstadoTexto(sol.estado);
                  const esComprable = sol.estado?.toLowerCase() === "aprobado_auxiliar";
                  const estadosItems = contarEstadosItems(sol.solicitud_items);
                  
                  return (
                    <tr 
                      key={sol.id} 
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      {/* Número de solicitud */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                            style={{
                              backgroundColor: estadoColor === "green" ? "#d1fae5" :
                                            estadoColor === "red" ? "#fee2e2" :
                                            estadoColor === "yellow" ? "#fef3c7" :
                                            estadoColor === "blue" ? "#dbeafe" :
                                            estadoColor === "purple" ? "#e9d5ff" : "#f3f4f6"
                            }}
                          >
                            <span className="font-bold" style={{
                              color: estadoColor === "green" ? "#059669" :
                                    estadoColor === "red" ? "#dc2626" :
                                    estadoColor === "yellow" ? "#d97706" :
                                    estadoColor === "blue" ? "#2563eb" :
                                    estadoColor === "purple" ? "#7c3aed" : "#6b7280"
                            }}>
                              {esComprable ? "🛒" : "#"}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              #{sol.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Fecha y Hora */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(sol.fecha_solicitud).toLocaleDateString(
                            "es-ES",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(sol.fecha_solicitud).toLocaleTimeString(
                            "es-ES",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      </td>

                      {/* Proveedor */}
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 max-w-[150px] truncate">
                          {sol.proveedor?.nombre || "No especificado"}
                        </div>
                      </td>

                      {/* Creada por */}
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 max-w-[150px] truncate">
                          {sol.email_creador || "Usuario no disponible"}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            estadoColor === "green"
                              ? "bg-green-100 text-green-800"
                              : estadoColor === "red"
                              ? "bg-red-100 text-red-800"
                              : estadoColor === "yellow"
                              ? "bg-yellow-100 text-yellow-800"
                              : estadoColor === "blue"
                              ? "bg-blue-100 text-blue-800"
                              : estadoColor === "purple"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {estadoTexto}
                        </span>
                      </td>

                      {/* Items Aprobados/Rechazados */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-green-600">
                            ✓ {estadosItems.aprobados}
                          </span>
                          {estadosItems.rechazados > 0 && (
                            <span className="text-sm font-medium text-red-600">
                              ✗ {estadosItems.rechazados}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            / {estadosItems.total}
                          </span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => verDetalle(sol.id)}
                            className="text-xs px-3 py-1.5 flex items-center gap-1.5 rounded transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver detalle
                          </button>
                          
                          <button
                            onClick={() => generarPedido(sol)}
                            disabled={generando || !esComprable}
                            className={`text-xs px-3 py-1.5 flex items-center gap-1.5 rounded transition-colors ${
                              esComprable 
                                ? "bg-green-600 text-white hover:bg-green-700" 
                                : "bg-gray-100 text-gray-500 cursor-not-allowed"
                            }`}
                            title={esComprable ? "Generar pedido de compra" : "Solo solicitudes aprobadas pueden convertirse a pedidos"}
                          >
                            {generando ? (
                              <>
                                <svg className="animate-spin w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Generando...
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Comprar
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Panel de detalle MEJORADO con productos y estados */}
      {detalle && (
        <div className="fixed right-4 top-20 w-[500px] bg-white shadow-2xl rounded-lg border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">
                  Solicitud #{detalle.id}
                </h3>
                <p className="text-sm text-gray-500">
                  Revisa los productos antes de generar el pedido
                </p>
              </div>
              <button 
                onClick={() => setDetalle(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="p-4">
            {/* Info del proveedor */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-600 font-medium mb-1">Proveedor</div>
              <div className="font-semibold text-blue-900">{detalle.proveedor?.nombre || "No especificado"}</div>
              {detalle.proveedor?.nit && (
                <div className="text-xs text-blue-700">NIT: {detalle.proveedor.nit}</div>
              )}
            </div>
            
            {/* Items con estados detallados */}
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span>📦</span>
                Productos ({detalle.items?.length || 0})
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {detalle.items?.map(it => {
                  const estadoItem = it.estado_item?.toLowerCase();
                  const esAprobado = estadoItem === 'aprobado_auxiliar';
                  const esRechazado = estadoItem === 'rechazado_auxiliar';
                  
                  return (
                    <div 
                      key={it.id} 
                      className={`p-3 rounded-lg border-2 transition-all ${
                        esAprobado 
                          ? 'bg-green-50 border-green-200' 
                          : esRechazado 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {esAprobado && <span className="text-green-600">✓</span>}
                            {esRechazado && <span className="text-red-600">✗</span>}
                            {it.catalogo_productos?.nombre}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Cantidad: {it.cantidad_solicitada} {it.unidad}
                          </div>
                          {it.observaciones && (
                            <div className="text-xs text-gray-500 italic mt-1">
                              💬 {it.observaciones}
                            </div>
                          )}
                        </div>
                        
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          esAprobado 
                            ? 'bg-green-100 text-green-700' 
                            : esRechazado 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {esAprobado ? 'Aprobado' : esRechazado ? 'Rechazado' : 'Pendiente'}
                        </span>
                      </div>
                      
                      {/* Motivo de rechazo si existe */}
                      {esRechazado && it.motivo_rechazo && (
                        <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                          <strong>Motivo:</strong> {it.motivo_rechazo}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Resumen */}
            <div className="border-t pt-4 mb-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 bg-green-50 rounded">
                  <div className="text-xs text-green-600">Productos aprobados</div>
                  <div className="text-lg font-bold text-green-700">
                    {detalle.items?.filter(it => it.estado_item === 'aprobado_auxiliar').length || 0}
                  </div>
                </div>
                <div className="p-2 bg-red-50 rounded">
                  <div className="text-xs text-red-600">Productos rechazados</div>
                  <div className="text-lg font-bold text-red-700">
                    {detalle.items?.filter(it => it.estado_item === 'rechazado_auxiliar').length || 0}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Botones de acción */}
            <div className="flex gap-2 pt-4 border-t">
              <button 
                onClick={() => generarPedido(detalle)}
                disabled={generando}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  generando 
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed" 
                    : "bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg"
                }`}
              >
                {generando ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Generando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Generar Pedido
                  </>
                )}
              </button>
              <button 
                onClick={() => setDetalle(null)}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}