// src/screens/solicitudes/TarjetaSolicitud.jsx
import React from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Calendar,
  User,
  Package,
  ChevronDown,
  Eye,
  DollarSign,
  Check,
  X
} from "lucide-react";

export default function TarjetaSolicitud({
  solicitud,
  roleName,
  onEstadoChange,
}) {
  const { id, nombre, estado, productos, fecha_creacion, creado_por } =
    solicitud;

  const getEstadoConfig = (estado) => {
    switch (estado) {
      case "aprobada":
        return {
          badgeClass: "badge-success",
          text: "Aprobada",
          color: "var(--color-success)",
          icon: <CheckCircle className="w-4 h-4" />
        };
      case "pendiente":
        return {
          badgeClass: "badge-warning",
          text: "Pendiente",
          color: "var(--color-warning)",
          icon: <Clock className="w-4 h-4" />
        };
      case "rechazada":
        return {
          badgeClass: "badge-error",
          text: "Rechazada",
          color: "var(--color-error)",
          icon: <XCircle className="w-4 h-4" />
        };
      default:
        return {
          badgeClass: "badge",
          text: estado || "Desconocido",
          color: "var(--color-muted)",
          icon: <FileText className="w-4 h-4" />
        };
    }
  };

  const estadoConfig = getEstadoConfig(estado);

  const getFechaFormateada = (fecha) => {
    if (!fecha) return "Fecha no disponible";
    return new Date(fecha).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="card card-hover p-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Información principal */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-base flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-primary">
                  {solicitud.proveedor?.nombre || `Solicitud #${id}`}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  ID: {id.substring(0, 8)}...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`badge ${estadoConfig.badgeClass} flex items-center gap-1.5`}>
                {estadoConfig.icon}
                <span className="font-medium">{estadoConfig.text}</span>
              </div>
            </div>
          </div>

          {/* Detalles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted flex-shrink-0" />
              <div>
                <p className="text-xs text-muted">Fecha</p>
                <p className="text-sm font-medium text-primary">
                  {solicitud.created_at
                    ? new Date(solicitud.created_at).toLocaleDateString('es-ES')
                    : getFechaFormateada(fecha_creacion)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted flex-shrink-0" />
              <div>
                <p className="text-xs text-muted">Creado por</p>
                <p className="text-sm font-medium text-primary truncate">
                  {solicitud.created_by_user?.nombre ||
                    creado_por?.nombre ||
                    "Usuario"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted flex-shrink-0" />
              <div>
                <p className="text-xs text-muted">Productos</p>
                <p className="text-sm font-medium text-primary">
                  {productos?.length || 0} items
                </p>
              </div>
            </div>
          </div>

          {/* Lista de productos (opcional - colapsable) */}
          {productos && productos.length > 0 && (
            <div className="mt-3">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-primary list-none p-2 hover:bg-app rounded-base">
                  <span className="flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 text-muted group-open:rotate-180 transition-transform" />
                    <span>Ver productos ({productos.length})</span>
                  </span>
                </summary>
                <div className="mt-2 space-y-1.5">
                  {productos.map((producto, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 bg-app rounded-base border border-base"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-primary truncate block">
                          {producto.nombre}
                        </span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted">
                            Cantidad: {producto.cantidad} {producto.unidad}
                          </span>
                          {producto.precio_unitario && (
                            <span className="text-xs font-medium text-primary flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {producto.precio_unitario.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-2 min-w-[200px]">
          {(roleName === "administrador" || roleName === "jefe bodega") &&
            estado === "pendiente" && (
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                <button
                  className="btn btn-primary flex items-center justify-center gap-2 !py-2 text-sm"
                  onClick={() => onEstadoChange(solicitud.id, "aprobada")}
                >
                  <Check className="w-4 h-4" />
                  Aprobar
                </button>
                <button
                  className="btn flex items-center justify-center gap-2 !py-2 text-sm"
                  style={{
                    backgroundColor: 'var(--color-error)',
                    color: 'white',
                    borderColor: 'var(--color-error)',
                  }}
                  onClick={() => onEstadoChange(solicitud.id, "rechazada")}
                >
                  <X className="w-4 h-4" />
                  Rechazar
                </button>
              </div>
            )}

          <button className="btn btn-outline flex items-center justify-center gap-2 !py-2 text-sm">
            <Eye className="w-4 h-4" />
            Ver detalles
          </button>
        </div>
      </div>
    </div>
  );
}