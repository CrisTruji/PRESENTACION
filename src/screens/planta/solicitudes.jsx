// src/screens/planta/solicitudes.jsx
import React from "react";
import useSolicitudes from "../../screens/hooks/usesolicitudes";
import { useAuth } from "../../context/auth";

import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Hourglass,
} from "lucide-react";

export default function SolicitudesPlanta() {
  // Usando el hook useAuth correctamente (compatibilidad con ambos)
  const { user, profile, session } = useAuth?.() || {};

  // Obteniendo el ID del usuario - Compatible con ambos enfoques
  const userId = profile?.id || user?.id || session?.user?.id;

  console.log("DEBUG - SolicitudesPlanta:", {
    profile,
    user,
    session,
    userId,
    profileId: profile?.id,
    userIdFromUser: user?.id,
    sessionUserId: session?.user?.id,
  });

  // Usando el hook con el ID obtenido
  const { solicitudes = [], loading } = useSolicitudes({ created_by: userId });

  // Función para obtener el color del estado
  const getEstadoColor = (estado) => {
    if (!estado) return "text-gray-600 bg-gray-100";

    const estadoLower = estado.toLowerCase();
    switch (true) {
      case estadoLower.includes("pendiente"):
      case estadoLower.includes("espera"):
        return "text-yellow-600 bg-yellow-100";
      case estadoLower.includes("aprobada"):
      case estadoLower.includes("completada"):
      case estadoLower.includes("finalizada"):
        return "text-green-600 bg-green-100";
      case estadoLower.includes("rechazada"):
      case estadoLower.includes("cancelada"):
        return "text-red-600 bg-red-100";
      case estadoLower.includes("proceso"):
      case estadoLower.includes("revisión"):
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Función para obtener el icono del estado
  const getEstadoIcon = (estado) => {
    if (!estado) return <FileText size={16} className="text-gray-600" />;

    const estadoLower = estado.toLowerCase();
    switch (true) {
      case estadoLower.includes("pendiente"):
      case estadoLower.includes("espera"):
        return <Clock size={16} className="text-yellow-600" />;
      case estadoLower.includes("aprobada"):
      case estadoLower.includes("completada"):
      case estadoLower.includes("finalizada"):
        return <CheckCircle size={16} className="text-green-600" />;
      case estadoLower.includes("rechazada"):
      case estadoLower.includes("cancelada"):
        return <AlertCircle size={16} className="text-red-600" />;
      case estadoLower.includes("proceso"):
      case estadoLower.includes("revisión"):
        return <Hourglass size={16} className="text-blue-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="spinner-lg mb-4"></div>
          <p className="text-lg font-medium text-gray-600 mb-2">
            Cargando solicitudes
          </p>
          <p className="text-sm text-gray-400">
            Recopilando información de tus solicitudes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Mis Solicitudes
            </h1>
            <p className="text-gray-600">
              {solicitudes.length} solicitud
              {solicitudes.length !== 1 ? "es" : ""} registrada
              {solicitudes.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Tabla de solicitudes */}
        {solicitudes.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText size={32} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay solicitudes
              </h3>
              <p className="text-gray-600 mb-6">
                {userId
                  ? "Aún no has creado ninguna solicitud. Comienza creando tu primera solicitud de compra."
                  : "No se pudo identificar tu usuario. Por favor, verifica tu sesión."}
              </p>
              <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg mt-4 text-left">
                <p>
                  <strong>Debug info:</strong>
                </p>
                <p>Usuario ID: {userId || "No encontrado"}</p>
                <p>Perfil: {profile ? "Sí" : "No"}</p>
                <p>User object: {user ? "Sí" : "No"}</p>
                <p>Sesión: {session ? "Sí" : "No"}</p>
                <p>Hook funcionando: {!loading ? "Sí" : "Cargando..."}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proveedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {solicitudes.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {s.proveedor?.nombre || "Sin proveedor"}
                      </td>
                      <td className="px-6 py-4">
                        {s.fecha_solicitud
                          ? new Date(s.fecha_solicitud).toLocaleString()
                          : "Fecha no disponible"}
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${getEstadoColor(
                            s.estado
                          )}`}
                        >
                          {getEstadoIcon(s.estado)}
                          <span className="text-sm font-medium capitalize">
                            {s.estado || "Sin estado"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
