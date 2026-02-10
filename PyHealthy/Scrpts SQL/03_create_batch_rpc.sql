-- ========================================
-- SPRINT 1.3: BATCH RPC PARA COSTOS
-- ========================================
-- Calcula costos de múltiples recetas en una sola llamada
-- Reemplaza N llamadas individuales con 1 llamada batch
-- Ejecutar en Supabase SQL Editor

-- ========================================
-- RPC: calcular_costos_batch
-- ========================================

CREATE OR REPLACE FUNCTION calcular_costos_batch(p_receta_ids UUID[])
RETURNS TABLE(
  receta_id UUID,
  costo_total NUMERIC,
  ingredientes_count INTEGER,
  ingredientes_con_costo INTEGER,
  ingredientes_sin_costo INTEGER,
  costo_por_porcion NUMERIC,
  rendimiento INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id as receta_id,
    COALESCE(SUM(ri.cantidad_requerida * amp.costo_promedio), 0)::NUMERIC as costo_total,
    COUNT(ri.id)::INTEGER as ingredientes_count,
    COUNT(CASE WHEN amp.costo_promedio > 0 THEN 1 END)::INTEGER as ingredientes_con_costo,
    COUNT(CASE WHEN amp.costo_promedio IS NULL OR amp.costo_promedio = 0 THEN 1 END)::INTEGER as ingredientes_sin_costo,
    CASE
      WHEN ar.rendimiento > 0 THEN
        (COALESCE(SUM(ri.cantidad_requerida * amp.costo_promedio), 0) / ar.rendimiento)::NUMERIC
      ELSE 0::NUMERIC
    END as costo_por_porcion,
    ar.rendimiento::INTEGER
  FROM unnest(p_receta_ids) WITH ORDINALITY AS input_ids(id, ord)
  LEFT JOIN arbol_recetas ar ON ar.id = input_ids.id
  LEFT JOIN receta_ingredientes ri ON ri.receta_id = ar.id
  LEFT JOIN arbol_materia_prima amp ON amp.id = ri.materia_prima_id
  GROUP BY ar.id, ar.rendimiento, input_ids.ord
  ORDER BY input_ids.ord;
END;
$$;

-- Agregar comentario para documentación
COMMENT ON FUNCTION calcular_costos_batch IS
'Calcula costos de múltiples recetas en batch.
Parámetros:
  - p_receta_ids: Array de UUIDs de recetas
Retorna:
  - receta_id, costo_total, ingredientes_count, etc.
Ejemplo:
  SELECT * FROM calcular_costos_batch(ARRAY[
    ''uuid1''::uuid,
    ''uuid2''::uuid
  ]);';

-- ========================================
-- TEST DE LA FUNCIÓN
-- ========================================

DO $$
DECLARE
  test_ids UUID[];
  result RECORD;
BEGIN
  -- Obtener 5 recetas de prueba
  SELECT ARRAY_AGG(id) INTO test_ids
  FROM arbol_recetas
  WHERE nivel_actual = 2
  LIMIT 5;

  -- Ejecutar función
  RAISE NOTICE 'Testing calcular_costos_batch con % recetas', array_length(test_ids, 1);

  FOR result IN
    SELECT * FROM calcular_costos_batch(test_ids)
  LOOP
    RAISE NOTICE 'Receta: %, Costo: %, Ingredientes: %',
      result.receta_id, result.costo_total, result.ingredientes_count;
  END LOOP;

  RAISE NOTICE 'Función calcular_costos_batch funcionando correctamente ✓';
END $$;

-- ========================================
-- COMPARACIÓN MANUAL vs BATCH
-- ========================================

WITH recetas_test AS (
  SELECT id FROM arbol_recetas WHERE nivel_actual = 2 LIMIT 5
)
SELECT
  ar.id,
  ar.codigo,
  ar.nombre,
  COUNT(ri.id) as ingredientes_count,
  SUM(ri.cantidad_requerida * amp.costo_promedio) as costo_manual,
  batch.costo_total as costo_batch,
  batch.costo_total - SUM(ri.cantidad_requerida * amp.costo_promedio) as diferencia
FROM recetas_test rt
JOIN arbol_recetas ar ON ar.id = rt.id
LEFT JOIN receta_ingredientes ri ON ri.receta_id = ar.id
LEFT JOIN arbol_materia_prima amp ON amp.id = ri.materia_prima_id
CROSS JOIN LATERAL (
  SELECT * FROM calcular_costos_batch(ARRAY[ar.id])
) batch
GROUP BY ar.id, ar.codigo, ar.nombre, batch.costo_total;

-- Resultado esperado: diferencia = 0 (o muy cercano por redondeo)
