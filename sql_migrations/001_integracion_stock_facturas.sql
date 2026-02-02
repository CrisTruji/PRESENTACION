-- ============================================================
-- MIGRACIÓN: Integración de Facturas con Stock
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1.1 CREAR TABLA proveedor_presentaciones
-- Vincula proveedores con presentaciones del árbol (nivel 6)
-- ============================================================
CREATE TABLE IF NOT EXISTS proveedor_presentaciones (
  id BIGSERIAL PRIMARY KEY,
  proveedor_id BIGINT REFERENCES proveedores(id) NOT NULL,
  presentacion_id BIGINT REFERENCES arbol_materia_prima(id) NOT NULL,
  precio_referencia DECIMAL(12,4),
  codigo_proveedor VARCHAR(50),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proveedor_id, presentacion_id)
);

CREATE INDEX IF NOT EXISTS idx_prov_pres_proveedor ON proveedor_presentaciones(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_prov_pres_presentacion ON proveedor_presentaciones(presentacion_id);

-- ============================================================
-- 1.2 MODIFICAR TABLA solicitud_items
-- Agregar referencia al árbol de materia prima
-- ============================================================
ALTER TABLE solicitud_items
ADD COLUMN IF NOT EXISTS presentacion_id BIGINT REFERENCES arbol_materia_prima(id);

CREATE INDEX IF NOT EXISTS idx_sol_items_presentacion ON solicitud_items(presentacion_id);

-- ============================================================
-- 1.3 MODIFICAR TABLA factura_items
-- Agregar referencia al árbol de materia prima
-- ============================================================
ALTER TABLE factura_items
ADD COLUMN IF NOT EXISTS presentacion_id BIGINT REFERENCES arbol_materia_prima(id);

CREATE INDEX IF NOT EXISTS idx_fact_items_presentacion ON factura_items(presentacion_id);

-- ============================================================
-- 1.4 CREAR TABLA movimientos_inventario
-- Auditoría de movimientos de stock
-- ============================================================
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT REFERENCES arbol_materia_prima(id) NOT NULL,
  presentacion_id BIGINT REFERENCES arbol_materia_prima(id),
  factura_id BIGINT REFERENCES facturas(id),
  factura_item_id BIGINT REFERENCES factura_items(id),
  tipo_movimiento VARCHAR(20) CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste')) NOT NULL,
  cantidad_presentacion DECIMAL(12,4),
  cantidad_unidad_base DECIMAL(12,4) NOT NULL,
  unidad VARCHAR(20),
  stock_anterior DECIMAL(12,4),
  stock_posterior DECIMAL(12,4),
  costo_unitario DECIMAL(12,4),
  costo_promedio_anterior DECIMAL(12,4),
  costo_promedio_posterior DECIMAL(12,4),
  observaciones TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mov_inv_producto ON movimientos_inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_mov_inv_factura ON movimientos_inventario(factura_id);
CREATE INDEX IF NOT EXISTS idx_mov_inv_fecha ON movimientos_inventario(created_at);

-- ============================================================
-- 1.5 AGREGAR CAMPOS DE COSTO A arbol_recetas
-- ============================================================
ALTER TABLE arbol_recetas
ADD COLUMN IF NOT EXISTS costo_total DECIMAL(12,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS costo_porcion DECIMAL(12,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultima_actualizacion_costo TIMESTAMPTZ;

-- ============================================================
-- 1.6 CREAR RPC actualizar_stock_desde_factura
-- Actualiza stock del producto (nivel 5) desde presentación (nivel 6)
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_stock_desde_factura(
  p_presentacion_id BIGINT,
  p_cantidad_recibida DECIMAL,
  p_precio_unitario DECIMAL,
  p_factura_id BIGINT,
  p_factura_item_id BIGINT,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_producto_id BIGINT;
  v_contenido_unidad DECIMAL;
  v_cantidad_base DECIMAL;
  v_stock_actual DECIMAL;
  v_costo_promedio DECIMAL;
  v_nuevo_stock DECIMAL;
  v_nuevo_costo DECIMAL;
  v_unidad VARCHAR;
  v_costo_por_unidad_base DECIMAL;
  v_nombre_producto VARCHAR;
  v_nombre_presentacion VARCHAR;
BEGIN
  -- Obtener datos de la presentación (nivel 6)
  SELECT parent_id, contenido_unidad, nombre
  INTO v_producto_id, v_contenido_unidad, v_nombre_presentacion
  FROM arbol_materia_prima
  WHERE id = p_presentacion_id AND nivel_actual = 6 AND activo = TRUE;

  IF v_producto_id IS NULL THEN
    RAISE EXCEPTION 'Presentación no encontrada o no es nivel 6. ID: %', p_presentacion_id;
  END IF;

  -- Calcular cantidad en unidad base
  -- Ej: 3 unidades de "3000ml" = 9000 ml
  v_cantidad_base := p_cantidad_recibida * COALESCE(v_contenido_unidad, 1);

  -- Calcular costo por unidad base
  -- Ej: Si 1 presentación de 3000ml cuesta $15000, entonces 1ml cuesta $5
  IF COALESCE(v_contenido_unidad, 1) > 0 THEN
    v_costo_por_unidad_base := p_precio_unitario / v_contenido_unidad;
  ELSE
    v_costo_por_unidad_base := p_precio_unitario;
  END IF;

  -- Obtener stock actual del producto (nivel 5)
  SELECT stock_actual, costo_promedio, unidad_stock, nombre
  INTO v_stock_actual, v_costo_promedio, v_unidad, v_nombre_producto
  FROM arbol_materia_prima
  WHERE id = v_producto_id AND nivel_actual = 5;

  IF v_nombre_producto IS NULL THEN
    RAISE EXCEPTION 'Producto padre (nivel 5) no encontrado. ID: %', v_producto_id;
  END IF;

  -- Calcular nuevo stock
  v_nuevo_stock := COALESCE(v_stock_actual, 0) + v_cantidad_base;

  -- Calcular nuevo costo promedio ponderado
  IF v_nuevo_stock > 0 THEN
    v_nuevo_costo := (
      (COALESCE(v_stock_actual, 0) * COALESCE(v_costo_promedio, 0)) +
      (v_cantidad_base * v_costo_por_unidad_base)
    ) / v_nuevo_stock;
  ELSE
    v_nuevo_costo := v_costo_por_unidad_base;
  END IF;

  -- Actualizar producto (nivel 5)
  UPDATE arbol_materia_prima
  SET
    stock_actual = v_nuevo_stock,
    costo_promedio = v_nuevo_costo,
    updated_at = NOW()
  WHERE id = v_producto_id;

  -- Registrar movimiento de inventario
  INSERT INTO movimientos_inventario (
    producto_id, presentacion_id, factura_id, factura_item_id,
    tipo_movimiento, cantidad_presentacion, cantidad_unidad_base, unidad,
    stock_anterior, stock_posterior,
    costo_unitario, costo_promedio_anterior, costo_promedio_posterior,
    created_by
  ) VALUES (
    v_producto_id, p_presentacion_id, p_factura_id, p_factura_item_id,
    'entrada', p_cantidad_recibida, v_cantidad_base, v_unidad,
    COALESCE(v_stock_actual, 0), v_nuevo_stock,
    p_precio_unitario, COALESCE(v_costo_promedio, 0), v_nuevo_costo,
    p_user_id
  );

  -- Registrar en historial_precios (si la tabla existe)
  BEGIN
    INSERT INTO historial_precios (
      producto_id, presentacion_id, factura_id,
      precio_unitario, cantidad, created_at
    ) VALUES (
      v_producto_id, p_presentacion_id, p_factura_id,
      v_costo_por_unidad_base, v_cantidad_base, NOW()
    );
  EXCEPTION WHEN undefined_table THEN
    -- Si no existe la tabla historial_precios, continuar sin error
    NULL;
  END;

  RETURN json_build_object(
    'success', TRUE,
    'producto_id', v_producto_id,
    'producto_nombre', v_nombre_producto,
    'presentacion_id', p_presentacion_id,
    'presentacion_nombre', v_nombre_presentacion,
    'cantidad_presentaciones', p_cantidad_recibida,
    'cantidad_unidad_base', v_cantidad_base,
    'unidad', v_unidad,
    'stock_anterior', COALESCE(v_stock_actual, 0),
    'stock_nuevo', v_nuevo_stock,
    'costo_anterior', COALESCE(v_costo_promedio, 0),
    'costo_nuevo', v_nuevo_costo
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'presentacion_id', p_presentacion_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 1.7 CREAR RPC calcular_costo_receta
-- Calcula el costo total de una receta basado en sus ingredientes
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_costo_receta(p_receta_id BIGINT)
RETURNS JSON AS $$
DECLARE
  v_costo_total DECIMAL := 0;
  v_rendimiento INTEGER;
  v_costo_porcion DECIMAL;
  v_nombre_receta VARCHAR;
  v_ingredientes_count INTEGER := 0;
  r RECORD;
BEGIN
  -- Obtener datos de la receta
  SELECT rendimiento, nombre
  INTO v_rendimiento, v_nombre_receta
  FROM arbol_recetas
  WHERE id = p_receta_id AND activo = TRUE;

  IF v_nombre_receta IS NULL THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Receta no encontrada',
      'receta_id', p_receta_id
    );
  END IF;

  -- Calcular costo sumando ingredientes
  FOR r IN
    SELECT
      ri.cantidad_requerida,
      amp.costo_promedio,
      amp.nombre as ingrediente_nombre
    FROM receta_ingredientes ri
    JOIN arbol_materia_prima amp ON ri.materia_prima_id = amp.id
    WHERE ri.receta_id = p_receta_id
  LOOP
    v_costo_total := v_costo_total + (r.cantidad_requerida * COALESCE(r.costo_promedio, 0));
    v_ingredientes_count := v_ingredientes_count + 1;
  END LOOP;

  -- Calcular costo por porción
  IF COALESCE(v_rendimiento, 0) > 0 THEN
    v_costo_porcion := v_costo_total / v_rendimiento;
  ELSE
    v_costo_porcion := v_costo_total;
  END IF;

  -- Actualizar receta con costos calculados
  UPDATE arbol_recetas
  SET
    costo_total = v_costo_total,
    costo_porcion = v_costo_porcion,
    ultima_actualizacion_costo = NOW()
  WHERE id = p_receta_id;

  RETURN json_build_object(
    'success', TRUE,
    'receta_id', p_receta_id,
    'receta_nombre', v_nombre_receta,
    'costo_total', v_costo_total,
    'rendimiento', v_rendimiento,
    'costo_porcion', v_costo_porcion,
    'ingredientes_count', v_ingredientes_count
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'receta_id', p_receta_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- HABILITAR RLS EN NUEVAS TABLAS
-- ============================================================
ALTER TABLE proveedor_presentaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- Políticas para proveedor_presentaciones
CREATE POLICY "Permitir lectura a usuarios autenticados" ON proveedor_presentaciones
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserción a usuarios autenticados" ON proveedor_presentaciones
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir actualización a usuarios autenticados" ON proveedor_presentaciones
  FOR UPDATE TO authenticated USING (true);

-- Políticas para movimientos_inventario
CREATE POLICY "Permitir lectura a usuarios autenticados" ON movimientos_inventario
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserción a usuarios autenticados" ON movimientos_inventario
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
