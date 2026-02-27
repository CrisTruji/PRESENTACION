// src/features/portal-empleado/hooks/useEmpleadoPerfil.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEmpleadoByAuthUser, updateDatosPersonales, getResumenPortal } from "../services/portalEmpleadoService";

export function useEmpleadoPerfil() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["portal", "perfil"],
    queryFn: getEmpleadoByAuthUser,
    select: (res) => res.data,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  return {
    empleado: data ?? null,
    loading: isLoading,
    error,
  };
}

export function useUpdateDatosPersonales() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empleadoId, datos }) => updateDatosPersonales(empleadoId, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal", "perfil"] });
    },
  });
}

export function useResumenPortal(empleadoId) {
  return useQuery({
    queryKey: ["portal", "resumen", empleadoId],
    queryFn: () => getResumenPortal(empleadoId),
    enabled: !!empleadoId,
    staleTime: 1000 * 60 * 2,
  });
}
