// src/screens/planta/productos.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Eye,
  Package,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortField, setSortField] = useState("nombre");
  const [sortDirection, setSortDirection] = useState("asc");

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Cargar productos
  useEffect(() => {
    loadProductos();
  }, [currentPage, searchTerm, selectedCategory, sortField, sortDirection]);

  const loadProductos = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Primero obtener el total con los filtros aplicados
      let countQuery = supabase
        .from("catalogo_productos")
        .select("*", { count: "exact", head: true });

      if (searchTerm) {
        countQuery = countQuery.or(`nombre.ilike.%${searchTerm}%`);
      }

      if (selectedCategory) {
        countQuery = countQuery.eq("categoria", selectedCategory);
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      // 2. Ahora obtener los datos con paginación
      let dataQuery = supabase.from("catalogo_productos").select("*");

      // Aplicar los mismos filtros
      if (searchTerm) {
        dataQuery = dataQuery.or(`nombre.ilike.%${searchTerm}%`);
      }

      if (selectedCategory) {
        dataQuery = dataQuery.eq("categoria", selectedCategory);
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

      if (supabaseError) throw supabaseError;
      setProductos(data || []);
    } catch (err) {
      console.error("Error cargando productos:", err);
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  };

  // Obtener categorías únicas
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    const fetchCategorias = async () => {
      const { data } = await supabase
        .from("catalogo_productos")
        .select("categoria");

      const uniqueCats = [
        ...new Set(data?.map((p) => p.categoria).filter(Boolean)),
      ];
      setCategorias(uniqueCats.sort());
    };

    fetchCategorias();
  }, []);

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

  // Navegación de páginas
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-12 text-center border-2 border-dashed border-red-200">
          <div className="text-5xl mb-6 text-red-500">❌</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Error al cargar productos
          </h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={loadProductos} className="btn-primary">
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Catálogo de Productos
          </h1>
          <p className="text-gray-600">
            {totalCount} productos registrados • Página {currentPage} de{" "}
            {totalPages}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              className="form-input pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="relative">
            <Filter
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <select
              className="form-select pl-10"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center md:justify-end gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-primary-600">
                {productos.length}
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

      {/* Tabla - SIN columna de Descripción */}
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
                    Nombre del Producto {getSortIcon("nombre")}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("categoria")}
                >
                  <div className="flex items-center gap-1">
                    Categoría {getSortIcon("categoria")}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productos.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Package
                        size={48}
                        className="mx-auto mb-4 text-gray-300"
                      />
                      <p className="text-lg font-medium mb-2">
                        No se encontraron productos
                      </p>
                      <p className="text-gray-400">
                        {searchTerm || selectedCategory
                          ? "Prueba con otros filtros"
                          : "No hay productos registrados"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                productos.map((producto) => (
                  <tr key={producto.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                        {producto.id}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Package size={20} className="text-orange-600" />
                        </div>
                        <div className="font-medium text-gray-900">
                          {producto.nombre}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {producto.categoria ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {producto.categoria}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">
                          Sin categoría
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Ver detalles"
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
            productos
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
