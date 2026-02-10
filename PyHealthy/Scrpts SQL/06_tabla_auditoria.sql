-- ========================================
-- SPRINT 3.3: Tabla de Auditoría Completa
-- Trazabilidad de todos los cambios en tablas críticas
-- ========================================
-- Fecha: 2026-02-06
-- Objetivo: Auditar INSERT, UPDATE, DELETE en tablas críticas

-- ========================================
-- 1. CREAR TABLA DE AUDITORÍA
-- ========================================

CREATE TABLE IF NOT EXISTS auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla VARCHAR(100) NOT NULL,
  registro_id UUID NOT NULL,
  operacion VARCHAR(10) NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  usuario_id UUID REFERENCES auth.users(id),
  usuario_email VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE auditoria IS 'Auditoría genérica de cambios en tablas críticas';
COMMENT ON COLUMN auditoria.tabla IS 'Nombre de la tabla auditada';
COMMENT ON COLUMN auditoria.registro_id IS 'UUID del registro modificado';
COMMENT ON COLUMN auditoria.operacion IS 'INSERT, UPDATE o DELETE';
COMMENT ON COLUMN auditoria.datos_anteriores IS 'Estado antes del cambio (NULL en INSERT)';
COMMENT ON COLUMN auditoria.datos_nuevos IS 'Estado después del cambio (NULL en DELETE)';

-- ========================================
-- 2. ÍNDICES DE PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_auditoria_tabla
ON auditoria(tabla);

CREATE INDEX IF NOT EXISTS idx_auditoria_registro_id
ON auditoria(registro_id);

CREATE INDEX IF NOT EXISTS idx_auditoria_operacion
ON auditoria(operacion);

