// src/screens/solicitudes/VistaCrearSolicitud.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth";
import { supabase } from "@/shared/api";
import {
  ArrowLeft,
  Search,
  Check,
  Package,
  Hash,
  Tag,
  FileText,
  Building,
  ShoppingCart,
  ChevronRight
} from "lucide-react";

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
    const { data, error } = await supabase
      .from("proveedores")
      .select("*")
      .order("nombre", { ascending: true });
    if (error) console.error("Error cargando proveedores:", error);
    setProveedores(data || []);
  };

  const cargarProductos = async (proveedorId) => {
    const { data, error } = await supabase
      .from("catalogo_productos")
      .select("*")
      .eq("proveedor_id", proveedorId);
    if (error) console.error("Error cargando productos:", error);
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

      // Crear solicitud
      const { data: solicitud, error: errorSolicitud } = await supabase
        .from("solicitudes")
        .insert({
          proveedor_id: proveedorSeleccionado.id,
          created_by: session.user.id,
          estado: "pendiente",
        })
        .select()
        .single();

      if (errorSolicitud) throw errorSolicitud;

      // Crear items de solicitud
      const itemsData = items.map((item) => ({
        solicitud_id: solicitud.id,
        catalogo_producto_id: item.producto_id,
        cantidad_solicitada: item.cantidad,
        unidad: item.unidad,
      }));

      const { error: errorItems } = await supabase
        .from("solicitud_items")
        .insert(itemsData);

      if (errorItems) throw errorItems;

      alert("Solicitud creada exitosamente");
      onSolicitudCreada();
    } catch (error) {
      console.error("Error creando solicitud:", error);
      alert("Error: " + error.message);
    } finally {
      setCargando(false);
    }
  };

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
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={onVolver}
              className="btn btn-outline flex items-center gap-2 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a solicitudes
            </button>
            <h1 className="section-title">
              {paso === 1 ? "Seleccionar Proveedor" : "Nueva Solicitud"}
            </h1>
          </div>
        </div>

        {/* Progreso */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${paso >= 1 ? 'bg-primary text-white' : 'bg-app border border-base text-muted'}`}>
                1
              </div>
              <span className={`mt-2 text-sm ${paso >= 1 ? 'text-primary font-medium' : 'text-muted'}`}>
                Proveedor
              </span>
            </div>
            
            <div className={`w-16 h-0.5 mx-2 ${paso >= 2 ? 'bg-primary' : 'bg-base'}`} />
            
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${paso >= 2 ? 'bg-primary text-white' : 'bg-app border border-base text-muted'}`}>
                2
              </div>
              <span className={`mt-2 text-sm ${paso >= 2 ? 'text-primary font-medium' : 'text-muted'}`}>
                Productos
              </span>
            </div>
          </div>
        </div>

        {/* Contenido por paso */}
        {paso === 1 ? (
          <div>
            {/* Búsqueda de proveedores */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar proveedor por nombre o NIT..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="form-input pl-10 !py-2.5"
                />
              </div>
            </div>

            {/* Lista de proveedores */}
            <div className="space-y-3">
              {proveedoresFiltrados.map((proveedor) => (
                <div
                  key={proveedor.id}
                  className="card card-hover p-4 cursor-pointer"
                  onClick={() => seleccionarProveedor(proveedor)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-base flex items-center justify-center">
                        <Building className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-primary">
                          {proveedor.nombre}
                        </h3>
                        <p className="text-sm text-muted">
                          NIT: {proveedor.nit || "No registrado"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información del proveedor seleccionado */}
            <div className="card p-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <button
                    type="button"
                    onClick={() => setPaso(1)}
                    className="btn btn-outline flex items-center gap-2 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Cambiar proveedor
                  </button>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-semibold text-primary">
                    {proveedorSeleccionado?.nombre}
                  </h3>
                  <p className="text-sm text-muted">
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
                <div className="card p-8 text-center border-2 border-dashed border-base">
                  <Package className="w-12 h-12 text-muted mx-auto mb-4" />
                  <p className="text-muted mb-4">
                    No hay productos disponibles para este proveedor
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setPaso(1)}
                  >
                    Seleccionar otro proveedor
                  </button>
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead className="table-header">
                        <tr>
                          <th className="table-header-cell">Producto</th>
                          <th className="table-header-cell">Código</th>
                          <th className="table-header-cell">Categoría</th>
                          <th className="table-header-cell">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productos.map((producto) => (
                          <tr key={producto.id} className="table-row">
                            <td className="table-cell">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-base flex items-center justify-center">
                                  <Package className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <div className="font-medium text-primary">
                                    {producto.nombre}
                                  </div>
                                  <div className="text-xs text-muted mt-0.5">
                                    {producto.descripcion || "Sin descripción"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="table-cell">
                              <code className="text-sm bg-app px-2 py-1 rounded-base font-mono text-muted">
                                {producto.codigo_arbol}
                              </code>
                            </td>
                            <td className="table-cell">
                              {producto.categoria ? (
                                <span className="badge badge-primary">
                                  {producto.categoria}
                                </span>
                              ) : (
                                <span className="text-muted text-sm">-</span>
                              )}
                            </td>
                            <td className="table-cell">
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
                                className="form-input w-24 !py-1.5 !px-3 text-center"
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
                <div className="mt-6">
                  <div className="card p-4">
                    <h3 className="text-lg font-semibold text-primary mb-4">
                      Resumen de Pedido
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="flex justify-between items-center p-3 bg-app rounded-base">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted" />
                          <span className="text-sm text-muted">Productos seleccionados:</span>
                        </div>
                        <strong className="text-base text-primary">
                          {items.length}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-app rounded-base">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-muted" />
                          <span className="text-sm text-muted">Total unidades:</span>
                        </div>
                        <strong className="text-base text-primary">
                          {items.reduce((sum, item) => sum + item.cantidad, 0)}
                        </strong>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-base">
                      <button
                        type="button"
                        onClick={onVolver}
                        className="btn btn-outline flex-1"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={cargando || !nombre || items.length === 0}
                        className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        {cargando ? (
                          <>
                            <div className="spinner spinner-sm"></div>
                            Creando...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Crear Solicitud
                          </>
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
    </div>
  );
}