import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function ProductosList({ facturaId, onTotalChange }) {
  const [productos, setProductos] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({
    codigo_producto: "",
    nombre: "",
    cantidad: "",
    precio: "",
  });

  useEffect(() => {
    fetchProductos();
  }, [facturaId]);

  async function fetchProductos() {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("factura_id", facturaId);

    if (error) {
      console.error("Error al obtener productos:", error);
      return;
    }

    setProductos(data);

    // calcular total
    const total = data.reduce(
      (sum, p) => sum + (parseFloat(p.cantidad) * parseFloat(p.precio) || 0),
      0
    );
    onTotalChange(total);
  }

  async function agregarProducto() {
    if (!nuevoProducto.nombre || !nuevoProducto.precio) {
      alert("Por favor, completa todos los campos del producto.");
      return;
    }

    const { error } = await supabase.from("productos").insert([
      {
        factura_id: facturaId,
        codigo_producto: nuevoProducto.codigo_producto,
        nombre: nuevoProducto.nombre,
        cantidad: parseFloat(nuevoProducto.cantidad) || 0,
        precio: parseFloat(nuevoProducto.precio) || 0,
      },
    ]);

    if (error) {
      console.error("Error al agregar producto:", error);
      alert("Error al agregar producto.");
    } else {
      setNuevoProducto({ codigo_producto: "", nombre: "", cantidad: "", precio: "" });
      fetchProductos();
    }
  }

  async function eliminarProducto(id) {
    const { error } = await supabase.from("productos").delete().eq("id", id);
    if (error) console.error("Error al eliminar:", error);
    fetchProductos();
  }

  return (
    <div style={{ marginTop: "10px" }}>
      <h4>Productos de la factura</h4>

      {/* 🟢 Formulario para agregar producto */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Código producto"
          value={nuevoProducto.codigo_producto}
          onChange={(e) =>
            setNuevoProducto({ ...nuevoProducto, codigo_producto: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Nombre"
          value={nuevoProducto.nombre}
          onChange={(e) =>
            setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })
          }
        />
        <input
          type="number"
          placeholder="Cantidad"
          value={nuevoProducto.cantidad}
          onChange={(e) =>
            setNuevoProducto({ ...nuevoProducto, cantidad: e.target.value })
          }
        />
        <input
          type="number"
          placeholder="Precio unitario"
          value={nuevoProducto.precio}
          onChange={(e) =>
            setNuevoProducto({ ...nuevoProducto, precio: e.target.value })
          }
        />
        <button onClick={agregarProducto}>Agregar</button>
      </div>

      {/* 🟣 Tabla de productos */}
      <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#8d8d8dff" }}>
            <th>Código producto</th>
            <th>Nombre</th>
            <th>Cantidad</th>
            <th>Precio unitario</th>
            <th>Total</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id}>
              <td>{p.codigo_producto}</td>
              <td>{p.nombre}</td>
              <td>{p.cantidad}</td>
              <td>{p.precio}</td>
              <td>{(p.cantidad * p.precio).toLocaleString("es-CO", { style: "currency", currency: "COP" })}</td>
              <td>
                <button onClick={() => eliminarProducto(p.id)}>❌ Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
