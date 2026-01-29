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
import notify from "../../utils/notifier";
import {
  FileText,
  Clock,
  Eye,
  RefreshCw,
  AlertCircle,
  Package,
  Filter,
  Calendar,
  Building,
  User
} from "lucide-react";

export default function GestionAux() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { navigate } = useRouter();

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  async function cargarSolicitudes() {
    setLoading(true);
    setError(null);
    try {
      const data = await getSolicitudesPendientesAuxiliar();
      setSolicitudes(data || []);
      
      if (data && data.length > 0) {
        notify.success(`Cargadas ${data.length} solicitudes pendientes`);
      } else {
        notify.info("No hay solicitudes pendientes de revisión");
      }
    } catch (err) {
      console.error("Error cargando solicitudes:", err);
      setError("Error al cargar las solicitudes");
      notify.error("Error cargando solicitudes pendientes");
    } finally {
      setLoading(false);
    }
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
      <div className="min-h-content bg-app">
        <div className="page-container">
          <div className="min-h-[300px] flex items-center justify-center">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-4"></div>
              <p className="text-secondary font-medium">Cargando solicitudes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card p-12 text-center">
          <div className="alert-error inline-flex items-center justify-center w-20 h-20 rounded-full mb-6">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Error al cargar solicitudes</h3>
          <p className="text-secondary mb-6">{error}</p>
          <button
            onClick={cargarSolicitudes}
            className="btn btn-primary"
          >
            Intentar nuevamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header */}
        <div className="section-header">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
              <h1 className="section-title">Gestión de Solicitudes</h1>
              <p className="section-subtitle">
                Revisa y aprueba las solicitudes de compra pendientes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cargarSolicitudes}
                disabled={loading}
                className="btn btn-outline flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Cargando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Actualizar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="card-hover p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary mb-1">Total</p>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-surface rounded-base flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="card-hover p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary mb-1">Pendientes</p>
                <p className="text-2xl font-bold text-primary">{stats.pendientes}</p>
              </div>
              <div className="w-12 h-12 bg-surface rounded-base flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>

          <div className="card-hover p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary mb-1">En revisión</p>
                <p className="text-2xl font-bold text-primary">{stats.enRevision}</p>
              </div>
              <div className="w-12 h-12 bg-surface rounded-base flex items-center justify-center">
                <Filter className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de solicitudes */}
        {solicitudes.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 bg-app rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText size={32} className="text-muted" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No hay solicitudes pendientes</h3>
            <p className="text-secondary mb-6">Todas las solicitudes han sido revisadas.</p>
            <button
              onClick={cargarSolicitudes}
              className="btn btn-primary"
            >
              Verificar nuevamente
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Solicitud</th>
                    <th className="table-header-cell">Fecha</th>
                    <th className="table-header-cell">Proveedor</th>
                    <th className="table-header-cell">Creada por</th>
                    <th className="table-header-cell">Estado</th>
                    <th className="table-header-cell">Productos</th>
                    <th className="table-header-cell">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((sol) => (
                    <tr key={sol.id} className="table-row">
                      {/* ID */}
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-app rounded-base flex items-center justify-center mr-3 border border-light">
                            <span className="font-bold text-primary text-sm">#{sol.id}</span>
                          </div>
                          <div className="font-semibold">
                            {sol.id}
                          </div>
                        </div>
                      </td>

                      {/* Fecha */}
                      <td className="table-cell">
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {new Date(sol.fecha_solicitud).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-xs text-secondary">
                            {new Date(sol.fecha_solicitud).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Proveedor */}
                      <td className="table-cell">
                        <div className="text-sm max-w-[150px] truncate">
                          {sol.proveedores?.nombre || 'No especificado'}
                        </div>
                      </td>

                      {/* Creada por */}
                      <td className="table-cell">
                        <div className="text-sm max-w-[150px] truncate">
                          {sol.email_creador || 'N/A'}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="table-cell">
                        <span className={`badge ${getEstadoClasses(sol.estado, 'solicitud')}`}>
                          {ETIQUETAS_ESTADO_SOLICITUD[sol.estado]}
                        </span>
                      </td>

                      {/* Items */}
                      <td className="table-cell">
                        <div className="text-sm">
                          {sol.solicitud_items?.length || 0}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="table-cell">
                        <button
                          onClick={() => {
                            navigate("ver_detalles_solicitud", { id: sol.id });
                            notify.info(`Abriendo detalles de solicitud #${sol.id}`);
                          }}
                          className="btn btn-outline flex items-center gap-1.5"
                        >
                          <Eye className="w-4 h-4" />
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

        {/* Footer de la tabla */}
        {solicitudes.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4 text-sm text-secondary">
            <div>
              Mostrando <span className="font-semibold">{solicitudes.length}</span> solicitudes
            </div>
            <div className="text-xs">
              Actualizado hace unos momentos
            </div>
          </div>
        )}
      </div>
    </div>
  );
}