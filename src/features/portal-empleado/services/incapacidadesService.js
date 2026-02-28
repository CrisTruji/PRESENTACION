// src/features/portal-empleado/services/incapacidadesService.js
import { supabase } from "@/shared/api";

export async function getIncapacidadesByEmpleado(empleadoId) {
  const { data, error } = await supabase
    .from("empleado_incapacidades")
    .select("id, tipo, fecha_inicio, fecha_fin, dias_incapacidad, diagnostico, entidad_emisora, numero_radicado, estado, archivo_path, observaciones, created_at")
    .eq("empleado_id", empleadoId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Sube el archivo PDF de incapacidad al bucket y registra en BD.
 * @param {number} empleadoId
 * @param {object} datos - { tipo, fecha_inicio, fecha_fin, diagnostico, entidad_emisora, numero_radicado, observaciones }
 * @param {File|null} archivo - PDF opcional (máx 10MB)
 */
export async function reportarIncapacidad(empleadoId, datos, archivo) {
  let archivo_path = null;

  if (archivo) {
    if (archivo.size > 10 * 1024 * 1024) {
      throw new Error("El archivo no puede superar los 10 MB");
    }
    const ext = archivo.name.split(".").pop();
    const storagePath = `${empleadoId}/${Date.now()}.${ext}`;

    const { error: storageError } = await supabase.storage
      .from("incapacidades-docs")
      .upload(storagePath, archivo, { contentType: archivo.type, upsert: false });

    if (storageError) throw storageError;
    archivo_path = storagePath;
  }

  const dias = calcularDias(datos.fecha_inicio, datos.fecha_fin);

  const { data, error } = await supabase
    .from("empleado_incapacidades")
    .insert({
      empleado_id: empleadoId,
      tipo: datos.tipo,
      fecha_inicio: datos.fecha_inicio,
      fecha_fin: datos.fecha_fin,
      dias_incapacidad: dias,
      diagnostico: datos.diagnostico ?? null,
      entidad_emisora: datos.entidad_emisora ?? null,
      numero_radicado: datos.numero_radicado ?? null,
      observaciones: datos.observaciones ?? null,
      archivo_path,
      estado: "pendiente",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Genera URL firmada (1h) para descargar el documento de incapacidad */
export async function getIncapacidadDocUrl(archivoPath) {
  const { data, error } = await supabase.storage
    .from("incapacidades-docs")
    .createSignedUrl(archivoPath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

function calcularDias(inicio, fin) {
  if (!inicio || !fin) return 0;
  const d1 = new Date(inicio);
  const d2 = new Date(fin);
  return Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
}
