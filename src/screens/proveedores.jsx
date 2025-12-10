import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "../context/roleroutercontext";

export default function ProveedoresScreen() {
  const { navigate } = useRouter();
  const [proveedores, setProveedores] = useState([]);

  useEffect(() => {
    loadProveedores();
  }, []);

  const loadProveedores = async () => {
    const { data, error } = await supabase
      .from("proveedores")
      .select("*");

    if (error) {
      console.error("Error cargando proveedores:", error);
      return;
    }

    setProveedores(data);
  };

  const handleSelectProveedor = (proveedor) => {
    navigate("productos", { proveedorId: proveedor.id });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Proveedores</h1>

      {proveedores.length === 0 && <p>No hay proveedores registrados.</p>}

      <ul>
        {proveedores.map((p) => (
          <li key={p.id} style={{ marginBottom: 12 }}>
            <button
              onClick={() => handleSelectProveedor(p)}
              style={{
                padding: "10px 15px",
                background: "orange",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              {p.nombre}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
