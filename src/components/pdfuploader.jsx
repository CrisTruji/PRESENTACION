import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function PdfUploader({ facturaId, onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [existingUrl, setExistingUrl] = useState(null);

  // 🔹 Cargar URL existente (si la factura ya tiene PDF)
  useEffect(() => {
    async function fetchExisting() {
      const { data, error } = await supabase
        .from("facturas")
        .select("pdf_url")
        .eq("id", facturaId)
        .single();

      if (!error && data?.pdf_url) {
        setExistingUrl(data.pdf_url);
      }
    }
    fetchExisting();
  }, [facturaId]);

  // 🔹 Capturar el archivo
  function handleFileChange(e) {
    setFile(e.target.files[0]);
  }

  // 🔹 Subir archivo PDF
  async function handleUpload(e) {
    e.stopPropagation();
    if (!file) return alert("Selecciona un archivo PDF primero.");
    setUploading(true);

    try {
      if (existingUrl) {
        alert("⚠️ Ya existe un PDF, elimínalo primero si deseas reemplazarlo.");
        return;
      }

      const fileName = `${facturaId}-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("facturas-pdf")
        .upload(fileName, file, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("facturas-pdf")
        .getPublicUrl(fileName);

      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("facturas")
        .update({ pdf_url: publicUrl })
        .eq("id", facturaId);

      if (updateError) throw updateError;

      alert("✅ PDF subido correctamente.");
      setExistingUrl(publicUrl);
      onUploadSuccess?.();
    } catch (error) {
      console.error("❌ Error al subir PDF:", error);
      alert(`Error al subir: ${error.message}`);
    } finally {
      setUploading(false);
      setFile(null);
    }
  }

  // 🔹 Eliminar archivo PDF
  async function handleDelete(e) {
    e.stopPropagation();
    if (!existingUrl) return;

    const confirmDelete = window.confirm("¿Eliminar este PDF definitivamente?");
    if (!confirmDelete) return;

    try {
      // Obtener nombre del archivo desde la URL
      const path = existingUrl.split("/").pop();

      // Borrar del bucket
      const { error: storageError } = await supabase.storage
        .from("facturas-pdf")
        .remove([path]);
      if (storageError) throw storageError;

      // Limpiar columna en la tabla facturas
      const { error: updateError } = await supabase
        .from("facturas")
        .update({ pdf_url: null })
        .eq("id", facturaId);
      if (updateError) throw updateError;

      alert("🗑️ PDF eliminado correctamente.");
      setExistingUrl(null);
      onUploadSuccess?.();
    } catch (error) {
      console.error("Error al eliminar PDF:", error);
      alert(`Error al eliminar: ${error.message}`);
    }
  }

  return (
    <div style={{ margin: "10px 0" }}>
      {existingUrl ? (
        <div>
          <a href={existingUrl} target="_blank" rel="noreferrer">
            👁️ Ver PDF
          </a>{" "}
          <button onClick={handleDelete}>🗑️ Eliminar</button>
        </div>
      ) : (
        <div>
          <input type="file" accept="application/pdf" onChange={handleFileChange} />
          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? "Subiendo..." : "📎 Subir PDF"}
          </button>
        </div>
      )}
    </div>
  );
}
