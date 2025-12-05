// src/screens/auxiliar/verificarsolicitud.jsx
import React, { useEffect, useState } from "react";
import {
  getPendingSolicitudes,
  getSolicitudById,
  updateSolicitudEstado,
  updateProductoEstado
} from "../../services/solicitudes";

export default function VerificarSolicitud() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [productos, setProductos] = useState([]);
  const [modal, setModal] = useState({ open: false, producto: null });
  const [comentario, setComentario] = useState("");

  // ===========================
  // Cargar solicitudes pendientes
  // ===========================
  useEffect(() => {
    async function load() {
      const { data } = await getPendingSolicitudes();
      setSolicitudes(data || []);
      setLoading(false);
    }
    load();
  }, []);

  // ===========================
  // Abrir solicitud y cargar productos
  // ===========================
  async function openSolicitud(id) {
    const { data } = await getSolicitudById(id);
    setSelected(data);

    // Aquí esperamos que getSolicitudById incluya la tabla "solicitud_detalle"
    setProductos(data?.detalle || []);
  }

  // ===========================
  // Cancelar producto (abrir modal)
  // ===========================
  function openCancelModal(producto) {
    setComentario("");
    setModal({ open: true, producto });
  }

  // ===========================
  // Confirmar cancelación de producto
  // ===========================
  async function confirmarCancelacion() {
    const prod = modal.producto;
    await updateProductoEstado(prod.id, "devuelto", comentario);

    // actualizar estado local sin recargar
    setProductos(prev =>
      prev.map(p =>
        p.id === prod.id ? { ...p, estado: "devuelto", comentario } : p
      )
    );

    setModal({ open: false, producto: null });
  }

  // ===========================
  // Aprobar solicitud completa
  // ===========================
  async function aprobarSolicitud() {
    const productosAutorizados = productos.every(p => p.estado === "autorizado");

    if (!productosAutorizados) {
      alert("No puedes aprobar una solicitud con productos devueltos");
      return;
    }

    await updateSolicitudEstado(selected.id, "verificada", null, "Aprobada por auxiliar");
    alert("Solicitud verificada");
    window.location.reload();
  }

  // ===========================
  // Confirmar devolución total
  // ===========================
  async function devolverSolicitud() {
    await updateSolicitudEstado(selected.id, "devuelta", null, "Devuelta al jefe de planta");
    alert("Solicitud devuelta completa");
    window.location.reload();
  }

  // ===========================
  // UI
  // ===========================
  if (loading) return <p>Cargando...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Solicitudes por verificar</h2>

      {/* LISTA DE SOLICITUDES */}
      <div style={{ display: "grid", gap: 12 }}>
        {solicitudes.map(s => (
          <div key={s.id} style={{ border: "1px solid #e5e7eb", padding: 12 }}>
            <div>ID: {s.id} - Proveedor: {s.proveedores?.nombre}</div>
            <div>Estado: {s.estado}</div>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => openSolicitud(s.id)}>Abrir</button>{" "}
              <button onClick={() => aprobarSolicitud(s.id)}>Aprobar</button>{" "}
              <button onClick={() => devolverSolicitud(s.id)}>Devolver</button>
            </div>
          </div>
        ))}
      </div>

      {/* DETALLE DE LA SOLICITUD */}
      {selected && (
        <div style={{ marginTop: 30 }}>
          <h3>Solicitud #{selected.id}</h3>

          {/* TABLA DE PRODUCTOS */}
          <table border="1" cellPadding="8" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(p => (
                <tr key={p.id}>
                  <td>{p.productos?.nombre}</td>
                  <td>{p.cantidad}</td>
                  <td>
                    {p.estado === "autorizado" && <span style={{ color: "green" }}>Autorizado</span>}
                    {p.estado === "devuelto" && <span style={{ color: "red" }}>Devuelto</span>}
                  </td>
                  <td>
                    {p.estado === "autorizado" ? (
                      <button onClick={() => openCancelModal(p)}>Cancelar</button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* BOTONES FINALES */}
          <div style={{ marginTop: 20 }}>
            <button onClick={aprobarSolicitud}>Aprobar Solicitud</button>{" "}
            <button onClick={devolverSolicitud}>Devolver Completa</button>
          </div>
        </div>
      )}

      {/* MODAL DE CANCELACIÓN */}
      {modal.open && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <div style={{ background: "#fff", padding: 20, borderRadius: 8, width: 350 }}>
            <h3>Devolver producto</h3>

            <p>{modal.producto?.productos?.nombre}</p>

            <textarea
              rows="3"
              placeholder="Motivo (opcional)"
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              style={{ width: "100%", marginTop: 8 }}
            />

            <div style={{ marginTop: 12 }}>
              <button onClick={() => setModal({ open: false, producto: null })}>
                Cancelar
              </button>{" "}
              <button onClick={confirmarCancelacion}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
