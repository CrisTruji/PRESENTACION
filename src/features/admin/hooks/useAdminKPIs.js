// ========================================
// useAdminKPIs - KPIs del dashboard admin
// ========================================

import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/shared/api';

export function useAdminKPIs() {
  const results = useQueries({
    queries: [
      // 1. Pedidos de hoy
      {
        queryKey: ['kpi-pedidos-hoy'],
        queryFn: async () => {
          const hoy = new Date().toISOString().split('T')[0];
          const { count } = await supabase
            .from('pedidos_servicio')
            .select('id', { count: 'exact', head: true })
            .eq('fecha', hoy);
          return count || 0;
        },
        staleTime: 5 * 60 * 1000,
      },
      // 2. Ciclos activos
      {
        queryKey: ['kpi-ciclos'],
        queryFn: async () => {
          const { count } = await supabase
            .from('ciclos_menu')
            .select('id', { count: 'exact', head: true })
            .eq('estado', 'activo')
            .eq('activo', true);
          return count || 0;
        },
        staleTime: 10 * 60 * 1000,
      },
      // 3. Solicitudes pendientes
      {
        queryKey: ['kpi-solicitudes'],
        queryFn: async () => {
          const { count } = await supabase
            .from('solicitudes')
            .select('id', { count: 'exact', head: true })
            .in('estado', ['pendiente', 'revision_aux']);
          return count || 0;
        },
        staleTime: 5 * 60 * 1000,
      },
      // 4. Facturas de la semana
      {
        queryKey: ['kpi-facturas'],
        queryFn: async () => {
          const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { count } = await supabase
            .from('facturas')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', hace7dias);
          return count || 0;
        },
        staleTime: 5 * 60 * 1000,
      },
      // 5. Productos con stock crítico (stock_actual < stock_minimo)
      {
        queryKey: ['kpi-stock-critico'],
        queryFn: async () => {
          const { data } = await supabase
            .from('arbol_materia_prima')
            .select('id, stock_actual, stock_minimo')
            .eq('nivel_actual', 5)
            .eq('activo', true)
            .not('stock_minimo', 'is', null);
          const criticos = (data || []).filter(
            (p) => p.stock_actual !== null && p.stock_actual < p.stock_minimo
          ).length;
          return criticos;
        },
        staleTime: 5 * 60 * 1000,
      },
      // 6. Valor total del inventario
      {
        queryKey: ['kpi-valor-inventario'],
        queryFn: async () => {
          const { data } = await supabase
            .from('arbol_materia_prima')
            .select('stock_actual, costo_promedio')
            .eq('nivel_actual', 5)
            .eq('activo', true);
          const total = (data || []).reduce(
            (s, p) => s + (p.stock_actual || 0) * (p.costo_promedio || 0),
            0
          );
          return Math.round(total);
        },
        staleTime: 10 * 60 * 1000,
      },
    ],
  });

  const [pedidosHoy, ciclosActivos, solicitudesPendientes, facturasSemanales, stockCritico, valorInventario] = results;

  return {
    pedidosHoy: pedidosHoy.data ?? 0,
    ciclosActivos: ciclosActivos.data ?? 0,
    solicitudesPendientes: solicitudesPendientes.data ?? 0,
    facturasSemanales: facturasSemanales.data ?? 0,
    stockCritico: stockCritico.data ?? 0,
    valorInventario: valorInventario.data ?? 0,
    isLoading: results.some((r) => r.isLoading),
  };
}
