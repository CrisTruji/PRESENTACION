// src/screens/solicitudes/TarjetaSolicitud.jsx
import React from "react";

export default function TarjetaSolicitud({
  solicitud,
  roleName,
  onEstadoChange,
}) {
  const { id, nombre, estado, productos, fecha_creacion, creado_por } =
    solicitud;

  const getEstadoColor = (estado) => {
    switch (estado) {
      case "aprobada":
        return "badge-success";
      case "pendiente":
        return "badge-warning";
      case "rechazada":
        return "badge-error";
      default:
        return "badge";
    }
  };

  const getEstadoText = (estado) => {
    switch (estado) {
      case "aprobada":
        return "Aprobada";
      case "pendiente":
        return "Pendiente";
      case "rechazada":
        return "Rechazada";
      default:
        return estado;
    }
  };

  const getFechaFormateada = (fecha) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
    <div className={`${styles.tarjeta} card card-hover p-6`}>
      <div
        className={`${styles.contenidoTarjeta} flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4`}
      >
        {/* Información principal */}
        <div className={`${styles.infoPrincipal} flex-1`}>
          <div
            className={`${styles.encabezado} flex flex-col sm:flex-row sm:items-center gap-3 mb-4`}
          >
            <h3
              className={`${styles.nombreProveedor} text-lg font-semibold text-gray-900`}
            >
              {solicitud.proveedor?.nombre || `Solicitud #${id}`}
            </h3>

            <div className="flex items-center gap-2">
              <span
                className={styles.estado}
                style={{ backgroundColor: getColorEstado(solicitud.estado) }}
              >
                {getIconoEstado(solicitud.estado)}{" "}
                {String(solicitud.estado).toUpperCase()}
              </span>

              <div className={`badge ${getEstadoColor(estado)}`}>
                {getEstadoText(estado)}
              </div>
            </div>
          </div>

          {/* Detalles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Fecha</p>
              <p className="font-medium text-gray-900">
                {solicitud.created_at
                  ? new Date(solicitud.created_at).toLocaleDateString()
                  : getFechaFormateada(fecha_creacion)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Creado por</p>
              <p className={`${styles.creador} font-medium text-gray-900`}>
                Solicitado por:{" "}
                <strong>
                  {solicitud.created_by_user?.nombre ||
                    creado_por?.nombre ||
                    "Usuario"}
                </strong>
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Productos</p>
              <p className="font-medium text-gray-900">
                {productos?.length || 0} items
              </p>
            </div>
          </div>

          {/* Lista de productos (opcional - colapsable) */}
          {productos && productos.length > 0 && (
            <div className="mt-4">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-700 list-none">
                  <span>Ver productos ({productos.length})</span>
                  <svg
                    className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="mt-3 space-y-2">
                  {productos.map((producto, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                    >
                      <span className="font-medium text-gray-900">
                        {producto.nombre}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          Cantidad: {producto.cantidad} {producto.unidad}
                        </span>
                        {producto.precio_unitario && (
                          <span className="text-sm font-medium text-primary-600">
                            ${producto.precio_unitario.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div
          className={`${styles.acciones} flex flex-col sm:flex-row lg:flex-col gap-2`}
        >
          {(roleName === "administrador" || roleName === "jefe bodega") &&
            estado === "pendiente" && (
              <div className={styles.botonesAccion}>
                <button
                  className={`${styles.botonAprobar} px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors`}
                  onClick={() => onEstadoChange(solicitud.id, "aprobada")}
                >
                  Aprobar
                </button>
                <button
                  className={`${styles.botonRechazar} px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors`}
                  onClick={() => onEstadoChange(solicitud.id, "rechazada")}
                >
                  Rechazar
                </button>
              </div>
            )}

          <button className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors">
            Ver detalles
          </button>
        </div>
      </div>
    </div>
  );
}
