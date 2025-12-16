// src/screens/solicitudes/Solicitudes.jsx
import React, { useEffect, useState } from "react";
import { listSolicitudes, updateSolicitudEstado } from "../../lib/solicitudes";
import { useAuth } from "../../context/auth";

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

  return (
    <div
      className={`${styles.container} max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`}
    >
      {/* Header */}
      <div
        className={`${styles.header} flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6 mb-8`}
      >
        <div>
          <h1
            className={`${styles.titulo} text-3xl sm:text-4xl font-bold text-gray-900 mb-2`}
          >
            Solicitudes
          </h1>
          <p
            className={`${styles.subtitulo} text-base sm:text-lg text-gray-600`}
          >
            Gestiona las solicitudes de materiales
          </p>
        </div>

        {(roleName === "jefe planta" || roleName === "administrador") && (
          <button
            className={`${styles.botonPrimario} btn-primary inline-flex items-center gap-2`}
            onClick={() => setVista("crear")}
          >
            <span className={`${styles.icono} text-xl`}>+</span>
            Nueva Solicitud
          </button>
        )}
      </div>

      {/* Estadísticas */}
      <div
        className={`${styles.estadisticas} grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8`}
      >
        <div className={`${styles.tarjetaEstadistica} card p-6 text-center`}>
          <div
            className={`${styles.numero} text-3xl font-bold text-gray-900 mb-2`}
          >
            {solicitudes.length}
          </div>
          <div
            className={`${styles.etiqueta} text-sm font-medium text-gray-600`}
          >
            Total
          </div>
        </div>

        <div className={`${styles.tarjetaEstadistica} card p-6 text-center`}>
          <div
            className={`${styles.numero} ${styles.numeroPendiente} text-3xl font-bold text-yellow-600 mb-2`}
          >
            {solicitudes.filter((s) => s.estado === "pendiente").length}
          </div>
          <div
            className={`${styles.etiqueta} text-sm font-medium text-gray-600`}
          >
            Pendientes
          </div>
        </div>

        <div className={`${styles.tarjetaEstadistica} card p-6 text-center`}>
          <div
            className={`${styles.numero} ${styles.numeroAprobada} text-3xl font-bold text-green-600 mb-2`}
          >
            {solicitudes.filter((s) => s.estado === "aprobada").length}
          </div>
          <div
            className={`${styles.etiqueta} text-sm font-medium text-gray-600`}
          >
            Aprobadas
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {loading ? (
        <div className={`${styles.cargando} text-center py-16`}>
          <div className={`${styles.spinner} spinner mx-auto mb-4`}></div>
          <p className="text-gray-600 font-medium">Cargando solicitudes...</p>
        </div>
      ) : (
        <div className={`${styles.listaSolicitudes} space-y-4`}>
          {solicitudes.length === 0 ? (
            <div
              className={`${styles.estadoVacio} card p-12 text-center border-2 border-dashed border-gray-200`}
            >
              <div className={`${styles.iconoVacio} text-5xl mb-6`}>📋</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay solicitudes
              </h3>
              <p className="text-gray-600 mb-6">
                Cuando crees solicitudes, aparecerán aquí
              </p>

              {(roleName === "jefe planta" || roleName === "administrador") && (
                <button
                  className={`${styles.botonPrimario} btn-primary`}
                  onClick={() => setVista("crear")}
                >
                  Crear primera solicitud
                </button>
              )}
            </div>
          ) : (
            solicitudes.map((solicitud) => (
              <TarjetaSolicitud
                key={solicitud.id}
                solicitud={solicitud}
                roleName={roleName}
                onEstadoChange={handleEstado}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
