// src/screens/aux_compras/gestionaux.jsx
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/auth";
import { getSolicitudes } from "../../services/solicitudes";
import { actualizarEstadoSolicitud, getSolicitudConItems } from "../../services/solicitudes";

export default function GestionAux() {
  const { user } = useAuth?.() || {};
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  async function fetchSolicitudes() {
    setLoading(true);
    try {
      // traer solicitudes pendientes
      const data = await getSolicitudes();
      // filtrar por estado 'pendiente' o por lógica que tengas
      const pendientes = (data || []).filter(s => s.estado === "pendiente");
      setSolicitudes(pendientes);
    } catch (e) {
      console.error(e);
      toast.error("Error cargando solicitudes");
    } finally {
      setLoading(false);
    }
  }

  async function verDetalle(id) {
    try {
      const s = await getSolicitudConItems(id);
      setDetalle(s);
    } catch (e) {
      console.error(e);
      toast.error("Error cargando detalle");
    }
  }

  async function aprobar(id) {
    try {
      await actualizarEstadoSolicitud(id, "aprobado_auxiliar");
      toast.success("Solicitud aprobada");
      fetchSolicitudes();
      setDetalle(null);
    } catch (e) {
      console.error(e);
      toast.error("Error aprobando");
    }
  }

  async function rechazar(id) {
    try {
      await actualizarEstadoSolicitud(id, "rechazado");
      toast.success("Solicitud rechazada");
      fetchSolicitudes();
      setDetalle(null);
    } catch (e) {
      console.error(e);
      toast.error("Error rechazando");
    }
  }

  if (loading) return <p className="p-6">Cargando...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Solicitudes por Revisar (Aux. Compras)</h1>

      {solicitudes.length === 0 ? (
        <p>No hay solicitudes pendientes.</p>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Proveedor</th>
              <th className="p-2">Fecha</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map(s => (
              <tr key={s.id}>
                <td className="border p-2">{s.proveedor?.nombre || "-"}</td>
                <td className="border p-2">{new Date(s.fecha_solicitud).toLocaleString()}</td>
                <td className="border p-2">{s.estado}</td>
                <td className="border p-2">
                  <button onClick={() => verDetalle(s.id)} className="mr-2 text-blue-600">Ver</button>
                  <button onClick={() => aprobar(s.id)} className="mr-2 text-green-600">Aprobar</button>
                  <button onClick={() => rechazar(s.id)} className="text-red-600">Rechazar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Drawer básico de detalle */}
      {detalle && (
        <div className="fixed right-4 top-12 w-96 bg-white shadow p-4 border">
          <h3 className="font-semibold mb-2">Solicitud #{detalle.id}</h3>
          <div className="text-sm mb-2">Proveedor: {detalle.proveedor?.nombre}</div>
          <div className="mb-2">
            <strong>Items</strong>
            <ul className="list-disc ml-5">
              {detalle.items?.map(it => (
                <li key={it.id}>{it.catalogo_productos?.nombre} — {it.cantidad_solicitada} {it.unidad}</li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <button onClick={() => aprobar(detalle.id)} className="bg-green-600 text-white px-3 py-1 rounded">Aprobar</button>
            <button onClick={() => rechazar(detalle.id)} className="bg-red-600 text-white px-3 py-1 rounded">Rechazar</button>
            <button onClick={() => setDetalle(null)} className="px-3 py-1 border rounded">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
