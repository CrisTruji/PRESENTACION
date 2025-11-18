import React, { useEffect, useState } from "react";
import { listSolicitudes, updateSolicitudEstado } from "../lib/solicitudes.js";
import { useAuth } from "../context/auth.jsx";

export default function SolicitudesScreen() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSolicitudes() {
      try {
        const data = await listSolicitudes();
        setSolicitudes(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSolicitudes();
  }, []);

  const handleUpdateEstado = async (id, estado) => {
    try {
      await updateSolicitudEstado(id, estado, user.id);
      // Recargar lista
      const data = await listSolicitudes();
      setSolicitudes(data);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (loading) return <p>Cargando solicitudes...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Solicitudes</h2>
      <ul>
        {solicitudes.map((sol) => (
          <li key={sol.id} style={{ margin: "10px 0", border: "1px solid #ccc", padding: "10px" }}>
            <p>Proveedor: {sol.proveedor.nombre}</p>
            <p>Estado: {sol.estado}</p>
            <p>Creado por: {sol.created_by_user?.nombre}</p>
            {sol.estado === 'pendiente' && (
              <div>
                <button onClick={() => handleUpdateEstado(sol.id, 'aprobada')}>Aprobar</button>
                <button onClick={() => handleUpdateEstado(sol.id, 'rechazada')}>Rechazar</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}