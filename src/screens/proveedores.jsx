// src/screens/planta/proveedores.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "../context/roleroutercontext";
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
} from "lucide-react";

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
      <ChevronUp size={16} />
    ) : (
      <ChevronDown size={16} />
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-12 text-center border-2 border-dashed border-red-200">
          <div className="text-5xl mb-6 text-red-500">❌</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Error al cargar proveedores
          </h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={loadProveedores} className="btn-primary">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Proveedores</h1>
          <p className="text-gray-600">
            {totalCount} proveedores registrados • Página {currentPage} de{" "}
            {totalPages}
          </p>
        </div>

        <button
          onClick={handleViewProducts}
          className="btn-primary flex items-center gap-2"
        >
          <ChevronRight size={18} />
          Ver productos
        </button>
      </div>

      {/* Búsqueda */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar proveedor por nombre, NIT o ID..."
              className="form-input pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex items-center justify-center md:justify-end gap-6">
            <div className="text-center">
              <div className="text-xl font-bold text-primary-600">
                {proveedores.length}
              </div>
              <div className="text-sm text-gray-500">En esta página</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-700">
                {totalCount}
              </div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de proveedores - CON COLUMNA NIT */}
      <div className="card overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("id")}
                >
                  <div className="flex items-center gap-1">
                    ID {getSortIcon("id")}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("nombre")}
                >
                  <div className="flex items-center gap-1">
                    Nombre del Proveedor {getSortIcon("nombre")}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("nit")}
                >
                  <div className="flex items-center gap-1">
                    NIT {getSortIcon("nit")}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="spinner mx-auto mb-3"></div>
                    <p className="text-gray-500">Cargando proveedores...</p>
                  </td>
                </tr>
              ) : proveedores.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Building
                        size={48}
                        className="mx-auto mb-4 text-gray-300"
                      />
                      <p className="text-lg font-medium mb-2">
                        No se encontraron proveedores
                      </p>
                      <p className="text-gray-400">
                        {searchTerm
                          ? "Prueba con otros términos de búsqueda"
                          : "No hay proveedores registrados"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                proveedores.map((proveedor) => (
                  <tr key={proveedor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                        {proveedor.id}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {proveedor.nombre}
                          </div>
                          {proveedor.rut && (
                            <div className="text-sm text-gray-500 mt-1 font-mono">
                              {proveedor.rut}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {proveedor.nit ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Hash
                              size={14}
                              className="text-gray-400 flex-shrink-0"
                            />
                            <span className="text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
                              {proveedor.nit}
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 italic">
                            Sin NIT registrado
                          </div>
                        )}
                        {proveedor.email && (
                          <div className="flex items-center gap-2 text-sm mt-2">
                            <Mail
                              size={14}
                              className="text-gray-400 flex-shrink-0"
                            />
                            <span className="text-gray-600 truncate max-w-[200px]">
                              {proveedor.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Ver detalles"
                        onClick={() =>
                          navigate("productos", { proveedorId: proveedor.id })
                        }
                      >
                        <Eye size={18} className="text-gray-600" />
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} -{" "}
            {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount}{" "}
            proveedores
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg ${
                currentPage === 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100"
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
                  className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                    currentPage === pageNum
                      ? "bg-orange-500 text-white"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => goToPage(currentPage + 1)}
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
                  if (!isNaN(page)) goToPage(page);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
