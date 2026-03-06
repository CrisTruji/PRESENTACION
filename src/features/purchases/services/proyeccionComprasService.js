// ========================================
// PROYECCION COMPRAS SERVICE
// Calcula necesidades de compra basadas en
// ciclos de menú activos vs. stock actual
// ========================================

import { supabase, supabaseRequest } from '@/shared/api';

/**
 * Llama a la función SQL calcular_necesidades_compra(p_dias_adelante)
 * Retorna ingredientes con déficit proyectado para los próximos X días.
 *
 * Columnas retornadas:
 *   materia_prima_id, codigo, nombre, unidad_medida,
 *   cantidad_requerida, stock_actual, deficit, costo_estimado,
 *   prioridad ('critico'|'bajo'|'ok'), fuente ('menu'|'stock_minimo')
 */
export async function getProyeccionCompras(diasAdelante = 7) {
  return supabaseRequest(
    supabase.rpc('calcular_necesidades_compra', { p_dias_adelante: diasAdelante })
  );
}
