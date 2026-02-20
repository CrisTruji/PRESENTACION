-- ============================================================
-- 07_sistema_facturas_stock.sql
-- Sistema completo de facturación y actualización de stock
--
-- IMPORTANTE: Este script asume que arbol_materia_prima.id es BIGINT
-- (coincide con la base de datos real de este proyecto).
--
-- Tablas que ya existen y NO se recrean:
--   factura_items          — Ya existe con producto_arbol_id, presentacion_id
--   movimientos_inventario — Ya existe con todas las columnas necesarias
--
-- Lo que este script hace:
--   1. Crea proveedor_presentaciones si no existe
--   2. Agrega columnas faltantes en factura_items si no existen
--   3. DROP + CREATE de procesar_factura_stock (corrige firma BIGINT)
--   4. CREATE OR REPLACE de resumen_inventario y obtener_stock_producto
-- ============================================================

-- ============================================================
-- 1. TABLA: proveedor_presentaciones
--    Vincula proveedores con presentaciones (nivel 6) + precio referencia
-- ============================================================

CREATE TABLE IF NOT EXISTS proveedor_presentaciones (
  id                BIGSERIAL    PRIMARY KEY,
  proveedor_id      INTEGER      NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  presentacion_id   BIGINT       NOT NULL REFERENCES arbol_materia_prima(id) ON DELETE CASCADE,
  precio_referencia NUMERIC(12,2) DEFAULT 0 CHECK (precio_referencia >= 0),
  codigo_proveedor  VARCHAR(50),
  activo            BOOLEAN      NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (proveedor_id, presentacion_id)
);

CREATE INDEX IF NOT EXISTS idx_prov_pres_proveedor    ON proveedor_presentaciones(proveedor_id)   WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_prov_pres_presentacion ON proveedor_presentaciones(presentacion_id) WHERE activo = true;

COMMENT ON TABLE proveedor_presentaciones IS
  'Vínculo proveedor ↔ presentación (nivel 6) con precio de referencia';

-- ============================================================
-- 2. Columnas faltantes en factura_items
--    (la tabla ya existe — solo agrega si no están)
-- ============================================================

ALTER TABLE factura_items
  ADD COLUMN IF NOT EXISTS producto_arbol_id BIGINT REFERENCES arbol_materia_prima(id),
  ADD COLUMN IF NOT EXISTS presentacion_id   BIGINT REFERENCES arbol_materia_prima(id),
  ADD COLUMN IF NOT EXISTS cantidad_recibida NUMERIC(12,3) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_factura_items_presentacion
  ON factura_items(presentacion_id) WHERE presentacion_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_factura_items_producto
  ON factura_items(producto_arbol_id) WHERE producto_arbol_id IS NOT NULL;

-- ============================================================
-- 3. RPC: procesar_factura_stock  (BIGINT — coincide con IDs reales)
--
--    Flujo por cada factura_item con presentacion_id:
--      a) Lee contenido_unidad de la presentación (nivel 6)
--      b) Convierte: base = cantidad_recibida × contenido_unidad
--      c) Calcula nuevo costo promedio ponderado
--      d) Actualiza stock_actual y costo_promedio en nivel 5
--      e) Actualiza precio_referencia en proveedor_presentaciones
--           (precio_referencia = costo_promedio calculado → evoluciona
--            con cada entrada real, partiendo del dato histórico inicial)
--      f) Inserta fila en movimientos_inventario
--      g) Marca factura como 'procesado' o 'error'
-- ============================================================

-- Eliminar versión vieja
DROP FUNCTION IF EXISTS procesar_factura_stock(bigint);
DROP FUNCTION IF EXISTS procesar_factura_stock(uuid);

