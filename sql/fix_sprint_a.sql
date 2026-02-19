-- ============================================================
-- FIX SPRINT A — Correcciones críticas
-- Healthy App - PRESENTACION
-- ============================================================

-- ============================================================
-- A3: Permitir solicitudes de cambio generales (sin componente específico)
-- SolicitudCambioModal envía menuComponenteId=null → violaba NOT NULL
-- ============================================================
ALTER TABLE solicitudes_cambio_menu
  ALTER COLUMN menu_componente_id DROP NOT NULL;


-- ============================================================
-- A4: Agregar columna codigo_unidad a arbol_recetas
-- crearRecetaLocal() intentaba insertar este campo que no existía
-- ============================================================
ALTER TABLE arbol_recetas
  ADD COLUMN IF NOT EXISTS codigo_unidad VARCHAR(30);


-- ============================================================
-- A5: Hacer idempotente la RPC consolidar_pedidos_servicio
-- Si ya existe un consolidado para (fecha, servicio) → retornar su id
-- en vez de intentar un INSERT que falla con UNIQUE violation
-- ============================================================
CREATE OR REPLACE FUNCTION consolidar_pedidos_servicio(p_fecha DATE, p_servicio VARCHAR)
RETURNS UUID AS $$
DECLARE
  v_consolidado_id UUID;
BEGIN
  -- Idempotente: si ya existe un consolidado, retornar su id
  SELECT id INTO v_consolidado_id
  FROM consolidados_produccion
  WHERE fecha = p_fecha AND servicio = p_servicio;

  IF FOUND THEN
    RETURN v_consolidado_id;
  END IF;

  -- Crear nuevo consolidado
  INSERT INTO consolidados_produccion (fecha, servicio, estado)
  VALUES (p_fecha, p_servicio, 'en_revision')
  RETURNING id INTO v_consolidado_id;

  -- Consolidar items de todos los pedidos enviados
  INSERT INTO consolidado_items (consolidado_id, receta_id, componente_id, cantidad_total, desglose_dietas, desglose_unidades)
  SELECT
    v_consolidado_id, mc.receta_id, mc.componente_id,
    COALESCE(SUM(pi.cantidad), 0),
    jsonb_object_agg(td.codigo, COALESCE(pi.cantidad, 0)),
    jsonb_object_agg(op.codigo, COALESCE(pi.cantidad, 0))
  FROM pedidos_servicio ps
    JOIN pedido_items_servicio pi ON pi.pedido_id = ps.id
    JOIN tipos_dieta td ON pi.tipo_dieta_id = td.id
    JOIN operaciones op ON ps.operacion_id = op.id
    JOIN ciclos_menu cm ON cm.operacion_id = op.id AND cm.activo = true AND cm.estado = 'activo'
    JOIN ciclo_dia_servicios cds ON cds.ciclo_id = cm.id AND cds.numero_dia = ps.dia_ciclo_calculado AND cds.servicio = ps.servicio
    JOIN menu_componentes mc ON mc.ciclo_dia_servicio_id = cds.id AND mc.activo = true
  WHERE ps.fecha = p_fecha AND ps.servicio = p_servicio AND ps.estado = 'enviado'
  GROUP BY mc.receta_id, mc.componente_id;

  -- Actualizar total de porciones del consolidado
  UPDATE consolidados_produccion SET total_porciones = (
    SELECT COALESCE(SUM(cantidad_total), 0) FROM consolidado_items WHERE consolidado_id = v_consolidado_id
  ) WHERE id = v_consolidado_id;

  -- Marcar pedidos como consolidados
  UPDATE pedidos_servicio SET estado = 'consolidado', updated_at = now()
  WHERE fecha = p_fecha AND servicio = p_servicio AND estado = 'enviado';

  RETURN v_consolidado_id;
END;
$$ LANGUAGE plpgsql;
