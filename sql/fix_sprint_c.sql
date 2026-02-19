-- ============================================================
-- FIX SPRINT C — Performance, robustez y calidad
-- Healthy App - PRESENTACION
-- NOTA: C6 (RLS diferenciada) está diferida para producción
-- ============================================================

-- ============================================================
-- C1: RPC para ingredientes totales del consolidado
-- Reemplaza el loop N+1 en consolidadoService.getIngredientesTotales
-- (40+ queries → 1 query en el servidor)
-- ============================================================
CREATE OR REPLACE FUNCTION get_ingredientes_totales(p_consolidado_id UUID)
RETURNS TABLE (
  materia_prima_id BIGINT,   -- arbol_materia_prima.id es BIGINT (tabla heredada del sistema legacy)
  nombre TEXT,
  codigo TEXT,
  unidad_medida TEXT,
  stock_actual NUMERIC,
  stock_minimo NUMERIC,
  total_requerido NUMERIC,
  diferencia NUMERIC,
  estado_stock TEXT
) AS $$
  SELECT
    mp.id AS materia_prima_id,
    mp.nombre,
    mp.codigo,
    mp.unidad_medida,
    COALESCE(mp.stock_actual, 0) AS stock_actual,
    COALESCE(mp.stock_minimo, 0) AS stock_minimo,
    ROUND(
      SUM(ri.cantidad_requerida * (ci.cantidad_total::NUMERIC / NULLIF(ar.rendimiento, 0))),
      2
    ) AS total_requerido,
    ROUND(
      COALESCE(mp.stock_actual, 0) -
      SUM(ri.cantidad_requerida * (ci.cantidad_total::NUMERIC / NULLIF(ar.rendimiento, 0))),
      2
    ) AS diferencia,
    CASE
      WHEN COALESCE(mp.stock_actual, 0) >=
           SUM(ri.cantidad_requerida * (ci.cantidad_total::NUMERIC / NULLIF(ar.rendimiento, 0)))
      THEN 'SUFICIENTE'
      ELSE 'INSUFICIENTE'
    END AS estado_stock
  FROM consolidado_items ci
  JOIN arbol_recetas ar ON ar.id = ci.receta_id
  JOIN receta_ingredientes ri ON ri.receta_id = ci.receta_id AND ri.activo = true
  JOIN arbol_materia_prima mp ON mp.id = ri.materia_prima_id
  WHERE ci.consolidado_id = p_consolidado_id
  GROUP BY
    mp.id, mp.nombre, mp.codigo, mp.unidad_medida, mp.stock_actual, mp.stock_minimo
  ORDER BY
    CASE WHEN COALESCE(mp.stock_actual, 0) <
              SUM(ri.cantidad_requerida * (ci.cantidad_total::NUMERIC / NULLIF(ar.rendimiento, 0)))
         THEN 0 ELSE 1 END,
    mp.nombre;
$$ LANGUAGE sql STABLE;


-- ============================================================
-- C3: RPC para descontar stock al marcar como preparado
-- Implementa el TODO que estaba en consolidadoService.marcarPreparado
-- ============================================================
CREATE OR REPLACE FUNCTION descontar_stock_consolidado(p_consolidado_id UUID)
RETURNS void AS $$
  UPDATE arbol_materia_prima mp
  SET
    stock_actual = mp.stock_actual - calc.total_requerido,
    updated_at = now()
  FROM (
    SELECT
      ri.materia_prima_id,
      SUM(ri.cantidad_requerida * (ci.cantidad_total::NUMERIC / NULLIF(ar.rendimiento, 0))) AS total_requerido
    FROM consolidado_items ci
    JOIN arbol_recetas ar ON ar.id = ci.receta_id
    JOIN receta_ingredientes ri ON ri.receta_id = ci.receta_id AND ri.activo = true
    WHERE ci.consolidado_id = p_consolidado_id
    GROUP BY ri.materia_prima_id
  ) calc
  WHERE mp.id = calc.materia_prima_id;
$$ LANGUAGE sql;


-- ============================================================
-- C4: Fix calcular_dia_ciclo para fechas anteriores al inicio del ciclo
-- Actualmente devuelve un número negativo (módulo PostgreSQL con negativos)
-- Después del fix: retorna NULL para fechas antes del inicio
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_dia_ciclo(p_operacion_id UUID, p_fecha DATE)
RETURNS INT AS $$
DECLARE
  v_ciclo RECORD;
  v_cantidad_ciclos INT;
  v_dias_desde_inicio INT;
BEGIN
  SELECT * INTO v_ciclo FROM ciclos_menu
  WHERE operacion_id = p_operacion_id AND activo = true AND estado = 'activo'
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT cantidad_ciclos INTO v_cantidad_ciclos FROM operaciones WHERE id = p_operacion_id;

  v_dias_desde_inicio := (p_fecha - v_ciclo.fecha_inicio) + v_ciclo.dia_actual_ciclo;

  -- Si la fecha es anterior al inicio del ciclo, retornar NULL en vez de número negativo
  IF v_dias_desde_inicio <= 0 THEN RETURN NULL; END IF;

  RETURN ((v_dias_desde_inicio - 1) % v_cantidad_ciclos) + 1;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- C5: Índices faltantes para mejorar performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pedidos_created_by
  ON pedidos_servicio(created_by);

CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_estado
  ON pedidos_servicio(fecha, estado);

CREATE INDEX IF NOT EXISTS idx_pedidos_operacion_fecha
  ON pedidos_servicio(operacion_id, fecha, servicio);

CREATE INDEX IF NOT EXISTS idx_ciclos_operacion_estado
  ON ciclos_menu(operacion_id, estado, activo);

CREATE INDEX IF NOT EXISTS idx_consolidado_items_consolidado
  ON consolidado_items(consolidado_id);

CREATE INDEX IF NOT EXISTS idx_receta_ingredientes_receta
  ON receta_ingredientes(receta_id) WHERE activo = true;
