// src/pages/jefe-planta/crearsolicitud.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth"; 
import { getProveedores } from "../../services/proveedores";
import { getProductosByProveedor } from "../../services/productos";
import { crearSolicitud, agregarItemsSolicitud } from "../../services/solicitudes";

export default function CrearSolicitudPlanta() {
  const { user } = useAuth();   // ← CORREGIDO
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");
  const [productos, setProductos] = useState([]);
  const [itemsSeleccionados, setItemsSeleccionados] = useState([]);
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

  const onProveedorChange = async (provId) => {
    setProveedorSeleccionado(provId);
    setProductos([]);
    setItemsSeleccionados([]);

    if (!provId) return;

    try {
      const prods = await getProductosByProveedor(Number(provId));
      setProductos(prods);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Error cargando productos del proveedor");
    }
  };

  const agregarProducto = (producto, cantidad, unidad = "und", observaciones = "") => {
    if (!producto || !cantidad || Number(cantidad) <= 0) {
      setError("Ingrese una cantidad válida");
      return;
    }

    if (itemsSeleccionados.some((i) => Number(i.catalogo_producto_id) === producto.id)) {
      setError("Este producto ya fue agregado");
      return;
    }

    setItemsSeleccionados((prev) => [
      ...prev,
      {
        catalogo_producto_id: producto.id,
        nombre: producto.nombre,
        categoria: producto.categoria,
        cantidad_solicitada: Number(cantidad),
        unidad,
        observaciones,
      },
    ]);

    setError("");
  };

  const eliminarItem = (id) => {
    setItemsSeleccionados((prev) => prev.filter((p) => p.catalogo_producto_id !== id));
  };

  const handleEnviarSolicitud = async () => {
    if (!proveedorSeleccionado) {
      setError("Seleccione un proveedor.");
      return;
    }
    if (itemsSeleccionados.length === 0) {
      setError("Debe agregar al menos un producto.");
      return;
    }

    setCargando(true);
    setError("");

    try {
      const solicitud = await crearSolicitud({
        proveedor_id: Number(proveedorSeleccionado),
        created_by: user?.id,         // ← CORREGIDO
        observaciones: "",
      });

      await agregarItemsSolicitud(solicitud.id, itemsSeleccionados);

      alert("Solicitud creada correctamente");

      setProveedorSeleccionado("");
      setProductos([]);
      setItemsSeleccionados([]);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Error creando la solicitud");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Crear Solicitud - Jefe de Planta</h1>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      {/* Seleccionar proveedor */}
      <div className="mb-6">
        <label className="block mb-1 font-medium">Proveedor</label>
        <select
          className="border rounded p-2 w-full"
          value={proveedorSeleccionado}
          onChange={(e) => onProveedorChange(e.target.value)}
        >
          <option value="">-- Seleccione un proveedor --</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Productos */}
      {proveedorSeleccionado && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Productos del proveedor</h2>

          {productos.length === 0 ? (
            <p className="text-sm text-gray-600">
              Este proveedor no tiene productos asociados.
            </p>
          ) : (
            <div className="grid gap-3">
              {productos.map((prod) => (
                <ProductoFila key={prod.id} producto={prod} onAgregar={agregarProducto} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items seleccionados */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Productos seleccionados</h2>

        {itemsSeleccionados.length === 0 ? (
          <p className="text-sm text-gray-600">No ha agregado productos.</p>
        ) : (
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">Producto</th>
                <th className="border px-2 py-1">Cantidad</th>
                <th className="border px-2 py-1">Unidad</th>
                <th className="border px-2 py-1">Notas</th>
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
                    <button className="text-red-600" onClick={() => eliminarItem(it.catalogo_producto_id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-3">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={cargando}
          onClick={handleEnviarSolicitud}
        >
          {cargando ? "Enviando..." : "Enviar solicitud"}
        </button>

        <button
          className="bg-gray-200 px-4 py-2 rounded"
          onClick={() => {
            setProveedorSeleccionado("");
            setItemsSeleccionados([]);
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

// Componente para agregar productos
function ProductoFila({ producto, onAgregar }) {
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("und");
  const [observaciones, setObservaciones] = useState("");

  return (
    <div className="border p-3 rounded flex items-center justify-between gap-4">
      <div>
        <div className="font-medium">{producto.nombre}</div>
        <div className="text-sm text-gray-600">
          {producto.categoria || "Sin categoría"}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          placeholder="Cantidad"
          className="border rounded p-1 w-24"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />

        <input
          type="text"
          className="border rounded p-1 w-20"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
        />

        <input
          type="text"
          className="border rounded p-1 w-48"
          placeholder="Notas"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />

        <button
          className="bg-green-600 text-white px-3 py-1 rounded"
          onClick={() => {
            onAgregar(producto, cantidad, unidad, observaciones);
            setCantidad("");
            setUnidad("und");
            setObservaciones("");
          }}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
