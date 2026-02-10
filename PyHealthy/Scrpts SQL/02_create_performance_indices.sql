-- ========================================
-- SPRINT 1.2: ÍNDICES DE PERFORMANCE
-- ========================================
-- Mejora performance de queries más frecuentes
-- Ejecutar en Supabase SQL Editor

-- ========================================
-- HABILITAR EXTENSIÓN PARA BÚSQUEDA FUZZY
-- ========================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ========================================
-- ÍNDICES PARA ARBOL_RECETAS
-- ========================================

-- Parent ID (usado en getHijos() - lazy loading constante)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_recetas_parent_id
ON arbol_recetas(parent_id)
WHERE activo = true;

-- Plato ID (usado en getRecetasPorPlato())
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_recetas_plato_id
ON arbol_recetas(plato_id)
WHERE activo = true AND plato_id IS NOT NULL;

-- Nivel actual (usado en filtros por nivel)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_recetas_nivel_actual
ON arbol_recetas(nivel_actual, activo)
WHERE activo = true;

-- Código (usado en getRecetaPorCodigo() y ordenamiento)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_recetas_codigo
ON arbol_recetas(codigo);

-- Búsqueda full-text en nombre (buscarRecetas())
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_recetas_nombre_trgm
ON arbol_recetas USING gin(nombre gin_trgm_ops);

-- Índice compuesto para query más común: nivel + activo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_recetas_nivel_codigo
ON arbol_recetas(nivel_actual, codigo)
WHERE activo = true;

-- ========================================
-- ÍNDICES PARA RECETA_INGREDIENTES
-- ========================================

-- Receta ID (usado en getIngredientes() - query MÁS FRECUENTE)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receta_ingredientes_receta_id
ON receta_ingredientes(receta_id);

-- Materia Prima ID (usado en reportes de uso y cálculo de costos)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receta_ingredientes_materia_prima_id
ON receta_ingredientes(materia_prima_id)
WHERE materia_prima_id IS NOT NULL;

-- Orden (usado para ordenamiento de ingredientes en UI)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receta_ingredientes_orden
ON receta_ingredientes(receta_id, orden);

-- Índice para query de ingredientes con producto
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receta_ingredientes_receta_materia
ON receta_ingredientes(receta_id, materia_prima_id);

-- ========================================
-- ÍNDICES PARA ARBOL_MATERIA_PRIMA
-- ========================================

-- Parent ID (usado en lazy loading de niveles)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_materia_prima_parent_id
ON arbol_materia_prima(parent_id)
WHERE activo = true;

-- Tipo rama + nivel (usado en filtros combinados por tipo)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_materia_prima_tipo_nivel
ON arbol_materia_prima(tipo_rama, nivel_actual, activo)
WHERE activo = true;

-- Nivel + Stock (usado para filtros de nivel 5 con stock)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_materia_prima_nivel_stock
ON arbol_materia_prima(nivel_actual, maneja_stock, stock_actual)
WHERE nivel_actual = 5 AND maneja_stock = true;

-- Stock bajo (usado para alertas de inventario)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_materia_prima_stock_bajo
ON arbol_materia_prima(stock_actual, stock_minimo)
WHERE maneja_stock = true AND stock_actual < stock_minimo;

-- Código (búsquedas rápidas y ordenamiento)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_materia_prima_codigo
ON arbol_materia_prima(codigo);

-- Búsqueda en nombre
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_materia_prima_nombre_trgm
ON arbol_materia_prima USING gin(nombre gin_trgm_ops);

-- ========================================
-- ÍNDICES PARA ARBOL_PLATOS
-- ========================================

-- Parent ID (lazy loading)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_platos_parent_id
ON arbol_platos(parent_id)
WHERE activo = true;

-- Nivel actual + es_hoja (usado para encontrar platos finales)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_platos_nivel_hoja
ON arbol_platos(nivel_actual, es_hoja, activo)
WHERE activo = true;

-- Código
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arbol_platos_codigo
ON arbol_platos(codigo);

-- ========================================
-- ANÁLISIS Y ESTADÍSTICAS
-- ========================================

-- Forzar análisis para actualizar estadísticas del query planner
ANALYZE arbol_recetas;
ANALYZE receta_ingredientes;
ANALYZE arbol_materia_prima;
ANALYZE arbol_platos;

-- ========================================
-- VERIFICACIÓN
-- ========================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('arbol_recetas', 'receta_ingredientes', 'arbol_materia_prima', 'arbol_platos')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- ========================================
-- TEST ANTES vs DESPUÉS
-- ========================================

-- TEST 1: getHijos() - Query más frecuente
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM arbol_recetas
WHERE parent_id = (SELECT id FROM arbol_recetas WHERE nivel_actual = 1 LIMIT 1)
  AND activo = true
ORDER BY codigo;

-- ESPERADO:
-- ANTES: Seq Scan (500-800ms para 2000 registros)
-- DESPUÉS: Index Scan using idx_arbol_recetas_parent_id (5-10ms)

-- TEST 2: getIngredientes() con JOIN
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  ri.*,
  amp.codigo as mp_codigo,
  amp.nombre as mp_nombre,
  amp.costo_promedio
FROM receta_ingredientes ri
LEFT JOIN arbol_materia_prima amp ON amp.id = ri.materia_prima_id
WHERE ri.receta_id = (SELECT id FROM arbol_recetas WHERE nivel_actual = 2 LIMIT 1)
ORDER BY ri.orden;

-- ESPERADO:
-- ANTES: Hash Join (300-500ms)
-- DESPUÉS: Nested Loop with Index Scan (3-5ms)

-- TEST 3: buscarRecetas() con ILIKE
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM arbol_recetas
WHERE activo = true
  AND (nombre ILIKE '%arroz%' OR codigo ILIKE '%arroz%')
LIMIT 50;

-- ESPERADO:
-- ANTES: Seq Scan con Filter (800-1200ms)
-- DESPUÉS: Bitmap Index Scan using idx_arbol_recetas_nombre_trgm (15-30ms)

-- TEST 4: Cálculo de costos batch
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  ri.receta_id,
  SUM(ri.cantidad_requerida * amp.costo_promedio) as costo_total
FROM receta_ingredientes ri
LEFT JOIN arbol_materia_prima amp ON amp.id = ri.materia_prima_id
WHERE ri.receta_id IN (SELECT id FROM arbol_recetas WHERE nivel_actual = 2 LIMIT 100)
GROUP BY ri.receta_id;

-- ESPERADO:
-- ANTES: Multiple Hash Joins (2-5s)
-- DESPUÉS: Index Scans + HashAggregate (200-500ms)
