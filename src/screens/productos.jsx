import React, { useEffect, useState } from "react";
import { useRouter } from "../context/router";
import { getProductsByProvider } from "../lib/supabase";

export default function ProductosScreen() {
  const { params } = useRouter();
  const proveedorId = params?.proveedorId;

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!proveedorId) return;

      const data = await getProductsByProvider(proveedorId);
      setProductos(data);
      setLoading(false);
    }

    load();
  }, [proveedorId]);

  if (loading) return <p>Cargando productos...</p>;

  if (!productos.length)
    return <p>No hay productos asociados a este proveedor.</p>;

  return (
    <div>
      <h2>Productos del proveedor</h2>

      <ul>
        {productos.map((p) => (
          <li key={p.id}>
            <strong>{p.nombre}</strong> — {p.codigo_arbol} — {p.categoria}
          </li>
        ))}
      </ul>
    </div>
  );
}
