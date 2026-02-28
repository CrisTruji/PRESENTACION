// src/features/portal-empleado/services/vacacionesService.js
import { supabase } from "@/shared/api";

// ── Cálculo de días disponibles ──────────────────────────────────────────────

/**
 * Calcula los días de vacaciones disponibles para un empleado.
 * Fórmula: días causados (15/año = 1.25/mes) - días ya disfrutados/aprobados
 */
export async function calcularDiasDisponibles(empleadoId) {
  const { data: emp, error: empError } = await supabase
    .from("empleados")
    .select("fecha_ingreso")
    .eq("id", empleadoId)
    .single();

  if (empError || !emp?.fecha_ingreso) return { diasCausados: 0, diasTomados: 0, diasDisponibles: 0 };

  // Meses trabajados desde fecha de ingreso
  const ingreso = new Date(emp.fecha_ingreso);
  const hoy = new Date();
  const meses = Math.max(
    0,
    (hoy.getFullYear() - ingreso.getFullYear()) * 12 +
      (hoy.getMonth() - ingreso.getMonth())
  );

  const diasCausados = Math.floor(meses * 1.25); // 15 días / 12 meses

  // Días ya usados (aprobados + disfrutados)
  const { data: usados } = await supabase
    .from("empleado_vacaciones")
    .select("dias_solicitados, dias_periodo")
    .eq("empleado_id", empleadoId)
    .in("estado", ["aprobado", "disfrutado", "en_curso", "programado"]);

  const diasTomados = (usados ?? []).reduce(
    (acc, v) => acc + (v.dias_solicitados ?? v.dias_periodo ?? 0),
    0
  );

  return {
    diasCausados,
    diasTomados,
    diasDisponibles: Math.max(0, diasCausados - diasTomados),
  };
}

// ── Vista empleado ────────────────────────────────────────────────────────────

export async function getVacacionesByEmpleado(empleadoId) {
  const { data, error } = await supabase
    .from("empleado_vacaciones")
    .select("id, tipo, fecha_inicio, fecha_fin, dias_solicitados, dias_periodo, estado, observaciones, motivo_rechazo, created_at")
    .eq("empleado_id", empleadoId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Crea una solicitud de vacaciones.
 * Los días se calculan en el cliente y se pasan como `dias_solicitados`.
 */
export async function crearSolicitudVacaciones(empleadoId, datos) {
  const { tipo, fecha_inicio, fecha_fin, dias_solicitados, observaciones } = datos;

  const anio = new Date(fecha_inicio).getFullYear();

  const { data, error } = await supabase
    .from("empleado_vacaciones")
    .insert({
      empleado_id: empleadoId,
      tipo: tipo ?? "ordinarias",
      fecha_inicio,
      fecha_fin,
      dias_solicitados,
      anio,
      estado: "pendiente",
      observaciones: observaciones ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Utilidades ────────────────────────────────────────────────────────────────

/** Calcula días calendario entre dos fechas (inclusive) */
export function calcularDiasCalendario(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return 0;
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  if (fin < inicio) return 0;
  return Math.round((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
}
