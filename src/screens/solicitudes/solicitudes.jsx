// src/screens/solicitudes/Solicitudes.jsx
import React, { useEffect, useState } from "react";
import { listSolicitudes, updateSolicitudEstado } from "../../lib/solicitudes";
import { useAuth } from "../../context/auth";

import TarjetaSolicitud from "./TarjetaSolicitud";
import VistaCrearSolicitud from "./VistaCrearSolicitud";

import styles from "./Solicitudes.module.css";

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
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>Solicitudes</h1>
          <p className={styles.subtitulo}>Gestiona las solicitudes de materiales</p>
        </div>

        {(roleName === "jefe planta" || roleName === "administrador") && (
          <button className={styles.botonPrimario} onClick={() => setVista("crear")}>
            <span className={styles.icono}>+</span>
            Nueva Solicitud
          </button>
        )}
      </div>

      <div className={styles.estadisticas}>
        <div className={styles.tarjetaEstadistica}>
          <div className={styles.numero}>{solicitudes.length}</div>
          <div className={styles.etiqueta}>Total</div>
        </div>

        <div className={styles.tarjetaEstadistica}>
          <div className={`${styles.numero} ${styles.numeroPendiente}`}>
            {solicitudes.filter((s) => s.estado === "pendiente").length}
          </div>
          <div className={styles.etiqueta}>Pendientes</div>
        </div>

        <div className={styles.tarjetaEstadistica}>
          <div className={`${styles.numero} ${styles.numeroAprobada}`}>
            {solicitudes.filter((s) => s.estado === "aprobada").length}
          </div>
          <div className={styles.etiqueta}>Aprobadas</div>
        </div>
      </div>

      {loading ? (
        <div className={styles.cargando}>
          <div className={styles.spinner} />
          <p>Cargando solicitudes...</p>
        </div>
      ) : (
        <div className={styles.listaSolicitudes}>
          {solicitudes.length === 0 ? (
            <div className={styles.estadoVacio}>
              <div className={styles.iconoVacio}>📋</div>
              <h3>No hay solicitudes</h3>
              <p>Cuando crees solicitudes, aparecerán aquí</p>

              {(roleName === "jefe planta" || roleName === "administrador") && (
                <button className={styles.botonPrimario} onClick={() => setVista("crear")}>
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
