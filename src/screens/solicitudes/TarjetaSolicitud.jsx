// src/screens/solicitudes/TarjetaSolicitud.jsx
import React from "react";
import styles from "./TarjetaSolicitud.module.css";

/**
 * TarjetaSolicitud: componente visual independiente para cada solicitud.
 * Recibe: solicitud, roleName, onEstadoChange
 */
export default function TarjetaSolicitud({ solicitud, roleName, onEstadoChange }) {
  const getColorEstado = (estado) => {
    switch (estado) {
      case "aprobada":
        return "#10B981";
      case "rechazada":
        return "#EF4444";
      case "pendiente":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const getIconoEstado = (estado) => {
    switch (estado) {
      case "aprobada":
        return "✅";
      case "rechazada":
        return "❌";
      case "pendiente":
        return "⏳";
      default:
        return "📄";
    }
  };

  return (
    <div className={styles.tarjeta}>
      <div className={styles.contenidoTarjeta}>
        <div className={styles.infoPrincipal}>
          <div className={styles.encabezado}>
            <span
              className={styles.estado}
              style={{ backgroundColor: getColorEstado(solicitud.estado) }}
            >
              {getIconoEstado(solicitud.estado)} {String(solicitud.estado).toUpperCase()}
            </span>
            <span className={styles.fecha}>
              {solicitud.created_at ? new Date(solicitud.created_at).toLocaleDateString() : ""}
            </span>
          </div>

          <h3 className={styles.nombreProveedor}>{solicitud.proveedor?.nombre || "—"}</h3>
          <p className={styles.creador}>
            Solicitado por:{" "}
            <strong>{solicitud.created_by_user?.nombre || "Usuario"}</strong>
          </p>
        </div>

        <div className={styles.acciones}>
          {solicitud.estado === "pendiente" && roleName === "administrador" && (
            <div className={styles.botonesAccion}>
              <button
                className={styles.botonAprobar}
                onClick={() => onEstadoChange(solicitud.id, "aprobada")}
              >
                Aprobar
              </button>
              <button
                className={styles.botonRechazar}
                onClick={() => onEstadoChange(solicitud.id, "rechazada")}
              >
                Rechazar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