CREATE OR REPLACE FUNCTION procesar_factura_stock(p_factura_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_item                RECORD;
  v_presentacion        RECORD;
  v_producto            RECORD;
  v_cantidad_base       NUMERIC;
  v_nuevo_stock         NUMERIC;
  v_nuevo_costo         NUMERIC;
  v_proveedor_id        INTEGER;
  v_precio_base_inicial NUMERIC;
  v_procesados          INTEGER := 0;
  v_errores             INTEGER := 0;
  v_resultado           JSONB   := '[]'::JSONB;
BEGIN

  -- Leer proveedor_id de la factura (necesario para actualizar precio_referencia)
  SELECT proveedor_id INTO v_proveedor_id
  FROM   facturas
  WHERE  id = p_factura_id;

  -- Marcar como procesando
  UPDATE facturas
  SET estado_procesamiento = 'procesando',
      updated_at           = now()
  WHERE id = p_factura_id;

  -- Iterar sobre items con presentacion_id y cantidad > 0
  FOR v_item IN
    SELECT fi.*
    FROM   factura_items fi
    WHERE  fi.factura_id      = p_factura_id
      AND  fi.presentacion_id IS NOT NULL
      AND  fi.cantidad_recibida > 0
  LOOP
    BEGIN

      -- a) Datos de la presentación (nivel 6)
      SELECT id, nombre, parent_id,
             COALESCE(contenido_unidad, 1)  AS contenido_unidad,
             COALESCE(unidad_contenido, '') AS unidad_contenido
      INTO   v_presentacion
      FROM   arbol_materia_prima
      WHERE  id           = v_item.presentacion_id
        AND  nivel_actual = 6
        AND  activo       = true;

      IF NOT FOUND THEN
        v_errores := v_errores + 1;
        RAISE WARNING 'Presentacion % no encontrada (nivel 6 activo)', v_item.presentacion_id;
        CONTINUE;
      END IF;

      -- b) Datos del producto (nivel 5)
      --    Prioridad: producto_arbol_id del item → parent_id de la presentación
      SELECT id,
             COALESCE(stock_actual,    0) AS stock_actual,
             COALESCE(costo_promedio,  0) AS costo_promedio,
             COALESCE(unidad_medida, v_presentacion.unidad_contenido) AS unidad_medida
      INTO   v_producto
      FROM   arbol_materia_prima
      WHERE  id = COALESCE(v_item.producto_arbol_id, v_presentacion.parent_id)
        AND  nivel_actual = 5
        AND  activo       = true;

      IF NOT FOUND THEN
        v_errores := v_errores + 1;
        RAISE WARNING 'Producto nivel 5 no encontrado para presentacion %', v_item.presentacion_id;
        CONTINUE;
      END IF;

      -- c) Cantidad en unidad base
      v_cantidad_base := v_item.cantidad_recibida * v_presentacion.contenido_unidad;

      -- d) Nuevo stock
      v_nuevo_stock := v_producto.stock_actual + v_cantidad_base;

      -- e) Costo promedio ponderado
      --    Si el stock actual es 0 y precio_referencia existe en proveedor_presentaciones,
      --    lo usa como costo base inicial en lugar de 0.
      IF v_producto.costo_promedio = 0 AND v_proveedor_id IS NOT NULL THEN
        SELECT COALESCE(precio_referencia, 0)
        INTO   v_precio_base_inicial
        FROM   proveedor_presentaciones
        WHERE  proveedor_id    = v_proveedor_id
          AND  presentacion_id = v_item.presentacion_id
          AND  activo          = true
        LIMIT 1;
        -- Si no encontró registro, usar 0
        IF NOT FOUND THEN
          v_precio_base_inicial := 0;
        END IF;
      ELSE
        v_precio_base_inicial := v_producto.costo_promedio;
      END IF;

      IF v_nuevo_stock > 0 THEN
        v_nuevo_costo := (
          (v_producto.stock_actual  * v_precio_base_inicial)
          + (v_cantidad_base        * v_item.precio_unitario)
        ) / v_nuevo_stock;
      ELSE
        v_nuevo_costo := v_item.precio_unitario;
      END IF;

      -- f) Actualizar nivel 5
      UPDATE arbol_materia_prima
      SET stock_actual   = v_nuevo_stock,
          costo_promedio = ROUND(v_nuevo_costo, 4),
          updated_at     = now()
      WHERE id = v_producto.id;

      -- f2) Actualizar precio_referencia en proveedor_presentaciones
      --     El precio_referencia evoluciona con cada compra real:
      --     usa el costo promedio ponderado recién calculado.
      --     Si no existe registro aún, lo ignora (sin error).
      IF v_proveedor_id IS NOT NULL THEN
        UPDATE proveedor_presentaciones
        SET precio_referencia = ROUND(v_nuevo_costo, 2),
            updated_at        = now()
        WHERE proveedor_id    = v_proveedor_id
          AND presentacion_id = v_item.presentacion_id
          AND activo          = true;
      END IF;

      -- g) Registrar movimiento
      INSERT INTO movimientos_inventario (
        factura_id,
        producto_id,
        presentacion_id,
        tipo_movimiento,
        cantidad_presentacion,
        cantidad_unidad_base,
        costo_unitario,
        stock_anterior,
        stock_posterior,
        costo_promedio_anterior,
        costo_promedio_posterior,
        unidad,
        created_at
      ) VALUES (
        p_factura_id,
        v_producto.id,
        v_item.presentacion_id,
        'entrada',
        v_item.cantidad_recibida,
        v_cantidad_base,
        v_item.precio_unitario,
        v_producto.stock_actual,
        v_nuevo_stock,
        v_producto.costo_promedio,
        ROUND(v_nuevo_costo, 4),
        v_producto.unidad_medida,
        now()
      );

      v_resultado  := v_resultado || jsonb_build_object(
        'producto_id',    v_producto.id,
        'stock_anterior', v_producto.stock_actual,
        'stock_nuevo',    v_nuevo_stock,
        'cantidad_base',  v_cantidad_base
      );
      v_procesados := v_procesados + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errores  := v_errores + 1;
      v_resultado := v_resultado || jsonb_build_object(
        'error_item_id',      v_item.id,
        'error_presentacion', v_item.presentacion_id,
        'error_msg',          SQLERRM,
        'error_state',        SQLSTATE
      );
      RAISE WARNING 'Error item % factura %: % (state: %)', v_item.id, p_factura_id, SQLERRM, SQLSTATE;
    END;
  END LOOP;

  -- Marcar resultado final
  UPDATE facturas
  SET estado_procesamiento   = CASE WHEN v_errores = 0 THEN 'procesado' ELSE 'error' END,
      intentos_procesamiento = intentos_procesamiento + 1,
      updated_at             = now()
  WHERE id = p_factura_id;

  RETURN jsonb_build_object(
    'procesados', v_procesados,
    'errores',    v_errores,
    'detalle',    v_resultado
  );
