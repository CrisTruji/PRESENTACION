import React, { useEffect, useState } from "react";
import { useRouter } from "../../context/roleroutercontext";
import { getSolicitudes } from "../../services/solicitudes";

export default function GestionAux() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  const { navigate } = useRouter();

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  async function cargarSolicitudes() {
    setLoading(true);
    const data = await getSolicitudes();
    setSolicitudes(data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="spinner mb-4"></div>
      </div>
    );
  }

  // Función para determinar el color del badge según estado de la SOLICITUD
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
        return "purple"; // Color diferente para estado final

      default:
        return "gray";
    }
  };

  // Función para obtener el texto del estado legible
  const getEstadoTexto = (estado) => {
    if (!estado) return "Sin estado";

    const estadoMap = {
      pendiente: "Pendiente",
      en_revision: "En revisión",
      aprobado: "Aprobado",
      aprobado_auxiliar: "Aprobado (Aux)",
      rechazado: "Rechazado",
      rechazado_auxiliar: "Rechazado (Aux)",
      en_proceso: "En proceso",
      en_compra: "En compra",
      comprado: "Comprado",
      completado: "Completado",
      cancelado: "Cancelado",
    };

    return estadoMap[estado.toLowerCase()] || estado;
  };

  // Función para determinar si una solicitud es editable
  const esSolicitudEditable = (estado) => {
    const estadoLower = estado?.toLowerCase();
    // Solo estas solicitudes se pueden aprobar/rechazar
    const estadosEditables = [
      "pendiente",
      "en_revision",
      "aprobado_auxiliar",
      "rechazado_auxiliar",
    ];
    return estadosEditables.includes(estadoLower);
  };

  // Función para contar solicitudes por estado
  const contarPorEstado = (estado) => {
    return solicitudes.filter(
      (s) => s.estado?.toLowerCase() === estado?.toLowerCase()
    ).length;
  };

  // Función para el ícono de acción según estado
  const getAccionIcono = (estado) => {
    const estadoLower = estado?.toLowerCase();

    if (estadoLower === "comprado" || estadoLower === "completado") {
      return (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }

    return (
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header con estadísticas */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Gestión de Solicitudes
            </h1>
            <p className="text-gray-600">
              Gestiona todas las solicitudes de compra del sistema
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
              <span className="text-primary-600">📋</span>
              Total: {solicitudes.length}
            </span>
          </div>
        </div>

        {/* Estadísticas - Cambiado a 4 columnas para cubrir todo el ancho */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Pendientes
                </p>
                <p className="text-2xl font-bold text-gray-800">
                  {contarPorEstado("pendiente") +
                    contarPorEstado("en_revision")}
                </p>
              </div>
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 text-lg">⏳</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Aprobadas
                </p>
                <p className="text-2xl font-bold text-gray-800">
                  {contarPorEstado("aprobado") +
                    contarPorEstado("aprobado_auxiliar")}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Rechazadas
                </p>
                <p className="text-2xl font-bold text-gray-800">
                  {contarPorEstado("rechazado") +
                    contarPorEstado("rechazado_auxiliar")}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <span className="text-red-600 text-lg">❌</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Compradas
                </p>
                <p className="text-2xl font-bold text-gray-800">
                  {contarPorEstado("comprado") + contarPorEstado("completado")}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-lg">🛒</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {solicitudes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-gray-400 text-xl">📄</span>
          </div>
          <p className="text-gray-600">No hay solicitudes disponibles.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          {/* Tabla compacta */}
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
                  const esEditable = esSolicitudEditable(sol.estado);
                  const esComprado = sol.estado?.toLowerCase() === "comprado";

                  return (
                    <tr
                      key={sol.id}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      {/* Número de solicitud */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                            style={{
                              backgroundColor:
                                estadoColor === "green"
                                  ? "#d1fae5"
                                  : estadoColor === "red"
                                  ? "#fee2e2"
                                  : estadoColor === "yellow"
                                  ? "#fef3c7"
                                  : estadoColor === "blue"
                                  ? "#dbeafe"
                                  : estadoColor === "purple"
                                  ? "#e9d5ff"
                                  : "#f3f4f6",
                            }}
                          >
                            <span
                              className="font-bold"
                              style={{
                                color:
                                  estadoColor === "green"
                                    ? "#059669"
                                    : estadoColor === "red"
                                    ? "#dc2626"
                                    : estadoColor === "yellow"
                                    ? "#d97706"
                                    : estadoColor === "blue"
                                    ? "#2563eb"
                                    : estadoColor === "purple"
                                    ? "#7c3aed"
                                    : "#6b7280",
                              }}
                            >
                              {esComprado ? "#" : "#"}
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
                          {esComprado && <span className="ml-1"></span>}
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
                        <button
                          onClick={() =>
                            navigate("ver_detalles_solicitud", { id: sol.id })
                          }
                          className={`text-xs px-3 py-1.5 flex items-center gap-1.5 rounded border transition-colors ${
                            esEditable
                              ? "btn-outline hover-lift"
                              : "bg-gray-100 text-gray-500 border-gray-200 cursor-default"
                          }`}
                          disabled={!esEditable}
                          title={
                            esEditable
                              ? "Ver detalles y gestionar"
                              : "Solo ver detalles (solicitud finalizada)"
                          }
                        >
                          {getAccionIcono(sol.estado)}
                          {esComprado ? "Ver detalles" : "Detalles"}
                        </button>
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
                Pendientes (se pueden gestionar)
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
                <span className="w-3 h-3 bg-purple-100 rounded-full"></span>
                Compradas (solo lectura)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
