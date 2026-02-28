// src/features/portal-empleado/hooks/useDesprendibles.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDesprendiblesByEmpleado,
  descargarDesprendible,
  subirDesprendible,
  getEmpleadosConEstadoDesprendible,
  getEstadisticasPeriodo,
} from "../services/desprendiblesService";
import notify from "@/shared/lib/notifier";

/** Hook para la vista del empleado */
export function useDesprendibles(empleadoId) {
  return useQuery({
    queryKey: ["desprendibles", empleadoId],
    queryFn: () => getDesprendiblesByEmpleado(empleadoId),
    enabled: !!empleadoId,
    staleTime: 1000 * 60 * 5,
  });
}

/** Descarga un desprendible y abre en nueva pestaña */
export function useDescargarDesprendible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archivoPath }) => descargarDesprendible(id, archivoPath),
    onSuccess: (signedUrl, { empleadoId }) => {
      window.open(signedUrl, "_blank");
      qc.invalidateQueries({ queryKey: ["desprendibles", empleadoId] });
    },
    onError: () => notify.error("No se pudo generar el enlace de descarga"),
  });
}

/** Hook para la vista de nómina - lista empleados con estado de desprendible */
export function useEmpleadosConDesprendible(periodo) {
  return useQuery({
    queryKey: ["nomina-desprendibles", periodo],
    queryFn: () => getEmpleadosConEstadoDesprendible(periodo),
    enabled: !!periodo,
    staleTime: 1000 * 60 * 2,
  });
}

/** Hook para estadísticas de cobertura de un período */
export function useEstadisticasPeriodo(periodo) {
  return useQuery({
    queryKey: ["nomina-stats", periodo],
    queryFn: () => getEstadisticasPeriodo(periodo),
    enabled: !!periodo,
    staleTime: 1000 * 60 * 1,
  });
}

/** Hook para subir un lote de desprendibles */
export function useSubirDesprendibles(periodo) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batch) => subirDesprendible(...batch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nomina-desprendibles", periodo] });
      qc.invalidateQueries({ queryKey: ["nomina-stats", periodo] });
    },
  });
}
