// src/features/portal-empleado/services/desprendiblesService.js
import { supabase } from "@/shared/api";

// ── Vista empleado ────────────────────────────────────────────────────────────

/** Lista todos los desprendibles de un empleado, ordenados por período desc */
export async function getDesprendiblesByEmpleado(empleadoId) {
  const { data, error } = await supabase
    .from("empleado_desprendibles")
    .select("id, periodo, archivo_path, descargado, descargado_at, created_at")
    .eq("empleado_id", empleadoId)
    .order("periodo", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Genera una URL firmada de 1 hora para descargar el archivo.
 * Marca el desprendible como descargado en BD.
 */
export async function descargarDesprendible(desprendibleId, archivoPath) {
  const { data, error } = await supabase.storage
    .from("desprendibles-nomina")
    .createSignedUrl(archivoPath, 3600);

  if (error) throw error;

  // Marcar como descargado (best-effort, no bloquear si falla)
  supabase
    .from("empleado_desprendibles")
    .update({ descargado: true, descargado_at: new Date().toISOString() })
    .eq("id", desprendibleId)
    .then(() => {});

  return data.signedUrl;
}

// ── Vista nómina (upload + gestión) ─────────────────────────────────────────

/**
 * Sube un PDF al bucket y registra en BD.
 * @param {File} file           – archivo PDF
 * @param {string} cedula       – documento_identidad del empleado
 * @param {string} periodo      – formato 'YYYY-MM'
 * @param {number} empleadoId   – id de la fila en empleados
 * @param {string} subioPor     – auth.uid() del usuario de nómina
 */
export async function subirDesprendible(file, cedula, periodo, empleadoId, subioPor) {
  const storagePath = `${cedula}/${periodo}.pdf`;

  // 1. Subir al bucket (upsert por si ya existía)
  const { error: storageError } = await supabase.storage
    .from("desprendibles-nomina")
    .upload(storagePath, file, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (storageError) throw storageError;

  // 2. Registrar o actualizar en BD
  const { data, error: dbError } = await supabase
    .from("empleado_desprendibles")
    .upsert(
      {
        empleado_id: empleadoId,
        periodo,
        archivo_path: storagePath,
        descargado: false,
        descargado_at: null,
        subido_por: subioPor,
      },
      { onConflict: "empleado_id,periodo" }
    )
    .select()
    .single();

  if (dbError) throw dbError;
  return data;
}

/**
 * Lista empleados activos con su estado de desprendible para un período dado.
 * Útil para el PanelNomina.
 */
export async function getEmpleadosConEstadoDesprendible(periodo) {
  const { data: empleados, error: empError } = await supabase
    .from("empleados")
    .select("id, documento_identidad, nombres, apellidos, cargo")
    .eq("activo", "true")
    .order("apellidos");

  if (empError) throw empError;

  if (!empleados?.length) return [];

  const ids = empleados.map((e) => e.id);

  const { data: desprendibles } = await supabase
    .from("empleado_desprendibles")
    .select("empleado_id, descargado, created_at")
    .eq("periodo", periodo)
    .in("empleado_id", ids);

  const mapaD = Object.fromEntries(
    (desprendibles ?? []).map((d) => [d.empleado_id, d])
  );

  return empleados.map((e) => ({
    ...e,
    tieneDesprendible: !!mapaD[e.id],
    descargado: mapaD[e.id]?.descargado ?? false,
    subidoEn: mapaD[e.id]?.created_at ?? null,
  }));
}

/** Obtiene las estadísticas de cobertura para un período */
export async function getEstadisticasPeriodo(periodo) {
  const [{ count: total }, { count: conDesprendible }] = await Promise.all([
    supabase.from("empleados").select("id", { count: "exact", head: true }).eq("activo", "true"),
    supabase
      .from("empleado_desprendibles")
      .select("id", { count: "exact", head: true })
      .eq("periodo", periodo),
  ]);

  return {
    total: total ?? 0,
    conDesprendible: conDesprendible ?? 0,
    sinDesprendible: (total ?? 0) - (conDesprendible ?? 0),
    porcentaje: total ? Math.round(((conDesprendible ?? 0) / total) * 100) : 0,
  };
}
