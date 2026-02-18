-- ============================================================
-- FIX RLS: Políticas de acceso para arbol_recetas, receta_ingredientes y arbol_materia_prima
-- Healthy App - PRESENTACION
-- Fecha: 2026-02-18
-- Motivo: Los roles nuevos (chef, supervisor_produccion, coordinador_unidad)
--         y usuarios autenticados en general reciben 404 al leer/escribir
--         arbol_recetas porque la tabla no tiene política RLS para authenticated.
-- ============================================================

-- ============================================================
-- 1. arbol_recetas
-- ============================================================
-- Verificar si hay RLS activo
ALTER TABLE arbol_recetas ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas previas conflictivas (si existen con otro nombre)
DROP POLICY IF EXISTS "auth_read_arbol_recetas" ON arbol_recetas;
DROP POLICY IF EXISTS "auth_write_arbol_recetas" ON arbol_recetas;
DROP POLICY IF EXISTS "auth_all_arbol_recetas" ON arbol_recetas;
DROP POLICY IF EXISTS "Permitir lectura" ON arbol_recetas;
DROP POLICY IF EXISTS "Permitir escritura" ON arbol_recetas;

-- Nueva política: todos los usuarios autenticados pueden leer y escribir
CREATE POLICY "auth_all_arbol_recetas"
  ON arbol_recetas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. receta_ingredientes
-- ============================================================
ALTER TABLE receta_ingredientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_receta_ingredientes" ON receta_ingredientes;
DROP POLICY IF EXISTS "auth_write_receta_ingredientes" ON receta_ingredientes;
DROP POLICY IF EXISTS "auth_all_receta_ingredientes" ON receta_ingredientes;
DROP POLICY IF EXISTS "Permitir lectura" ON receta_ingredientes;
DROP POLICY IF EXISTS "Permitir escritura" ON receta_ingredientes;

CREATE POLICY "auth_all_receta_ingredientes"
  ON receta_ingredientes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. arbol_materia_prima
-- ============================================================
ALTER TABLE arbol_materia_prima ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_arbol_materia_prima" ON arbol_materia_prima;
DROP POLICY IF EXISTS "auth_write_arbol_materia_prima" ON arbol_materia_prima;
DROP POLICY IF EXISTS "auth_all_arbol_materia_prima" ON arbol_materia_prima;
DROP POLICY IF EXISTS "Permitir lectura" ON arbol_materia_prima;
DROP POLICY IF EXISTS "Permitir escritura" ON arbol_materia_prima;

CREATE POLICY "auth_all_arbol_materia_prima"
  ON arbol_materia_prima
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 4. arbol_platos (por si el SelectorReceta lo usa)
-- ============================================================
ALTER TABLE arbol_platos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_arbol_platos" ON arbol_platos;
DROP POLICY IF EXISTS "Permitir lectura" ON arbol_platos;

CREATE POLICY "auth_all_arbol_platos"
  ON arbol_platos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- FIN
-- ============================================================
-- Para aplicar: copiar y ejecutar en Supabase > SQL Editor
