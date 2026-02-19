-- ============================================================
-- Tabla de gramajes base por componente
-- Healthy App - PRESENTACION
-- ============================================================
-- Esta tabla almacena los gramajes preestablecidos para cada componente
-- Los valores se pueden asignar globalmente o por operación
-- Las dietas variaciones se calculan como % del gramaje base

CREATE TABLE IF NOT EXISTS gramajes_componentes_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operacion_id UUID REFERENCES operaciones(id) ON DELETE CASCADE,  -- NULL = valor global
  componente_id UUID NOT NULL REFERENCES componentes_plato(id) ON DELETE CASCADE,
  gramaje NUMERIC(10,2) NOT NULL,  -- Ej: 200 gr
  unidad_medida VARCHAR(10) DEFAULT 'gr',  -- gr, ml, oz, etc
  descripcion TEXT,  -- Notas sobre este gramaje
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(operacion_id, componente_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_gramajes_componentes_operacion
  ON gramajes_componentes_base(operacion_id) WHERE operacion_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gramajes_componentes_componente
  ON gramajes_componentes_base(componente_id);

-- RLS
ALTER TABLE gramajes_componentes_base ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_gramajes_componentes" ON gramajes_componentes_base;
CREATE POLICY "auth_all_gramajes_componentes"
  ON gramajes_componentes_base
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- DATOS SEMILLA: Gramajes base por componente (valores globales)
-- Estos son los valores por defecto — pueden ser sobrescritos por operación
-- ============================================================

-- Desayuno
INSERT INTO gramajes_componentes_base (componente_id, gramaje, unidad_medida, descripcion)
SELECT c.id, 200, 'gr', 'Cereal - Desayuno base'
FROM componentes_plato c WHERE c.codigo = 'cereal'
ON CONFLICT (operacion_id, componente_id) DO NOTHING;

INSERT INTO gramajes_componentes_base (componente_id, gramaje, unidad_medida, descripcion)
SELECT c.id, 250, 'ml', 'Jugo - Desayuno base'
FROM componentes_plato c WHERE c.codigo = 'jugo'
ON CONFLICT (operacion_id, componente_id) DO NOTHING;

-- Almuerzo
INSERT INTO gramajes_componentes_base (componente_id, gramaje, unidad_medida, descripcion)
SELECT c.id, 200, 'gr', 'Sopa - Almuerzo base'
FROM componentes_plato c WHERE c.codigo = 'sopa'
ON CONFLICT (operacion_id, componente_id) DO NOTHING;

INSERT INTO gramajes_componentes_base (componente_id, gramaje, unidad_medida, descripcion)
SELECT c.id, 180, 'gr', 'Proteína - Almuerzo base'
FROM componentes_plato c WHERE c.codigo = 'proteina'
ON CONFLICT (operacion_id, componente_id) DO NOTHING;

INSERT INTO gramajes_componentes_base (componente_id, gramaje, unidad_medida, descripcion)
SELECT c.id, 150, 'gr', 'Verdura - Almuerzo base'
FROM componentes_plato c WHERE c.codigo = 'verdura'
ON CONFLICT (operacion_id, componente_id) DO NOTHING;

INSERT INTO gramajes_componentes_base (componente_id, gramaje, unidad_medida, descripcion)
SELECT c.id, 200, 'gr', 'Farináceo - Almuerzo base'
FROM componentes_plato c WHERE c.codigo = 'farinaceo'
ON CONFLICT (operacion_id, componente_id) DO NOTHING;

-- Cena
INSERT INTO gramajes_componentes_base (componente_id, gramaje, unidad_medida, descripcion)
SELECT c.id, 180, 'gr', 'Proteína - Cena base'
FROM componentes_plato c WHERE c.codigo = 'proteina'
ON CONFLICT (operacion_id, componente_id) DO NOTHING;

INSERT INTO gramajes_componentes_base (componente_id, gramaje, unidad_medida, descripcion)
SELECT c.id, 130, 'gr', 'Verdura - Cena base'
FROM componentes_plato c WHERE c.codigo = 'verdura'
ON CONFLICT (operacion_id, componente_id) DO NOTHING;

-- Onces
INSERT INTO gramajes_componentes_base (componente_id, gramaje, unidad_medida, descripcion)
SELECT c.id, 250, 'ml', 'Jugo - Onces base'
FROM componentes_plato c WHERE c.codigo = 'jugo'
ON CONFLICT (operacion_id, componente_id) DO NOTHING;

INSERT INTO gramajes_componentes_base (componente_id, gramaje, unidad_medida, descripcion)
SELECT c.id, 100, 'gr', 'Cereal - Onces base'
FROM componentes_plato c WHERE c.codigo = 'cereal'
ON CONFLICT (operacion_id, componente_id) DO NOTHING;
