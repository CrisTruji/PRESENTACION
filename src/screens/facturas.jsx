// src/screens/facturas.jsx
import React, { useEffect, useState } from "react";
import { listFacturas, createFactura } from "../lib/solicitudes";
import { useAuth } from "../context/auth";

export default function FacturasScreen() {
  const { session } = useAuth();
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ solicitud_id: "", numero_factura: "", fecha_factura: "", valor_total: 0 });

  useEffect(() => {
    async function load() {
      try {
        const data = await listFacturas();
        setFacturas(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCreate() {
    try {
      await createFactura(form, session.id);
      alert("Factura creada");
      setShowForm(false);
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  if (loading) return <p style={{ padding: 20 }}>Cargando facturas...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Facturas</h2>
      <button onClick={() => setShowForm((s) => !s)}>Crear factura</button>
      {showForm && (
        <div style={{ marginTop: 12 }}>
          <input placeholder="Solicitud ID" value={form.solicitud_id} onChange={(e) => setForm({ ...form, solicitud_id: e.target.value })} />
          <input placeholder="N° factura" value={form.numero_factura} onChange={(e) => setForm({ ...form, numero_factura: e.target.value })} />
          <input type="date" value={form.fecha_factura} onChange={(e) => setForm({ ...form, fecha_factura: e.target.value })} />
          <input type="number" placeholder="Valor total" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} />
          <button onClick={handleCreate}>Guardar</button>
        </div>
      )}

      <ul>
        {facturas.map((f) => (
          <li key={f.id} style={{ border: "1px solid #eee", padding: 10, marginBottom: 8 }}>
            <p>Número: {f.numero_factura}</p>
            <p>Proveedor: {f.proveedor?.nombre}</p>
            <p>Valor: {f.valor_total}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
