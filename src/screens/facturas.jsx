// src/screens/facturas.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/auth";
import { supabase } from "../lib/supabase";

export default function Facturas() {
  const { roleName } = useAuth();
  
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroProveedor, setFiltroProveedor] = useState("todos");
  const [proveedores, setProveedores] = useState([]);
  
  // Modal de productos
  const [modalAbierto, setModalAbierto] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [productosModal, setProductosModal] = useState([]);

  // Edición de romaneo (solo para almacenista)
  const [editandoRomaneo, setEditandoRomaneo] = useState(null);
  const [valorRomaneo, setValorRomaneo] = useState("");

  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  // Permisos por rol
  const puedeEditarRomaneo = roleName === 'almacenista' || roleName === 'administrador';

  // Cargar datos
  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    try {
      const { data: facturasData, error } = await supabase
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
              nombre
            )
          )
        `)
        .order("fecha_factura", { ascending: false });

      if (error) throw error;

      setFacturas(facturasData || []);

      // Extraer proveedores únicos
      const provsUnicos = [];
      const idsVistos = new Set();
      facturasData?.forEach(f => {
        const prov = f.solicitudes?.proveedores;
        if (prov && !idsVistos.has(prov.id)) {
          idsVistos.add(prov.id);
          provsUnicos.push(prov);
        }
      });
      setProveedores(provsUnicos);

    } catch (error) {
      console.error("Error al cargar facturas:", error);
      showNotification('error', 'Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  }

  function showNotification(type, message) {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
  }

  // Filtrar facturas
  const facturasFiltradas = filtroProveedor === "todos"
    ? facturas
    : facturas.filter(f => f.solicitudes?.proveedores?.id === parseInt(filtroProveedor));

  // Abrir modal de productos
  function verProductos(factura) {
    setFacturaSeleccionada(factura);
    setProductosModal(factura.factura_items || []);
    setModalAbierto(true);
  }

  // Guardar número de romaneo
  async function guardarRomaneo(facturaId) {
    if (!valorRomaneo.trim()) {
      showNotification('warning', 'El número de romaneo no puede estar vacío');
      return;
    }

    try {
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

      showNotification('success', 'Número de romaneo guardado');
      setEditandoRomaneo(null);
      setValorRomaneo("");

    } catch (error) {
      showNotification('error', 'Error al guardar');
    }
  }

  function iniciarEdicionRomaneo(factura) {
    setEditandoRomaneo(factura.id);
    setValorRomaneo(factura.numero_romaneo || "");
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando facturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Notificación */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 
          notification.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'
        } text-white max-w-md`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          📄 Facturas
        </h1>
        <p className="text-gray-600">
          Consulta las facturas registradas en el sistema
        </p>
      </div>

      {/* Filtros y estadísticas */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por proveedor:
            </label>
            <select
              value={filtroProveedor}
              onChange={(e) => setFiltroProveedor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los proveedores</option>
              {proveedores.map(prov => (
                <option key={prov.id} value={prov.id}>
                  {prov.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Total facturas</p>
              <p className="text-2xl font-bold text-blue-900">{facturasFiltradas.length}</p>
            </div>

            <button
              onClick={cargarDatos}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de facturas */}
      {facturasFiltradas.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl">📄</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay facturas registradas
          </h3>
          <p className="text-gray-500">
            {filtroProveedor === "todos" 
              ? "Aún no se han registrado facturas en el sistema."
              : "Este proveedor no tiene facturas registradas."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Proveedor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nº Factura
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nº Romaneo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    PDF
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {facturasFiltradas.map(factura => (
                  <tr key={factura.id} className="hover:bg-gray-50 transition-colors">
                    {/* Proveedor */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 text-sm font-bold">
                            {factura.solicitudes?.proveedores?.nombre?.charAt(0)}
                          </span>
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

                    {/* Número de factura */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-gray-900">
                        {factura.numero_factura}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(factura.fecha_factura).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </div>
                    </td>

                    {/* Valor Total - CLICKEABLE */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => verProductos(factura)}
                        className="font-bold text-green-600 hover:text-green-700 hover:underline cursor-pointer text-left transition-colors"
                      >
                        ${factura.valor_total?.toLocaleString() || 0}
                      </button>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {factura.factura_items?.length || 0} productos
                      </div>
                    </td>

                    {/* Número de Romaneo - EDITABLE solo para almacenista */}
                    <td className="px-4 py-3">
                      {puedeEditarRomaneo ? (
                        editandoRomaneo === factura.id ? (
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={valorRomaneo}
                              onChange={(e) => setValorRomaneo(e.target.value)}
                              className="w-28 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                              placeholder="Nº Romaneo"
                              autoFocus
                            />
                            <button
                              onClick={() => guardarRomaneo(factura.id)}
                              className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setEditandoRomaneo(null);
                                setValorRomaneo("");
                              }}
                              className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => iniciarEdicionRomaneo(factura)}
                            className="text-sm text-gray-700 hover:text-blue-600 flex items-center gap-1 group"
                          >
                            {factura.numero_romaneo ? (
                              <>
                                <span className="font-mono">{factura.numero_romaneo}</span>
                                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </>
                            ) : (
                              <span className="text-gray-400 italic">Click para agregar</span>
                            )}
                          </button>
                        )
                      ) : (
                        <span className="text-sm text-gray-700 font-mono">
                          {factura.numero_romaneo || <span className="text-gray-400">—</span>}
                        </span>
                      )}
                    </td>

                    {/* PDF */}
                    <td className="px-4 py-3">
                      {factura.pdf_url ? (
                        <a
                          href={factura.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm hover:underline"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Ver PDF
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">Sin PDF</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de productos */}
      {modalAbierto && facturaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Detalle de Factura
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {facturaSeleccionada.solicitudes?.proveedores?.nombre} - 
                    Factura #{facturaSeleccionada.numero_factura}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(facturaSeleccionada.fecha_factura).toLocaleDateString('es-ES', {
                      dateStyle: 'long'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setModalAbierto(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Productos */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Productos:</h3>
                <div className="space-y-2">
                  {productosModal.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.catalogo_productos?.nombre || 'Producto sin nombre'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {item.cantidad} unidades × ${item.precio_unitario?.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          ${item.subtotal?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t-2 border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">Total:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${facturaSeleccionada.valor_total?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                {facturaSeleccionada.pdf_url && (
                  <a
                    href={facturaSeleccionada.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-center font-medium"
                  >
                    📄 Ver PDF
                  </a>
                )}
                <button
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}