CREATE INDEX IF NOT EXISTS idx_auditoria_created_at
ON auditoria(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario
ON auditoria(usuario_id)
WHERE usuario_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auditoria_tabla_registro
ON auditoria(tabla, registro_id, created_at DESC);

-- Índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_auditoria_busqueda
ON auditoria(tabla, operacion, created_at DESC)
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- ========================================
-- 3. FUNCIÓN GENÉRICA DE AUDITORÍA
-- ========================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar registro de auditoría
  INSERT INTO auditoria (
    tabla,
    registro_id,
    operacion,
    datos_anteriores,
    datos_nuevos,
    usuario_id,
    usuario_email,
    ip_address
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE
      WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb
      ELSE NULL
    END,
    CASE
      WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb
      ELSE NULL
    END,
    auth.uid(),
    auth.email(),
    inet_client_addr()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit_trigger_function IS 'Función genérica para auditar cambios (INSERT, UPDATE, DELETE)';

-- ========================================
-- 4. APLICAR AUDITORÍA A TABLAS CRÍTICAS
-- ========================================

-- 4.1 Auditoría en arbol_recetas
DROP TRIGGER IF EXISTS audit_arbol_recetas ON arbol_recetas;
CREATE TRIGGER audit_arbol_recetas
AFTER INSERT OR UPDATE OR DELETE ON arbol_recetas
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 4.2 Auditoría en receta_ingredientes
DROP TRIGGER IF EXISTS audit_receta_ingredientes ON receta_ingredientes;
CREATE TRIGGER audit_receta_ingredientes
AFTER INSERT OR UPDATE OR DELETE ON receta_ingredientes
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 4.3 Auditoría en arbol_materia_prima
DROP TRIGGER IF EXISTS audit_arbol_materia_prima ON arbol_materia_prima;
CREATE TRIGGER audit_arbol_materia_prima
AFTER INSERT OR UPDATE OR DELETE ON arbol_materia_prima
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 4.4 Auditoría en platos (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'arbol_platos') THEN
    DROP TRIGGER IF EXISTS audit_arbol_platos ON arbol_platos;
    CREATE TRIGGER audit_arbol_platos
    AFTER INSERT OR UPDATE OR DELETE ON arbol_platos
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    RAISE NOTICE 'Auditoría aplicada a arbol_platos';
  END IF;
END $$;

-- ========================================
-- 5. VISTA: Auditoría Legible
-- ========================================

CREATE OR REPLACE VIEW auditoria_legible AS
WITH cambios_update AS (
  SELECT
    a.id,
    a.tabla,
    a.operacion,
    a.registro_id,
    a.usuario_email,
    a.created_at,
    jsonb_object_agg(
      key,
      jsonb_build_object(
        'anterior', a.datos_anteriores->key,
        'nuevo', a.datos_nuevos->key
      )
    ) FILTER (WHERE a.datos_anteriores->key IS DISTINCT FROM a.datos_nuevos->key) AS cambios
  FROM auditoria a
  CROSS JOIN LATERAL jsonb_each(a.datos_anteriores) AS keys(key, value)
  WHERE a.operacion = 'UPDATE'
    AND a.datos_anteriores->key IS DISTINCT FROM a.datos_nuevos->key
  GROUP BY a.id, a.tabla, a.operacion, a.registro_id, a.usuario_email, a.created_at
)
-- UPDATE con cambios
SELECT
  id,
  tabla,
  operacion,
  registro_id,
  usuario_email,
  created_at,
  cambios::TEXT AS cambios_json
FROM cambios_update

UNION ALL

-- INSERT
SELECT
  id,
  tabla,
  operacion,
  registro_id,
  usuario_email,
  created_at,
  datos_nuevos::TEXT AS cambios_json
FROM auditoria
WHERE operacion = 'INSERT'

UNION ALL

-- DELETE
SELECT
  id,
  tabla,
  operacion,
  registro_id,
  usuario_email,
  created_at,
  datos_anteriores::TEXT AS cambios_json
FROM auditoria
WHERE operacion = 'DELETE'

ORDER BY created_at DESC;

COMMENT ON VIEW auditoria_legible IS 'Vista legible de auditoría con cambios en formato JSON';

-- ========================================
-- 6. VISTA: Resumen de Auditoría
-- ========================================

CREATE OR REPLACE VIEW auditoria_resumen AS
SELECT
  tabla,
  operacion,
  COUNT(*) AS total_operaciones,
  COUNT(DISTINCT usuario_email) AS usuarios_distintos,
  COUNT(DISTINCT registro_id) AS registros_afectados,
  MIN(created_at) AS primera_operacion,
  MAX(created_at) AS ultima_operacion,
  DATE_TRUNC('day', MAX(created_at)) AS dia
FROM auditoria
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tabla, operacion, DATE_TRUNC('day', created_at)
ORDER BY dia DESC, tabla, operacion;

COMMENT ON VIEW auditoria_resumen IS 'Resumen estadístico de auditoría por día';

-- ========================================
-- 7. VISTA: Actividad por Usuario
-- ========================================

CREATE OR REPLACE VIEW auditoria_por_usuario AS
SELECT
  usuario_email,
  tabla,
  operacion,
  COUNT(*) AS total_operaciones,
  MAX(created_at) AS ultima_actividad,
  DATE_TRUNC('hour', MAX(created_at)) AS hora
FROM auditoria
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND usuario_email IS NOT NULL
GROUP BY usuario_email, tabla, operacion, DATE_TRUNC('hour', created_at)
ORDER BY hora DESC, usuario_email, tabla;

COMMENT ON VIEW auditoria_por_usuario IS 'Actividad de usuarios en últimos 7 días';

-- ========================================
-- 8. FUNCIÓN RPC: Historial de un Registro
-- ========================================

CREATE OR REPLACE FUNCTION obtener_historial_registro(
  p_tabla VARCHAR,
  p_registro_id UUID
)
RETURNS TABLE (
  id UUID,
  operacion VARCHAR,
  usuario_email VARCHAR,
  created_at TIMESTAMPTZ,
  cambios JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.operacion,
    a.usuario_email,
    a.created_at,
    CASE
      WHEN a.operacion = 'UPDATE' THEN (
        SELECT jsonb_object_agg(key, jsonb_build_object('anterior', a.datos_anteriores->key, 'nuevo', a.datos_nuevos->key))
        FROM jsonb_each(a.datos_anteriores)
        WHERE a.datos_anteriores->key IS DISTINCT FROM a.datos_nuevos->key
      )
      WHEN a.operacion = 'INSERT' THEN a.datos_nuevos
      ELSE a.datos_anteriores
    END AS cambios
  FROM auditoria a
  WHERE a.tabla = p_tabla
    AND a.registro_id = p_registro_id
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION obtener_historial_registro IS 'RPC: Obtiene historial completo de cambios de un registro';

-- ========================================
-- 9. FUNCIÓN RPC: Buscar en Auditoría
-- ========================================

CREATE OR REPLACE FUNCTION buscar_auditoria(
  p_tabla VARCHAR DEFAULT NULL,
  p_operacion VARCHAR DEFAULT NULL,
  p_usuario_email VARCHAR DEFAULT NULL,
  p_fecha_desde TIMESTAMPTZ DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_fecha_hasta TIMESTAMPTZ DEFAULT NOW(),
  p_limite INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  tabla VARCHAR,
  registro_id UUID,
  operacion VARCHAR,
  usuario_email VARCHAR,
  created_at TIMESTAMPTZ,
  resumen TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.tabla,
    a.registro_id,
    a.operacion,
    a.usuario_email,
    a.created_at,
    CASE
      WHEN a.operacion = 'INSERT' THEN
        'Creó ' || COALESCE(a.datos_nuevos->>'nombre', a.datos_nuevos->>'codigo', 'registro')
      WHEN a.operacion = 'UPDATE' THEN
        'Modificó ' || (
          SELECT COUNT(*)::TEXT || ' campo(s)'
          FROM jsonb_each(a.datos_anteriores)
          WHERE a.datos_anteriores->key IS DISTINCT FROM a.datos_nuevos->key
        )
      ELSE
        'Eliminó ' || COALESCE(a.datos_anteriores->>'nombre', a.datos_anteriores->>'codigo', 'registro')
    END AS resumen
  FROM auditoria a
  WHERE (p_tabla IS NULL OR a.tabla = p_tabla)
    AND (p_operacion IS NULL OR a.operacion = p_operacion)
    AND (p_usuario_email IS NULL OR a.usuario_email ILIKE '%' || p_usuario_email || '%')
    AND a.created_at >= p_fecha_desde
    AND a.created_at <= p_fecha_hasta
  ORDER BY a.created_at DESC
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION buscar_auditoria IS 'RPC: Búsqueda flexible en auditoría con filtros';

-- ========================================
-- 10. FUNCIÓN RPC: Estadísticas de Auditoría
-- ========================================

CREATE OR REPLACE FUNCTION estadisticas_auditoria(
  p_dias INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_operaciones BIGINT,
  total_inserts BIGINT,
  total_updates BIGINT,
  total_deletes BIGINT,
  usuarios_activos BIGINT,
  tablas_afectadas BIGINT,
  operaciones_hoy BIGINT,
  promedio_diario NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_operaciones,
    COUNT(*) FILTER (WHERE operacion = 'INSERT') AS total_inserts,
    COUNT(*) FILTER (WHERE operacion = 'UPDATE') AS total_updates,
    COUNT(*) FILTER (WHERE operacion = 'DELETE') AS total_deletes,
    COUNT(DISTINCT usuario_email) AS usuarios_activos,
    COUNT(DISTINCT tabla) AS tablas_afectadas,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS operaciones_hoy,
    (COUNT(*)::NUMERIC / NULLIF(p_dias, 0))::NUMERIC(10,2) AS promedio_diario
  FROM auditoria
  WHERE created_at >= CURRENT_DATE - (p_dias || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION estadisticas_auditoria IS 'RPC: Estadísticas generales de auditoría';

-- ========================================
-- 11. POLÍTICA DE RETENCIÓN (30 días)
-- ========================================

-- Función para limpiar auditoría vieja
CREATE OR REPLACE FUNCTION limpiar_auditoria_vieja(
  p_dias INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM auditoria
  WHERE created_at < CURRENT_DATE - (p_dias || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION limpiar_auditoria_vieja IS 'Elimina registros de auditoría más antiguos que N días';

-- ========================================
-- 12. GRANTS (Development)
-- ========================================

GRANT ALL ON auditoria TO authenticated;
GRANT SELECT ON auditoria_legible TO authenticated;
GRANT SELECT ON auditoria_resumen TO authenticated;
GRANT SELECT ON auditoria_por_usuario TO authenticated;
GRANT EXECUTE ON FUNCTION obtener_historial_registro TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_auditoria TO authenticated;
GRANT EXECUTE ON FUNCTION estadisticas_auditoria TO authenticated;
-- limpiar_auditoria_vieja solo para admins (configurar en RLS)

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Test 1: Tabla creada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditoria') THEN
    RAISE NOTICE 'Test 1: Tabla auditoria creada ✓';
  END IF;
END $$;

-- Test 2: Índices creados
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'auditoria'
      AND indexname LIKE 'idx_auditoria_%'
  ) THEN
    RAISE NOTICE 'Test 2: Índices de auditoría creados ✓';
  END IF;
END $$;

-- Test 3: Triggers aplicados
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname LIKE 'audit_%'
  ) THEN
    RAISE NOTICE 'Test 3: Triggers de auditoría aplicados ✓';
  END IF;
END $$;

-- Test 4: Vistas creadas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name LIKE 'auditoria_%'
  ) THEN
    RAISE NOTICE 'Test 4: Vistas de auditoría creadas ✓';
  END IF;
END $$;

-- Test 5: Funciones RPC creadas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname IN ('obtener_historial_registro', 'buscar_auditoria', 'estadisticas_auditoria')
  ) THEN
    RAISE NOTICE 'Test 5: Funciones RPC de auditoría creadas ✓';
  END IF;
END $$;

RAISE NOTICE '========================================';
RAISE NOTICE 'SCRIPT 06 - Auditoría Completada';
RAISE NOTICE 'Trazabilidad completa configurada';
RAISE NOTICE 'Triggers en tablas críticas';
RAISE NOTICE 'Vistas y funciones RPC listas';
RAISE NOTICE 'Retención: 90 días (configurable)';
RAISE NOTICE '========================================';

-- ========================================
-- EJEMPLOS DE USO
-- ========================================

-- Ejemplo 1: Ver últimos 10 cambios
-- SELECT * FROM auditoria_legible LIMIT 10;

-- Ejemplo 2: Historial de una receta
-- SELECT * FROM obtener_historial_registro('arbol_recetas', 'uuid-receta');

-- Ejemplo 3: Buscar cambios de un usuario
-- SELECT * FROM buscar_auditoria(NULL, NULL, 'usuario@email.com');

-- Ejemplo 4: Estadísticas últimos 30 días
-- SELECT * FROM estadisticas_auditoria(30);

-- Ejemplo 5: Resumen por tabla
-- SELECT * FROM auditoria_resumen WHERE tabla = 'arbol_recetas';

-- Ejemplo 6: Actividad por usuario
-- SELECT * FROM auditoria_por_usuario;

-- Ejemplo 7: Limpiar auditoría vieja (manual, solo admins)
-- SELECT limpiar_auditoria_vieja(90); -- Elimina registros > 90 días
