import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import PdfUploader from "./pdfuploader";
import ProductosList from "./productoslist";

function formatCurrency(value) {
  if (value == null) return "$0";
  return new Intl.NumberFormat("es-CO").format(Number(value));
}

export default function FacturasList() {
  const [facturas, setFacturas] = useState([]);
  const [formData, setFormData] = useState({
    nombre_empresa: "",
    nit: "",
    fecha: "",
    numero_factura: "",
    codigo_clinica: "",
  });
  const [expandedId, setExpandedId] = useState(null); // id factura expandida

  useEffect(() => {
    fetchFacturas();
  }, []);

  // 🔹 Cargar todas las facturas
  async function fetchFacturas() {
    const { data, error } = await supabase
      .from("facturas")
      .select("*")
      .order("fecha", { ascending: false }); // más reciente primero
    if (error) {
      console.error("Error al cargar facturas:", error);
    } else {
      setFacturas(data || []);
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  // 🔹 Agregar nueva factura (con validación de duplicados)
  async function agregarFactura() {
    const { nombre_empresa, nit, fecha, numero_factura, codigo_clinica } =
      formData;

    // Validar campos obligatorios
    if (!nombre_empresa || !nit || !fecha || !numero_factura || !codigo_clinica) {
      alert("Por favor completa todos los campos.");
      return;
    }

    // Verificar si ya existe una factura igual
    const { data: existing, error: existingError } = await supabase
      .from("facturas")
      .select("id")
      .eq("numero_factura", numero_factura)
      .eq("nombre_empresa", nombre_empresa)
      .maybeSingle(); // evita error si no existe

    if (existingError) {
      console.error("Error al verificar duplicados:", existingError);
      alert("Error verificando si la factura ya existe.");
      return;
    }

    if (existing) {
      alert("⚠️ Esta factura ya existe para esa empresa.");
      return;
    }

    // Insertar si no existe
    const { data, error } = await supabase
      .from("facturas")
      .insert([{ nombre_empresa, nit, fecha, numero_factura, codigo_clinica }])
      .select("*")
      .single();

    if (error) {
      console.error("Error al agregar factura:", error);
      alert("Error al agregar factura. Revisa la consola.");
      return;
    }

    // Actualizar estado local
    setFacturas((prev) => [data, ...prev]);
    setFormData({
      nombre_empresa: "",
      nit: "",
      fecha: "",
      numero_factura: "",
      codigo_clinica: "",
    });
  }

  // 🔹 Callback que ProductosList usa para actualizar el total
  async function handleTotalUpdate(facturaId, total) {
    try {
      const { data, error } = await supabase
        .from("facturas")
        .update({ total })
        .eq("id", facturaId)
        .select();
      if (error) throw error;

      setFacturas((prev) =>
        prev.map((f) => (f.id === facturaId ? { ...f, total } : f))
      );
    } catch (err) {
      console.error("Error actualizando total en factura:", err);
    }
  }

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h2>📄 Registro de Facturas</h2>

      {/* FORMULARIO */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          name="nombre_empresa"
          placeholder="Nombre empresa"
          value={formData.nombre_empresa}
          onChange={handleChange}
        />
        <input
          name="nit"
          placeholder="NIT"
          value={formData.nit}
          onChange={handleChange}
        />
        <input
          type="date"
          name="fecha"
          value={formData.fecha}
          onChange={handleChange}
        />
        <input
          name="numero_factura"
          placeholder="N° Factura"
          value={formData.numero_factura}
          onChange={handleChange}
        />
        <select
          name="codigo_clinica"
          value={formData.codigo_clinica || ""}
          onChange={handleChange}
        >
          <option value="">N° Operación</option>
          {Array.from({ length: 35 }, (_, i) => {
            const num = String(i + 1).padStart(4, "0");
            return (
              <option key={num} value={num}>
                {num}
              </option>
            );
          })}
        </select>
        <button onClick={agregarFactura}>➕ Agregar</button>
      </div>

      {/* TABLA PRINCIPAL */}
      <table
        border="1"
        cellPadding="8"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead style={{ background: "#807f7fff", color: "white" }}>
          <tr>
            <th>Empresa</th>
            <th>NIT</th>
            <th>Total ($)</th>
            <th>N° Factura</th>
            <th>Fecha</th>
            <th>Código operación</th>
            <th>PDF</th>
          </tr>
        </thead>
        <tbody>
          {facturas.map((f) => (
            <React.Fragment key={f.id}>
              <tr
                style={{ cursor: "pointer", background: expandedId === f.id ? "#848484ff" : "white" }}
                onClick={() => toggleExpand(f.id)}
                title="Haz clic para ver productos"
              >
                <td>{f.nombre_empresa}</td>
                <td>{f.nit}</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(f.total)}</td>
                <td>{f.numero_factura}</td>
                <td>{f.fecha}</td>
                <td>{f.codigo_clinica}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {f.pdf_url? (
                    <a href={f.pdf_url} target="_blank" rel="noreferrer">
                      👁️ Ver PDF
                    </a>
                  ) : (
                    <PdfUploader
                      facturaId={f.id}
                      onUploadSuccess={() => fetchFacturas()}
                    />
                  )}
                </td>
              </tr>

              {expandedId === f.id && (
                <tr>
                  <td colSpan="7" style={{ background: "#656565ff" }}>
                    <ProductosList
                      facturaId={f.id}
                      onTotalChange={(total) => handleTotalUpdate(f.id, total)}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
