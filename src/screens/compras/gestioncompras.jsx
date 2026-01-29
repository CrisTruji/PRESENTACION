// src/screens/compras/gestioncompras.jsx
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/auth";
import { getSolicitudes, getSolicitudConItems, actualizarEstadoSolicitud } from "../../services/solicitudes";
import { crearPedido, agregarItemsPedido } from "../../services/pedidos";
import notify from "../../utils/notifier";
import {
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Eye,
  ShoppingCart,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Building,
  User,
  CheckCircle,
  XCircle,
  RefreshCw,
  Package,
  X,
  Loader2,
  FileText,
  AlertCircle,
  ShoppingBag
} from "lucide-react";

export default function GestionCompras() {
  const { user, profile } = useAuth?.() || {};
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [generando, setGenerando] = useState(false);
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedEstado, setSelectedEstado] = useState("todos");
  const [selectedProveedor, setSelectedProveedor] = useState("todos");
  const [sortField, setSortField] = useState("fecha_solicitud");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;
  
  // Ref para búsqueda
  const searchInputRef = useRef(null);
  
  // Estados para filtros disponibles
  const [estadosDisponibles, setEstadosDisponibles] = useState([]);
  const [proveedoresDisponibles, setProveedoresDisponibles] = useState([]);

  // Debounce para búsqueda
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timerId);
  }, [searchTerm]);

  useEffect(() => {
    fetchSolicitudes();
  }, [debouncedSearchTerm, selectedEstado, selectedProveedor, sortField, sortDirection, currentPage]);

  async function fetchSolicitudes() {
    setLoading(true);
    try {
      const data = await getSolicitudes();
      
      // Extraer estados y proveedores únicos
      const estados = new Set();
      const proveedores = new Set();
      
      data?.forEach(s => {
        if (s.estado) estados.add(s.estado);
        if (s.proveedor?.nombre) proveedores.add(s.proveedor.nombre);
      });
      
      setEstadosDisponibles(Array.from(estados));
      setProveedoresDisponibles(Array.from(proveedores));

      // Aplicar filtros
      let filtradas = (data || []).filter(s => 
        s.estado === "aprobado_auxiliar" || s.estado === "en_compra" || s.estado === "en_proceso"
      );

      // Filtro por estado
      if (selectedEstado !== "todos") {
        filtradas = filtradas.filter(s => s.estado === selectedEstado);
      }

      // Filtro por proveedor
      if (selectedProveedor !== "todos") {
        filtradas = filtradas.filter(s => s.proveedor?.nombre === selectedProveedor);
      }

      // Filtro por búsqueda
      if (debouncedSearchTerm) {
        filtradas = filtradas.filter(s => 
          s.id.toString().includes(debouncedSearchTerm) ||
          (s.proveedor?.nombre || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          (s.email_creador || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
      }

      // Ordenamiento
      filtradas.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        if (sortField === "fecha_solicitud") {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        
        if (sortDirection === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      // Paginación
      const total = filtradas.length;
      setTotalCount(total);
      
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginadas = filtradas.slice(startIndex, endIndex);
      
      setSolicitudes(paginadas);
      setError(null);
      
      if (paginadas.length > 0) {
        notify.success(`Cargadas ${paginadas.length} solicitudes de compra`);
      }
    } catch (e) {
      console.error(e);
      setError("Error cargando solicitudes");
      notify.error("Error cargando solicitudes");
    } finally {
      setLoading(false);
    }
  }

  async function verDetalle(id) {
    try {
      const s = await getSolicitudConItems(id);
      setDetalle(s);
      notify.success("Detalles de solicitud cargados");
    } catch (e) {
      console.error(e);
      notify.error("Error cargando detalle");
    }
  }

  async function generarPedido(solicitud) {
    if (!user?.id) {
      notify.error("No se puede identificar el usuario");
      return;
    }

    try {
      setGenerando(true);
      
      const pedido = await crearPedido({
        solicitud_id: solicitud.id,
        proveedor_id: solicitud.proveedor_id,
        created_by: user.id
      });

      const items = (detalle?.items || []).map(it => ({
        catalogo_producto_id: it.catalogo_producto_id,
        cantidad: it.cantidad_solicitada,
        precio_unitario: null
      }));

      await agregarItemsPedido(pedido.id, items);

      await actualizarEstadoSolicitud(
        solicitud.id, 
        "comprado",
        `Pedido generado por ${profile?.nombre || user.email}`,
        user.id
      );

      notify.success("Pedido generado correctamente");
      setDetalle(null);
      fetchSolicitudes();
    } catch (e) {
      console.error(e);
      notify.error("Error generando pedido");
    } finally {
      setGenerando(false);
    }
  }

  // Función para contar items aprobados vs rechazados
  const contarEstadosItems = (items) => {
    if (!items || items.length === 0) return { aprobados: 0, rechazados: 0, total: 0 };
    
    const aprobados = items.filter(it => 
      it.estado_item === 'aprobado_auxiliar'
    ).length;
    
    const rechazados = items.filter(it => 
      it.estado_item === 'rechazado_auxiliar'
    ).length;
    
    return { aprobados, rechazados, total: items.length };
  };

  // Handlers para ordenamiento
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  // Calcular total de páginas
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Calcular estadísticas
  const totalAprobadas = solicitudes.filter(s => 
    s.estado?.toLowerCase() === "aprobado_auxiliar"
  ).length;
  const totalEnProceso = solicitudes.filter(s => 
    s.estado?.toLowerCase() === "en_proceso"
  ).length;
  const totalEnCompra = solicitudes.filter(s => 
    s.estado?.toLowerCase() === "en_compra"
  ).length;
  
  if (error && solicitudes.length === 0) {
    return <ErrorState error={error} onRetry={fetchSolicitudes} />;
  }

  return (
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header */}
        <div className="section-header">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
              <h1 className="section-title">Gestión de Compras</h1>
              <p className="section-subtitle">
                Convierte solicitudes aprobadas en pedidos de compra
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="badge badge-primary">
                <ShoppingBag size={14} className="mr-1" />
                Total: {totalCount}
              </span>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatsCard
            title="Pendientes compra"
            value={totalAprobadas}
            icon={<ShoppingCart className="w-5 h-5 text-primary" />}
          />
          <StatsCard
            title="En proceso"
            value={totalEnProceso}
            icon={<Loader2 className="w-5 h-5 text-warning" />}
          />
          <StatsCard
            title="En compra"
            value={totalEnCompra}
            icon={<Package className="w-5 h-5 text-success" />}
          />
          <StatsCard
            title="Página actual"
            value={`${currentPage} / ${totalPages || 1}`}
            icon={<FileText className="w-5 h-5 text-secondary" />}
          />
        </div>

        {/* Filtros */}
        <div className="card p-compact mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Búsqueda */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted"
                size={20}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por ID, proveedor o creador..."
                className="form-input pl-10 pr-10 !py-2.5"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setDebouncedSearchTerm("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-primary"
                  type="button"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Filtro por estado */}
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted"
                size={20}
              />
              <select
                className="form-input pl-10 !py-2.5 appearance-none"
                value={selectedEstado}
                onChange={(e) => {
                  setSelectedEstado(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="todos">Todos los estados</option>
                {estadosDisponibles.map((estado, index) => (
                  <option key={index} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por proveedor */}
            <div className="relative">
              <Building
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted"
                size={20}
              />
              <select
                className="form-input pl-10 !py-2.5 appearance-none"
                value={selectedProveedor}
                onChange={(e) => {
                  setSelectedProveedor(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="todos">Todos los proveedores</option>
                {proveedoresDisponibles.map((proveedor, index) => (
                  <option key={index} value={proveedor}>
                    {proveedor}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón actualizar */}
            <div className="flex items-center justify-center md:justify-end">
              <button 
                onClick={fetchSolicitudes}
                className="btn btn-outline flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de Solicitudes */}
        <div className="card overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("id")}
                  >
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Solicitud {getSortIcon("id")}
                    </div>
                  </th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("fecha_solicitud")}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Fecha y Hora {getSortIcon("fecha_solicitud")}
                    </div>
                  </th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("proveedor.nombre")}
                  >
                    <div className="flex items-center gap-1">
                      <Building className="w-4 h-4" />
                      Proveedor {getSortIcon("proveedor.nombre")}
                    </div>
                  </th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("email_creador")}
                  >
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Creada por {getSortIcon("email_creador")}
                    </div>
                  </th>
                  <th className="table-header-cell">Estado</th>
                  <th className="table-header-cell">Items Aprobados</th>
                  <th className="table-header-cell">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="spinner spinner-lg mx-auto mb-3"></div>
                      <p className="text-muted">Cargando solicitudes...</p>
                    </td>
                  </tr>
                ) : solicitudes.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="text-muted">
                        <Package
                          size={48}
                          className="mx-auto mb-4 text-border"
                        />
                        <p className="text-lg font-medium mb-2 text-primary">
                          No se encontraron solicitudes
                        </p>
                        <p className="text-muted">
                          {debouncedSearchTerm || selectedEstado !== "todos" || selectedProveedor !== "todos"
                            ? "Prueba con otros filtros"
                            : "No hay solicitudes para comprar"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  solicitudes.map((sol) => {
                    const esComprable = sol.estado?.toLowerCase() === "aprobado_auxiliar";
                    const estadosItems = contarEstadosItems(sol.solicitud_items);
                    
                    return (
                      <tr key={sol.id} className="table-row">
                        {/* Número de solicitud */}
                        <td className="table-cell">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-app rounded-base flex items-center justify-center mr-3 border border-light">
                              <span className="font-bold text-primary">#{sol.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Fecha y Hora */}
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {new Date(sol.fecha_solicitud).toLocaleDateString("es-ES", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-xs text-secondary">
                              {new Date(sol.fecha_solicitud).toLocaleTimeString("es-ES", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Proveedor */}
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-base flex items-center justify-center">
                              <Building size={16} className="text-primary" />
                            </div>
                            <span className="text-sm truncate max-w-[150px]">
                              {sol.proveedor?.nombre || "No especificado"}
                            </span>
                          </div>
                        </td>

                        {/* Creada por */}
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-base flex items-center justify-center">
                              <User size={16} className="text-primary" />
                            </div>
                            <span className="text-sm truncate max-w-[150px]">
                              {sol.email_creador || "Usuario no disponible"}
                            </span>
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="table-cell">
                          <EstadoBadge estado={sol.estado} />
                        </td>

                        {/* Items Aprobados/Rechazados */}
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <CheckCircle size={16} className="text-success" />
                              <span className="text-sm font-medium text-success">
                                {estadosItems.aprobados}
                              </span>
                            </div>
                            {estadosItems.rechazados > 0 && (
                              <div className="flex items-center gap-1">
                                <XCircle size={16} className="text-error" />
                                <span className="text-sm font-medium text-error">
                                  {estadosItems.rechazados}
                                </span>
                              </div>
                            )}
                            <span className="text-xs text-secondary">
                              / {estadosItems.total}
                            </span>
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => verDetalle(sol.id)}
                              className="btn btn-outline btn-icon"
                              title="Ver detalle"
                            >
                              <Eye size={16} />
                            </button>
                            
                            <button
                              onClick={() => generarPedido(sol)}
                              disabled={generando || !esComprable}
                              className={`btn btn-icon ${
                                esComprable 
                                  ? "btn-primary" 
                                  : "opacity-50 cursor-not-allowed"
                              }`}
                              title={esComprable ? "Generar pedido de compra" : "Solo solicitudes aprobadas pueden convertirse a pedidos"}
                            >
                              {generando ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <ShoppingCart size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-base">
            <div className="text-sm text-secondary">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount}{" "}
              solicitudes
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`btn btn-icon ${
                  currentPage === 1
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                <ChevronLeft size={20} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-10 h-10 flex items-center justify-center rounded-base ${
                      currentPage === pageNum
                        ? "btn-primary"
                        : "btn btn-outline"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`btn btn-icon ${
                  currentPage === totalPages
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary">Ir a:</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                defaultValue={currentPage}
                className="form-input w-16 !py-1.5 !px-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const page = parseInt(e.target.value);
                    if (!isNaN(page)) goToPage(page);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      {detalle && (
        <DetalleModal
          detalle={detalle}
          generando={generando}
          onGenerarPedido={generarPedido}
          onClose={() => setDetalle(null)}
          contarEstadosItems={contarEstadosItems}
        />
      )}
    </div>
  );
}

// Componente para mostrar el estado con badge
function EstadoBadge({ estado }) {
  const getEstadoConfig = (estado) => {
    if (!estado) return { texto: "Sin estado", clase: "badge" };
    
    switch (estado.toLowerCase()) {
      case "aprobado":
      case "aprobado_auxiliar":
        return { texto: "Aprobado", clase: "badge-success" };
      case "rechazado":
      case "rechazado_auxiliar":
        return { texto: "Rechazado", clase: "badge-error" };
      case "pendiente":
      case "en_revision":
        return { texto: "En revisión", clase: "badge-warning" };
      case "en_proceso":
      case "en_compra":
        return { texto: "En proceso", clase: "badge-primary" };
      case "comprado":
      case "completado":
        return { texto: "Comprado", clase: "badge-success" };
      default:
        return { texto: estado, clase: "badge" };
    }
  };

  const config = getEstadoConfig(estado);
  
  return (
    <span className={`badge ${config.clase}`}>
      {config.texto}
    </span>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="page-container">
      <div className="card p-12 text-center">
        <div className="alert-error inline-flex items-center justify-center w-20 h-20 rounded-full mb-6">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-semibold mb-2">Error al cargar solicitudes</h3>
        <p className="text-secondary mb-6">{error}</p>
        <button onClick={onRetry} className="btn btn-primary">
          Reintentar
        </button>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon }) {
  return (
    <div className="card-hover p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-secondary mb-1">{title}</p>
          <p className="text-2xl font-bold text-primary">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-base flex items-center justify-center bg-surface">
          {icon}
        </div>
      </div>
    </div>
  );
}

function DetalleModal({ detalle, generando, onGenerarPedido, onClose, contarEstadosItems }) {
  const estadosItems = contarEstadosItems(detalle.items);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-card shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="card-header">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Detalles de Solicitud</h2>
              <p className="text-secondary">
                #{detalle.id} • {detalle.proveedor?.nombre || "Sin proveedor"}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(detalle.fecha_solicitud).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <User size={14} />
                  {detalle.email_creador || "Usuario no disponible"}
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="btn btn-icon btn-outline"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Información del proveedor */}
          <div className="mb-6 p-4 bg-surface rounded-base border border-light">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Building size={18} />
              Información del Proveedor
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-secondary">Nombre</p>
                <p className="font-medium">{detalle.proveedor?.nombre || "No especificado"}</p>
              </div>
              {detalle.proveedor?.nit && (
                <div>
                  <p className="text-sm text-secondary">NIT</p>
                  <p className="font-mono">{detalle.proveedor.nit}</p>
                </div>
              )}
            </div>
          </div>

          {/* Resumen de items */}
          <div className="mb-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package size={18} />
              Resumen de Productos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-success/10 rounded-base border border-success/20">
                <div className="text-xs text-success font-medium mb-1">Aprobados</div>
                <div className="text-lg font-bold text-success">
                  {estadosItems.aprobados}
                </div>
              </div>
              <div className="p-3 bg-error/10 rounded-base border border-error/20">
                <div className="text-xs text-error font-medium mb-1">Rechazados</div>
                <div className="text-lg font-bold text-error">
                  {estadosItems.rechazados}
                </div>
              </div>
              <div className="p-3 bg-surface rounded-base border border-light">
                <div className="text-xs text-secondary font-medium mb-1">Total</div>
                <div className="text-lg font-bold">
                  {estadosItems.total}
                </div>
              </div>
            </div>
          </div>

          {/* Lista de productos */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package size={18} />
              Productos ({detalle.items?.length || 0})
            </h3>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {detalle.items?.map(it => {
                const estadoItem = it.estado_item?.toLowerCase();
                const esAprobado = estadoItem === 'aprobado_auxiliar';
                const esRechazado = estadoItem === 'rechazado_auxiliar';
                
                return (
                  <div 
                    key={it.id} 
                    className={`p-4 rounded-base border-2 transition-all ${
                      esAprobado 
                        ? 'bg-success/10 border-success/20' 
                        : esRechazado 
                        ? 'bg-error/10 border-error/20' 
                        : 'bg-surface border-light'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {esAprobado && <CheckCircle size={16} className="text-success" />}
                          {esRechazado && <XCircle size={16} className="text-error" />}
                          {it.catalogo_productos?.nombre}
                        </div>
                        <div className="text-sm text-secondary mt-1">
                          Cantidad: {it.cantidad_solicitada} {it.unidad}
                        </div>
                        {it.observaciones && (
                          <div className="text-sm text-muted italic mt-1">
                            {it.observaciones}
                          </div>
                        )}
                      </div>
                      
                      <span className={`badge ${
                        esAprobado 
                          ? 'badge-success' 
                          : esRechazado 
                          ? 'badge-error' 
                          : ''
                      }`}>
                        {esAprobado ? 'Aprobado' : esRechazado ? 'Rechazado' : 'Pendiente'}
                      </span>
                    </div>
                    
                    {/* Motivo de rechazo si existe */}
                    {esRechazado && it.motivo_rechazo && (
                      <div className="mt-2 p-2 bg-error/10 rounded-base text-sm text-error">
                        <strong>Motivo:</strong> {it.motivo_rechazo}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="card-footer flex justify-between items-center">
          <div className="text-sm text-secondary">
            {detalle.estado === "aprobado_auxiliar" 
              ? "Lista para generar pedido" 
              : "Requiere aprobación previa"}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="btn btn-outline"
            >
              Cerrar
            </button>
            <button 
              onClick={() => onGenerarPedido(detalle)}
              disabled={generando || detalle.estado !== "aprobado_auxiliar"}
              className={`btn ${
                generando 
                  ? "opacity-50 cursor-not-allowed" 
                  : detalle.estado === "aprobado_auxiliar"
                  ? "btn-primary"
                  : "opacity-50 cursor-not-allowed"
              } flex items-center gap-2`}
            >
              {generando ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <ShoppingCart size={16} />
                  Generar Pedido
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}