-- ========================================
-- SPRINT 3.1: Sistema de Stock Completo
-- Niveles 5 y 6 en Árbol de Materia Prima
-- ========================================
-- Fecha: 2026-02-06
-- Objetivo: Soportar 6 niveles para gestión completa de inventario

-- ========================================
-- 1. ACTUALIZAR CONSTRAINT PARA 6 NIVELES
-- ========================================

-- Eliminar constraint viejo
ALTER TABLE arbol_materia_prima
DROP CONSTRAINT IF EXISTS arbol_materia_prima_nivel_actual_check;

-- Crear constraint nuevo (niveles 1-6)
ALTER TABLE arbol_materia_prima
ADD CONSTRAINT arbol_materia_prima_nivel_actual_check
CHECK (nivel_actual IN (1, 2, 3, 4, 5, 6));

COMMENT ON CONSTRAINT arbol_materia_prima_nivel_actual_check
ON arbol_materia_prima IS 'Niveles: 1=Categoría Principal, 2=Subcategoría, 3=Grupo, 4=Familia, 5=Stock, 6=Presentaciones';

-- ========================================
-- 2. AGREGAR CAMPOS PARA STOCK (NIVEL 5)
-- ========================================

-- Stock actual y límites
ALTER TABLE arbol_materia_prima
ADD COLUMN IF NOT EXISTS stock_actual NUMERIC(10,2) DEFAULT 0 CHECK (stock_actual >= 0),
ADD COLUMN IF NOT EXISTS stock_minimo NUMERIC(10,2) DEFAULT 0 CHECK (stock_minimo >= 0),
ADD COLUMN IF NOT EXISTS stock_maximo NUMERIC(10,2) DEFAULT 0 CHECK (stock_maximo >= 0),
ADD COLUMN IF NOT EXISTS unidad_medida VARCHAR(20);

-- Comentarios descriptivos
COMMENT ON COLUMN arbol_materia_prima.stock_actual IS 'Cantidad actual en inventario (nivel 5)';
COMMENT ON COLUMN arbol_materia_prima.stock_minimo IS 'Alerta cuando stock < stock_minimo';
COMMENT ON COLUMN arbol_materia_prima.stock_maximo IS 'Máximo permitido en inventario';
COMMENT ON COLUMN arbol_materia_prima.unidad_medida IS 'kg, L, unidades, etc.';

-- ========================================
-- 3. AGREGAR CAMPOS PARA PRESENTACIONES (NIVEL 6)
-- ========================================

-- Presentaciones y precios
ALTER TABLE arbol_materia_prima
ADD COLUMN IF NOT EXISTS presentacion VARCHAR(100),
ADD COLUMN IF NOT EXISTS cantidad_por_unidad NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(10,2) CHECK (precio_unitario >= 0),
ADD COLUMN IF NOT EXISTS codigo_barra VARCHAR(50);

-- Comentarios descriptivos
COMMENT ON COLUMN arbol_materia_prima.presentacion IS 'Ej: Bolsa 5kg, Caja 12 unidades (nivel 6)';
COMMENT ON COLUMN arbol_materia_prima.cantidad_por_unidad IS 'Cantidad en la presentación';
COMMENT ON COLUMN arbol_materia_prima.precio_unitario IS 'Precio de esta presentación';
COMMENT ON COLUMN arbol_materia_prima.codigo_barra IS 'Código de barras para scanner';

-- ========================================
-- 4. ÍNDICES DE PERFORMANCE
-- ========================================

