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
  });
  const [expandedId, setExpandedId] = useState(null); // id factura expandida

  useEffect(() => {
    fetchFacturas();
  }, []);

  async function fetchFacturas() {
    const { data, error } = await supabase
      .from("facturas")
      .select("*")
      .order("id", { ascending: true });
    if (error) {
      console.error("Error al cargar facturas:", error);
    } else {
      setFacturas(data || []);
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function agregarFactura() {
  const { nombre_empresa, nit, fecha, numero_factura, codigo_clinica } = formData;
  if (!nombre_empresa || !nit || !fecha || !numero_factura || !codigo_clinica) {
    alert("Por favor completa todos los campos.");
    return;
  }

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

  // data devuelve un objeto (no array) cuando usas .single()
  setFacturas((prev) => [...prev, data]);
  setFormData({
    nombre_empresa: "",
    nit: "",
    fecha: "",
    numero_factura: "",
    codigo_clinica: "",
  });
}


  // callback que ProductosList llamará con el total calculado
  async function handleTotalUpdate(facturaId, total) {
    try {
      // Actualizamos en la base de datos
      const { data, error } = await supabase
        .from("facturas")
        .update({ total })
        .eq("id", facturaId)
        .select();
      if (error) throw error;

      // Actualizamos el estado local para que la tabla muestre el total actualizado
      setFacturas((prev) =>
        prev.map((f) => (f.id === facturaId ? { ...f, total } : f))
      );
    } catch (err) {
      console.error("Error actualizando total en factura:", err);
    }
  }

  // toggle expand row on click
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

  {/* Select correcto */}
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
  <thead style={{ background: "#707070ff" }}>
    <tr>
      <th>Empresa</th>
      <th>NIT</th>
      <th>Total ($)</th>
      <th>N° Factura</th>
      <th>Fecha</th>
      <th>codigo_clinica</th>
      <th>PDF</th>
    </tr>
  </thead>
  <tbody>
    {facturas.map((f) => (
      <React.Fragment key={f.id}>
        {/* Fila principal (clicable para expandir) */}
        <tr
          style={{ cursor: "pointer" }}
          onClick={() => toggleExpand(f.id)}
          title="Haz clic para ver productos"
        >
          <td>{f.nombre_empresa}</td>
          <td>{f.nit}</td>
          <td style={{ textAlign: "right" }}>{formatCurrency(f.total)}</td>
          <td>{f.numero_factura}</td>
          <td>{f.fecha}</td>
          <td>{f.codigo_clinica}</td>

          {/* PDF */}
          <td onClick={(e) => e.stopPropagation()}>
            {/* stopPropagation para que al usar los controles de la celda no se active el toggle */}
            {f.pdf_url ? (
              <a href={f.pdf_url} target="_blank" rel="noreferrer">
                👁️ Ver PDF
              </a>
            ) : (
              // mostramos el uploader compacto dentro de la celda
              <PdfUploader
                facturaId={f.id}
                onUploadSuccess={() => fetchFacturas()}
              />
            )}
          </td>
        </tr>

        {/* Fila expandida: contiene ProductosList (oculta si no corresponde) */}
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
