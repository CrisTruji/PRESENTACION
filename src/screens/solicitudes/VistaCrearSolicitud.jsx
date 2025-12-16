// src/screens/solicitudes/VistaCrearSolicitud.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth";

export default function VistaCrearSolicitud({ onVolver, onSolicitudCreada }) {
  const { session } = useAuth();
  const [paso, setPaso] = useState(1);
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState([]);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [nombre, setNombre] = useState("");

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    const { getAllProviders } = await import("../../lib/supabase");
    const data = await getAllProviders();
    setProveedores(data || []);
  };

  const cargarProductos = async (proveedorId) => {
    const { getProductsByProvider } = await import("../../lib/supabase");
    const data = await getProductsByProvider(proveedorId);
    setProductos(data || []);
  };

  const proveedoresFiltrados = proveedores.filter(
    (prov) =>
      prov.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (prov.nit && prov.nit.includes(busqueda))
  );

  const seleccionarProveedor = (proveedor) => {
    setProveedorSeleccionado(proveedor);
    cargarProductos(proveedor.id);
    setPaso(2);
  };

  const manejarCantidad = (productoId, cantidad) => {
    if (!cantidad || cantidad === "0") {
      setItems(items.filter((item) => item.producto_id !== productoId));
      return;
    }

    const producto = productos.find((p) => p.id === productoId);
    const existe = items.find((item) => item.producto_id === productoId);

    if (existe) {
      setItems(
        items.map((item) =>
          item.producto_id === productoId
            ? { ...item, cantidad: parseInt(cantidad, 10) }
            : item
        )
      );
    } else if (producto) {
      setItems([
        ...items,
        {
          producto_id: producto.id,
          producto_nombre: producto.nombre,
          producto_codigo: producto.codigo_arbol,
          cantidad: parseInt(cantidad, 10),
          unidad: "unidades",
        },
      ]);
    }
  };

  const enviarSolicitud = async () => {
    if (items.length === 0) {
      alert("Agrega al menos un producto");
      return;
    }

    try {
      setCargando(true);
      const { createSolicitud, createSolicitudItems } = await import(
        "../../lib/supabase"
      );

      const solicitud = await createSolicitud({
        proveedor_id: proveedorSeleccionado.id,
        created_by: session.user.id,
        estado: "pendiente",
      });

      const itemsData = items.map((item) => ({
        solicitud_id: solicitud.id,
        catalogo_producto_id: item.producto_id,
        cantidad_solicitada: item.cantidad,
        unidad: item.unidad,
      }));

      await createSolicitudItems(itemsData);
      alert("✅ Solicitud creada exitosamente");
      onSolicitudCreada();
    } catch (error) {
      alert("❌ Error: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  // Handler del P front (para compatibilidad)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      await enviarSolicitud();
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto px-4 py-8 ${styles.container}`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between mb-8 ${styles.header}`}
      >
        <div>
          <button
            onClick={onVolver}
            className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium ${styles.botonSecundario}`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Volver a solicitudes
          </button>
          <h1
            className={`text-3xl font-bold text-gray-900 mt-2 ${styles.titulo}`}
          >
            {paso === 1 ? "Seleccionar Proveedor" : "Nueva Solicitud"}
          </h1>
        </div>
      </div>

      <div className={styles.progreso}>
        <div className={styles.paso}>
          <div
            className={styles.circuloPaso}
            style={{
              backgroundColor: paso >= 1 ? "#FF6B00" : "#E5E7EB",
              color: paso >= 1 ? "#fff" : "#9CA3AF",
            }}
          >
            1
          </div>
          <span className={paso >= 1 ? styles.pasoActivo : styles.pasoInactivo}>
            Proveedor
          </span>
        </div>

        <div className={styles.linea} />

        <div className={styles.paso}>
          <div
            className={styles.circuloPaso}
            style={{
              backgroundColor: paso >= 2 ? "#FF6B00" : "#E5E7EB",
              color: paso >= 2 ? "#fff" : "#9CA3AF",
            }}
          >
            2
          </div>
          <span className={paso >= 2 ? styles.pasoActivo : styles.pasoInactivo}>
            Productos
          </span>
        </div>
      </div>

      {/* Contenido por paso */}
      {paso === 1 ? (
        <div>
          {/* Búsqueda de proveedores */}
          <div className={`${styles.busquedaContainer} form-group mb-6`}>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Buscar proveedor por nombre o NIT..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className={`form-input pl-10 ${styles.busquedaInput}`}
              />
            </div>
          </div>

          {/* Lista de proveedores */}
          <div className={`${styles.listaProveedores} space-y-4`}>
            {proveedoresFiltrados.map((proveedor) => (
              <div
                key={proveedor.id}
                className={`card hover-lift cursor-pointer p-4 ${styles.tarjetaProveedor}`}
                onClick={() => seleccionarProveedor(proveedor)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3
                      className={`text-lg font-semibold text-gray-900 ${styles.nombreProveedorLista}`}
                    >
                      {proveedor.nombre}
                    </h3>
                    <p className={`text-sm text-gray-600 ${styles.nit}`}>
                      NIT: {proveedor.nit || "No registrado"}
                    </p>
                  </div>
                  <div className={`text-primary-600 text-xl ${styles.flecha}`}>
                    →
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del proveedor seleccionado */}
          <div className="card p-6 mb-6">
            <div
              className={`${styles.infoProveedor} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}
            >
              <div>
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className={`btn-outline flex items-center gap-2 ${styles.botonSecundario}`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Cambiar proveedor
                </button>
              </div>
              <div className={`${styles.datosProveedor}`}>
                <h3 className="text-xl font-bold text-gray-900">
                  {proveedorSeleccionado?.nombre}
                </h3>
                <p className="text-gray-600">
                  NIT: {proveedorSeleccionado?.nit || "No registrado"}
                </p>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="nombre">
              Nombre de la solicitud
            </label>
            <input
              id="nombre"
              type="text"
              className="form-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Materiales para proyecto X"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Productos solicitados</label>

            {productos.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 mb-4">
                  No hay productos disponibles para este proveedor
                </p>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setPaso(1)}
                >
                  Seleccionar otro proveedor
                </button>
              </div>
            ) : (
              <div className={`${styles.tablaContainer} card overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table
                    className={`min-w-full divide-y divide-gray-200 ${styles.tabla}`}
                  >
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ${styles.th}`}
                        >
                          Producto
                        </th>
                        <th
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ${styles.th}`}
                        >
                          Código
                        </th>
                        <th
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ${styles.th}`}
                        >
                          Categoría
                        </th>
                        <th
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ${styles.th}`}
                        >
                          Cantidad
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {productos.map((producto) => (
                        <tr
                          key={producto.id}
                          className={`hover:bg-gray-50 ${styles.tr}`}
                        >
                          <td className={`px-6 py-4 ${styles.td}`}>
                            <strong className="font-medium text-gray-900">
                              {producto.nombre}
                            </strong>
                          </td>
                          <td className={`px-6 py-4 ${styles.td}`}>
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                              {producto.codigo_arbol}
                            </code>
                          </td>
                          <td className={`px-6 py-4 ${styles.td}`}>
                            {producto.categoria ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {producto.categoria}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className={`px-6 py-4 ${styles.td}`}>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={
                                items.find((i) => i.producto_id === producto.id)
                                  ?.cantidad || ""
                              }
                              onChange={(e) =>
                                manejarCantidad(producto.id, e.target.value)
                              }
                              className={`form-input w-32 ${styles.inputCantidad}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {items.length > 0 && (
              <div className={`mt-8 ${styles.resumen}`}>
                <div className={`card p-6 ${styles.tarjetaResumen}`}>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Resumen de Pedido
                  </h3>
                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 ${styles.datosResumen}`}
                  >
                    <div
                      className={`flex justify-between items-center p-3 bg-gray-50 rounded-lg ${styles.datoResumen}`}
                    >
                      <span className="text-gray-700">
                        Productos seleccionados:
                      </span>
                      <strong className="text-lg text-primary-600">
                        {items.length}
                      </strong>
                    </div>
                    <div
                      className={`flex justify-between items-center p-3 bg-gray-50 rounded-lg ${styles.datoResumen}`}
                    >
                      <span className="text-gray-700">Total unidades:</span>
                      <strong className="text-lg text-primary-600">
                        {items.reduce((sum, item) => sum + item.cantidad, 0)}
                      </strong>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-4 pt-6 border-t">
                    <button
                      type="button"
                      onClick={onVolver}
                      className="btn-outline flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={cargando || !nombre || items.length === 0}
                      className="btn-primary flex-1"
                    >
                      {cargando ? (
                        <>
                          <span className="spinner-sm mr-2"></span>
                          Creando...
                        </>
                      ) : (
                        "Crear Solicitud"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