END;
$$;

COMMENT ON FUNCTION procesar_factura_stock(BIGINT) IS
  'Procesa una factura: actualiza stock_actual y costo_promedio ponderado '
  'en arbol_materia_prima (nivel 5), actualiza precio_referencia en '
  'proveedor_presentaciones (evoluciona como promedio ponderado de entradas '
  'reales, partiendo del dato histórico inicial), y genera movimientos_inventario.';

-- ============================================================
-- 4. RPC: resumen_inventario
-- ============================================================

CREATE OR REPLACE FUNCTION resumen_inventario(p_tipo_rama TEXT DEFAULT NULL)
RETURNS TABLE (
  id               BIGINT,
  codigo           TEXT,
  nombre           TEXT,
  stock_actual     NUMERIC,
  stock_minimo     NUMERIC,
  stock_maximo     NUMERIC,
  unidad_medida    TEXT,
  costo_promedio   NUMERIC,
  valor_inventario NUMERIC,
  estado_stock     TEXT,
  categoria        TEXT
)
LANGUAGE sql STABLE AS $$
  SELECT
    mp.id,
    mp.codigo::TEXT,
    mp.nombre::TEXT,
    COALESCE(mp.stock_actual,  0),
    COALESCE(mp.stock_minimo,  0),
    COALESCE(mp.stock_maximo,  0),
    COALESCE(mp.unidad_medida, '')::TEXT,
    COALESCE(mp.costo_promedio, 0),
    ROUND(COALESCE(mp.costo_promedio, 0) * COALESCE(mp.stock_actual, 0), 2),
    CASE
      WHEN mp.stock_actual < mp.stock_minimo                        THEN 'CRÍTICO'
      WHEN mp.stock_actual < mp.stock_minimo * 1.2                  THEN 'BAJO'
      WHEN mp.stock_maximo > 0 AND mp.stock_actual > mp.stock_maximo THEN 'EXCESO'
      ELSE 'NORMAL'
    END,
    cat.nombre::TEXT
  FROM arbol_materia_prima mp
  LEFT JOIN arbol_materia_prima fam ON fam.id = mp.parent_id     AND fam.nivel_actual = 4
  LEFT JOIN arbol_materia_prima grp ON grp.id = fam.parent_id    AND grp.nivel_actual = 3
  LEFT JOIN arbol_materia_prima sub ON sub.id = grp.parent_id    AND sub.nivel_actual = 2
  LEFT JOIN arbol_materia_prima cat ON cat.id = sub.parent_id    AND cat.nivel_actual = 1
  WHERE mp.nivel_actual = 5
    AND mp.activo = true
    AND (p_tipo_rama IS NULL OR cat.nombre ILIKE '%' || p_tipo_rama || '%')
  ORDER BY
    CASE
      WHEN mp.stock_actual < mp.stock_minimo      THEN 1
      WHEN mp.stock_actual < mp.stock_minimo * 1.2 THEN 2
      ELSE 3
    END,
    mp.nombre;
