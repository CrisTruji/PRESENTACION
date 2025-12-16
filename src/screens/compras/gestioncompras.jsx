// src/screens/compras/gestioncompras.jsx
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/auth";
import { getSolicitudes, getSolicitudConItems, actualizarEstadoSolicitud } from "../../services/solicitudes";
import { crearPedido, agregarItemsPedido } from "../../services/pedidos";

export default function GestionCompras() {
  const { user } = useAuth?.() || {};
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
    try {
      setGenerando(true);
      // crear pedido
      const pedido = await crearPedido({
        solicitud_id: solicitud.id,
        proveedor_id: solicitud.proveedor_id,
        created_by: user?.id || null
      });

      // preparar items: usar items de la solicitud
      const items = (detalle?.items || []).map(it => ({
        catalogo_producto_id: it.catalogo_producto_id,
        cantidad: it.cantidad_solicitada,
        precio_unitario: null
      }));

      await agregarItemsPedido(pedido.id, items);

      // actualizar estado de la solicitud a 'comprado'
      await actualizarEstadoSolicitud(solicitud.id, "comprado");
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

  // Función para determinar el color del badge según estado
  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case "aprobado":
      case "aprobado_auxiliar":
        return "green";
        
      case "rechazado":
      case "rechazado_auxiliar":
      case "cancelado":
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
                    Items
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

                      {/* Cantidad de items */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {sol.solicitud_items?.length || 0}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          
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

      {/* Panel de detalle */}
      {detalle && (
        <div className="fixed right-4 top-20 w-96 bg-white shadow-xl rounded-lg border border-gray-200 p-4 z-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800 text-lg">
              Solicitud #{detalle.id}
            </h3>
            <button 
              onClick={() => setDetalle(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-1">Proveedor</div>
            <div className="font-medium">{detalle.proveedor?.nombre || "No especificado"}</div>
          </div>
          
          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2">Items solicitados</div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {detalle.items?.map(it => (
                <div key={it.id} className="flex items-start justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium text-sm">{it.catalogo_productos?.nombre}</div>
                    <div className="text-xs text-gray-500">{it.cantidad_solicitada} {it.unidad}</div>
                  </div>
                  <div className="text-sm font-medium">
                    {it.cantidad_solicitada} unidad{it.cantidad_solicitada !== 1 ? 'es' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <button 
              onClick={() => generarPedido(detalle)}
              disabled={generando}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                generando 
                  ? "bg-gray-100 text-gray-500 cursor-not-allowed" 
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {generando ? "Generando pedido..." : "Generar pedido"}
            </button>
            <button 
              onClick={() => setDetalle(null)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}