-- ============================================================
-- FIX: Recetas Locales
-- 1. Desactivar trigger de auditoría en arbol_recetas (si existe)
-- 2. Agregar restricción UNIQUE: una receta local por (receta_base, unidad)
-- ============================================================

-- ============================================================
-- PARTE 1: Eliminar trigger de auditoría que referencia
-- tabla "auditoria" inexistente en arbol_recetas
-- ============================================================

-- Listar triggers existentes en arbol_recetas para diagnóstico:
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'arbol_recetas';

-- Eliminar cualquier trigger de auditoría en arbol_recetas
DO $$
DECLARE
  trig RECORD;
BEGIN
  FOR trig IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'arbol_recetas'
      AND trigger_schema = 'public'
      AND (
        trigger_name ILIKE '%audit%'
        OR trigger_name ILIKE '%log%'
        OR trigger_name ILIKE '%track%'
        OR trigger_name ILIKE '%histor%'
      )
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trig.trigger_name) || ' ON arbol_recetas CASCADE';
    RAISE NOTICE 'Trigger eliminado: %', trig.trigger_name;
  END LOOP;
END $$;

-- Si el trigger se llama de otra forma, elimínalo manualmente con:
-- DROP TRIGGER IF EXISTS <nombre_trigger> ON arbol_recetas;

-- ============================================================
-- PARTE 2: Restricción UNIQUE para recetas locales
-- Una sola receta local por (receta_base [parent_id], codigo_unidad)
-- Previene duplicados de variantes locales por unidad
-- ============================================================

-- Agregar índice único parcial: solo aplica a registros es_local=true
CREATE UNIQUE INDEX IF NOT EXISTS idx_receta_local_unica
  ON arbol_recetas (parent_id, codigo_unidad)
  WHERE es_local = true AND activo = true;

-- Nota: si codigo_unidad puede ser NULL (receta local sin unidad específica),
-- PostgreSQL trata cada NULL como distinto, por lo que NULL no choca con otro NULL.
-- Para recetas con código de unidad específico, sí se aplica la restricción.

-- ============================================================
-- PARTE 3: Verificar columnas necesarias en arbol_recetas
-- (ya deberían existir del fix_sprint_a.sql)
-- ============================================================
ALTER TABLE arbol_recetas ADD COLUMN IF NOT EXISTS es_local BOOLEAN DEFAULT false;
ALTER TABLE arbol_recetas ADD COLUMN IF NOT EXISTS tipo_local VARCHAR(30);
ALTER TABLE arbol_recetas ADD COLUMN IF NOT EXISTS codigo_unidad VARCHAR(30);
ALTER TABLE arbol_recetas ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES arbol_recetas(id);

-- Verificar resultado:
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'arbol_recetas'
  AND trigger_schema = 'public';
