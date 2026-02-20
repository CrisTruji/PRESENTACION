-- ============================================================
-- FIX: consolidar_pedidos_servicio re-consolida si está vacío
-- Si el consolidado existe pero tiene total_porciones = 0
-- (fue generado antes de que los pedidos fueran enviados),
-- limpia los items y vuelve a consolidar.
-- ============================================================

CREATE OR REPLACE FUNCTION consolidar_pedidos_servicio(p_fecha DATE, p_servicio VARCHAR)
RETURNS UUID AS $$
DECLARE
  v_consolidado_id UUID;
  v_total          INT;
BEGIN
  -- Buscar consolidado existente
  SELECT id, total_porciones
  INTO v_consolidado_id, v_total
  FROM consolidados_produccion
  WHERE fecha = p_fecha AND servicio = p_servicio;

  IF FOUND THEN
    -- Si ya tiene porciones, no hacer nada
    IF v_total > 0 THEN
      RETURN v_consolidado_id;
    END IF;

    -- Vacío: limpiar items para re-consolidar
    DELETE FROM consolidado_items WHERE consolidado_id = v_consolidado_id;
  ELSE
    -- Crear nuevo consolidado
    INSERT INTO consolidados_produccion (fecha, servicio, estado)
    VALUES (p_fecha, p_servicio, 'en_revision')
    RETURNING id INTO v_consolidado_id;
  END IF;

  -- Insertar items desde pedidos enviados
  INSERT INTO consolidado_items (
    consolidado_id, receta_id, componente_id,
    cantidad_total, desglose_dietas, desglose_unidades
  )
  SELECT
    v_consolidado_id,
    mc.receta_id,
    mc.componente_id,
    COALESCE(SUM(pi.cantidad), 0),
    jsonb_object_agg(td.codigo, COALESCE(pi.cantidad, 0)),
    jsonb_object_agg(op.codigo, COALESCE(pi.cantidad, 0))
  FROM pedidos_servicio ps
    JOIN pedido_items_servicio   pi  ON pi.pedido_id          = ps.id
    JOIN tipos_dieta             td  ON pi.tipo_dieta_id       = td.id
    JOIN operaciones             op  ON ps.operacion_id        = op.id
    JOIN ciclos_menu             cm  ON cm.operacion_id        = op.id
                                    AND cm.activo = true AND cm.estado = 'activo'
    JOIN ciclo_dia_servicios     cds ON cds.ciclo_id           = cm.id
                                    AND cds.numero_dia         = ps.dia_ciclo_calculado
                                    AND cds.servicio           = ps.servicio
    JOIN menu_componentes        mc  ON mc.ciclo_dia_servicio_id = cds.id
                                    AND mc.activo = true
  WHERE ps.fecha    = p_fecha
    AND ps.servicio = p_servicio
    AND ps.estado   = 'enviado'
  GROUP BY mc.receta_id, mc.componente_id;

  -- Actualizar total de porciones
  UPDATE consolidados_produccion
  SET
    total_porciones = (
      SELECT COALESCE(SUM(cantidad_total), 0)
      FROM consolidado_items
      WHERE consolidado_id = v_consolidado_id
    ),
    updated_at = now()
  WHERE id = v_consolidado_id;

  -- Marcar pedidos como consolidados
  UPDATE pedidos_servicio
  SET estado = 'consolidado', updated_at = now()
  WHERE fecha    = p_fecha
    AND servicio = p_servicio
    AND estado   = 'enviado';

  RETURN v_consolidado_id;
END;
$$ LANGUAGE plpgsql;
