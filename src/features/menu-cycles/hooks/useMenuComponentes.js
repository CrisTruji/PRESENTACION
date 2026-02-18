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
  });
}

export function useAsignarComponente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cicloDiaServicioId, componenteId, recetaId, orden }) =>
      menuComponentesService.asignarComponente(cicloDiaServicioId, componenteId, recetaId, orden),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-componentes'] });
      queryClient.invalidateQueries({ queryKey: ['ciclos'] });
    },
  });
}

export function useEliminarComponente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (menuComponenteId) =>
      menuComponentesService.eliminarComponente(menuComponenteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-componentes'] });
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
