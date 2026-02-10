-- ========================================
-- SPRINT 3.2: Triggers para Costos Automáticos
-- Recálculo automático cuando cambian ingredientes o precios
-- ========================================
-- Fecha: 2026-02-06
-- Objetivo: Mantener costos de recetas actualizados automáticamente

-- ========================================
-- 1. AGREGAR CAMPO cambios_pendientes
-- ========================================

ALTER TABLE arbol_recetas
ADD COLUMN IF NOT EXISTS cambios_pendientes BOOLEAN DEFAULT false;

COMMENT ON COLUMN arbol_recetas.cambios_pendientes IS 'Flag: indica que el costo necesita recalcularse';

-- ========================================
-- 2. FUNCIÓN: Recalcular Costo de Receta
-- ========================================

CREATE OR REPLACE FUNCTION recalcular_costo_receta()
RETURNS TRIGGER AS $$
DECLARE
  v_receta_id UUID;
BEGIN
  -- Determinar ID de la receta afectada
  v_receta_id := COALESCE(NEW.receta_id, OLD.receta_id);

  -- Recalcular costo de la receta
  UPDATE arbol_recetas ar
  SET
    costo_calculado = COALESCE((
      SELECT SUM(ri.cantidad_requerida * mp.costo_promedio)
      FROM receta_ingredientes ri
      JOIN arbol_materia_prima mp ON ri.materia_prima_id = mp.id
      WHERE ri.receta_id = ar.id
        AND ri.activo = true
        AND mp.activo = true
    ), 0),
    updated_at = NOW(),
    cambios_pendientes = false  -- Reset flag después de recalcular
  WHERE ar.id = v_receta_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalcular_costo_receta IS 'Trigger: Recalcula costo cuando cambian ingredientes';

-- ========================================
-- 3. TRIGGER: Cambios en Ingredientes
-- ========================================

DROP TRIGGER IF EXISTS trigger_recalcular_costo_ingrediente ON receta_ingredientes;

CREATE TRIGGER trigger_recalcular_costo_ingrediente
AFTER INSERT OR UPDATE OR DELETE ON receta_ingredientes
FOR EACH ROW
EXECUTE FUNCTION recalcular_costo_receta();

COMMENT ON TRIGGER trigger_recalcular_costo_ingrediente ON receta_ingredientes
IS 'Recalcula costo de receta cuando se agregan/modifican/eliminan ingredientes';

-- ========================================
-- 4. FUNCIÓN: Actualizar Costos por Cambio de Precio
-- ========================================

