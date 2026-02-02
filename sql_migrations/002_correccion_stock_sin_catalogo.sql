-- ============================================================
-- MIGRACIÓN 002: Corrección de Stock sin catalogo_productos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 2.1 ACTUALIZAR TABLA solicitud_items
-- Eliminar dependencia de catalogo_productos, usar arbol_materia_prima
-- ============================================================

-- Agregar columna para producto del árbol si no existe
ALTER TABLE solicitud_items
ADD COLUMN IF NOT EXISTS producto_arbol_id BIGINT REFERENCES arbol_materia_prima(id);

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_sol_items_producto_arbol ON solicitud_items(producto_arbol_id);

-- ============================================================
-- 2.2 ACTUALIZAR TABLA factura_items
-- Eliminar dependencia de catalogo_productos
-- ============================================================

-- Agregar columna para producto del árbol si no existe
ALTER TABLE factura_items
ADD COLUMN IF NOT EXISTS producto_arbol_id BIGINT REFERENCES arbol_materia_prima(id);

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_fact_items_producto_arbol ON factura_items(producto_arbol_id);

-- ============================================================
-- 2.3 AGREGAR CAMPO costo_promedio A arbol_materia_prima
-- Si no existe
-- ============================================================
ALTER TABLE arbol_materia_prima
ADD COLUMN IF NOT EXISTS costo_promedio DECIMAL(12,4) DEFAULT 0;

