-- ============================================================
-- test_factura_recepcion.sql
-- Script de prueba: crea una solicitud en estado 'comprado'
-- con items que tienen presentacion_id y producto_arbol_id
-- para poder probar la recepción de facturas y actualización de stock.
--
-- INSTRUCCIONES:
--   1. Ejecutar en el SQL Editor de Supabase
--   2. Tomar nota del ID de solicitud creado
--   3. Ir a Almacenista → Recepción de Facturas → verificar que aparece
-- ============================================================

-- Paso 1: Ver los primeros nodos nivel 5 y sus presentaciones nivel 6
-- (para encontrar IDs válidos para el test)
SELECT
  p5.id        AS producto_id,
  p5.codigo    AS producto_codigo,
  p5.nombre    AS producto_nombre,
  p6.id        AS presentacion_id,
  p6.codigo    AS presentacion_codigo,
  p6.nombre    AS presentacion_nombre,
  p6.contenido_unidad,
  p6.unidad_contenido
FROM arbol_materia_prima p5
JOIN arbol_materia_prima p6 ON p6.parent_id = p5.id AND p6.nivel_actual = 6 AND p6.activo = true
WHERE p5.nivel_actual = 5 AND p5.activo = true
ORDER BY p5.nombre
LIMIT 10;

-- ============================================================
-- Paso 2: Una vez que tengas IDs válidos del paso 1,
-- ejecutar el bloque DO para crear la solicitud de prueba.
--
-- REEMPLAZA los IDs con los que obtuviste en el paso 1:
--   v_proveedor_id   → un ID válido de la tabla proveedores
--   v_prod1_id       → producto_id nivel 5
--   v_pres1_id       → presentacion_id nivel 6 (hijo de v_prod1_id)
--   v_prod2_id       → segundo producto_id nivel 5
--   v_pres2_id       → segunda presentacion_id nivel 6 (hijo de v_prod2_id)
-- ============================================================

DO $$
DECLARE
  v_solicitud_id  BIGINT;
  v_proveedor_id  INTEGER;
  v_prod1_id      BIGINT;
  v_pres1_id      BIGINT;
  v_prod2_id      BIGINT;
  v_pres2_id      BIGINT;
BEGIN
  -- ── Tomar un proveedor existente ──────────────────────────
  SELECT id INTO v_proveedor_id FROM proveedores LIMIT 1;

  -- ── Tomar los primeros dos productos nivel 5 con presentaciones ──
  SELECT p5.id, p6.id
  INTO v_prod1_id, v_pres1_id
  FROM arbol_materia_prima p5
  JOIN arbol_materia_prima p6 ON p6.parent_id = p5.id AND p6.nivel_actual = 6 AND p6.activo = true
  WHERE p5.nivel_actual = 5 AND p5.activo = true
  ORDER BY p5.nombre
  LIMIT 1;

  SELECT p5.id, p6.id
  INTO v_prod2_id, v_pres2_id
  FROM arbol_materia_prima p5
  JOIN arbol_materia_prima p6 ON p6.parent_id = p5.id AND p6.nivel_actual = 6 AND p6.activo = true
  WHERE p5.nivel_actual = 5 AND p5.activo = true
    AND p5.id != v_prod1_id
  ORDER BY p5.nombre
  LIMIT 1;

  RAISE NOTICE 'Proveedor ID: %', v_proveedor_id;
  RAISE NOTICE 'Producto 1 ID: %, Presentacion 1 ID: %', v_prod1_id, v_pres1_id;
  RAISE NOTICE 'Producto 2 ID: %, Presentacion 2 ID: %', v_prod2_id, v_pres2_id;

  -- ── Crear la solicitud en estado 'comprado' ───────────────
  INSERT INTO solicitudes (
    proveedor_id,
    estado,
    fecha_solicitud,
    observaciones
  ) VALUES (
    v_proveedor_id,
    'comprado',
    now(),
    'Solicitud de PRUEBA para testear recepción de facturas y stock'
  )
  RETURNING id INTO v_solicitud_id;

  RAISE NOTICE 'Solicitud creada con ID: %', v_solicitud_id;

  -- ── Crear items de la solicitud ───────────────────────────
  INSERT INTO solicitud_items (
    solicitud_id,
    producto_arbol_id,
    presentacion_id,
    cantidad_solicitada,
    unidad,
    estado_item
  ) VALUES
    (v_solicitud_id, v_prod1_id, v_pres1_id, 10, 'und', 'aprobado_compras'),
    (v_solicitud_id, v_prod2_id, v_pres2_id, 5,  'und', 'aprobado_compras');

  RAISE NOTICE '✅ Solicitud de prueba creada exitosamente. ID: %', v_solicitud_id;
  RAISE NOTICE 'Ahora ve a Almacenista → Recepción de Facturas para verla.';

END $$;
