// src/screens/planta/solicitudes.jsx
import React from "react";
import useSolicitudes from "../../screens/hooks/usesolicitudes";
import { useAuth } from "../../context/auth";

export default function SolicitudesPlanta() {
  const { user, profile, session } = useAuth?.() || {};
  const userId = profile?.id || user?.id || session?.user?.id;

  const { solicitudes = [], loading } = useSolicitudes({ created_by: userId });

  // Función para determinar el color del badge según estado (igual que en GestionAux)
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

  // Función para obtener el texto del estado legible (igual que en GestionAux)
  const getEstadoTexto = (estado) => {
    if (!estado) return "Sin estado";
    
    const estadoMap = {
      "pendiente": "Pendiente",
      "en_revision": "En revisión",
      "aprobado": "Aprobado",
      "aprobado_auxiliar": "Aprobado (Aux)",
      "rechazado": "Rechazado",
      "rechazado_auxiliar": "Rechazado (Aux)",
      "en_proceso": "En proceso",
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
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <div className="spinner mb-4"></div>
        <p className="text-gray-600 font-medium">Cargando solicitudes…</p>
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
              Mis Solicitudes de Compra
            </h1>
            <p className="text-gray-600">
              Historial de todas las solicitudes que has creado
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
              <span className="text-primary-600">📋</span>
              Total: {solicitudes.length}
            </span>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Pendientes</p>
                <p className="text-lg font-bold text-gray-800">
                  {contarPorEstado("pendiente")}
                </p>
              </div>
              <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600">⏳</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Aprobadas</p>
                <p className="text-lg font-bold text-gray-800">
                  {contarPorEstado("aprobado") + contarPorEstado("aprobado_auxiliar")}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <span className="text-green-600">✅</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Rechazadas</p>
                <p className="text-lg font-bold text-gray-800">
                  {contarPorEstado("rechazado") + contarPorEstado("rechazado_auxiliar")}
                </p>
              </div>
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <span className="text-red-600">❌</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Compradas</p>
                <p className="text-lg font-bold text-gray-800">
                  {contarPorEstado("comprado")}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                <span className="text-purple-600">🛒</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de solicitudes */}
      {solicitudes.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl">📄</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay solicitudes
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {userId
              ? "Aún no has creado ninguna solicitud. Comienza creando tu primera solicitud de compra."
              : "No se pudo identificar tu usuario. Por favor, verifica tu sesión."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          {/* Tabla compacta - igual que en GestionAux */}
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
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {solicitudes.map((sol) => {
                  const estadoColor = getEstadoColor(sol.estado);
                  const estadoTexto = getEstadoTexto(sol.estado);
                  const esComprado = sol.estado?.toLowerCase() === "comprado";
                  
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
                              {esComprado ? "✓" : "#"}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {sol.id}
                            </div>
                            {esComprado && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                Finalizado
                              </div>
                            )}
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
                          {esComprado && (
                            <span className="ml-1">✓</span>
                          )}
                        </span>
                      </td>

                      {/* Cantidad de items */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {sol.solicitud_items?.length || 0}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Leyenda de estados */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-yellow-100 rounded-full"></span>
                Pendientes
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-100 rounded-full"></span>
                Aprobadas
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-100 rounded-full"></span>
                Rechazadas
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-100 rounded-full"></span>
                En proceso
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-purple-100 rounded-full"></span>
                Compradas
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Información de debug (solo desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 font-medium mb-2">Debug info:</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Usuario ID: {userId || "No encontrado"}</p>
            <p>Total solicitudes: {solicitudes.length}</p>
            <p>Estados encontrados: {[...new Set(solicitudes.map(s => s.estado))].join(", ")}</p>
          </div>
        </div>
      )}
    </div>
  );
}