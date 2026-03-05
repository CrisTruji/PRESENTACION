// src/features/presupuesto/hooks/useCierreCostos.js
// Carga en paralelo los tres bloques de datos para el Cierre de Costos Mensual:
//   1. Facturas del mes (compras/gastos de proveedor)
//   2. Consolidados de producción (lo que se produjo realmente)
//   3. Gasto real por categoría (RPC calcular_gasto_real_mes)

import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/shared/api';
import { presupuestoService } from '../services/presupuestoService';

async function getFacturasMes(mes) {
  // mes = 'YYYY-MM'
  const inicio = mes + '-01';
  const [y, m] = mes.split('-').map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  const fin    = `${mes}-${String(ultimo).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('facturas')
    .select(`
      id, numero_factura, fecha_factura, valor_total, estado_recepcion,
      proveedores ( nombre )
    `)
    .gte('fecha_factura', inicio)
    .lte('fecha_factura', fin)
    .order('fecha_factura', { ascending: true });

  if (error) throw error;
  return (data || []).map((f) => ({
    ...f,
    proveedor_nombre: f.proveedores?.nombre ?? 'Sin proveedor',
  }));
}

async function getConsolidadosMes(mes) {
  const inicio = mes + '-01';
  const [y, m] = mes.split('-').map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  const fin    = `${mes}-${String(ultimo).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('consolidados_produccion')
    .select('id, fecha, servicio, total_porciones, estado')
    .gte('fecha', inicio)
    .lte('fecha', fin)
    .order('fecha', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Hook que carga los tres bloques del cierre de costos en paralelo.
 * @param {string} mes - 'YYYY-MM'
 */
export function useCierreCostos(mes) {
  const results = useQueries({
    queries: [
      {
        queryKey:  ['cierre-facturas', mes],
        queryFn:   () => getFacturasMes(mes),
        enabled:   !!mes,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey:  ['cierre-consolidados', mes],
        queryFn:   () => getConsolidadosMes(mes),
        enabled:   !!mes,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey:  ['gasto-real-mes', mes],
        queryFn:   () => presupuestoService.getGastoReal(mes).then((r) => r.data || []),
        enabled:   !!mes,
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  return {
    facturas:      results[0].data ?? [],
    consolidados:  results[1].data ?? [],
    gastoReal:     results[2].data ?? [],
    isLoading:     results.some((r) => r.isLoading),
    errors:        results.filter((r) => r.error).map((r) => r.error.message),
  };
}