CREATE OR REPLACE FUNCTION actualizar_costos_por_materia_prima()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo si cambió el costo_promedio
  IF OLD.costo_promedio IS DISTINCT FROM NEW.costo_promedio THEN

    -- Marcar recetas afectadas con cambios_pendientes
    UPDATE arbol_recetas ar
    SET
      cambios_pendientes = true,
      updated_at = NOW()
    WHERE ar.id IN (
      SELECT DISTINCT ri.receta_id
      FROM receta_ingredientes ri
      WHERE ri.materia_prima_id = NEW.id
        AND ri.activo = true
    )
    AND ar.activo = true;

    -- Opcional: Recalcular inmediatamente (puede ser pesado en producción)
    -- Para recalcular bajo demanda, comentar esta sección
    UPDATE arbol_recetas ar
    SET
      costo_calculado = COALESCE((
        SELECT SUM(ri.cantidad_requerida * mp.costo_promedio)
        FROM receta_ingredientes ri
        JOIN arbol_materia_prima mp ON ri.materia_prima_id = mp.id
        WHERE ri.receta_id = ar.id
          AND ri.activo = true
          AND mp.activo = true
      ), 0),
      cambios_pendientes = false
    WHERE ar.id IN (
      SELECT DISTINCT ri.receta_id
      FROM receta_ingredientes ri
      WHERE ri.materia_prima_id = NEW.id
        AND ri.activo = true
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_costos_por_materia_prima IS 'Trigger: Actualiza costos cuando cambia precio de materia prima';

-- ========================================
-- 5. TRIGGER: Cambio de Precio en Materia Prima
-- ========================================

DROP TRIGGER IF EXISTS trigger_actualizar_costos_materia_prima ON arbol_materia_prima;

CREATE TRIGGER trigger_actualizar_costos_materia_prima
AFTER UPDATE ON arbol_materia_prima
FOR EACH ROW
WHEN (OLD.costo_promedio IS DISTINCT FROM NEW.costo_promedio)
EXECUTE FUNCTION actualizar_costos_por_materia_prima();

COMMENT ON TRIGGER trigger_actualizar_costos_materia_prima ON arbol_materia_prima
IS 'Actualiza costos de recetas cuando cambia precio de materia prima';

-- ========================================
-- 6. VISTA: Recetas con Costos Pendientes
-- ========================================

CREATE OR REPLACE VIEW recetas_costos_pendientes AS
SELECT
  ar.id,
  ar.codigo,
  ar.nombre,
  ar.nivel_actual,
  ar.costo_calculado AS costo_actual,
  ar.updated_at AS ultima_actualizacion,
  COUNT(ri.id) AS ingredientes_count,
  -- Costo recalculado (sin guardar)
  COALESCE(SUM(ri.cantidad_requerida * mp.costo_promedio), 0) AS costo_nuevo,
  COALESCE(SUM(ri.cantidad_requerida * mp.costo_promedio), 0) - ar.costo_calculado AS diferencia
FROM arbol_recetas ar
LEFT JOIN receta_ingredientes ri ON ar.id = ri.receta_id AND ri.activo = true
LEFT JOIN arbol_materia_prima mp ON ri.materia_prima_id = mp.id AND mp.activo = true
WHERE ar.cambios_pendientes = true
  AND ar.activo = true
GROUP BY ar.id, ar.codigo, ar.nombre, ar.nivel_actual, ar.costo_calculado, ar.updated_at
ORDER BY ABS(COALESCE(SUM(ri.cantidad_requerida * mp.costo_promedio), 0) - ar.costo_calculado) DESC;

COMMENT ON VIEW recetas_costos_pendientes IS 'Recetas que necesitan recalcular costos';

-- ========================================
-- 7. VISTA: Impacto de Cambio de Precio
-- ========================================

CREATE OR REPLACE VIEW impacto_cambio_precio AS
SELECT
  mp.id AS materia_prima_id,
  mp.codigo AS mp_codigo,
  mp.nombre AS mp_nombre,
  mp.costo_promedio AS precio_actual,
  COUNT(DISTINCT ri.receta_id) AS recetas_afectadas,
  SUM(ri.cantidad_requerida) AS cantidad_total_usada,
  -- Lista de recetas afectadas
  array_agg(DISTINCT ar.nombre) AS recetas_nombres
FROM arbol_materia_prima mp
JOIN receta_ingredientes ri ON mp.id = ri.materia_prima_id AND ri.activo = true
JOIN arbol_recetas ar ON ri.receta_id = ar.id AND ar.activo = true
WHERE mp.activo = true
GROUP BY mp.id, mp.codigo, mp.nombre, mp.costo_promedio
ORDER BY COUNT(DISTINCT ri.receta_id) DESC;

COMMENT ON VIEW impacto_cambio_precio IS 'Muestra cuántas recetas se afectarían al cambiar precio de materia prima';

-- ========================================
-- 8. FUNCIÓN RPC: Recalcular Todas las Recetas
-- ========================================

CREATE OR REPLACE FUNCTION recalcular_todas_recetas()
RETURNS TABLE (
  recetas_actualizadas INTEGER,
  tiempo_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  v_start_time := clock_timestamp();

  -- Recalcular todas las recetas activas
  WITH updated AS (
    UPDATE arbol_recetas ar
    SET
      costo_calculado = COALESCE((
        SELECT SUM(ri.cantidad_requerida * mp.costo_promedio)
        FROM receta_ingredientes ri
        JOIN arbol_materia_prima mp ON ri.materia_prima_id = mp.id
        WHERE ri.receta_id = ar.id
          AND ri.activo = true
          AND mp.activo = true
      ), 0),
      cambios_pendientes = false,
      updated_at = NOW()
    WHERE ar.activo = true
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN QUERY SELECT
    v_count,
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalcular_todas_recetas IS 'RPC: Recalcula costos de todas las recetas (operación manual)';

-- ========================================
-- 9. FUNCIÓN RPC: Recalcular Recetas Pendientes
-- ========================================

CREATE OR REPLACE FUNCTION recalcular_recetas_pendientes()
RETURNS TABLE (
  recetas_actualizadas INTEGER,
  tiempo_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  v_start_time := clock_timestamp();

  -- Recalcular solo recetas con cambios pendientes
  WITH updated AS (
    UPDATE arbol_recetas ar
    SET
      costo_calculado = COALESCE((
        SELECT SUM(ri.cantidad_requerida * mp.costo_promedio)
        FROM receta_ingredientes ri
        JOIN arbol_materia_prima mp ON ri.materia_prima_id = mp.id
        WHERE ri.receta_id = ar.id
          AND ri.activo = true
          AND mp.activo = true
      ), 0),
      cambios_pendientes = false,
      updated_at = NOW()
    WHERE ar.cambios_pendientes = true
      AND ar.activo = true
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN QUERY SELECT
    v_count,
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalcular_recetas_pendientes IS 'RPC: Recalcula solo recetas marcadas con cambios_pendientes';

-- ========================================
-- 10. FUNCIÓN RPC: Simular Cambio de Precio
-- ========================================

CREATE OR REPLACE FUNCTION simular_cambio_precio(
  p_materia_prima_id UUID,
  p_nuevo_precio NUMERIC
)
RETURNS TABLE (
  receta_id UUID,
  receta_codigo VARCHAR,
  receta_nombre VARCHAR,
  costo_actual NUMERIC,
  costo_nuevo NUMERIC,
  diferencia NUMERIC,
  porcentaje_cambio NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id AS receta_id,
    ar.codigo AS receta_codigo,
    ar.nombre AS receta_nombre,
    ar.costo_calculado AS costo_actual,
    (ar.costo_calculado - ri.cantidad_requerida * mp.costo_promedio + ri.cantidad_requerida * p_nuevo_precio) AS costo_nuevo,
    (ri.cantidad_requerida * p_nuevo_precio - ri.cantidad_requerida * mp.costo_promedio) AS diferencia,
    CASE
      WHEN ar.costo_calculado > 0 THEN
        ((ri.cantidad_requerida * p_nuevo_precio - ri.cantidad_requerida * mp.costo_promedio) / ar.costo_calculado * 100)
      ELSE 0
    END AS porcentaje_cambio
  FROM receta_ingredientes ri
  JOIN arbol_recetas ar ON ri.receta_id = ar.id
  JOIN arbol_materia_prima mp ON ri.materia_prima_id = mp.id
  WHERE ri.materia_prima_id = p_materia_prima_id
    AND ri.activo = true
    AND ar.activo = true
    AND mp.activo = true
  ORDER BY ABS((ri.cantidad_requerida * p_nuevo_precio - ri.cantidad_requerida * mp.costo_promedio)) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION simular_cambio_precio IS 'RPC: Simula impacto de cambio de precio sin aplicarlo';

-- ========================================
-- 11. GRANTS (Development)
-- ========================================

GRANT EXECUTE ON FUNCTION recalcular_todas_recetas TO authenticated;
GRANT EXECUTE ON FUNCTION recalcular_recetas_pendientes TO authenticated;
GRANT EXECUTE ON FUNCTION simular_cambio_precio TO authenticated;
GRANT SELECT ON recetas_costos_pendientes TO authenticated;
GRANT SELECT ON impacto_cambio_precio TO authenticated;

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Test 1: Campo cambios_pendientes existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arbol_recetas'
      AND column_name = 'cambios_pendientes'
  ) THEN
    RAISE NOTICE 'Test 1: Campo cambios_pendientes creado ✓';
  END IF;
END $$;

-- Test 2: Funciones de trigger creadas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname IN ('recalcular_costo_receta', 'actualizar_costos_por_materia_prima')
  ) THEN
    RAISE NOTICE 'Test 2: Funciones de trigger creadas ✓';
  END IF;
END $$;

-- Test 3: Triggers activos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname IN ('trigger_recalcular_costo_ingrediente', 'trigger_actualizar_costos_materia_prima')
  ) THEN
    RAISE NOTICE 'Test 3: Triggers configurados ✓';
  END IF;
END $$;

-- Test 4: Vistas creadas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name IN ('recetas_costos_pendientes', 'impacto_cambio_precio')
  ) THEN
    RAISE NOTICE 'Test 4: Vistas de monitoreo creadas ✓';
  END IF;
END $$;

-- Test 5: Funciones RPC creadas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname IN ('recalcular_todas_recetas', 'recalcular_recetas_pendientes', 'simular_cambio_precio')
  ) THEN
    RAISE NOTICE 'Test 5: Funciones RPC para frontend creadas ✓';
  END IF;
END $$;

RAISE NOTICE '========================================';
RAISE NOTICE 'SCRIPT 05 - Triggers de Costos Completado';
RAISE NOTICE 'Recálculo automático configurado';
RAISE NOTICE 'Triggers: ingredientes y precios';
RAISE NOTICE 'Funciones RPC para gestión manual';
RAISE NOTICE '========================================';

-- ========================================
-- EJEMPLO DE USO
-- ========================================

-- Ejemplo 1: Ver recetas con costos pendientes
-- SELECT * FROM recetas_costos_pendientes;

-- Ejemplo 2: Recalcular todas las recetas manualmente
-- SELECT * FROM recalcular_todas_recetas();

-- Ejemplo 3: Recalcular solo pendientes
-- SELECT * FROM recalcular_recetas_pendientes();

-- Ejemplo 4: Simular cambio de precio
-- SELECT * FROM simular_cambio_precio('uuid-materia-prima', 150.00);

-- Ejemplo 5: Ver impacto de materia prima
-- SELECT * FROM impacto_cambio_precio WHERE recetas_afectadas > 5;
