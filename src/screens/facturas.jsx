// src/screens/facturas.jsx
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/auth";
import { supabase } from "../lib/supabase";
import {
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Eye,
  FileText,
  ChevronRight,
  ChevronLeft,
  Download,
  Calendar,
  DollarSign,
  Building,
  RefreshCw,
  Package,
  X,
  Edit,
  Save,
} from "lucide-react";

export default function Facturas() {
  const { roleName } = useAuth();
  
  // Estados principales
  const [facturas, setFacturas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedProveedor, setSelectedProveedor] = useState("todos");
  const [sortField, setSortField] = useState("fecha_factura");
  const [sortDirection, setSortDirection] = useState("desc");

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Estados para modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [productosModal, setProductosModal] = useState([]);

  // Estados para edición de romaneo
  const [editandoRomaneo, setEditandoRomaneo] = useState(null);
  const [valorRomaneo, setValorRomaneo] = useState("");
  const [loadingRomaneo, setLoadingRomaneo] = useState(false);

  // Notificación
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  // Ref para el input de búsqueda
  const searchInputRef = useRef(null);

  // Permisos por rol
  const puedeEditarRomaneo = roleName === 'almacenista' || roleName === 'administrador';

  // Debounce para búsqueda (400ms)
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // Cargar datos
  useEffect(() => {
    cargarDatos();
  }, [currentPage, debouncedSearchTerm, selectedProveedor, sortField, sortDirection]);

  async function cargarDatos() {
    try {
      setLoading(true);
      setError(null);

      // Construir consulta base
      let query = supabase
        .from("facturas")
        .select(`
          id,
          numero_factura,
          fecha_factura,
          valor_total,
          pdf_url,
          numero_romaneo,
          solicitudes (
            id,
            proveedores (
              id,
              nombre,
              nit
            )
          ),
          factura_items (
            id,
            cantidad,
            precio_unitario,
            subtotal,
            catalogo_productos (
              nombre,
              codigo_arbol,
              categoria
            )
          )
        `, { count: 'exact' });

      // Aplicar filtros
      if (debouncedSearchTerm) {
        query = query.ilike('numero_factura', `%${debouncedSearchTerm}%`);
      }

      if (selectedProveedor !== "todos") {
        query = query.eq('solicitudes.proveedor_id', parseInt(selectedProveedor));
      }

      // Aplicar ordenamiento
      query = query.order(sortField, { 
        ascending: sortDirection === 'asc' 
      });

      // Aplicar paginación
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setFacturas(data || []);
      setTotalCount(count || 0);

      // Extraer proveedores únicos
      if (!debouncedSearchTerm && selectedProveedor === "todos") {
        const provsUnicos = [];
        const idsVistos = new Set();
        data?.forEach(f => {
          const prov = f.solicitudes?.proveedores;
          if (prov && !idsVistos.has(prov.id)) {
            idsVistos.add(prov.id);
            provsUnicos.push(prov);
          }
        });
        setProveedores(provsUnicos);
      }

    } catch (err) {
      console.error("Error al cargar facturas:", err);
      setError("Error al cargar facturas");
      showNotification('error', 'Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  }

  function showNotification(type, message) {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
  }

  // Handlers de filtros
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

  // Funciones para modal de productos
  function verProductos(factura) {
    setFacturaSeleccionada(factura);
    setProductosModal(factura.factura_items || []);
    setModalAbierto(true);
  }

  // Funciones para edición de romaneo
  async function guardarRomaneo(facturaId) {
    if (!valorRomaneo.trim()) {
      showNotification('warning', 'El número de romaneo no puede estar vacío');
      return;
    }

    try {
      setLoadingRomaneo(true);
      const { error } = await supabase
        .from("facturas")
        .update({ numero_romaneo: valorRomaneo.trim() })
        .eq("id", facturaId);

      if (error) throw error;

      setFacturas(prev =>
        prev.map(f =>
          f.id === facturaId ? { ...f, numero_romaneo: valorRomaneo.trim() } : f
        )
      );

      showNotification('success', 'Número de romaneo guardado exitosamente');
      setEditandoRomaneo(null);
      setValorRomaneo("");
    } catch (err) {
      showNotification('error', 'Error al guardar el número de romaneo');
    } finally {
      setLoadingRomaneo(false);
    }
  }

  function iniciarEdicionRomaneo(factura) {
    setEditandoRomaneo(factura.id);
    setValorRomaneo(factura.numero_romaneo || "");
  }

  function cancelarEdicionRomaneo() {
    setEditandoRomaneo(null);
    setValorRomaneo("");
  }

  // Funciones utilitarias
  const formatFecha = (fecha) => {
    if (!fecha) return "—";
    return new Date(fecha).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatValor = (valor) => {
    if (!valor) return "$0";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valor);
  };

  const calcularTotalPagina = () => {
    return facturas.reduce((sum, factura) => sum + (factura.valor_total || 0), 0);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (error && facturas.length === 0) {
    return <ErrorState error={error} onRetry={cargarDatos} />;
  }

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Notificación */}
      <Notification notification={notification} />

      {/* Header */}
      <Header totalCount={totalCount} currentPage={currentPage} totalPages={totalPages} />

      {/* Estadísticas */}
      <StatsSection 
        facturasCount={facturas.length}
        totalPagina={calcularTotalPagina()}
        proveedoresCount={proveedores.length}
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
        selectedProveedor={selectedProveedor}
        onProveedorChange={(e) => {
          setSelectedProveedor(e.target.value);
          setCurrentPage(1);
        }}
        proveedores={proveedores}
        onRefresh={cargarDatos}
        debouncedSearchTerm={debouncedSearchTerm}
        searchInputRef={searchInputRef}
      />

      {/* Tabla de Facturas */}
      <FacturasTable
        facturas={facturas}
        sortField={sortField}
        loading={loading}
        sortDirection={sortDirection}
        onSort={handleSort}
        getSortIcon={getSortIcon}
        formatFecha={formatFecha}
        formatValor={formatValor}
        onVerProductos={verProductos}
        puedeEditarRomaneo={puedeEditarRomaneo}
        editandoRomaneo={editandoRomaneo}
        valorRomaneo={valorRomaneo}
        loadingRomaneo={loadingRomaneo}
        onValorRomaneoChange={setValorRomaneo}
        onGuardarRomaneo={guardarRomaneo}
        onIniciarEdicionRomaneo={iniciarEdicionRomaneo}
        onCancelarEdicionRomaneo={cancelarEdicionRomaneo}
        selectedProveedor={selectedProveedor}
        debouncedSearchTerm={debouncedSearchTerm}
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

      {/* Modal de Productos */}
      {modalAbierto && facturaSeleccionada && (
        <ProductosModal
          factura={facturaSeleccionada}
          productos={productosModal}
          onClose={() => setModalAbierto(false)}
          formatFecha={formatFecha}
          formatValor={formatValor}
        />
      )}
    </div>
  );
}

// Componentes auxiliares
function LoadingState() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando facturas...</p>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="card p-12 text-center border-2 border-dashed border-red-200">
        <div className="text-5xl mb-6 text-red-500">❌</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Error al cargar facturas
        </h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <button onClick={onRetry} className="btn-primary">
          Reintentar
        </button>
      </div>
    </div>
  );
}

