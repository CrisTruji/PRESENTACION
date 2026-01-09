// src/screens/compras/gestioncompras.jsx
import React, { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/auth";
import { getSolicitudes, getSolicitudConItems, actualizarEstadoSolicitud } from "../../services/solicitudes";
import { crearPedido, agregarItemsPedido } from "../../services/pedidos";
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
    } catch (e) {
      console.error(e);
      setError("Error cargando solicitudes");
      toast.error("Error cargando solicitudes");
    } finally {
      setLoading(false);
    }
  }

  async function verDetalle(id) {
    try {
      const s = await getSolicitudConItems(id);
      setDetalle(s);
    } catch (e) {
      console.error(e);
      toast.error("Error cargando detalle");
    }
  }

  async function generarPedido(solicitud) {
    if (!user?.id) {
      toast.error("No se puede identificar el usuario");
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

      toast.success("Pedido generado correctamente");
      setDetalle(null);
      fetchSolicitudes();
    } catch (e) {
      console.error(e);
      toast.error("Error generando pedido");
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

  // Función para determinar el color del badge según estado
  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case "aprobado":
      case "aprobado_auxiliar":
        return "green";
      case "rechazado":
      case "rechazado_auxiliar":
        return "red";
      case "pendiente":
      case "en_revision":
        return "yellow";
      case "en_proceso":
      case "en_compra":
        return "blue";
      case "comprado":
      case "completado":
        return "purple";
      default:
        return "gray";
    }
  };

  // Función para obtener el texto del estado legible
  const getEstadoTexto = (estado) => {
    if (!estado) return "Sin estado";
    
    const estadoMap = {
      "pendiente": "Pendiente",
      "en_revision": "En revisión",
      "aprobado": "Aprobado",
      "aprobado_auxiliar": "Aprobado",
      "rechazado": "Rechazado",
      "rechazado_auxiliar": "Rechazado",
      "en_compra": "En compra",
      "comprado": "Comprado",
      "completado": "Completado",
      "cancelado": "Cancelado"
    };
    
    return estadoMap[estado.toLowerCase()] || estado;
  };

  // Función para contar solicitudes por estado
  const contarPorEstado = (estado) => {
    return solicitudes.filter(s => 
      s.estado?.toLowerCase() === estado?.toLowerCase()
    ).length;
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
    return sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
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
  const totalAprobadas = contarPorEstado("aprobado_auxiliar");
  const totalEnProceso = contarPorEstado("en_proceso");
  const totalEnCompra = contarPorEstado("en_compra");
  
  if (error && solicitudes.length === 0) {
    return <ErrorState error={error} onRetry={fetchSolicitudes} />;
  }

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <Header totalCount={totalCount} currentPage={currentPage} totalPages={totalPages} />

      {/* Estadísticas */}
      <StatsSection 
        totalAprobadas={totalAprobadas}
        totalEnProceso={totalEnProceso}
        totalEnCompra={totalEnCompra}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      {/* Filtros */}
      <FiltersSection
        searchTerm={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
        onClearSearch={() => {
          setSearchTerm("");
          setDebouncedSearchTerm("");
          searchInputRef.current?.focus();
        }}
        selectedEstado={selectedEstado}
        onEstadoChange={(e) => {
          setSelectedEstado(e.target.value);
          setCurrentPage(1);
        }}
        selectedProveedor={selectedProveedor}
        onProveedorChange={(e) => {
          setSelectedProveedor(e.target.value);
          setCurrentPage(1);
        }}
        estadosDisponibles={estadosDisponibles}
        proveedoresDisponibles={proveedoresDisponibles}
        onRefresh={fetchSolicitudes}
        debouncedSearchTerm={debouncedSearchTerm}
        searchInputRef={searchInputRef}
      />

      {/* Tabla de Solicitudes */}
      <SolicitudesTable
        solicitudes={solicitudes}
        sortField={sortField}
        loading={loading}
        sortDirection={sortDirection}
        onSort={handleSort}
        getSortIcon={getSortIcon}
        getEstadoColor={getEstadoColor}
        getEstadoTexto={getEstadoTexto}
        contarEstadosItems={contarEstadosItems}
        onVerDetalle={verDetalle}
        onGenerarPedido={generarPedido}
        generando={generando}
        selectedEstado={selectedEstado}
        debouncedSearchTerm={debouncedSearchTerm}
        selectedProveedor={selectedProveedor}
      />

      {/* Paginación */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={goToPage}
        />
      )}

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


function ErrorState({ error, onRetry }) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg border-2 border-dashed border-red-200 p-12 text-center">
        <div className="text-5xl mb-6 text-red-500">❌</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Error al cargar solicitudes
        </h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <button 
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw size={16} />
          Reintentar
        </button>
      </div>
    </div>
  );
}

