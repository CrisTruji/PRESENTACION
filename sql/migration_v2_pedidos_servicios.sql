-- ============================================================
-- MIGRATION V2: Sistema de Pedidos y Servicios de Catering
-- Healthy App - PRESENTACION
-- Fecha: 2026-02-17
-- ============================================================

-- 1. ALTERACIONES A TABLAS EXISTENTES
ALTER TABLE arbol_recetas ADD COLUMN IF NOT EXISTS es_local BOOLEAN DEFAULT false;
ALTER TABLE arbol_recetas ADD COLUMN IF NOT EXISTS tipo_local VARCHAR(30);

-- 2. tipos_dieta (Catalogo Keralty)
CREATE TABLE IF NOT EXISTS tipos_dieta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(5) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  categoria VARCHAR(30) NOT NULL,
  descripcion TEXT,
  orden INT DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. componentes_plato
CREATE TABLE IF NOT EXISTS componentes_plato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(30) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  orden INT DEFAULT 0,
  es_fijo BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. operaciones
CREATE TABLE IF NOT EXISTS operaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(30) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  unidad_medica_codigo VARCHAR REFERENCES unidades_medicas(codigo),
  cantidad_ciclos INT NOT NULL DEFAULT 20,
  tipo_operacion VARCHAR(20) DEFAULT 'ciclico'
    CHECK (tipo_operacion IN ('ciclico', 'carta_menu')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. servicios_unidad
CREATE TABLE IF NOT EXISTS servicios_unidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operacion_id UUID NOT NULL REFERENCES operaciones(id),
  servicio VARCHAR(30) NOT NULL,
  hora_limite TIME NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(operacion_id, servicio)
);

-- 6. ciclos_menu
CREATE TABLE IF NOT EXISTS ciclos_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operacion_id UUID NOT NULL REFERENCES operaciones(id),
  nombre VARCHAR(100) NOT NULL,
  fecha_inicio DATE NOT NULL,
  dia_actual_ciclo INT DEFAULT 1,
  validado BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  estado VARCHAR(20) DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'activo', 'pausado', 'finalizado')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ciclo_dia_servicios
CREATE TABLE IF NOT EXISTS ciclo_dia_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id UUID NOT NULL REFERENCES ciclos_menu(id) ON DELETE CASCADE,
  numero_dia INT NOT NULL CHECK (numero_dia >= 1),
  servicio VARCHAR(30) NOT NULL,
  completo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ciclo_id, numero_dia, servicio)
);

-- 8. menu_componentes
CREATE TABLE IF NOT EXISTS menu_componentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_dia_servicio_id UUID NOT NULL REFERENCES ciclo_dia_servicios(id) ON DELETE CASCADE,
  componente_id UUID NOT NULL REFERENCES componentes_plato(id),
  receta_id BIGINT REFERENCES arbol_recetas(id),
  orden INT DEFAULT 0,
  opciones_carta JSONB,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. gramajes_componente_menu
CREATE TABLE IF NOT EXISTS gramajes_componente_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_componente_id UUID NOT NULL REFERENCES menu_componentes(id) ON DELETE CASCADE,
  tipo_dieta_id UUID NOT NULL REFERENCES tipos_dieta(id),
  gramaje NUMERIC(10,2) NOT NULL DEFAULT 0,
  unidad_medida VARCHAR(10) DEFAULT 'gr',
  porcentaje_modificacion NUMERIC(5,2),
  excluir BOOLEAN DEFAULT false,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(menu_componente_id, tipo_dieta_id)
);

-- 10. pedidos_servicio
CREATE TABLE IF NOT EXISTS pedidos_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operacion_id UUID NOT NULL REFERENCES operaciones(id),
  fecha DATE NOT NULL,
  servicio VARCHAR(30) NOT NULL,
  dia_ciclo_calculado INT NOT NULL,
  estado VARCHAR(20) DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'enviado', 'aprobado', 'rechazado', 'consolidado')),
  enviado_en_hora BOOLEAN DEFAULT true,
  hora_envio TIMESTAMPTZ,
  puede_editar BOOLEAN DEFAULT true,
  observaciones TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(operacion_id, fecha, servicio)
);

-- 11. pedido_items_servicio
CREATE TABLE IF NOT EXISTS pedido_items_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos_servicio(id) ON DELETE CASCADE,
  menu_componente_id UUID REFERENCES menu_componentes(id),
  tipo_dieta_id UUID NOT NULL REFERENCES tipos_dieta(id),
  cantidad INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  gramaje_aplicado NUMERIC(10,2),
  opcion_seleccionada VARCHAR(100),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. pedido_pacientes
