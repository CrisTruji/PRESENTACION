// src/screens/aux_compras/gestionaux.jsx
import React, { useEffect, useState } from "react";
import { useRouter } from "../../context/roleroutercontext";
import { getSolicitudesPendientesAuxiliar } from "../../services/solicitudes";
import { 
  ESTADOS_SOLICITUD, 
  ETIQUETAS_ESTADO_SOLICITUD,
  getEstadoClasses,
  getEstadoIcon 
} from "../../lib/estados";

export default function GestionAux() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { navigate } = useRouter();

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  async function cargarSolicitudes() {
    setLoading(true);
    const data = await getSolicitudesPendientesAuxiliar();
    setSolicitudes(data || []);
    setLoading(false);
  }

  // Contar por estado
  const contarPorEstado = (estado) => {
    return solicitudes.filter(s => s.estado === estado).length;
  };

  const stats = {
    total: solicitudes.length,
    pendientes: contarPorEstado(ESTADOS_SOLICITUD.PENDIENTE),
    enRevision: contarPorEstado(ESTADOS_SOLICITUD.EN_REVISION_AUXILIAR),
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Gestión de Solicitudes
            </h1>
            <p className="text-gray-600">
              Revisa y aprueba las solicitudes de compra pendientes
            </p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Pendientes</p>
                <p className="text-2xl font-bold text-gray-800">{stats.pendientes}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 text-lg">⏳</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">En revisión</p>
                <p className="text-2xl font-bold text-gray-800">{stats.enRevision}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">🔍</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de solicitudes */}
      {solicitudes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-gray-400 text-xl">📄</span>
          </div>
          <p className="text-gray-600">No hay solicitudes pendientes de revisión.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Solicitud
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Proveedor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Creada por
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Productos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {solicitudes.map((sol) => (
                  <tr
                    key={sol.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* ID */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="font-bold text-blue-600">#</span>
                        </div>
                        <div className="font-semibold text-gray-900">
                          {sol.id}
                        </div>
                      </div>
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 max-w-[150px] truncate">
                        {sol.proveedores?.nombre || 'No especificado'}
                      </div>
                    </td>

                    {/* Creada por */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 max-w-[150px] truncate">
                        {sol.email_creador || 'N/A'}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoClasses(sol.estado, 'solicitud')}`}>
                        <span>{getEstadoIcon(sol.estado, 'solicitud')}</span>
                        {ETIQUETAS_ESTADO_SOLICITUD[sol.estado]}
                      </span>
                    </td>

                    {/* Items */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {sol.solicitud_items?.length || 0}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => navigate("ver_detalles_solicitud", { id: sol.id })}
                        className="text-xs px-3 py-1.5 flex items-center gap-1.5 rounded border border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Revisar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}