function Header({ totalCount }) {
  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            🛒 Gestión de Compras
          </h1>
          <p className="text-gray-600">
            Convierte solicitudes aprobadas en pedidos de compra
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
            <span className="text-blue-600">📋</span>
            Total: {totalCount}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatsSection({ totalAprobadas, totalEnProceso, totalEnCompra, currentPage, totalPages }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <StatCard
        title="Pendientes compra"
        value={totalAprobadas}
        icon={<ShoppingCart size={20} className="text-blue-600" />}
        bgColor="bg-blue-50"
      />
      <StatCard
        title="En proceso"
        value={totalEnProceso}
        icon={<Loader2 size={20} className="text-yellow-600" />}
        bgColor="bg-yellow-50"
      />
      <StatCard
        title="En compra"
        value={totalEnCompra}
        icon={<Package size={20} className="text-green-600" />}
        bgColor="bg-green-50"
      />
      <StatCard
        title="Página actual"
        value={`${currentPage} / ${totalPages || 1}`}
        icon={<FileText size={20} className="text-purple-600" />}
        bgColor="bg-purple-50"
      />
    </div>
  );
}

function StatCard({ title, value, icon, bgColor }) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function FiltersSection({
  searchTerm,
  onSearchChange,
  onClearSearch,
  selectedEstado,
  onEstadoChange,
  selectedProveedor,
  onProveedorChange,
  estadosDisponibles,
  proveedoresDisponibles,
  onRefresh,
  debouncedSearchTerm,
  searchInputRef,
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar por ID, proveedor o creador..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            value={searchTerm}
            onChange={onSearchChange}
          />
          {searchTerm && (
            <button
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              type="button"
            >
              <X size={20} />
            </button>
          )}
          {debouncedSearchTerm && searchTerm && (
            <div className="absolute -bottom-6 left-0 text-xs text-gray-500">
              Buscando: "{debouncedSearchTerm}"
            </div>
          )}
        </div>

        {/* Filtro por estado */}
        <div className="relative">
          <Filter
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <select
            className="w-full pl-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
            value={selectedEstado}
            onChange={onEstadoChange}
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
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <select
            className="w-full pl-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
            value={selectedProveedor}
            onChange={onProveedorChange}
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
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>
      </div>
    </div>
  );
}

