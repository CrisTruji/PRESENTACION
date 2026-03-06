// ========================================
// useSemaforoOperativo - Estado de pedidos del día
// ========================================
// Carga en paralelo:
//   1. servicios_unidad activos con su hora_limite y operación
//   2. pedidos_servicio de hoy (no borradores)
// La lógica del semáforo (verde/amarillo/rojo) se calcula en el componente
// porque requiere la hora actual del cliente.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api';

async function fetchSemaforoData() {
  const hoy = new Date().toISOString().split('T')[0];

  const [serviciosResult, pedidosResult] = await Promise.all([
    // Todos los servicios_unidad activos con info de operación
    supabase
      .from('servicios_unidad')
      .select(
        'id, operacion_id, servicio, hora_limite, capacidad_promedio, operaciones!inner(id, nombre)'
      )
      .eq('activo', true),

    // Pedidos de hoy confirmados (excluye borradores)
    supabase
      .from('pedidos_servicio')
      .select('operacion_id, servicio, estado, hora_envio')
      .eq('fecha', hoy)
      .neq('estado', 'borrador'),
  ]);

  return {
    servicios: serviciosResult.data || [],
    pedidos:   pedidosResult.data   || [],
  };
}

/**
 * Hook para el Semáforo Operativo.
 * - staleTime: 2 min (datos no se re-fetchen si son recientes)
 * - refetchInterval: 5 min (polling automático sin intervención del usuario)
 */
export function useSemaforoOperativo() {
  return useQuery({
    queryKey: ['semaforo-operativo'],
    queryFn:  fetchSemaforoData,
    staleTime:       2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
