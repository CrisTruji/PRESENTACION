import React, { useEffect, useState } from "react";
import { listFacturas, createFactura } from "../lib/solicitudes";
import { useAuth } from "../context/auth";

export default function FacturasScreen({ solicitudes }) {
  const { user } = useAuth();
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    solicitud_id: "",
    numero_factura: "",
    fecha_factura: "",
    items: [],
    pdf_url: ""
  });

  useEffect(() => {
    async function fetchFacturas() {
      try {
        const data = await listFacturas();
        setFacturas(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchFacturas();
  }, []);

  const handleCreateFactura = async () => {
    try {
      await createFactura(formData, user.id);
      setShowForm(false);
      // Recargar
      const data = await listFacturas();
      setFacturas(data);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (loading) return <p>Cargando facturas...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Facturas</h2>
      <button onClick={() => setShowForm(!showForm)}>Crear Nueva Factura</button>
      {showForm && (
        <div style={{ marginTop: "20px" }}>
          <select onChange={(e) => setFormData({ ...formData, solicitud_id: e.target.value })}>
            <option value="">Seleccionar Solicitud</option>
            {solicitudes.map((sol) => (
              <option key={sol.id} value={sol.id}>{sol.id} - {sol.proveedor.nombre}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Número Factura"
            value={formData.numero_factura}
            onChange={(e) => setFormData({ ...formData, numero_factura: e.target.value })}
          />
          <input
            type="date"
            value={formData.fecha_factura}
            onChange={(e) => setFormData({ ...formData, fecha_factura: e.target.value })}
          />
          {/* Simplificado: Agrega lógica para items si es necesario */}
          <button onClick={handleCreateFactura}>Guardar Factura</button>
        </div>
      )}
      <ul>
        {facturas.map((fac) => (
          <li key={fac.id} style={{ margin: "10px 0", border: "1px solid #ccc", padding: "10px" }}>
            <p>Número: {fac.numero_factura}</p>
            <p>Proveedor: {fac.proveedor.nombre}</p>
            <p>Valor Total: {fac.valor_total}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}