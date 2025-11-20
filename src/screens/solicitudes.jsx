// src/screens/solicitudes.jsx
import React, { useEffect, useState } from "react";
import { listSolicitudes, updateSolicitudEstado } from "../lib/solicitudes";
import { useAuth } from "../context/auth";

export default function SolicitudesScreen() {
  const { session } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await listSolicitudes();
      setSolicitudes(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleEstado(id, estado) {
    try {
      await updateSolicitudEstado(id, estado, session?.id);
      load();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  if (loading) return <p style={{ padding: 20 }}>Cargando...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Solicitudes</h2>
      {solicitudes.map((s) => (
        <div key={s.id} style={{ border: "1px solid #eee", padding: 12, marginBottom: 8 }}>
          <p><strong>Proveedor:</strong> {s.proveedor?.nombre}</p>
          <p><strong>Estado:</strong> {s.estado}</p>
          <p><strong>Creado por:</strong> {s.created_by_user?.nombre || s.created_by}</p>
          {s.estado === "pendiente" && (
            <>
              <button onClick={() => handleEstado(s.id, "aprobada")} style={{ marginRight: 8 }}>Aprobar</button>
              <button onClick={() => handleEstado(s.id, "rechazada")}>Rechazar</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
