// src/screens/planta/proveedores.jsx
import React, { useEffect, useState } from "react";
import { supabase } from '@/shared/api';
import { useRouter } from "@/router";
import {
  Search,
  Eye,
  Building,
  Mail,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Hash,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import notify from "@/shared/lib/notifier";

export default function ProveedoresScreen() {
  const { navigate } = useRouter();
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("nombre");
  const [sortDirection, setSortDirection] = useState("asc");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    loadProveedores();
  }, [currentPage, debouncedSearchTerm, sortField, sortDirection]);

  const loadProveedores = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Primero obtener el total con los filtros aplicados
      let countQuery = supabase
        .from("proveedores")
        .select("*", { count: "exact", head: true });

      if (debouncedSearchTerm) {
        countQuery = countQuery.or(
          `nombre.ilike.%${debouncedSearchTerm}%,nit.ilike.%${debouncedSearchTerm}%`
        );
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      // 2. Ahora obtener los datos con paginación
      let dataQuery = supabase.from("proveedores").select("*");

      // Aplicar filtro de búsqueda (incluyendo NIT en la búsqueda)
      if (debouncedSearchTerm) {
        dataQuery = dataQuery.or(
          `nombre.ilike.%${debouncedSearchTerm}%,nit.ilike.%${debouncedSearchTerm}%`
        );
      }

      // Aplicar ordenamiento
      dataQuery = dataQuery.order(sortField, {
        ascending: sortDirection === "asc",
      });

      // Aplicar paginación
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      dataQuery = dataQuery.range(from, to);

      const { data, error: supabaseError } = await dataQuery;

      if (supabaseError) {
        console.error("Error cargando proveedores:", supabaseError);
        throw supabaseError;
      }
      setProveedores(data || []);
    } catch (err) {
      console.error("Error cargando proveedores:", err);
      setError("No se pudieron cargar los proveedores.");
      notify.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  };

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

  // Calcular páginas
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Botón para ver productos
  const handleViewProducts = () => {
    navigate("productos");
  };

  // Navegación de páginas
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (error) {
    return (
      <div className="page-container">
        <div className="card p-12 text-center border-2 border-dashed border-error/20">
          <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-error" />
          </div>
          <h3 className="text-xl font-semibold text-primary mb-2">
            Error al cargar proveedores
          </h3>
          <p className="text-muted mb-6">{error}</p>
          <button onClick={loadProveedores} className="btn btn-primary">
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6 mb-6">
          <div className="section-header">
            <h1 className="section-title">Proveedores</h1>
            <p className="section-subtitle">
              {totalCount} proveedores registrados • Página {currentPage} de{" "}
              {totalPages}
            </p>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar proveedor por nombre, NIT o ID..."
                className="form-input pl-10 !py-2.5"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex items-center justify-center md:justify-end gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-primary">
                  {proveedores.length}
                </div>
                <div className="text-sm text-muted">En esta página</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">
                  {totalCount}
                </div>
                <div className="text-sm text-muted">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de proveedores - CON COLUMNA NIT */}
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
                      ID {getSortIcon("id")}
                    </div>
                  </th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("nombre")}
                  >
                    <div className="flex items-center gap-1">
                      Nombre del Proveedor {getSortIcon("nombre")}
                    </div>
                  </th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("nit")}
                  >
                    <div className="flex items-center gap-1">
                      NIT {getSortIcon("nit")}
                    </div>
                  </th>
                  <th className="table-header-cell">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="spinner spinner-lg mx-auto mb-3"></div>
                      <p className="text-muted">Cargando proveedores...</p>
                    </td>
                  </tr>
                ) : proveedores.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="text-muted">
                        <Building
                          size={48}
                          className="mx-auto mb-4 text-border"
                        />
                        <p className="text-lg font-medium mb-2 text-primary">
                          No se encontraron proveedores
                        </p>
                        <p className="text-muted">
                          {searchTerm
                            ? "Prueba con otros términos de búsqueda"
                            : "No hay proveedores registrados"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  proveedores.map((proveedor) => (
                    <tr key={proveedor.id} className="table-row">
                      <td className="table-cell">
                        <code className="text-sm bg-app px-2 py-1 rounded-base font-mono text-muted">
                          {proveedor.id}
                        </code>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-base flex items-center justify-center">
                            <Building size={20} className="text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-primary">
                              {proveedor.nombre}
                            </div>
                            {proveedor.rut && (
                              <div className="text-sm text-muted mt-1 font-mono">
                                {proveedor.rut}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="space-y-2">
                          {proveedor.nit ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Hash
                                size={14}
                                className="text-muted flex-shrink-0"
                              />
                              <span className="text-muted font-mono bg-app px-2 py-1 rounded-base">
                                {proveedor.nit}
                              </span>
                            </div>
                          ) : (
                            <div className="text-sm text-muted italic">
                              Sin NIT registrado
                            </div>
                          )}
                          {proveedor.email && (
                            <div className="flex items-center gap-2 text-sm mt-2">
                              <Mail
                                size={14}
                                className="text-muted flex-shrink-0"
                              />
                              <span className="text-muted truncate max-w-[200px]">
                                {proveedor.email}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <button
                          className="btn btn-icon btn-outline"
                          title="Ver detalles"
                          onClick={() =>
                            navigate("productos", { proveedorId: proveedor.id })
                          }
                        >
                          <Eye size={18} className="text-secondary" />
                        </button>
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
              proveedores
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

        {/* Botón de recarga */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={loadProveedores}
            disabled={loading}
            className="btn btn-outline flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="spinner spinner-sm"></div>
                <span>Cargando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Actualizar lista</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}