CREATE TABLE IF NOT EXISTS pedido_pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos_servicio(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  identificacion VARCHAR(50) NOT NULL,
  cuarto VARCHAR(30) NOT NULL,
  tipo_dieta_id UUID NOT NULL REFERENCES tipos_dieta(id),
  alergias TEXT[],
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. solicitudes_cambio_menu
CREATE TABLE IF NOT EXISTS solicitudes_cambio_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos_servicio(id),
  menu_componente_id UUID NOT NULL REFERENCES menu_componentes(id),
  receta_solicitada_id BIGINT REFERENCES arbol_recetas(id),
  motivo TEXT NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  aprobado_por UUID REFERENCES auth.users(id),
  respuesta TEXT,
  fecha_decision TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. consolidados_produccion
CREATE TABLE IF NOT EXISTS consolidados_produccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  servicio VARCHAR(30) NOT NULL,
  estado VARCHAR(20) DEFAULT 'en_revision'
    CHECK (estado IN ('en_revision', 'aprobado', 'en_preparacion', 'completado')),
  total_porciones INT DEFAULT 0,
  ingredientes_totales JSONB,
  supervisor_id UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMPTZ,
  fecha_preparacion TIMESTAMPTZ,
  pdf_cocina_url TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fecha, servicio)
);

-- 15. consolidado_items
CREATE TABLE IF NOT EXISTS consolidado_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consolidado_id UUID NOT NULL REFERENCES consolidados_produccion(id) ON DELETE CASCADE,
  receta_id BIGINT NOT NULL REFERENCES arbol_recetas(id),
  componente_id UUID REFERENCES componentes_plato(id),
  cantidad_total INT NOT NULL DEFAULT 0,
  desglose_dietas JSONB DEFAULT '{}',
  desglose_unidades JSONB DEFAULT '{}',
  ingredientes_calculados JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. cambios_menu_supervisor
CREATE TABLE IF NOT EXISTS cambios_menu_supervisor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consolidado_id UUID NOT NULL REFERENCES consolidados_produccion(id),
  receta_original_id BIGINT NOT NULL REFERENCES arbol_recetas(id),
  receta_nueva_id BIGINT NOT NULL REFERENCES arbol_recetas(id),
  motivo TEXT NOT NULL,
  supervisor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. facturas_servicio (estructura base)