$$;

-- ============================================================
-- 5. RPC: obtener_stock_producto
-- ============================================================

CREATE OR REPLACE FUNCTION obtener_stock_producto(p_producto_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_producto    RECORD;
  v_presiones   JSONB;
  v_movimientos JSONB;
BEGIN
  SELECT id, codigo, nombre, stock_actual, stock_minimo, stock_maximo,
         unidad_medida, costo_promedio, updated_at
  INTO   v_producto
  FROM   arbol_materia_prima
  WHERE  id = p_producto_id AND nivel_actual = 5;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Producto no encontrado');
  END IF;

  -- Presentaciones (nivel 6)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',               pres.id,
    'nombre',           pres.nombre,
    'contenido_unidad', COALESCE(pres.contenido_unidad, 1),
    'unidad_contenido', pres.unidad_contenido,
    'precio_unitario',  pres.precio_unitario
  )), '[]'::JSONB)
  INTO v_presiones
  FROM arbol_materia_prima pres
  WHERE pres.parent_id   = p_producto_id
    AND pres.nivel_actual = 6
    AND pres.activo       = true;

  -- Últimos 10 movimientos
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',              mi.id,
    'tipo',            mi.tipo_movimiento,
    'cantidad_base',   mi.cantidad_unidad_base,
    'stock_anterior',  mi.stock_anterior,
    'stock_posterior', mi.stock_posterior,
    'fecha',           mi.created_at
  ) ORDER BY mi.created_at DESC), '[]'::JSONB)
  INTO v_movimientos
  FROM (
    SELECT * FROM movimientos_inventario
    WHERE producto_id = p_producto_id
    ORDER BY created_at DESC
    LIMIT 10
  ) mi;

  RETURN jsonb_build_object(
    'id',             v_producto.id,
    'codigo',         v_producto.codigo,
    'nombre',         v_producto.nombre,
    'stock_actual',   COALESCE(v_producto.stock_actual,  0),
    'stock_minimo',   COALESCE(v_producto.stock_minimo,  0),
    'stock_maximo',   COALESCE(v_producto.stock_maximo,  0),
    'unidad_medida',  v_producto.unidad_medida,
    'costo_promedio', COALESCE(v_producto.costo_promedio, 0),
    'presentaciones', v_presiones,
    'movimientos',    v_movimientos
  );
END;
$$;

-- ============================================================
-- 6. RLS básica (si las tablas son nuevas)
-- ============================================================

DO $$
BEGIN
  -- proveedor_presentaciones
  BEGIN
    ALTER TABLE proveedor_presentaciones ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'proveedor_presentaciones'
      AND policyname = 'auth_all_prov_pres'
  ) THEN
    CREATE POLICY auth_all_prov_pres
      ON proveedor_presentaciones FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;
