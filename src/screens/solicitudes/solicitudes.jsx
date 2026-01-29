// src/screens/solicitudes/Solicitudes.jsx
import React, { useEffect, useState } from "react";
import { listSolicitudes, updateSolicitudEstado } from "../../lib/solicitudes";
import { useAuth } from "../../context/auth";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  BarChart3
} from "lucide-react";

import TarjetaSolicitud from "./TarjetaSolicitud";
import VistaCrearSolicitud from "./VistaCrearSolicitud";

export default function SolicitudesScreen() {
  const { session, roleName } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("lista");

  useEffect(() => {
    cargarSolicitudes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarSolicitudes = async () => {
    try {
      const data = await listSolicitudes();
      setSolicitudes(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEstado = async (id, estado) => {
    try {
      await updateSolicitudEstado(id, estado, session?.user?.id);
      cargarSolicitudes();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (vista === "crear") {
    return (
      <VistaCrearSolicitud
        onVolver={() => setVista("lista")}
        onSolicitudCreada={() => {
          setVista("lista");
          cargarSolicitudes();
        }}
      />
    );
  }

  // Calcular estadísticas
  const totalSolicitudes = solicitudes.length;
  const pendientes = solicitudes.filter((s) => s.estado === "pendiente").length;
  const aprobadas = solicitudes.filter((s) => s.estado === "aprobada").length;
  const rechazadas = solicitudes.filter((s) => s.estado === "rechazada").length;

  return (
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div className="section-header">
            <h1 className="section-title">Solicitudes</h1>
            <p className="section-subtitle">
              Gestiona las solicitudes de materiales
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={cargarSolicitudes}
              disabled={loading}
              className="btn btn-outline flex items-center gap-2 text-sm !py-1.5"
            >
              {loading ? (
                <>
                  <div className="spinner spinner-sm"></div>
                  <span>Cargando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Actualizar</span>
                </>
              )}
            </button>

            {(roleName === "jefe planta" || roleName === "administrador") && (
              <button
                className="btn btn-primary flex items-center gap-2"
                onClick={() => setVista("crear")}
              >
                <Plus className="w-5 h-5" />
                Nueva Solicitud
              </button>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid-cards mb-6">
          <div className="stats-card">
            <div className="stats-icon bg-primary/10 text-primary">
              <FileText className="w-6 h-6" />
            </div>
            <div className="stats-content">
              <div className="stats-value">{totalSolicitudes}</div>
              <div className="stats-label">Total solicitudes</div>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-icon bg-warning/10 text-warning">
              <Clock className="w-6 h-6" />
            </div>
            <div className="stats-content">
              <div className="stats-value">{pendientes}</div>
              <div className="stats-label">Pendientes</div>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-icon bg-success/10 text-success">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="stats-content">
              <div className="stats-value">{aprobadas}</div>
              <div className="stats-label">Aprobadas</div>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-icon bg-error/10 text-error">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="stats-content">
              <div className="stats-value">{rechazadas}</div>
              <div className="stats-label">Rechazadas</div>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        {loading ? (
          <div className="card p-12 text-center">
            <div className="inline-flex flex-col items-center">
              <div className="spinner spinner-lg mx-auto"></div>
              <p className="mt-4 text-muted font-medium">Cargando solicitudes...</p>
            </div>
          </div>
        ) : (
          <>
            {solicitudes.length === 0 ? (
              <div className="card p-12 text-center border-2 border-dashed border-base">
                <div className="w-20 h-20 bg-app rounded-card flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-muted" />
                </div>
                <h3 className="text-xl font-semibold text-primary mb-2">
                  No hay solicitudes
                </h3>
                <p className="text-muted mb-6">
                  Cuando crees solicitudes, aparecerán aquí
                </p>

                {(roleName === "jefe planta" || roleName === "administrador") && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setVista("crear")}
                  >
                    Crear primera solicitud
                  </button>
                )}
              </div>
            ) : (
              <div className="card overflow-hidden">
                {/* Encabezado de la tabla */}
                <div className="card-header">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-primary">
                        Lista de solicitudes ({totalSolicitudes})
                      </h3>
                      <p className="text-sm text-muted mt-0.5">
                        {pendientes} pendientes • {aprobadas} aprobadas • {rechazadas} rechazadas
                      </p>
                    </div>
                    <div className="text-sm text-muted">
                      Actualizado recientemente
                    </div>
                  </div>
                </div>

                {/* Lista de solicitudes */}
                <div className="divide-y divide-base">
                  {solicitudes.map((solicitud) => (
                    <div key={solicitud.id} className="p-4 hover:bg-app/30 transition-colors">
                      <TarjetaSolicitud
                        solicitud={solicitud}
                        roleName={roleName}
                        onEstadoChange={handleEstado}
                      />
                    </div>
                  ))}
                </div>

                {/* Pie de tabla */}
                <div className="card-footer">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="text-sm text-muted">
                      Mostrando <span className="font-semibold text-primary">{totalSolicitudes}</span> solicitudes
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-warning"></div>
                        <span className="text-xs text-muted">Pendiente</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success"></div>
                        <span className="text-xs text-muted">Aprobada</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-error"></div>
                        <span className="text-xs text-muted">Rechazada</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Nota informativa */}
        <div className="mt-6 p-4 rounded-card bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-3">
            <BarChart3 className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm text-primary">
              <p className="font-medium mb-1">Tipos de estado:</p>
              <p>
                <span className="inline-flex items-center gap-1 mr-3">
                  <div className="w-2 h-2 rounded-full bg-warning"></div>
                  <span>Pendiente: Esperando aprobación</span>
                </span>
                <span className="inline-flex items-center gap-1 mr-3">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  <span>Aprobada: Solicitud aceptada</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-error"></div>
                  <span>Rechazada: Solicitud denegada</span>
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}