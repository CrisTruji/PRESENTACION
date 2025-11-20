// src/screens/proveedores.jsx
import React, { useEffect, useState } from "react";
import { listProveedores } from "../lib/solicitudes";
import { useRouter } from "../context/router";

export default function ProveedoresScreen() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { navigate } = useRouter();

  useEffect(() => {
    async function fetch() {
      try {
        const data = await listProveedores();
        setProveedores(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) return <p style={{ padding: 20 }}>Cargando proveedores...</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>Error: {error}</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Seleccionar Proveedor</h2>
      <ul>
        {proveedores.map((prov) => (
          <li key={prov.id} style={{ margin: "10px 0", border: "1px solid #eee", padding: 12 }}>
            <strong>{prov.nombre}</strong> — NIT: {prov.nit}
            <div style={{ marginTop: 8 }}>
              <button onClick={() => navigate("productos", { proveedor: prov })} style={{ marginRight: 8 }}>Ver productos</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
