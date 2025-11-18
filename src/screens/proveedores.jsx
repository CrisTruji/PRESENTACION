import React, { useEffect, useState } from "react";
import { listProveedores } from "../lib/solicitudes"; // Solo esta importación

export default function ProveedoresScreen({ onSelectProveedor }) {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProveedores() {
      try {
        const data = await listProveedores();
        setProveedores(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProveedores();
  }, []);

  if (loading) return <p>Cargando proveedores...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Seleccionar Proveedor</h2>
      <ul>
        {proveedores.map((prov) => (
          <li key={prov.id} style={{ margin: "10px 0" }}>
            <strong>{prov.nombre}</strong> - NIT: {prov.nit}
            <button onClick={() => onSelectProveedor(prov)} style={{ marginLeft: "10px" }}>
              Seleccionar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}