// src/screens/productos.jsx
import React, { useEffect, useState } from "react";
import { listProductos } from "../lib/solicitudes";
import ProductoItem from "../components/productoitem";
import { useRouter } from "../context/router";
import { useAuth } from "../context/auth";
import { createSolicitud } from "../lib/solicitudes";

export default function ProductosScreen() {
  const { route, navigate } = useRouter();
  const proveedor = route.params?.proveedor;
  const { session } = useAuth();

  const [productos, setProductos] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      if (!proveedor?.id) {
        setLoading(false);
        return;
      }
      try {
        const data = await listProductos(proveedor.id);
        setProductos(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [proveedor]);

  function onSelectItem(item) {
    setSelectedItems((p) => [...p, item]);
  }

  async function handleCreateSolicitud() {
    if (!proveedor) return alert("Selecciona proveedor");
    if (!selectedItems.length) return alert("Selecciona al menos un producto");
    try {
      await createSolicitud({ proveedor_id: proveedor.id, items: selectedItems }, session.id);
      alert("Solicitud creada");
      navigate("solicitudes");
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  if (loading) return <p style={{ padding: 20 }}>Cargando productos...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Productos de {proveedor?.nombre || "—"}</h2>
      {productos.length === 0 ? <p>No hay productos para este proveedor.</p> : (
        <div>
          {productos.map((p) => (
            <ProductoItem key={p.id} producto={p} onSelect={onSelectItem} />
          ))}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <h4>Items seleccionados: {selectedItems.length}</h4>
        <button onClick={handleCreateSolicitud}>Crear Solicitud</button>
      </div>
    </div>
  );
}