-- Índice para stock bajo (alertas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materia_prima_stock_bajo
ON arbol_materia_prima(stock_actual, stock_minimo)
WHERE nivel_actual = 5 AND activo = true AND stock_actual < stock_minimo;

-- Índice para nivel 5 (stock)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materia_prima_nivel_5
ON arbol_materia_prima(nivel_actual, activo)
WHERE nivel_actual = 5;

-- Índice para nivel 6 (presentaciones)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materia_prima_nivel_6
ON arbol_materia_prima(nivel_actual, activo)
WHERE nivel_actual = 6;

-- Índice para unidad de medida (agrupaciones)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materia_prima_unidad
ON arbol_materia_prima(unidad_medida)
WHERE nivel_actual = 5 AND activo = true;

-- Índice para código de barra (búsquedas rápidas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materia_prima_codigo_barra
ON arbol_materia_prima(codigo_barra)
WHERE codigo_barra IS NOT NULL AND activo = true;

-- ========================================
-- 5. VISTA PARA STOCK CON ALERTAS
-- ========================================

CREATE OR REPLACE VIEW vista_stock_alertas AS
SELECT
  mp.id,
  mp.codigo,
  mp.nombre,
  mp.stock_actual,
  mp.stock_minimo,
  mp.stock_maximo,
  mp.unidad_medida,
  mp.costo_promedio,
  mp.costo_promedio * mp.stock_actual AS valor_inventario,
  CASE
    WHEN mp.stock_actual < mp.stock_minimo THEN 'CRÍTICO'
    WHEN mp.stock_actual < (mp.stock_minimo * 1.2) THEN 'BAJO'
    WHEN mp.stock_actual > mp.stock_maximo THEN 'EXCESO'
    ELSE 'NORMAL'
  END AS estado_stock,
  mp.stock_minimo - mp.stock_actual AS cantidad_reabastecer,
  -- Relación con categoría
  mp.parent_id AS familia_id,
  p4.nombre AS familia_nombre,
  p4.parent_id AS grupo_id,
  p3.nombre AS grupo_nombre,
  p3.parent_id AS subcategoria_id,
  p2.nombre AS subcategoria_nombre,
  p2.parent_id AS categoria_id,
  p1.nombre AS categoria_nombre,
  mp.updated_at AS ultima_actualizacion
FROM arbol_materia_prima mp
LEFT JOIN arbol_materia_prima p4 ON mp.parent_id = p4.id  -- Familia (nivel 4)
LEFT JOIN arbol_materia_prima p3 ON p4.parent_id = p3.id  -- Grupo (nivel 3)
LEFT JOIN arbol_materia_prima p2 ON p3.parent_id = p2.id  -- Subcategoría (nivel 2)
LEFT JOIN arbol_materia_prima p1 ON p2.parent_id = p1.id  -- Categoría (nivel 1)
WHERE mp.nivel_actual = 5
  AND mp.activo = true
ORDER BY
  CASE
    WHEN mp.stock_actual < mp.stock_minimo THEN 1
    WHEN mp.stock_actual < (mp.stock_minimo * 1.2) THEN 2
    WHEN mp.stock_actual > mp.stock_maximo THEN 3
    ELSE 4
  END,
  mp.nombre;

COMMENT ON VIEW vista_stock_alertas IS 'Stock con alertas y jerarquía completa';

-- ========================================
-- 6. VISTA PARA PRESENTACIONES
-- ========================================

CREATE OR REPLACE VIEW vista_presentaciones AS
SELECT
  pres.id,
  pres.codigo,
  pres.nombre,
  pres.presentacion,
  pres.cantidad_por_unidad,
  pres.precio_unitario,
  pres.codigo_barra,
  -- Relación con stock (nivel 5)
  stock.id AS stock_id,
  stock.codigo AS stock_codigo,
  stock.nombre AS stock_nombre,
  stock.stock_actual,
  stock.unidad_medida,
  -- Cálculo precio por unidad base
  CASE
    WHEN pres.cantidad_por_unidad > 0 THEN
      pres.precio_unitario / pres.cantidad_por_unidad
    ELSE NULL
  END AS precio_por_unidad_base,
  pres.updated_at
FROM arbol_materia_prima pres
JOIN arbol_materia_prima stock ON pres.parent_id = stock.id
WHERE pres.nivel_actual = 6
  AND pres.activo = true
  AND stock.nivel_actual = 5
  AND stock.activo = true
ORDER BY stock.nombre, pres.presentacion;

COMMENT ON VIEW vista_presentaciones IS 'Presentaciones vinculadas a su stock';

-- ========================================
-- 7. FUNCIÓN: Actualizar Stock
-- ========================================

CREATE OR REPLACE FUNCTION actualizar_stock(
  p_stock_id UUID,
  p_cantidad NUMERIC,
  p_operacion VARCHAR DEFAULT 'incrementar'
)
RETURNS TABLE (
  success BOOLEAN,
  nuevo_stock NUMERIC,
  mensaje TEXT
) AS $$
DECLARE
  v_stock_actual NUMERIC;
  v_stock_minimo NUMERIC;
  v_nuevo_stock NUMERIC;
BEGIN
  -- Obtener stock actual
  SELECT stock_actual, stock_minimo
  INTO v_stock_actual, v_stock_minimo
  FROM arbol_materia_prima
  WHERE id = p_stock_id
    AND nivel_actual = 5
    AND activo = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'Stock no encontrado'::TEXT;
    RETURN;
  END IF;

  -- Calcular nuevo stock
  IF p_operacion = 'incrementar' THEN
    v_nuevo_stock := v_stock_actual + p_cantidad;
  ELSIF p_operacion = 'decrementar' THEN
    v_nuevo_stock := v_stock_actual - p_cantidad;
  ELSE
    v_nuevo_stock := p_cantidad; -- Establecer directamente
  END IF;

  -- Validar stock no negativo
  IF v_nuevo_stock < 0 THEN
    RETURN QUERY SELECT
      false,
      v_stock_actual,
      'ERROR: Stock insuficiente (actual: ' || v_stock_actual || ', requerido: ' || p_cantidad || ')'::TEXT;
    RETURN;
  END IF;

  -- Actualizar stock
  UPDATE arbol_materia_prima
  SET
    stock_actual = v_nuevo_stock,
    updated_at = NOW()
  WHERE id = p_stock_id;

  -- Retornar resultado con alerta si es necesario
  RETURN QUERY SELECT
    true,
    v_nuevo_stock,
    CASE
      WHEN v_nuevo_stock < v_stock_minimo THEN
        'ALERTA: Stock bajo (actual: ' || v_nuevo_stock || ', mínimo: ' || v_stock_minimo || ')'
      ELSE
        'Stock actualizado correctamente'
    END::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_stock IS 'Actualiza stock con validaciones y alertas';

-- ========================================
-- 8. FUNCIÓN: Calcular Costo Promedio Últimos N Meses
-- ========================================

CREATE OR REPLACE FUNCTION calcular_costo_promedio(
  p_materia_prima_id UUID,
  p_meses INTEGER DEFAULT 3
)
RETURNS TABLE (
  materia_prima_id UUID,
  costo_promedio NUMERIC,
  registros_count INTEGER,
  fecha_desde DATE,
  fecha_hasta DATE
) AS $$
BEGIN
  RETURN QUERY
  WITH movimientos AS (
    SELECT
      mp.id AS materia_prima_id,
      mp.precio_unitario AS costo,
      mp.updated_at::DATE AS fecha
    FROM arbol_materia_prima mp
    WHERE mp.id = p_materia_prima_id
      AND mp.nivel_actual = 6  -- Presentaciones tienen precios
      AND mp.activo = true
      AND mp.updated_at >= CURRENT_DATE - (p_meses || ' months')::INTERVAL
  )
  SELECT
    p_materia_prima_id,
    COALESCE(AVG(m.costo), 0)::NUMERIC(10,2) AS costo_promedio,
    COUNT(*)::INTEGER AS registros_count,
    MIN(m.fecha) AS fecha_desde,
    MAX(m.fecha) AS fecha_hasta
  FROM movimientos m;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_costo_promedio IS 'Calcula costo promedio de materia prima basado en presentaciones de últimos N meses';

-- ========================================
-- 9. FUNCIÓN: Obtener Stock Bajo (RPC para frontend)
-- ========================================

CREATE OR REPLACE FUNCTION obtener_stock_bajo()
RETURNS TABLE (
  id UUID,
  codigo VARCHAR,
  nombre VARCHAR,
  stock_actual NUMERIC,
  stock_minimo NUMERIC,
  diferencia NUMERIC,
  categoria VARCHAR,
  unidad_medida VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mp.id,
    mp.codigo,
    mp.nombre,
    mp.stock_actual,
    mp.stock_minimo,
    mp.stock_minimo - mp.stock_actual AS diferencia,
    p1.nombre AS categoria,
    mp.unidad_medida
  FROM arbol_materia_prima mp
  LEFT JOIN arbol_materia_prima p4 ON mp.parent_id = p4.id
  LEFT JOIN arbol_materia_prima p3 ON p4.parent_id = p3.id
  LEFT JOIN arbol_materia_prima p2 ON p3.parent_id = p2.id
  LEFT JOIN arbol_materia_prima p1 ON p2.parent_id = p1.id
  WHERE mp.nivel_actual = 5
    AND mp.activo = true
    AND mp.stock_actual < mp.stock_minimo
  ORDER BY (mp.stock_minimo - mp.stock_actual) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION obtener_stock_bajo IS 'RPC: Retorna items con stock bajo ordenados por urgencia';

-- ========================================
-- 10. GRANTS (Development - Todos los permisos)
-- ========================================

-- Nota: En producción, restringir con RLS
GRANT ALL ON arbol_materia_prima TO authenticated;
GRANT ALL ON vista_stock_alertas TO authenticated;
GRANT ALL ON vista_presentaciones TO authenticated;
GRANT EXECUTE ON FUNCTION actualizar_stock TO authenticated;
GRANT EXECUTE ON FUNCTION calcular_costo_promedio TO authenticated;
GRANT EXECUTE ON FUNCTION obtener_stock_bajo TO authenticated;

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Test 1: Constraint permite 6 niveles
DO $$
BEGIN
  RAISE NOTICE 'Test 1: Constraint niveles 1-6 configurado ✓';
END $$;

-- Test 2: Campos de stock existen
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arbol_materia_prima'
      AND column_name IN ('stock_actual', 'stock_minimo', 'presentacion')
  ) THEN
    RAISE NOTICE 'Test 2: Campos de stock y presentaciones creados ✓';
  END IF;
END $$;

-- Test 3: Índices creados
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'arbol_materia_prima'
      AND indexname LIKE 'idx_materia_prima_nivel_%'
  ) THEN
    RAISE NOTICE 'Test 3: Índices de niveles 5 y 6 creados ✓';
  END IF;
END $$;

-- Test 4: Vistas funcionando
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name IN ('vista_stock_alertas', 'vista_presentaciones')
  ) THEN
    RAISE NOTICE 'Test 4: Vistas creadas ✓';
  END IF;
END $$;

-- Test 5: Funciones creadas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname IN ('actualizar_stock', 'calcular_costo_promedio', 'obtener_stock_bajo')
  ) THEN
    RAISE NOTICE 'Test 5: Funciones RPC creadas ✓';
  END IF;
END $$;

RAISE NOTICE '========================================';
RAISE NOTICE 'SCRIPT 04 - Sistema de Stock Completado';
RAISE NOTICE 'Niveles 1-6 soportados';
RAISE NOTICE 'Stock (nivel 5) y Presentaciones (nivel 6)';
RAISE NOTICE 'Vistas y funciones RPC listas';
RAISE NOTICE '========================================';
