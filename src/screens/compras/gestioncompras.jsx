// src/screens/compras/gestioncompras.jsx
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/auth";
import { getSolicitudes, getSolicitudConItems, actualizarEstadoSolicitud } from "../../services/solicitudes";
import { crearPedido, agregarItemsPedido } from "../../services/pedidos";

export default function GestionCompras() {
  const { user } = useAuth?.() || {};
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState(null);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  async function fetchSolicitudes() {
    setLoading(true);
    try {
      const data = await getSolicitudes();
      // filtramos por estado que corresponda al flujo de compras, por ejemplo 'aprobado_auxiliar'
      const porComprar = (data || []).filter(s => s.estado === "aprobado_auxiliar");
      setSolicitudes(porComprar);
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

  async function generarPedido(solicitud) {
    try {
      setGenerando(true);
      // crear pedido
      const pedido = await crearPedido({
        solicitud_id: solicitud.id,
        proveedor_id: solicitud.proveedor_id,
        created_by: user?.id || null
      });

      // preparar items: usar items de la solicitud
      const items = (detalle?.items || []).map(it => ({
        catalogo_producto_id: it.catalogo_producto_id,
        cantidad: it.cantidad_solicitada,
        precio_unitario: null
      }));

      await agregarItemsPedido(pedido.id, items);

      // actualizar estado de la solicitud a 'comprado' o similar
      await actualizarEstadoSolicitud(solicitud.id, "comprado");
      toast.success("Pedido generado correctamente");
      setDetalle(null);
      fetchSolicitudes();
    } catch (e) {
      console.error(e);
      toast.error("Error generando pedido");
    } finally {
      setGenerando(false);
    }
  }

  if (loading) return <p className="p-6">Cargando...</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Gestión de Compras</h1>

      {solicitudes.length === 0 ? (
        <p>No hay solicitudes pendientes para compras.</p>
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
                <td className="border p-2">{s.proveedor?.nombre}</td>
                <td className="border p-2">{new Date(s.fecha_solicitud).toLocaleString()}</td>
                <td className="border p-2">{s.estado}</td>
                <td className="border p-2">
                  <button onClick={() => verDetalle(s.id)} className="mr-2 text-blue-600">Ver</button>
                  <button onClick={() => generarPedido(s)} className="text-green-600" disabled={generando}>
                    {generando ? "Generando..." : "Generar pedido"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {detalle && (
        <div className="fixed right-4 top-12 w-96 bg-white shadow p-4 border">
          <h3 className="font-semibold mb-2">Solicitud #{detalle.id}</h3>
          <div className="mb-2">Proveedor: {detalle.proveedor?.nombre}</div>
          <div>
            <strong>Items</strong>
            <ul className="list-disc ml-5">
              {detalle.items?.map(it => (
                <li key={it.id}>{it.catalogo_productos?.nombre} — {it.cantidad_solicitada} {it.unidad}</li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => generarPedido(detalle)} className="bg-green-600 text-white px-3 py-1 rounded">Generar pedido</button>
            <button onClick={() => setDetalle(null)} className="px-3 py-1 border rounded">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
