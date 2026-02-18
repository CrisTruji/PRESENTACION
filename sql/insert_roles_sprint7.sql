-- ============================================================
-- INSERT ROLES: Chef, Supervisor Produccion, Coordinador Unidad
-- Sprint 7 - Sistema de Pedidos de Servicios
--
-- Ejecutar en Supabase SQL Editor
-- Los roles se insertan en la tabla 'roles' existente.
-- Luego se pueden asignar desde el Admin Dashboard a usuarios.
-- ============================================================

-- Verificar primero si ya existen (ON CONFLICT previene duplicados)
INSERT INTO roles (id, nombre, descripcion) VALUES
  (gen_random_uuid(), 'chef', 'Chef/Nutricionista - Configura ciclos de menu y recetas por operacion'),
  (gen_random_uuid(), 'supervisor_produccion', 'Supervisor de Produccion - Consolida pedidos, verifica stock, aprueba para cocina'),
  (gen_random_uuid(), 'coordinador_unidad', 'Coordinador de Unidad - Realiza pedidos de servicio diarios por operacion')
ON CONFLICT (nombre) DO NOTHING;

-- Verificar insercion:
-- SELECT * FROM roles ORDER BY nombre;
