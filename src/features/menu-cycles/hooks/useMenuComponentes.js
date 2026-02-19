// ========================================
// HOOKS - Menu Componentes + Gramajes
// ========================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuComponentesService } from '../services/menuComponentesService';

export function useComponentesDia(cicloDiaServicioId) {
  return useQuery({
    queryKey: ['menu-componentes', cicloDiaServicioId],
    queryFn: () => menuComponentesService.getComponentesDia(cicloDiaServicioId),
    select: (response) => response.data,
    enabled: !!cicloDiaServicioId,
    // No retener datos de otro servicio/día mientras carga el nuevo
    placeholderData: undefined,
  });
}

export function useAsignarComponente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cicloDiaServicioId, componenteId, recetaId, orden }) =>
      menuComponentesService.asignarComponente(cicloDiaServicioId, componenteId, recetaId, orden),
    onSuccess: (_, variables) => {
      // Invalidar solo la query específica del servicio/día que fue modificado
      queryClient.invalidateQueries({ queryKey: ['menu-componentes', variables.cicloDiaServicioId] });
      // Invalidar el progreso del ciclo (campo "completo" actualizado)
      queryClient.invalidateQueries({ queryKey: ['ciclos', 'dia'] });
      queryClient.invalidateQueries({ queryKey: ['ciclos', 'progreso'] });
      queryClient.invalidateQueries({ queryKey: ['operaciones'] });
    },
  });
}

export function useEliminarComponente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (menuComponenteId) =>
      menuComponentesService.eliminarComponente(menuComponenteId),
    onSuccess: (data) => {
      // Obtener el cicloDiaServicioId del resultado para invalidar solo esa query
      const cicloDiaServicioId = data?.data?.ciclo_dia_servicio_id;
      if (cicloDiaServicioId) {
        queryClient.invalidateQueries({ queryKey: ['menu-componentes', cicloDiaServicioId] });
      } else {
        // Fallback: invalidar todas si no tenemos el ID
        queryClient.invalidateQueries({ queryKey: ['menu-componentes'] });
      }
      queryClient.invalidateQueries({ queryKey: ['ciclos', 'dia'] });
      queryClient.invalidateQueries({ queryKey: ['ciclos', 'progreso'] });
      queryClient.invalidateQueries({ queryKey: ['operaciones'] });
    },
  });
}

export function useActualizarReceta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ menuComponenteId, recetaId }) =>
      menuComponentesService.actualizarReceta(menuComponenteId, recetaId),
    onSuccess: (data) => {
      const cicloDiaServicioId = data?.data?.ciclo_dia_servicio_id;
      if (cicloDiaServicioId) {
        queryClient.invalidateQueries({ queryKey: ['menu-componentes', cicloDiaServicioId] });
      }
      // Actualizar ingredientes y gramajes del nuevo receta_id
      queryClient.invalidateQueries({ queryKey: ['receta-ingredientes'] });
    },
  });
}

// Gramajes
export function useGramajes(menuComponenteId) {
  return useQuery({
    queryKey: ['gramajes', menuComponenteId],
    queryFn: () => menuComponentesService.getGramajes(menuComponenteId),
    select: (response) => response.data,
    enabled: !!menuComponenteId,
  });
}

export function useGuardarGramajes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ menuComponenteId, gramajes }) =>
      menuComponentesService.guardarGramajes(menuComponenteId, gramajes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gramajes', variables.menuComponenteId] });
    },
  });
}

// Recetas locales
export function useCrearRecetaLocal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recetaEstandarId, codigoUnidad, ingredientesModificados }) =>
      menuComponentesService.crearRecetaLocal(recetaEstandarId, codigoUnidad, ingredientesModificados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-componentes'] });
    },
  });
}

// Buscar recetas
export function useBuscarRecetas(termino) {
  return useQuery({
    queryKey: ['buscar-recetas', termino],
    queryFn: () => menuComponentesService.buscarRecetas(termino),
    select: (response) => response.data,
    enabled: !!termino && termino.length >= 2,
  });
}

export function useRecetaConIngredientes(recetaId) {
  return useQuery({
    queryKey: ['receta-ingredientes', recetaId],
    queryFn: () => menuComponentesService.getRecetaConIngredientes(recetaId),
    select: (response) => response.data,
    enabled: !!recetaId,
  });
}

// Gramajes base de componentes
export function useGramajeBASEComponentes(operacionId) {
  return useQuery({
    queryKey: ['gramajes-base-componentes', operacionId],
    queryFn: () => menuComponentesService.getGramajeBASEComponentes(operacionId),
    select: (response) => response.data,
    enabled: !!operacionId,
  });
}

export function useGuardarGramajeBASEComponentes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ operacionId, gramajes }) =>
      menuComponentesService.guardarGramajeBASEComponentes(operacionId, gramajes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gramajes-base-componentes', variables.operacionId] });
    },
  });
}
