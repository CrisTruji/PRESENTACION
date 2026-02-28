// src/features/portal-empleado/hooks/useVacaciones.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getVacacionesByEmpleado,
  crearSolicitudVacaciones,
  calcularDiasDisponibles,
} from "../services/vacacionesService";
import notify from "@/shared/lib/notifier";

export function useVacaciones(empleadoId) {
  return useQuery({
    queryKey: ["vacaciones", empleadoId],
    queryFn: () => getVacacionesByEmpleado(empleadoId),
    enabled: !!empleadoId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDiasDisponibles(empleadoId) {
  return useQuery({
    queryKey: ["vacaciones-disponibles", empleadoId],
    queryFn: () => calcularDiasDisponibles(empleadoId),
    enabled: !!empleadoId,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCrearSolicitudVacaciones(empleadoId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos) => crearSolicitudVacaciones(empleadoId, datos),
    onSuccess: () => {
      notify.success("Solicitud de vacaciones enviada correctamente");
      qc.invalidateQueries({ queryKey: ["vacaciones", empleadoId] });
      qc.invalidateQueries({ queryKey: ["vacaciones-disponibles", empleadoId] });
      qc.invalidateQueries({ queryKey: ["vacaciones-pendientes"] });
    },
    onError: (err) => notify.error(err?.message ?? "Error al enviar la solicitud"),
  });
}
