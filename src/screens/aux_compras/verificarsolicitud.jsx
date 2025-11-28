import React, { useEffect, useState } from "react";
import { getPendingSolicitudes, getSolicitudById, updateSolicitudEstado } from "../../services/solicitudes";

export default function VerificarSolicitud() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await getPendingSolicitudes();
      setSolicitudes(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function openSolicitud(id) {
    const { data } = await getSolicitudById(id);
    setSelected(data);
  }

  async function approve(id) {
    await updateSolicitudEstado(id, "verificado", null, "Aprobado por auxiliar");
    alert("Aprobada");
    window.location.reload();
  }

  async function returnToPlanta(id) {
    await updateSolicitudEstado(id, "devuelto", null, "Devuelta al jefe de planta");
    alert("Devuelta");
    window.location.reload();
  }

  if (loading) return <p>Cargando...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Solicitudes por verificar</h2>
      <div style={{ display: "grid", gap: 12 }}>
        {solicitudes.map(s => (
          <div key={s.id} style={{ border: "1px solid #e5e7eb", padding: 12 }}>
            <div>ID: {s.id} - Proveedor: {s.proveedores?.nombre}</div>
            <div>Estado: {s.estado}</div>
            <div>
              <button onClick={() => openSolicitud(s.id)}>Abrir</button>
              <button onClick={() => approve(s.id)}>Aprobar</button>
              <button onClick={() => returnToPlanta(s.id)}>Devolver</button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div style={{ marginTop: 20 }}>
          <h3>Solicitud {selected.id}</h3>
          <pre>{JSON.stringify(selected, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
