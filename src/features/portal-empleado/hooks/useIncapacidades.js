// src/features/portal-empleado/hooks/useIncapacidades.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getIncapacidadesByEmpleado,
  reportarIncapacidad,
  getIncapacidadDocUrl,
} from "../services/incapacidadesService";
import notify from "@/shared/lib/notifier";

export function useIncapacidades(empleadoId) {
  return useQuery({
    queryKey: ["incapacidades", empleadoId],
    queryFn: () => getIncapacidadesByEmpleado(empleadoId),
    enabled: !!empleadoId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useReportarIncapacidad(empleadoId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ datos, archivo }) => reportarIncapacidad(empleadoId, datos, archivo),
    onSuccess: () => {
      notify.success("Incapacidad registrada correctamente");
      qc.invalidateQueries({ queryKey: ["incapacidades", empleadoId] });
    },
    onError: (err) => notify.error(err?.message ?? "Error al registrar la incapacidad"),
  });
}

export function useIncapacidadDocUrl() {
  return useMutation({
    mutationFn: (archivoPath) => getIncapacidadDocUrl(archivoPath),
    onSuccess: (url) => window.open(url, "_blank"),
    onError: () => notify.error("No se pudo generar el enlace del documento"),
  });
}
