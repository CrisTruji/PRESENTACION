// src/features/portal-empleado/services/portalEmpleadoService.js
import { supabase } from "@/shared/api";
import { supabaseRequest } from "@/shared/api";
import notify from "@/shared/lib/notifier";

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + "/functions/v1";

// ── Registro de empleado (llama a la Edge Function) ──────────────────────────

export async function verificarCedula(cedula) {
  const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/employee-register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "verificar_cedula", cedula }),
  });
  return res.json();
}

export async function crearCuentaEmpleado(cedula, email, password) {
  const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/employee-register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "crear_cuenta", cedula, email, password }),
  });
  return res.json();
}

// ── Perfil del empleado autenticado ──────────────────────────────────────────

export async function getEmpleadoByAuthUser() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { data: null, error: "No autenticado" };

  return supabaseRequest(
    supabase
      .from("empleados")
      .select(`
        *,
        empleados_talento_humano (*),
        empleados_sst (*)
      `)
      .eq("auth_user_id", user.id)
      .single()
  );
}

// ── Actualizar datos personales (solo correo, teléfono, dirección) ───────────

export async function updateDatosPersonales(empleadoId, datos) {
  const camposPermitidos = {};
  if (datos.correo    !== undefined) camposPermitidos.correo    = datos.correo;
  if (datos.telefono  !== undefined) camposPermitidos.telefono  = datos.telefono;
  if (datos.direccion !== undefined) camposPermitidos.direccion = datos.direccion;

  try {
    const { data, error } = await supabase
      .from("empleados")
      .update(camposPermitidos)
      .eq("id", empleadoId)
      .select()
      .single();

    if (error) throw error;
    notify.success("Datos actualizados correctamente");
    return { data, error: null };
  } catch (error) {
    console.error("Error actualizando datos personales:", error);
    notify.error("Error al guardar los cambios");
    return { data: null, error };
  }
}

// ── Resumen de actividad (para cards del dashboard) ──────────────────────────

export async function getResumenPortal(empleadoId) {
  try {
    const [desprendibles, vacaciones, incapacidades, documentos] = await Promise.all([
      supabase
        .from("empleado_desprendibles")
        .select("id, descargado")
        .eq("empleado_id", empleadoId),
      supabase
        .from("empleado_vacaciones")
        .select("id, estado, dias_solicitados")
        .eq("empleado_id", empleadoId),
      supabase
        .from("empleado_incapacidades")
        .select("id, estado")
        .eq("empleado_id", empleadoId),
      supabase
        .from("empleado_documentos")
        .select("id")
        .eq("empleado_id", empleadoId),
    ]);

    const totalDesprendibles = desprendibles.data?.length ?? 0;
    const nuevosDesprendibles = desprendibles.data?.filter((d) => !d.descargado).length ?? 0;

    const diasVacaciones = vacaciones.data
      ?.filter((v) => v.estado === "disfrutado")
      .reduce((acc, v) => acc + (v.dias_solicitados ?? 0), 0) ?? 0;

    const vacacionesPendientes = vacaciones.data?.filter((v) => v.estado === "pendiente").length ?? 0;

    return {
      desprendibles: { total: totalDesprendibles, nuevos: nuevosDesprendibles },
      vacaciones: { diasDisfrutados: diasVacaciones, pendientes: vacacionesPendientes },
      incapacidades: { total: incapacidades.data?.length ?? 0 },
      documentos: { total: documentos.data?.length ?? 0 },
    };
  } catch (error) {
    console.error("Error obteniendo resumen portal:", error);
    return {
      desprendibles: { total: 0, nuevos: 0 },
      vacaciones: { diasDisfrutados: 0, pendientes: 0 },
      incapacidades: { total: 0 },
      documentos: { total: 0 },
    };
  }
}
