import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth"; // si usas este hook para user
import { getProveedores } from "../../services/proveedores";
import { getProductosByProveedor } from "../../services/productos";
import { createSolicitud, agregarItemsSolicitud } from "../../services/solicitudes";

/**
 * Pantalla: Jefe de Planta -> Crear Solicitud
 * Integra: seleccionar proveedor -> listar productos -> agregar (sin carrito persistente) -> enviar solicitud
 *
 * Nota: aquí no usamos carrito persistente; agregas productos y al enviar todo se persiste.
 */

export default function CrearSolicitudPlanta() {
  const { user } = useAuth?.() || {}; // si no tienes hook, reemplaza user.id por el id que uses
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");
  const [productos, setProductos] = useState([]);
  const [itemsSeleccionados, setItemsSeleccionados] = useState([]); // items temporal: { catalogo_producto_id, nombre, categoria, cantidad_solicitada, unidad, observaciones }
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const provs = await getProveedores();
        setProveedores(provs);
      } catch (err) {
        console.error(err);
        setError("Error cargando proveedores");
      }
    }
    init();
  }, []);

  // Cuando se selecciona proveedor, traer productos de este proveedor
  const onProveedorChange = async (provId) => {
    setProveedorSeleccionado(provId);
    setProductos([]);
    setItemsSeleccionados([]); // resetear selección al cambiar proveedor
    if (!provId) return;

    try {
      const prods = await getProductosByProveedor(Number(provId));
      setProductos(prods);
    } catch (err) {
      console.error(err);
      setError("Error cargando productos");
    }
  };

  // Agregar producto a la lista temporal (sin carrito persistente, pero sí lista temporal)
  const agregarProducto = (producto, cantidad, unidad = "und", observaciones = "") => {
    if (!producto || !cantidad || Number(cantidad) <= 0) {
      setError("Ingrese una cantidad válida");
      return;
    }

    // evitar duplicados
    if (itemsSeleccionados.some((i) => Number(i.catalogo_producto_id) === Number(producto.id))) {
      setError("Producto ya agregado");
      return;
    }

    const nuevo = {
      catalogo_producto_id: Number(producto.id),
      nombre: producto.nombre,
      categoria: producto.categoria,
      cantidad_solicitada: Number(cantidad),
      unidad,
      observaciones
    };

    setItemsSeleccionados((prev) => [...prev, nuevo]);
    setError("");
  };

  const eliminarItem = (catalogo_producto_id) => {
    setItemsSeleccionados((prev) => prev.filter((p) => p.catalogo_producto_id !== catalogo_producto_id));
  };

  // Enviar solicitud (encabezado + items)
  const handleEnviarSolicitud = async () => {
    if (!proveedorSeleccionado) {
      setError("Seleccione un proveedor antes de enviar");
      return;
    }
    if (itemsSeleccionados.length === 0) {
      setError("Agregue al menos un producto");
      return;
    }

    setCargando(true);
    setError("");

    try {
      const solicitud = await crearSolicitud({
        proveedor_id: Number(proveedorSeleccionado),
        created_by: user?.id || null,
        observaciones: ""
      });

      await agregarItemsSolicitud(solicitud.id, itemsSeleccionados);

      // éxito: limpiar UI y mostrar mensaje
      setItemsSeleccionados([]);
      setProveedorSeleccionado("");
      setProductos([]);
      alert("Solicitud creada correctamente");
    } catch (err) {
      console.error(err);
      setError("Error creando la solicitud");
    } finally {
      setCargando(false);
    }
  };

  // Render
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Crear Solicitud - Jefe de Planta</h1>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      {/* Selector de proveedor */}
      <div className="mb-6">
        <label className="block mb-2 font-medium">Seleccione proveedor</label>
        <select
          className="border rounded p-2 w-full"
          value={proveedorSeleccionado}
          onChange={(e) => onProveedorChange(e.target.value)}
        >
          <option value="">-- Seleccione un proveedor --</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      {/* Productos del proveedor */}
      {proveedorSeleccionado && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Productos del proveedor</h2>

          {productos.length === 0 ? (
            <p className="text-sm text-gray-600">No se encontraron productos para este proveedor.</p>
          ) : (
            <div className="grid gap-3">
              {productos.map((prod) => (
                <ProductoFila key={prod.id} producto={prod} onAgregar={agregarProducto} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items seleccionados (temporal) */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Productos seleccionados</h2>

        {itemsSeleccionados.length === 0 ? (
          <p className="text-sm text-gray-600">No ha añadido productos.</p>
        ) : (
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">Producto</th>
                <th className="border px-2 py-1">Cantidad</th>
                <th className="border px-2 py-1">Unidad</th>
                <th className="border px-2 py-1">Observaciones</th>
                <th className="border px-2 py-1">Acción</th>
              </tr>
            </thead>
            <tbody>
              {itemsSeleccionados.map((it) => (
                <tr key={it.catalogo_producto_id}>
                  <td className="border px-2 py-1">{it.nombre}</td>
                  <td className="border px-2 py-1 text-center">{it.cantidad_solicitada}</td>
                  <td className="border px-2 py-1 text-center">{it.unidad}</td>
                  <td className="border px-2 py-1">{it.observaciones}</td>
                  <td className="border px-2 py-1 text-center">
                    <button className="text-red-600" onClick={() => eliminarItem(it.catalogo_producto_id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Botón enviar */}
      <div className="flex gap-3">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleEnviarSolicitud}
          disabled={cargando}
        >
          {cargando ? "Enviando..." : "Enviar solicitud"}
        </button>

        <button
          className="bg-gray-200 px-4 py-2 rounded"
          onClick={() => {
            setItemsSeleccionados([]);
            setProveedorSeleccionado("");
            setProductos([]);
            setError("");
          }}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}

/**
 * Componente de fila de producto (interno)
 * Recibe producto {id, nombre, categoria} y onAgregar callback(producto, cantidad, unidad, observaciones)
 * Implementa inputs para cantidad, unidad y notas por fila para no requerir carrito separado.
 */
function ProductoFila({ producto, onAgregar }) {
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("und");
  const [observaciones, setObservaciones] = useState("");

  return (
    <div className="border p-3 rounded flex items-center justify-between gap-4">
      <div>
        <div className="font-medium">{producto.nombre}</div>
        <div className="text-sm text-gray-600">{producto.categoria || "-"}</div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          placeholder="Cantidad"
          className="border rounded p-1 w-24"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
        <input
          type="text"
          placeholder="Unidad"
          className="border rounded p-1 w-20"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
        />
        <input
          type="text"
          placeholder="Notas (opcional)"
          className="border rounded p-1 w-48"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
        <button
          className="bg-green-600 text-white px-3 py-1 rounded"
          onClick={() => {
            onAgregar(producto, cantidad, unidad, observaciones);
            setCantidad("");
            setObservaciones("");
            setUnidad("und");
          }}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
