import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/auth";
import {
  crearSolicitud,
  crearSolicitudItem,
  obtenerCatalogoProductos,
  obtenerProveedores,
} from "../../services/solicitudes";
import { useNavigate } from "react-router-dom";

export default function CrearSolicitud() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [proveedores, setProveedores] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [proveedorId, setProveedorId] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [items, setItems] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    obtenerProveedores().then(setProveedores);
    obtenerCatalogoProductos().then(setCatalogo);
  }, []);

  const agregarItem = (producto) => {
    const existe = items.find((i) => i.catalogo_producto_id === producto.id);
    if (existe) return alert("Este producto ya fue agregado");

    const nuevo = {
      catalogo_producto_id: producto.id,
      nombre_producto: producto.nombre,
      cantidad_solicitada: 1,
      unidad: "UND",
      observaciones: "",
    };

    setItems([...items, nuevo]);
  };

  const actualizarItem = (index, campo, valor) => {
    const newItems = [...items];
    newItems[index][campo] = valor;
    setItems(newItems);
  };

  const eliminarItem = (id) => {
    setItems(items.filter((i) => i.catalogo_producto_id !== id));
  };

  const guardarSolicitud = async () => {
    if (!proveedorId) return alert("Selecciona un proveedor");
    if (items.length === 0) return alert("Agrega al menos un producto");

    const solicitud = await crearSolicitud({
      proveedor_id: proveedorId,
      created_by: user.id,
      observaciones: observaciones || "",
    });

    for (const it of items) {
      await crearSolicitudItem({
        solicitud_id: solicitud.id,
        catalogo_producto_id: it.catalogo_producto_id,
        cantidad_solicitada: it.cantidad_solicitada,
        unidad: it.unidad,
        observaciones: it.observaciones,
      });
    }

    navigate("/planta/confirmacion");
  };

  const productosFiltrados = catalogo.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Crear Solicitud</h1>

      {/* SELECCIONAR PROVEEDOR */}
      <label className="block mb-1 font-semibold">Proveedor</label>
      <select
        value={proveedorId}
        onChange={(e) => setProveedorId(e.target.value)}
        className="border px-2 py-1 w-full mb-4"
      >
        <option value="">Seleccione...</option>
        {proveedores.map((prov) => (
          <option key={prov.id} value={prov.id}>
            {prov.nombre}
          </option>
        ))}
      </select>

      {/* OBSERVACIONES */}
      <label className="block mb-1 font-semibold">Observaciones</label>
      <textarea
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
        className="border w-full p-2 mb-4"
      />

      {/* BUSCAR PRODUCTO */}
      <h2 className="text-lg font-semibold mt-4">Productos</h2>
      <input
        type="text"
        placeholder="Buscar producto..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="border px-2 py-1 w-full mb-3"
      />

      <div className="border p-3 mb-4 max-h-40 overflow-auto">
        {productosFiltrados.map((prod) => (
          <div
            key={prod.id}
            className="flex justify-between items-center py-1 border-b"
          >
            <span>{prod.nombre}</span>
            <button
              className="bg-blue-500 text-white px-2 py-1 rounded"
              onClick={() => agregarItem(prod)}
            >
              Agregar
            </button>
          </div>
        ))}
      </div>

      {/* ITEMS */}
      <h2 className="text-lg font-semibold mb-2">Items agregados</h2>

      {items.map((it, i) => (
        <div
          key={it.catalogo_producto_id}
          className="border p-3 mb-3 rounded bg-gray-50"
        >
          <p className="font-semibold">{it.nombre_producto}</p>

          <div className="flex gap-2 mt-2">
            <input
              type="number"
              min="1"
              value={it.cantidad_solicitada}
              onChange={(e) =>
                actualizarItem(i, "cantidad_solicitada", e.target.value)
              }
              className="border px-2 py-1 w-20"
            />

            <input
              type="text"
              value={it.unidad}
              onChange={(e) => actualizarItem(i, "unidad", e.target.value)}
              className="border px-2 py-1 w-20"
            />

            <input
              type="text"
              placeholder="Observación"
              value={it.observaciones}
              onChange={(e) =>
                actualizarItem(i, "observaciones", e.target.value)
              }
              className="border flex-1 px-2 py-1"
            />

            <button
              className="bg-red-500 text-white px-3 rounded"
              onClick={() => eliminarItem(it.catalogo_producto_id)}
            >
              X
            </button>
          </div>
        </div>
      ))}

      {/* GUARDAR */}
      <button
        onClick={guardarSolicitud}
        className="bg-green-600 text-white w-full py-2 rounded mt-4 font-bold"
      >
        Guardar Solicitud
      </button>
    </div>
  );
}