-- ============================================================
-- 2.4 CREAR/ACTUALIZAR RPC procesar_factura_stock
-- Procesa todos los items de una factura y actualiza stock
-- ============================================================
CREATE OR REPLACE FUNCTION procesar_factura_stock(p_factura_id BIGINT)
RETURNS JSON AS $$
DECLARE
  v_item RECORD;
  v_resultado JSON;
  v_resultados JSON[] := ARRAY[]::JSON[];
  v_total_procesados INTEGER := 0;
  v_total_errores INTEGER := 0;
  v_user_id UUID;

  -- Variables para cálculo
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
  -- Obtener usuario de la factura
  SELECT created_by INTO v_user_id FROM facturas WHERE id = p_factura_id;

  -- Procesar cada item de la factura que tenga presentacion_id
  FOR v_item IN
    SELECT
      fi.id as factura_item_id,
      fi.presentacion_id,
      fi.cantidad_recibida,
      fi.precio_unitario
    FROM factura_items fi
    WHERE fi.factura_id = p_factura_id
      AND fi.presentacion_id IS NOT NULL
  LOOP
    BEGIN
      -- Obtener datos de la presentación (nivel 6)
      SELECT parent_id, contenido_unidad, nombre
      INTO v_producto_id, v_contenido_unidad, v_nombre_presentacion
      FROM arbol_materia_prima
      WHERE id = v_item.presentacion_id AND nivel_actual = 6 AND activo = TRUE;

      IF v_producto_id IS NULL THEN
        v_resultados := v_resultados || json_build_object(
          'success', FALSE,
          'item_id', v_item.factura_item_id,
          'error', 'Presentación no encontrada o no es nivel 6'
        );
        v_total_errores := v_total_errores + 1;
        CONTINUE;
      END IF;

      -- Calcular cantidad en unidad base
      v_cantidad_base := v_item.cantidad_recibida * COALESCE(v_contenido_unidad, 1);

      -- Calcular costo por unidad base
      IF COALESCE(v_contenido_unidad, 1) > 0 THEN
        v_costo_por_unidad_base := v_item.precio_unitario / v_contenido_unidad;
      ELSE
        v_costo_por_unidad_base := v_item.precio_unitario;
      END IF;

      -- Obtener stock actual del producto (nivel 5)
      SELECT stock_actual, costo_promedio, unidad_stock, nombre
      INTO v_stock_actual, v_costo_promedio, v_unidad, v_nombre_producto
      FROM arbol_materia_prima
      WHERE id = v_producto_id AND nivel_actual = 5;

      IF v_nombre_producto IS NULL THEN
        v_resultados := v_resultados || json_build_object(
          'success', FALSE,
          'item_id', v_item.factura_item_id,
          'error', 'Producto padre (nivel 5) no encontrado'
        );
        v_total_errores := v_total_errores + 1;
        CONTINUE;
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
        v_producto_id, v_item.presentacion_id, p_factura_id, v_item.factura_item_id,
        'entrada', v_item.cantidad_recibida, v_cantidad_base, v_unidad,
        COALESCE(v_stock_actual, 0), v_nuevo_stock,
        v_item.precio_unitario, COALESCE(v_costo_promedio, 0), v_nuevo_costo,
        v_user_id
      );

      v_resultados := v_resultados || json_build_object(
        'success', TRUE,
        'producto_id', v_producto_id,
        'producto_nombre', v_nombre_producto,
        'presentacion_id', v_item.presentacion_id,
        'presentacion_nombre', v_nombre_presentacion,
        'cantidad_presentaciones', v_item.cantidad_recibida,
        'cantidad_unidad_base', v_cantidad_base,
        'unidad', v_unidad,
        'stock_anterior', COALESCE(v_stock_actual, 0),
        'stock_nuevo', v_nuevo_stock,
        'costo_anterior', COALESCE(v_costo_promedio, 0),
        'costo_nuevo', v_nuevo_costo
      );

      v_total_procesados := v_total_procesados + 1;

    EXCEPTION WHEN OTHERS THEN
      v_resultados := v_resultados || json_build_object(
        'success', FALSE,
        'item_id', v_item.factura_item_id,
        'error', SQLERRM
      );
      v_total_errores := v_total_errores + 1;
    END;
  END LOOP;

  -- Actualizar estado de procesamiento de la factura
  UPDATE facturas
  SET
    estado_procesamiento = CASE
      WHEN v_total_errores = 0 THEN 'completado'
      WHEN v_total_procesados > 0 THEN 'parcial'
      ELSE 'error'
    END,
    updated_at = NOW()
  WHERE id = p_factura_id;

  RETURN json_build_object(
    'success', v_total_errores = 0,
    'factura_id', p_factura_id,
    'total_procesados', v_total_procesados,
    'total_errores', v_total_errores,
    'movimientos', to_json(v_resultados)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', FALSE,
    'factura_id', p_factura_id,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2.5 CREAR VISTA PARA INVENTARIO
-- Vista consolidada del inventario
-- ============================================================
CREATE OR REPLACE VIEW vista_inventario AS
SELECT
  amp.id,
  amp.codigo,
  amp.nombre,
  amp.tipo_rama,
  amp.nivel_actual,
  amp.stock_actual,
  amp.stock_minimo,
  amp.stock_maximo,
  amp.unidad_stock,
  amp.costo_promedio,
  amp.maneja_stock,
  amp.activo,
  COALESCE(amp.stock_actual, 0) * COALESCE(amp.costo_promedio, 0) as valor_inventario,
  CASE
    WHEN amp.stock_minimo IS NOT NULL AND amp.stock_actual < amp.stock_minimo THEN 'bajo'
    WHEN amp.stock_maximo IS NOT NULL AND amp.stock_actual > amp.stock_maximo THEN 'exceso'
    ELSE 'normal'
  END as estado_stock,
  (
    SELECT COUNT(*)
    FROM arbol_materia_prima pres
    WHERE pres.parent_id = amp.id AND pres.nivel_actual = 6 AND pres.activo = TRUE
  ) as total_presentaciones,
  padre.nombre as categoria_padre,
  padre.codigo as codigo_padre
FROM arbol_materia_prima amp
LEFT JOIN arbol_materia_prima padre ON amp.parent_id = padre.id
WHERE amp.nivel_actual = 5
  AND amp.activo = TRUE
  AND amp.maneja_stock = TRUE;

-- ============================================================
-- 2.6 CREAR FUNCIÓN PARA OBTENER STOCK DE PRODUCTO CON PRESENTACIONES
-- ============================================================
CREATE OR REPLACE FUNCTION obtener_stock_producto(p_producto_id BIGINT)
RETURNS JSON AS $$
DECLARE
  v_producto RECORD;
  v_presentaciones JSON;
  v_ultimos_movimientos JSON;
BEGIN
  -- Obtener datos del producto
  SELECT
    id, codigo, nombre, stock_actual, stock_minimo, stock_maximo,
    unidad_stock, costo_promedio, maneja_stock
  INTO v_producto
  FROM arbol_materia_prima
  WHERE id = p_producto_id AND nivel_actual = 5;

  IF v_producto IS NULL THEN
    RETURN json_build_object('success', FALSE, 'error', 'Producto no encontrado');
  END IF;

  -- Obtener presentaciones
  SELECT json_agg(json_build_object(
    'id', id,
    'codigo', codigo,
    'nombre', nombre,
    'contenido_unidad', contenido_unidad,
    'unidad_contenido', unidad_contenido
  ))
  INTO v_presentaciones
  FROM arbol_materia_prima
  WHERE parent_id = p_producto_id AND nivel_actual = 6 AND activo = TRUE;

  -- Obtener últimos 10 movimientos
  SELECT json_agg(json_build_object(
    'id', mi.id,
    'tipo', mi.tipo_movimiento,
    'cantidad_presentacion', mi.cantidad_presentacion,
    'cantidad_base', mi.cantidad_unidad_base,
    'stock_anterior', mi.stock_anterior,
    'stock_posterior', mi.stock_posterior,
    'costo_unitario', mi.costo_unitario,
    'fecha', mi.created_at,
    'presentacion', (SELECT nombre FROM arbol_materia_prima WHERE id = mi.presentacion_id)
  ))
  INTO v_ultimos_movimientos
  FROM (
    SELECT * FROM movimientos_inventario
    WHERE producto_id = p_producto_id
    ORDER BY created_at DESC
    LIMIT 10
  ) mi;

  RETURN json_build_object(
    'success', TRUE,
    'producto', json_build_object(
      'id', v_producto.id,
      'codigo', v_producto.codigo,
      'nombre', v_producto.nombre,
      'stock_actual', v_producto.stock_actual,
      'stock_minimo', v_producto.stock_minimo,
      'stock_maximo', v_producto.stock_maximo,
      'unidad_stock', v_producto.unidad_stock,
      'costo_promedio', v_producto.costo_promedio,
      'valor_inventario', COALESCE(v_producto.stock_actual, 0) * COALESCE(v_producto.costo_promedio, 0)
    ),
    'presentaciones', COALESCE(v_presentaciones, '[]'::json),
    'ultimos_movimientos', COALESCE(v_ultimos_movimientos, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2.7 CREAR FUNCIÓN PARA RESUMEN DE INVENTARIO
-- ============================================================
CREATE OR REPLACE FUNCTION resumen_inventario(p_tipo_rama VARCHAR DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_total_productos INTEGER;
  v_total_valor DECIMAL;
  v_productos_bajo_stock INTEGER;
  v_productos_sin_stock INTEGER;
  v_productos JSON;
BEGIN
  -- Contar productos
  SELECT
    COUNT(*),
    COALESCE(SUM(COALESCE(stock_actual, 0) * COALESCE(costo_promedio, 0)), 0),
    COUNT(*) FILTER (WHERE stock_minimo IS NOT NULL AND stock_actual < stock_minimo),
    COUNT(*) FILTER (WHERE COALESCE(stock_actual, 0) = 0)
  INTO v_total_productos, v_total_valor, v_productos_bajo_stock, v_productos_sin_stock
  FROM arbol_materia_prima
  WHERE nivel_actual = 5
    AND activo = TRUE
    AND maneja_stock = TRUE
    AND (p_tipo_rama IS NULL OR tipo_rama = p_tipo_rama);

  -- Obtener lista de productos
  SELECT json_agg(json_build_object(
    'id', id,
    'codigo', codigo,
    'nombre', nombre,
    'tipo_rama', tipo_rama,
    'stock_actual', stock_actual,
    'stock_minimo', stock_minimo,
    'unidad_stock', unidad_stock,
    'costo_promedio', costo_promedio,
    'valor_inventario', COALESCE(stock_actual, 0) * COALESCE(costo_promedio, 0),
    'estado_stock', CASE
      WHEN stock_minimo IS NOT NULL AND stock_actual < stock_minimo THEN 'bajo'
      WHEN COALESCE(stock_actual, 0) = 0 THEN 'agotado'
      ELSE 'normal'
    END
  ) ORDER BY nombre)
  INTO v_productos
  FROM arbol_materia_prima
  WHERE nivel_actual = 5
    AND activo = TRUE
    AND maneja_stock = TRUE
    AND (p_tipo_rama IS NULL OR tipo_rama = p_tipo_rama);

  RETURN json_build_object(
    'success', TRUE,
    'resumen', json_build_object(
      'total_productos', v_total_productos,
      'valor_total_inventario', v_total_valor,
      'productos_bajo_stock', v_productos_bajo_stock,
      'productos_sin_stock', v_productos_sin_stock
    ),
    'productos', COALESCE(v_productos, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FIN DE LA MIGRACIÓN 002
-- ============================================================