function SolicitudesTable({
  solicitudes,
  sortField,
  loading,
  sortDirection,
  onSort,
  getSortIcon,
  getEstadoColor,
  getEstadoTexto,
  contarEstadosItems,
  onVerDetalle,
  onGenerarPedido,
  generando,
  selectedEstado,
  debouncedSearchTerm,
  selectedProveedor,
}) {
    if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-12 text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }
  if (solicitudes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-12 text-center">
          <div className="text-gray-500">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No se encontraron solicitudes</p>
            <p className="text-gray-400">
              {debouncedSearchTerm || selectedEstado !== "todos" || selectedProveedor !== "todos"
                ? "Prueba con otros filtros"
                : "No hay solicitudes para comprar"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <TableHeader
                field="id"
                label={
                  <>
                    <FileText size={14} />
                    Solicitud
                  </>
                }
                sortField={sortField}
                sortDirection={sortDirection}
                getSortIcon={getSortIcon}
                onSort={onSort}
              />
              <TableHeader
                field="fecha_solicitud"
                label={
                  <>
                    <Calendar size={14} />
                    Fecha y Hora
                  </>
                }
                sortField={sortField}
                sortDirection={sortDirection}
                getSortIcon={getSortIcon}
                onSort={onSort}
              />
              <TableHeader
                field="proveedor.nombre"
                label={
                  <>
                    <Building size={14} />
                    Proveedor
                  </>
                }
                sortField={sortField}
                sortDirection={sortDirection}
                getSortIcon={getSortIcon}
                onSort={onSort}
              />
              <TableHeader
                field="email_creador"
                label={
                  <>
                    <User size={14} />
                    Creada por
                  </>
                }
                sortField={sortField}
                sortDirection={sortDirection}
                getSortIcon={getSortIcon}
                onSort={onSort}
              />
              <TableHeader
                field="estado"
                label="Estado"
                sortField={sortField}
                sortDirection={sortDirection}
                getSortIcon={getSortIcon}
                onSort={onSort}
              />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items Aprobados
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {solicitudes.map((sol) => {
              const estadoColor = getEstadoColor(sol.estado);
              const estadoTexto = getEstadoTexto(sol.estado);
              const esComprable = sol.estado?.toLowerCase() === "aprobado_auxiliar";
              const estadosItems = contarEstadosItems(sol.solicitud_items);
              
              return (
                <tr key={sol.id} className="hover:bg-gray-50 transition-colors duration-150">
                  {/* Número de solicitud */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="font-bold text-gray-700">#{sol.id}</span>
                      </div>
                    </div>
                  </td>

                  {/* Fecha y Hora */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900">
                        {new Date(sol.fecha_solicitud).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(sol.fecha_solicitud).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </td>

                  {/* Proveedor */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Building size={16} className="text-purple-600" />
                      </div>
                      <span className="text-sm text-gray-900 truncate max-w-[150px]">
                        {sol.proveedor?.nombre || "No especificado"}
                      </span>
                    </div>
                  </td>

                  {/* Creada por */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <User size={16} className="text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-900 truncate max-w-[150px]">
                        {sol.email_creador || "Usuario no disponible"}
                      </span>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        estadoColor === "green"
                          ? "bg-green-100 text-green-800"
                          : estadoColor === "red"
                          ? "bg-red-100 text-red-800"
                          : estadoColor === "yellow"
                          ? "bg-yellow-100 text-yellow-800"
                          : estadoColor === "blue"
                          ? "bg-blue-100 text-blue-800"
                          : estadoColor === "purple"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {estadoTexto}
                    </span>
                  </td>

                  {/* Items Aprobados/Rechazados */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          {estadosItems.aprobados}
                        </span>
                      </div>
                      {estadosItems.rechazados > 0 && (
                        <div className="flex items-center gap-1">
                          <XCircle size={16} className="text-red-600" />
                          <span className="text-sm font-medium text-red-600">
                            {estadosItems.rechazados}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-gray-400">
                        / {estadosItems.total}
                      </span>
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onVerDetalle(sol.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100"
                        title="Ver detalle"
                      >
                        <Eye size={16} />
                        Detalle
                      </button>
                      
                      <button
                        onClick={() => onGenerarPedido(sol)}
                        disabled={generando || !esComprable}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          esComprable 
                            ? "bg-green-600 text-white hover:bg-green-700" 
                            : "bg-gray-100 text-gray-500 cursor-not-allowed"
                        }`}
                        title={esComprable ? "Generar pedido de compra" : "Solo solicitudes aprobadas pueden convertirse a pedidos"}
                      >
                        {generando ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Generando...
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={16} />
                            Comprar
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableHeader({ field, label, getSortIcon, onSort }) {
  return (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label} {getSortIcon(field)}
      </div>
    </th>
  );
}

function Pagination({ currentPage, totalPages, totalCount, itemsPerPage, onPageChange }) {
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const leftOffset = Math.floor(maxVisible / 2);
      let start = Math.max(currentPage - leftOffset, 1);
      let end = Math.min(start + maxVisible - 1, totalPages);

      if (end - start + 1 < maxVisible) {
        start = Math.max(end - maxVisible + 1, 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages.map((page) => (
      <button
        key={page}
        onClick={() => onPageChange(page)}
        className={`w-10 h-10 flex items-center justify-center rounded-lg ${
          currentPage === page
            ? "bg-blue-600 text-white"
            : "border border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        {page}
      </button>
    ));
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
      <div className="text-sm text-gray-600">
        Mostrando {(currentPage - 1) * itemsPerPage + 1} -{" "}
        {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} solicitudes
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg ${
            currentPage === 1
              ? "text-gray-400 cursor-not-allowed"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <ChevronLeft size={20} />
        </button>

        {renderPageNumbers()}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg ${
            currentPage === totalPages
              ? "text-gray-400 cursor-not-allowed"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Ir a:</span>
        <input
          type="number"
          min="1"
          max={totalPages}
          defaultValue={currentPage}
          className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const page = parseInt(e.target.value);
              if (!isNaN(page)) onPageChange(page);
            }
          }}
        />
      </div>
    </div>
  );
}

function DetalleModal({ detalle, generando, onGenerarPedido, onClose, contarEstadosItems }) {
  const estadosItems = contarEstadosItems(detalle.items);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Detalles de Solicitud</h2>
              <p className="text-gray-600">
                #{detalle.id} • {detalle.proveedor?.nombre || "Sin proveedor"}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
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
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Información del proveedor */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Building size={18} />
              Información del Proveedor
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-medium">{detalle.proveedor?.nombre || "No especificado"}</p>
              </div>
              {detalle.proveedor?.nit && (
                <div>
                  <p className="text-sm text-gray-500">NIT</p>
                  <p className="font-mono">{detalle.proveedor.nit}</p>
                </div>
              )}
            </div>
          </div>

          {/* Resumen de items */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Package size={18} />
              Resumen de Productos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-xs text-green-600 font-medium mb-1">Aprobados</div>
                <div className="text-lg font-bold text-green-700">
                  {estadosItems.aprobados}
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-xs text-red-600 font-medium mb-1">Rechazados</div>
                <div className="text-lg font-bold text-red-700">
                  {estadosItems.rechazados}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-600 font-medium mb-1">Total</div>
                <div className="text-lg font-bold text-gray-700">
                  {estadosItems.total}
                </div>
              </div>
            </div>
          </div>

          {/* Lista de productos */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
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
                    className={`p-4 rounded-lg border-2 transition-all ${
                      esAprobado 
                        ? 'bg-green-50 border-green-200' 
                        : esRechazado 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {esAprobado && <CheckCircle size={16} className="text-green-600" />}
                          {esRechazado && <XCircle size={16} className="text-red-600" />}
                          {it.catalogo_productos?.nombre}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Cantidad: {it.cantidad_solicitada} {it.unidad}
                        </div>
                        {it.observaciones && (
                          <div className="text-sm text-gray-500 italic mt-1">
                            {it.observaciones}
                          </div>
                        )}
                      </div>
                      
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        esAprobado 
                          ? 'bg-green-100 text-green-700' 
                          : esRechazado 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {esAprobado ? 'Aprobado' : esRechazado ? 'Rechazado' : 'Pendiente'}
                      </span>
                    </div>
                    
                    {/* Motivo de rechazo si existe */}
                    {esRechazado && it.motivo_rechazo && (
                      <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-800">
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
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {detalle.estado === "aprobado_auxiliar" 
              ? "Lista para generar pedido" 
              : "Requiere aprobación previa"}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cerrar
            </button>
            <button 
              onClick={() => onGenerarPedido(detalle)}
              disabled={generando || detalle.estado !== "aprobado_auxiliar"}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                generando 
                  ? "bg-gray-100 text-gray-500 cursor-not-allowed" 
                  : detalle.estado === "aprobado_auxiliar"
                  ? "bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
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