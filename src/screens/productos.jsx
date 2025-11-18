import React, { useEffect, useState } from "react";
import { listProductos } from "../lib/solicitudes";
import ProductoItem from "../components/productoitem";

export default function ProductosScreen({ proveedor, onCreateSolicitud }) {
  const [productos, setProductos] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProductos() {
      try {
        const data = await listProductos(proveedor.id);
        setProductos(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (proveedor) fetchProductos();
  }, [proveedor]);

  const handleSelectProducto = (item) => {
    setSelectedItems([...selectedItems, item]);
  };

  const handleCreateSolicitud = () => {
    if (selectedItems.length === 0) return alert("Selecciona al menos un producto");
    onCreateSolicitud(selectedItems);
  };

  if (loading) return <p>Cargando productos...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Productos de {proveedor.nombre}</h2>
      <div>
        {productos.map((prod) => (
          <ProductoItem key={prod.id} producto={prod} onSelect={handleSelectProducto} />
        ))}
      </div>
      <h3>Items Seleccionados: {selectedItems.length}</h3>
      <button onClick={handleCreateSolicitud}>Crear Solicitud</button>
    </div>
  );
}