-- ============================================================
-- FIX: Evitar duplicados en receta_ingredientes
-- Solo aplica sobre registros activos.
-- Si hay duplicados pendientes, elimínalos primero con:
--
--   DELETE FROM receta_ingredientes
--   WHERE id IN (
--     SELECT id FROM (
--       SELECT id, ROW_NUMBER() OVER (
--         PARTITION BY receta_id, materia_prima_id ORDER BY id DESC
--       ) rn FROM receta_ingredientes WHERE activo = true
--     ) t WHERE rn > 1
--   );
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_receta_ingrediente_activo
ON receta_ingredientes (receta_id, materia_prima_id)
WHERE activo = true;