function Notification({ notification }) {
  if (!notification.show) return null;

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500'
  }[notification.type];

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${bgColor} text-white max-w-md`}>
      {notification.message}
    </div>
  );
}

function Header({ totalCount}) {
  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            📄 Facturas
          </h1>
          <p className="text-gray-600">
            Consulta las facturas registradas en el sistema
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
            <span className="text-primary-600">📋</span>
            Total: {totalCount}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatsSection({ facturasCount, totalPagina, proveedoresCount, currentPage, totalPages }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <StatCard
        title="Esta página"
        value={facturasCount}
        icon={<FileText size={20} className="text-blue-600" />}
        bgColor="bg-blue-50"
      />
      <StatCard
        title="Total página"
        value={new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(totalPagina)}
        icon={<DollarSign size={20} className="text-green-600" />}
        bgColor="bg-green-50"
      />
      <StatCard
        title="Proveedores"
        value={proveedoresCount}
        icon={<Building size={20} className="text-purple-600" />}
        bgColor="bg-purple-50"
      />
      <StatCard
        title="Página actual"
        value={`${currentPage} / ${totalPages || 1}`}
        icon={<Calendar size={20} className="text-orange-600" />}
        bgColor="bg-orange-50"
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
  selectedProveedor,
  onProveedorChange,
  proveedores,
  onRefresh,
  debouncedSearchTerm,
  searchInputRef,
}) {
  return (
    <div className="card p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar por N° de factura..."
            className="form-input pl-10 pr-10"
            value={searchTerm}
            onChange={onSearchChange}
          />
          {searchTerm && (
            <button
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              type="button"
            >
              ×
            </button>
          )}
          {debouncedSearchTerm && searchTerm && (
            <div className="absolute -bottom-6 left-0 text-xs text-gray-500">
              Buscando: "{debouncedSearchTerm}"
            </div>
          )}
        </div>

        <div className="relative">
          <Filter
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <select
            className="form-select pl-10"
            value={selectedProveedor}
            onChange={onProveedorChange}
          >
            <option value="todos">Todos los proveedores</option>
            {proveedores.map((prov) => (
              <option key={prov.id} value={prov.id}>
                {prov.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-center md:justify-end gap-4">
          <button onClick={onRefresh} className="btn-outline flex items-center gap-2">
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>
      </div>
    </div>
  );
}

function FacturasTable({
  facturas,
  sortField,
  loading,
  sortDirection,
  onSort,
  getSortIcon,
  formatFecha,
  formatValor,
  onVerProductos,
  puedeEditarRomaneo,
  editandoRomaneo,
  valorRomaneo,
  loadingRomaneo,
  onValorRomaneoChange,
  onGuardarRomaneo,
  onIniciarEdicionRomaneo,
  onCancelarEdicionRomaneo,
  selectedProveedor,
  debouncedSearchTerm,
}) {

    if (loading) {
    return (
      <div className="card overflow-hidden mb-6">
        <div className="px-6 py-12 text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando facturas...</p>
        </div>
      </div>
    );
  }

  if (facturas.length === 0) {
    return (
      <div className="card overflow-hidden mb-6">
        <div className="px-6 py-12 text-center">
          <div className="text-gray-500">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No se encontraron facturas</p>
            <p className="text-gray-400">
              {debouncedSearchTerm || selectedProveedor !== "todos"
                ? "Prueba con otros filtros"
                : "No hay facturas registradas"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden mb-6">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <TableHeader
                field="solicitudes.proveedores.nombre"
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
                field="numero_factura"
                label={
                  <>
                    <FileText size={14} />
                    N° Factura
                  </>
                }
                sortField={sortField}
                sortDirection={sortDirection}
                getSortIcon={getSortIcon}
                onSort={onSort}
              />
              <TableHeader
                field="fecha_factura"
                label={
                  <>
                    <Calendar size={14} />
                    Fecha
                  </>
                }
                sortField={sortField}
                sortDirection={sortDirection}
                getSortIcon={getSortIcon}
                onSort={onSort}
              />
              <TableHeader
                field="valor_total"
                label={
                  <>
                    <DollarSign size={14} />
                    Valor Total
                  </>
                }
                sortField={sortField}
                sortDirection={sortDirection}
                getSortIcon={getSortIcon}
                onSort={onSort}
              />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                N° Romaneo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {facturas.map((factura) => (
              <tr key={factura.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Building size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {factura.solicitudes?.proveedores?.nombre || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        NIT: {factura.solicitudes?.proveedores?.nit || 'N/A'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{factura.numero_factura}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-700">{formatFecha(factura.fecha_factura)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onVerProductos(factura)}
                    className="text-left hover:underline text-green-600 hover:text-green-700 font-semibold"
                  >
                    {formatValor(factura.valor_total)}
                  </button>
                  <div className="text-xs text-gray-500">
                    {factura.factura_items?.length || 0} productos
                  </div>
                </td>
                <td className="px-6 py-4">
                  {puedeEditarRomaneo ? (
                    editandoRomaneo === factura.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={valorRomaneo}
                          onChange={(e) => onValorRomaneoChange(e.target.value)}
                          className="form-input w-32 text-sm"
                          placeholder="N° Romaneo"
                          disabled={loadingRomaneo}
                        />
                        <button
                          onClick={() => onGuardarRomaneo(factura.id)}
                          disabled={loadingRomaneo}
                          className="p-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={onCancelarEdicionRomaneo}
                          disabled={loadingRomaneo}
                          className="p-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onIniciarEdicionRomaneo(factura)}
                        className="flex items-center gap-1 text-sm text-gray-700 hover:text-blue-600 group"
                      >
                        {factura.numero_romaneo ? (
                          <>
                            <span className="font-mono">{factura.numero_romaneo}</span>
                            <Edit size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </>
                        ) : (
                          <span className="text-gray-400 italic flex items-center gap-1">
                            <Edit size={14} />
                            Agregar
                          </span>
                        )}
                      </button>
                    )
                  ) : (
                    <span className="text-sm text-gray-700 font-mono">
                      {factura.numero_romaneo || <span className="text-gray-400">—</span>}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onVerProductos(factura)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-blue-600"
                      title="Ver productos"
                    >
                      <Eye size={18} />
                    </button>
                    {factura.pdf_url && (
                      <a
                        href={factura.pdf_url}
                        download
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                        title="Descargar PDF"
                      >
                        <Download size={18} />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
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
            ? "bg-primary-500 text-white"
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
        {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} facturas
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

function ProductosModal({ factura, productos, onClose, formatFecha, formatValor }) {
  const total = productos.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Detalles de Factura</h2>
              <p className="text-gray-600">
                {factura.solicitudes?.proveedores?.nombre} - Factura #{factura.numero_factura}
              </p>
              <p className="text-sm text-gray-500">
                {formatFecha(factura.fecha_factura)}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Información general */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="card p-4">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Building size={18} />
                Información del Proveedor
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Nombre</p>
                  <p className="font-medium">{factura.solicitudes?.proveedores?.nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">NIT</p>
                  <p className="font-mono">{factura.solicitudes?.proveedores?.nit}</p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText size={18} />
                Información de la Factura
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Número de Factura</p>
                  <p className="font-medium">{factura.numero_factura}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Número de Romaneo</p>
                  <p className="font-medium">{factura.numero_romaneo || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valor Total</p>
                  <p className="font-bold text-lg text-green-700">
                    {formatValor(factura.valor_total)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Package size={18} />
              Productos ({productos.length})
            </h3>

            {productos.length === 0 ? (
              <div className="card p-8 text-center">
                <Package size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600">No hay productos registrados para esta factura</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Producto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Cantidad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Precio Unitario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {productos.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Package size={20} className="text-orange-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {item.catalogo_productos?.nombre || 'Producto sin nombre'}
                                </div>
                                {item.catalogo_productos?.codigo_arbol && (
                                  <div className="text-xs text-gray-500 font-mono">
                                    {item.catalogo_productos.codigo_arbol}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-center">
                              <span className="font-medium text-gray-900">{item.cantidad}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-green-700 font-medium">
                              {formatValor(item.precio_unitario)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-green-700 font-bold">
                              {formatValor(item.subtotal)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="3" className="px-6 py-4 text-right font-medium">
                          Total:
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-green-700 font-bold text-lg">
                            {formatValor(total)}
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <div className="flex items-center gap-4">
            {factura.pdf_url && (
              <>
                <a
                  href={factura.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline flex items-center gap-2"
                >
                  <Eye size={16} />
                  Ver PDF
                </a>
                <a
                  href={factura.pdf_url}
                  download
                  className="btn-primary flex items-center gap-2"
                >
                  <Download size={16} />
                  Descargar PDF
                </a>
              </>
            )}
          </div>
          <button onClick={onClose} className="btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}