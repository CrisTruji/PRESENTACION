-- ============================================================
-- SEED: Horarios límite de entrega por unidad y servicio
-- servicios_unidad — tabla que define las horas_limite por operacion
--
-- INSTRUCCIONES:
-- 1. Ejecuta este script en Supabase → SQL Editor
-- 2. Ajusta los horarios según los que aplican para cada unidad
-- 3. Las horas están en formato HH:MM (24h)
-- ============================================================

-- Limpiar datos existentes si los hay (para re-seed limpio)
-- DELETE FROM servicios_unidad;

-- ============================================================
-- Obtener los IDs de las operaciones para referenciarlos
-- (Los INSERTs usan subquery para obtener el ID por código)
-- ============================================================

-- COORDINADORA
INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'desayuno', '06:30', true FROM operaciones WHERE codigo = 'coordinadora'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'almuerzo', '10:30', true FROM operaciones WHERE codigo = 'coordinadora'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'cena', '16:30', true FROM operaciones WHERE codigo = 'coordinadora'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

-- ALCALÁ
INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'desayuno', '06:00', true FROM operaciones WHERE codigo = 'alcala'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'nueves', '09:00', true FROM operaciones WHERE codigo = 'alcala'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'almuerzo', '10:30', true FROM operaciones WHERE codigo = 'alcala'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'onces', '14:30', true FROM operaciones WHERE codigo = 'alcala'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'cena', '16:30', true FROM operaciones WHERE codigo = 'alcala'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'cena_ligera', '19:00', true FROM operaciones WHERE codigo = 'alcala'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

-- PRESENTES
INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'desayuno', '06:00', true FROM operaciones WHERE codigo = 'presentes'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'nueves', '09:00', true FROM operaciones WHERE codigo = 'presentes'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'almuerzo', '10:30', true FROM operaciones WHERE codigo = 'presentes'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'onces', '14:30', true FROM operaciones WHERE codigo = 'presentes'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'cena', '16:30', true FROM operaciones WHERE codigo = 'presentes'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'cena_ligera', '19:00', true FROM operaciones WHERE codigo = 'presentes'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

-- IDIME
INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'desayuno', '06:30', true FROM operaciones WHERE codigo = 'idime'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'almuerzo', '10:30', true FROM operaciones WHERE codigo = 'idime'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'cena', '16:30', true FROM operaciones WHERE codigo = 'idime'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

-- RED HUMANA
INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'desayuno', '06:30', true FROM operaciones WHERE codigo = 'red_humana'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'almuerzo', '10:30', true FROM operaciones WHERE codigo = 'red_humana'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'cena', '16:30', true FROM operaciones WHERE codigo = 'red_humana'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

-- VIRREY SOLIS
INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'desayuno', '06:30', true FROM operaciones WHERE codigo = 'virrey_solis'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'almuerzo', '10:30', true FROM operaciones WHERE codigo = 'virrey_solis'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'cena', '16:30', true FROM operaciones WHERE codigo = 'virrey_solis'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

-- CARVAL
INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'desayuno', '06:30', true FROM operaciones WHERE codigo = 'carval'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'almuerzo', '11:00', true FROM operaciones WHERE codigo = 'carval'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'cena', '16:30', true FROM operaciones WHERE codigo = 'carval'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

-- ARCHROMA
INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'desayuno', '06:30', true FROM operaciones WHERE codigo = 'archroma'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'almuerzo', '11:00', true FROM operaciones WHERE codigo = 'archroma'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'cena', '17:00', true FROM operaciones WHERE codigo = 'archroma'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

-- EIREN
INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'almuerzo', '11:00', true FROM operaciones WHERE codigo = 'eiren'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

-- BRUNE
INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'almuerzo', '11:00', true FROM operaciones WHERE codigo = 'brune'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

-- VENTAS
INSERT INTO servicios_unidad (operacion_id, servicio, hora_limite, activo)
SELECT id, 'almuerzo', '11:00', true FROM operaciones WHERE codigo = 'ventas'
ON CONFLICT (operacion_id, servicio) DO UPDATE SET hora_limite = EXCLUDED.hora_limite, activo = true;

-- Verificar los datos insertados
SELECT op.nombre, su.servicio, su.hora_limite
FROM servicios_unidad su
JOIN operaciones op ON op.id = su.operacion_id
WHERE su.activo = true
ORDER BY op.nombre, su.servicio;
