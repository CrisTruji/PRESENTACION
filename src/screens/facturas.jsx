// src/screens/facturas.jsx
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/auth";
import { supabase } from "../lib/supabase";
import notify from "../utils/notifier";
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
  AlertCircle,
  CheckCircle,
  XCircle,
  FileDigit,
  Hash,
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

  // Ref para el input de búsqueda
  const searchInputRef = useRef(null);

  // Permisos por rol
  const puedeEditarRomaneo =
    roleName === "almacenista" || roleName === "administrador";

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
  }, [
    currentPage,
    debouncedSearchTerm,
    selectedProveedor,
    sortField,
    sortDirection,
  ]);

  async function cargarDatos() {
    try {
      setLoading(true);
      setError(null);

      // Construir consulta base
      let query = supabase.from("facturas").select(
        `
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
        `,
        { count: "exact" },
      );

      // Aplicar filtros
      if (debouncedSearchTerm) {
        query = query.ilike("numero_factura", `%${debouncedSearchTerm}%`);
      }

      if (selectedProveedor !== "todos") {
        query = query.eq(
          "solicitudes.proveedor_id",
          parseInt(selectedProveedor),
        );
      }

      // Aplicar ordenamiento
      query = query.order(sortField, {
        ascending: sortDirection === "asc",
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
        data?.forEach((f) => {
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
      notify.error("Error al cargar facturas");
    } finally {
      setLoading(false);
    }
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
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
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
      notify.warning("El número de romaneo no puede estar vacío");
      return;
    }

    try {
      setLoadingRomaneo(true);
      const { error } = await supabase
        .from("facturas")
        .update({ numero_romaneo: valorRomaneo.trim() })
        .eq("id", facturaId);

      if (error) throw error;

      setFacturas((prev) =>
        prev.map((f) =>
          f.id === facturaId
            ? { ...f, numero_romaneo: valorRomaneo.trim() }
            : f,
        ),
      );

      notify.success("Número de romaneo guardado exitosamente");
      setEditandoRomaneo(null);
      setValorRomaneo("");
    } catch (err) {
      notify.error("Error al guardar el número de romaneo");
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
    return facturas.reduce(
      (sum, factura) => sum + (factura.valor_total || 0),
      0,
    );
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (error && facturas.length === 0) {
    return (
      <div className="page-container">
        <div className="card p-12 text-center border-2 border-dashed border-error/20">
          <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-error" />
          </div>
          <h3 className="text-xl font-semibold text-primary mb-2">
            Error al cargar facturas
          </h3>
          <p className="text-muted mb-6">{error}</p>
          <button onClick={cargarDatos} className="btn btn-primary">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="section-header">
            <h1 className="section-title">Facturas</h1>
            <p className="section-subtitle">
              Consulta las facturas registradas en el sistema
            </p>
          </div>
          <div className="badge badge-primary flex items-center gap-1.5">
            <FileDigit className="w-4 h-4" />
            <span>Total: {totalCount}</span>
          </div>
        </div>
        {/* Estadísticas */}
        <div className="grid-cards mb-6">
          <div className="stats-card">
            <div className="stats-icon bg-primary/10 text-primary">
              <FileText className="w-6 h-6" />
            </div>
            <div className="stats-content">
              <div className="stats-value">{facturas.length}</div>
              <div className="stats-label">Esta página</div>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-icon bg-success/10 text-success">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="stats-content">
              <div className="stats-value">
                {new Intl.NumberFormat("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                }).format(calcularTotalPagina())}
              </div>
              <div className="stats-label">Total página</div>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-icon bg-primary/10 text-primary">
              <Building className="w-6 h-6" />
            </div>
            <div className="stats-content">
              <div className="stats-value">{proveedores.length}</div>
              <div className="stats-label">Proveedores</div>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-icon bg-primary/10 text-primary">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="stats-content">
              <div className="stats-value">
                {currentPage} / {totalPages || 1}
              </div>
              <div className="stats-label">Página actual</div>
            </div>
          </div>
        </div>
        {/* Filtros */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted"
                size={20}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por N° de factura..."
                className="form-input pl-10 pr-10 !py-2.5"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setDebouncedSearchTerm("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-secondary"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {debouncedSearchTerm && searchTerm && (
                <div className="absolute -bottom-6 left-0 text-xs text-muted">
                  Buscando: "{debouncedSearchTerm}"
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted">
                <Filter size={20} />
              </div>
              <select
                className="form-select pl-10 !py-2.5 appearance-none"
                value={selectedProveedor}
                onChange={(e) => {
                  setSelectedProveedor(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  backgroundColor: "var(--color-bg-surface)",
                  color: "var(--color-text-primary)",
                  borderColor: "var(--color-border)",
                }}
              >
                <option
                  value="todos"
                  style={{
                    backgroundColor: "var(--color-bg-surface)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  Todos los proveedores
                </option>
                {proveedores.map((prov) => (
                  <option
                    key={prov.id}
                    value={prov.id}
                    style={{
                      backgroundColor: "var(--color-bg-surface)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {prov.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-center md:justify-end">
              <button
                onClick={cargarDatos}
                className="btn btn-outline flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
            </div>
          </div>
        </div>
        {/* Tabla de Facturas */}
        <div className="card overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("solicitudes.proveedores.nombre")}
                  >
                    <div className="flex items-center gap-1">
                      <Building className="w-4 h-4" />
                      Proveedor
                      {getSortIcon("solicitudes.proveedores.nombre")}
                    </div>
                  </th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("numero_factura")}
                  >
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      N° Factura
                      {getSortIcon("numero_factura")}
                    </div>
                  </th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("fecha_factura")}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Fecha
                      {getSortIcon("fecha_factura")}
                    </div>
                  </th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("valor_total")}
                  >
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      Valor Total
                      {getSortIcon("valor_total")}
                    </div>
                  </th>
                  <th className="table-header-cell">N° Romaneo</th>
                  <th className="table-header-cell">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="spinner spinner-lg mx-auto mb-3"></div>
                      <p className="text-muted">Cargando facturas...</p>
                    </td>
                  </tr>
                ) : facturas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-muted">
                        <FileText
                          size={48}
                          className="mx-auto mb-4 text-border"
                        />
                        <p className="text-lg font-medium mb-2 text-primary">
                          No se encontraron facturas
                        </p>
                        <p className="text-muted">
                          {debouncedSearchTerm || selectedProveedor !== "todos"
                            ? "Prueba con otros filtros"
                            : "No hay facturas registradas"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  facturas.map((factura) => (
                    <tr key={factura.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-base flex items-center justify-center">
                            <Building className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-primary">
                              {factura.solicitudes?.proveedores?.nombre ||
                                "N/A"}
                            </div>
                            <div className="text-xs text-muted">
                              NIT:{" "}
                              {factura.solicitudes?.proveedores?.nit || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="font-medium text-primary">
                          {factura.numero_factura}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted" />
                          <span className="text-secondary">
                            {formatFecha(factura.fecha_factura)}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => verProductos(factura)}
                          className="text-left hover:underline text-primary hover:text-primary-hover font-semibold"
                        >
                          {formatValor(factura.valor_total)}
                        </button>
                        <div className="text-xs text-muted">
                          {factura.factura_items?.length || 0} productos
                        </div>
                      </td>
                      <td className="table-cell">
                        {puedeEditarRomaneo ? (
                          editandoRomaneo === factura.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={valorRomaneo}
                                onChange={(e) =>
                                  setValorRomaneo(e.target.value)
                                }
                                className="form-input w-32 text-sm !py-1.5 !px-2"
                                placeholder="N° Romaneo"
                                disabled={loadingRomaneo}
                              />
                              <button
                                onClick={() => guardarRomaneo(factura.id)}
                                disabled={loadingRomaneo}
                                className="btn btn-icon !p-1 bg-success hover:bg-success/90"
                              >
                                <Save className="w-4 h-4 text-white" />
                              </button>
                              <button
                                onClick={cancelarEdicionRomaneo}
                                disabled={loadingRomaneo}
                                className="btn btn-icon !p-1 bg-error hover:bg-error/90"
                              >
                                <X className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => iniciarEdicionRomaneo(factura)}
                              className="flex items-center gap-1 text-sm text-secondary hover:text-primary group"
                            >
                              {factura.numero_romaneo ? (
                                <>
                                  <span className="font-mono">
                                    {factura.numero_romaneo}
                                  </span>
                                  <Edit className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </>
                              ) : (
                                <span className="text-muted italic flex items-center gap-1">
                                  <Edit className="w-3 h-3" />
                                  Agregar
                                </span>
                              )}
                            </button>
                          )
                        ) : (
                          <span className="text-sm text-secondary font-mono">
                            {factura.numero_romaneo || (
                              <span className="text-muted">—</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => verProductos(factura)}
                            className="btn btn-icon btn-outline"
                            title="Ver productos"
                          >
                            <Eye className="w-4 h-4 text-secondary" />
                          </button>
                          {factura.pdf_url && (
                            <a
                              href={factura.pdf_url}
                              download
                              className="btn btn-icon btn-outline"
                              title="Descargar PDF"
                            >
                              <Download className="w-4 h-4 text-secondary" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-base">
            <div className="text-sm text-muted">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount}{" "}
              facturas
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`btn btn-icon ${currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
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
                className={`btn btn-icon ${currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Ir a:</span>
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
        {/* Modal de Productos */}
        {modalAbierto && facturaSeleccionada && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-card shadow-card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="card-header">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-primary">
                      Detalles de Factura
                    </h2>
                    <p className="text-sm text-muted">
                      {facturaSeleccionada.solicitudes?.proveedores?.nombre} -
                      Factura #{facturaSeleccionada.numero_factura}
                    </p>
                  </div>
                  <button
                    onClick={() => setModalAbierto(false)}
                    className="text-muted hover:text-primary"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Información general */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="card p-4">
                    <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Información del Proveedor
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted">Nombre</p>
                        <p className="font-medium text-primary">
                          {facturaSeleccionada.solicitudes?.proveedores?.nombre}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">NIT</p>
                        <p className="font-mono text-secondary">
                          {facturaSeleccionada.solicitudes?.proveedores?.nit}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="card p-4">
                    <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Información de la Factura
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted">Número de Factura</p>
                        <p className="font-medium text-primary">
                          {facturaSeleccionada.numero_factura}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">Número de Romaneo</p>
                        <p className="font-medium text-primary">
                          {facturaSeleccionada.numero_romaneo || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">Valor Total</p>
                        <p className="font-bold text-lg text-success">
                          {formatValor(facturaSeleccionada.valor_total)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Productos */}
                <div className="mb-6">
                  <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Productos ({productosModal.length})
                  </h3>

                  {productosModal.length === 0 ? (
                    <div className="card p-8 text-center">
                      <Package className="w-12 h-12 text-muted mx-auto mb-4" />
                      <p className="text-muted">
                        No hay productos registrados para esta factura
                      </p>
                    </div>
                  ) : (
                    <div className="card overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="table">
                          <thead className="table-header">
                            <tr>
                              <th className="table-header-cell">Producto</th>
                              <th className="table-header-cell">Cantidad</th>
                              <th className="table-header-cell">
                                Precio Unitario
                              </th>
                              <th className="table-header-cell">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productosModal.map((item, index) => (
                              <tr key={index} className="table-row">
                                <td className="table-cell">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-base flex items-center justify-center">
                                      <Package className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                      <div className="font-medium text-primary">
                                        {item.catalogo_productos?.nombre ||
                                          "Producto sin nombre"}
                                      </div>
                                      {item.catalogo_productos
                                        ?.codigo_arbol && (
                                        <div className="text-xs text-muted font-mono">
                                          {item.catalogo_productos.codigo_arbol}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="table-cell">
                                  <div className="text-center">
                                    <span className="font-medium text-primary">
                                      {item.cantidad}
                                    </span>
                                  </div>
                                </td>
                                <td className="table-cell">
                                  <div className="text-success font-medium">
                                    {formatValor(item.precio_unitario)}
                                  </div>
                                </td>
                                <td className="table-cell">
                                  <div className="text-success font-bold">
                                    {formatValor(item.subtotal)}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="table-header">
                            <tr>
                              <td
                                colSpan="3"
                                className="table-cell text-right font-medium"
                              >
                                Total:
                              </td>
                              <td className="table-cell">
                                <div className="text-success font-bold text-lg">
                                  {formatValor(
                                    productosModal.reduce(
                                      (sum, item) => sum + (item.subtotal || 0),
                                      0,
                                    ),
                                  )}
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
              <div className="card-footer">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div className="flex items-center gap-4">
                    {facturaSeleccionada.pdf_url && (
                      <>
                        <a
                          href={facturaSeleccionada.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Ver PDF
                        </a>
                        <a
                          href={facturaSeleccionada.pdf_url}
                          download
                          className="btn btn-primary flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Descargar PDF
                        </a>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setModalAbierto(false)}
                    className="btn btn-outline"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
