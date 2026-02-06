-- ========================================
-- SPRINT 1.1: FIX CONSTRAINT NIVEL 3
-- ========================================
-- Permite insertar recetas nivel 3 (recetas locales)
-- Ejecutar en Supabase SQL Editor

-- PASO 1: Verificar constraint actual
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'arbol_recetas'::regclass
  AND conname LIKE '%nivel%';

-- PASO 2: Eliminar constraint incorrecto
ALTER TABLE arbol_recetas
DROP CONSTRAINT IF EXISTS arbol_recetas_nivel_actual_check;

-- PASO 3: Crear constraint correcto (permitir 1, 2, 3)
ALTER TABLE arbol_recetas
ADD CONSTRAINT arbol_recetas_nivel_actual_check
CHECK (nivel_actual IN (1, 2, 3));

-- PASO 4: Agregar comentario para documentación
COMMENT ON CONSTRAINT arbol_recetas_nivel_actual_check ON arbol_recetas IS
'Nivel 1: Conector (enlace con plato 2.X)
 Nivel 2: Receta estándar (3.X)
 Nivel 3: Receta local por unidad médica (3.X-01, 3.X-02, etc.)';

-- PASO 5: Test de inserción (validar funcionamiento)
DO $$
DECLARE
  test_parent_id UUID;
  test_plato_id UUID;
BEGIN
  -- Obtener IDs válidos para test
  SELECT id INTO test_parent_id FROM arbol_recetas WHERE nivel_actual = 2 LIMIT 1;
  SELECT plato_id INTO test_plato_id FROM arbol_recetas WHERE nivel_actual = 2 LIMIT 1;

  -- Intentar insertar nivel 3
  INSERT INTO arbol_recetas (
    codigo, nombre, descripcion, nivel_actual, parent_id, plato_id, activo
  ) VALUES (
    'TEST.03-99',
    'Test Receta Local Nivel 3',
    'Test de validación constraint',
    3,
    test_parent_id,
    test_plato_id,
    false
  );

  -- Si llegó aquí, funciona → limpiar
  DELETE FROM arbol_recetas WHERE codigo = 'TEST.03-99';

  RAISE NOTICE 'Constraint nivel 3 funcionando correctamente ✓';
END $$;

-- PASO 6: Verificar conteo por niveles
SELECT
  nivel_actual,
  COUNT(*) as cantidad,
  CASE
    WHEN nivel_actual = 1 THEN 'Conectores'
    WHEN nivel_actual = 2 THEN 'Recetas Estándar'
    WHEN nivel_actual = 3 THEN 'Recetas Locales'
  END as descripcion
FROM arbol_recetas
WHERE activo = true
GROUP BY nivel_actual
ORDER BY nivel_actual;