CREATE TABLE IF NOT EXISTS facturas_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operacion_id UUID NOT NULL REFERENCES operaciones(id),
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  desglose_servicios JSONB,
  desglose_dietas JSONB,
  subtotal NUMERIC(12,2),
  total NUMERIC(12,2),
  estado VARCHAR(20) DEFAULT 'generada',
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INDICES
CREATE INDEX IF NOT EXISTS idx_ciclo_dia_serv ON ciclo_dia_servicios(ciclo_id, numero_dia);
CREATE INDEX IF NOT EXISTS idx_menu_comp_dia ON menu_componentes(ciclo_dia_servicio_id);
CREATE INDEX IF NOT EXISTS idx_gramajes_comp ON gramajes_componente_menu(menu_componente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_op_fecha ON pedidos_servicio(operacion_id, fecha);
CREATE INDEX IF NOT EXISTS idx_pedido_items_ped ON pedido_items_servicio(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_pac_ped ON pedido_pacientes(pedido_id);
CREATE INDEX IF NOT EXISTS idx_consolidado_fecha ON consolidados_produccion(fecha, servicio);
CREATE INDEX IF NOT EXISTS idx_consolidado_items ON consolidado_items(consolidado_id);

-- DATOS SEMILLA: 19 tipos de dieta Keralty
INSERT INTO tipos_dieta (codigo, nombre, categoria, orden) VALUES
  ('C1', 'Complementaria 1 (6-8m)', 'pediatrica', 1),
  ('C2', 'Complementaria 2 (9-11m)', 'pediatrica', 2),
  ('C3', 'Complementaria 3 (12-24m)', 'pediatrica', 3),
  ('C4', 'Complementaria 4 (4-8a)', 'pediatrica', 4),
  ('CE', 'Escolar (9-13a)', 'pediatrica', 5),
  ('AD', 'Adolescente (14-17a)', 'pediatrica', 6),
  ('LQ', 'Liquida Clara', 'consistencia', 7),
  ('LC', 'Liquida Completa', 'consistencia', 8),
  ('LT', 'Liquida Transicion', 'consistencia', 9),
  ('S1', 'Semiblanda F1 - Compotas', 'consistencia', 10),
  ('S2', 'Semiblanda F2 - Pures', 'consistencia', 11),
  ('SM', 'Semiblanda F3 - Mecanica', 'consistencia', 12),
  ('BL', 'Blanda', 'consistencia', 13),
  ('NR', 'Normal', 'terapeutica', 14),
  ('HG', 'Hipoglucida (Diabeticos)', 'terapeutica', 15),
  ('HP', 'Hipoproteica (Renal)', 'terapeutica', 16),
  ('BR', 'Baja en Residuo', 'terapeutica', 17),
  ('RF', 'Rica en Fibra', 'terapeutica', 18),
  ('VE', 'Vegetariana', 'terapeutica', 19)
ON CONFLICT (codigo) DO NOTHING;

-- DATOS SEMILLA: 11 componentes base
INSERT INTO componentes_plato (codigo, nombre, orden, es_fijo) VALUES
  ('jugo', 'Jugo', 1, true),
  ('proteina', 'Proteina', 2, true),
  ('verdura', 'Verdura', 3, true),
  ('farinaceo', 'Farinaceo', 4, true),
  ('cereal', 'Cereal', 5, true),
  ('sopa', 'Sopa', 6, true),
  ('fruta', 'Fruta', 7, true),
  ('postre', 'Postre', 8, true),
  ('energetico', 'Energetico', 9, true),
  ('bebida_lactea', 'Bebida Lactea', 10, true),
  ('acompanamiento', 'Acompanamiento', 11, true)
ON CONFLICT (codigo) DO NOTHING;

-- DATOS SEMILLA: 11 operaciones activas
INSERT INTO operaciones (codigo, nombre, cantidad_ciclos, tipo_operacion) VALUES
  ('coordinadora', 'Coordinadora', 20, 'ciclico'),
  ('carval', 'Carval', 10, 'ciclico'),
  ('presentes', 'Presentes', 20, 'ciclico'),
  ('idime', 'IDIME', 21, 'ciclico'),
  ('red_humana', 'Red Humana', 21, 'ciclico'),
  ('virrey_solis', 'Virrey Solis', 21, 'ciclico'),
  ('alcala', 'Alcala', 21, 'ciclico'),
  ('eiren', 'Eiren', 10, 'carta_menu'),
  ('brune', 'Brune', 5, 'ciclico'),
  ('ventas', 'Ventas', 5, 'ciclico'),
  ('archroma', 'Archroma', 5, 'ciclico')
ON CONFLICT (codigo) DO NOTHING;

-- DATOS SEMILLA: Roles nuevos
INSERT INTO roles (id, nombre, descripcion) VALUES
  (gen_random_uuid(), 'chef', 'Chef/Nutricionista - Configura ciclos de menu'),
  (gen_random_uuid(), 'supervisor_produccion', 'Supervisor - Consolida pedidos y gestiona produccion'),
  (gen_random_uuid(), 'coordinador_unidad', 'Coordinador de unidad - Hace pedidos de servicio')
ON CONFLICT (nombre) DO NOTHING;

-- RPC: Calcular dia del ciclo
CREATE OR REPLACE FUNCTION calcular_dia_ciclo(p_operacion_id UUID, p_fecha DATE)
RETURNS INT AS $$
DECLARE
  v_ciclo RECORD;
  v_cantidad_ciclos INT;
  v_dias_desde_inicio INT;
BEGIN
  SELECT * INTO v_ciclo FROM ciclos_menu
  WHERE operacion_id = p_operacion_id AND activo = true AND estado = 'activo'
  ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT cantidad_ciclos INTO v_cantidad_ciclos FROM operaciones WHERE id = p_operacion_id;
  v_dias_desde_inicio := (p_fecha - v_ciclo.fecha_inicio) + v_ciclo.dia_actual_ciclo;
  RETURN ((v_dias_desde_inicio - 1) % v_cantidad_ciclos) + 1;
END;
$$ LANGUAGE plpgsql;

-- RPC: Consolidar pedidos
CREATE OR REPLACE FUNCTION consolidar_pedidos_servicio(p_fecha DATE, p_servicio VARCHAR)
RETURNS UUID AS $$
DECLARE
  v_consolidado_id UUID;
BEGIN
  INSERT INTO consolidados_produccion (fecha, servicio, estado)
  VALUES (p_fecha, p_servicio, 'en_revision')
  RETURNING id INTO v_consolidado_id;

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

  UPDATE consolidados_produccion SET total_porciones = (
    SELECT COALESCE(SUM(cantidad_total), 0) FROM consolidado_items WHERE consolidado_id = v_consolidado_id
  ) WHERE id = v_consolidado_id;

  UPDATE pedidos_servicio SET estado = 'consolidado', updated_at = now()
  WHERE fecha = p_fecha AND servicio = p_servicio AND estado = 'enviado';

  RETURN v_consolidado_id;
END;
$$ LANGUAGE plpgsql;

-- RLS basico
ALTER TABLE tipos_dieta ENABLE ROW LEVEL SECURITY;
ALTER TABLE componentes_plato ENABLE ROW LEVEL SECURITY;
ALTER TABLE operaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios_unidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciclos_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciclo_dia_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_componentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gramajes_componente_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_cambio_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE consolidados_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE consolidado_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cambios_menu_supervisor ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_servicio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_tipos_dieta" ON tipos_dieta FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_componentes" ON componentes_plato FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_all_operaciones" ON operaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_servicios_unidad" ON servicios_unidad FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_ciclos" ON ciclos_menu FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_ciclo_dia" ON ciclo_dia_servicios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_menu_comp" ON menu_componentes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_gramajes" ON gramajes_componente_menu FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pedidos" ON pedidos_servicio FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pedido_items" ON pedido_items_servicio FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pedido_pac" ON pedido_pacientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_sol_cambio" ON solicitudes_cambio_menu FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_consolidados" ON consolidados_produccion FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_consol_items" ON consolidado_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_cambios_sup" ON cambios_menu_supervisor FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_fact_serv" ON facturas_servicio FOR ALL TO authenticated USING (true) WITH CHECK (true);
