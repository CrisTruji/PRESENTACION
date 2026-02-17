# 📚 DOCUMENTACIÓN COMPLETA DE POLÍTICAS RLS

## 📋 ÍNDICE
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Matriz de Permisos Completa](#matriz-de-permisos)
3. [Políticas por Tabla](#políticas-por-tabla)
4. [Casos de Uso](#casos-de-uso)
5. [Testing y Verificación](#testing-y-verificación)
6. [Troubleshooting](#troubleshooting)
7. [Plan de Migración](#plan-de-migración)

---

## 🎯 RESUMEN EJECUTIVO

### Tablas Protegidas
- ✅ **28 tablas** con RLS habilitado
- ✅ **69 políticas** creadas en total
- ✅ **7 roles** configurados

### Roles del Sistema
1. **administrador**: Acceso completo a todo el sistema
2. **jefe_de_planta**: Crea solicitudes, gestiona servicios
3. **auxiliar_de_compras**: Verifica y aprueba solicitudes
4. **jefe_de_compras**: Realiza compras, crea pedidos y facturas
5. **almacenista**: Recibe facturas, actualiza inventario
6. **jefe**: Gestiona recetas y materia prima (rol tipo chef)
7. **usuario**: Usuario sin permisos especiales

---

## 📊 MATRIZ DE PERMISOS COMPLETA

### Leyenda
- ✅ = Permitido
- ⚠️ = Permitido con restricciones
- ❌ = NO permitido
- 📖 = Solo lectura

| Tabla | Admin | Jefe Planta | Aux Compras | Jefe Compras | Almacenista | Chef/Jefe | Usuario |
|-------|-------|-------------|-------------|--------------|-------------|-----------|---------|
| **profiles** | ✅ | 📖 (propio) | 📖 (propio) | 📖 (propio) | 📖 (propio) | 📖 (propio) | 📖 (propio) |
| **roles** | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 |
| **solicitudes** | ✅ | ⚠️ (propias) | 📖/✏️ | 📖/✏️ | 📖 | ❌ | ❌ |
| **solicitud_items** | ✅ | ⚠️ (propias) | 📖 | 📖 | 📖 | ❌ | ❌ |
| **facturas** | ✅ | ❌ | ❌ | 📖/✏️ | ⚠️ (crear/actualizar) | ❌ | ❌ |
| **factura_items** | ✅ | ❌ | ❌ | 📖 | ✏️ | ❌ | ❌ |
| **pedidos** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **pedido_items** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **proveedores** | ✅ | 📖 | 📖 | ✅ | 📖 | 📖 | ❌ |
| **arbol_materia_prima** | ✅ | 📖 | 📖 | 📖 | ⚠️ (solo stock) | ✅ | ❌ |
| **arbol_recetas** | ✅ | 📖 | 📖 | 📖 | 📖 | ✅ | ❌ |
| **receta_ingredientes** | ✅ | 📖 | 📖 | 📖 | 📖 | ✅ | ❌ |
| **arbol_platos** | ✅ | 📖 | 📖 | 📖 | 📖 | ✅ | ❌ |
| **arbol_servicios** | ✅ | ✅ | 📖 | 📖 | 📖 | 📖 | ❌ |
| **servicio_unidades** | ✅ | ✅ | 📖 | 📖 | 📖 | 📖 | ❌ |
| **empleados** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **empleados_talento_humano** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **empleados_sst** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **empleado_documentos** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **movimientos_inventario** | 📖/✏️ | 📖 | 📖 | 📖 | 📖/✏️ | 📖 | ❌ |
| **movimientos_stock** | 📖/✏️ | 📖 | 📖 | 📖 | 📖/✏️ | 📖 | ❌ |
| **historial_precios** | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 | ❌ |
| **auditoria** | 📖 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **unidades_medicas** | ✅ | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 |

---

## 🔍 POLÍTICAS POR TABLA

### 1. arbol_materia_prima

**Políticas creadas:**
```sql
-- Ver: Todos los usuarios autenticados
users_view_materia_prima (SELECT)

-- Crear: Solo admin y chef
admin_chef_create_materia_prima (INSERT)

-- Editar todo: Solo admin y chef
admin_chef_update_materia_prima (UPDATE)

-- Editar stock: Almacenista
almacenista_update_stock_materia_prima (UPDATE)
```

**Casos de uso:**
- ✅ Chef crea un nuevo ingrediente
- ✅ Almacenista actualiza stock después de recibir factura
- ✅ Jefe de planta consulta ingredientes disponibles
- ❌ Auxiliar de compras NO puede modificar ingredientes

---

### 2. arbol_recetas

**Políticas creadas:**
```sql
-- Ver: Todos
users_view_recetas (SELECT)

-- Gestionar: Solo admin y chef
admin_chef_manage_recetas (ALL)
```

**Casos de uso:**
- ✅ Chef crea una nueva receta
- ✅ Chef modifica ingredientes de una receta
- ✅ Jefe de planta consulta recetas para planificar
- ❌ Almacenista NO puede modificar recetas

---

### 3. empleados (y tablas relacionadas)

**Políticas creadas:**
```sql
-- Ver: Solo administrador
admin_view_empleados (SELECT)

-- Gestionar: Solo administrador
admin_manage_empleados (ALL)
```

**Casos de uso:**
- ✅ Administrador registra nuevo empleado
- ✅ Administrador actualiza salario de empleado
- ✅ Administrador consulta exámenes médicos
- ❌ Jefe de planta NO puede ver datos de empleados
- ❌ Ningún otro rol puede ver datos sensibles

**Nota para el futuro:**
```sql
-- Cuando agregues el rol RRHH, modifica las políticas:
DROP POLICY "admin_view_empleados" ON public.empleados;
CREATE POLICY "admin_rrhh_view_empleados" ON public.empleados
FOR SELECT
TO authenticated
USING (
    get_user_role() = ANY (ARRAY['administrador', 'rrhh'])
);
```

---

### 4. auditoria

**Políticas creadas:**
```sql
-- Ver: Solo administrador
admin_view_auditoria (SELECT)

-- Insertar: Sistema (triggers)
system_insert_auditoria (INSERT)
```

**Casos de uso:**
- ✅ Administrador revisa quién modificó una solicitud
- ✅ Sistema registra automáticamente cambios
- ❌ Otros usuarios NO pueden ver auditoría

---

### 5. movimientos_stock

**Políticas creadas:**
```sql
-- Ver: Todos
users_view_movimientos_stock (SELECT)

-- Insertar: Almacenista y admin
almacenista_admin_insert_movimientos_stock (INSERT)
```

**Características:**
- ⚠️ **INMUTABLES**: No se pueden actualizar ni eliminar
- ✅ Solo se pueden insertar nuevos registros
- 📊 Mantienen trazabilidad completa del inventario

---

## 🎮 CASOS DE USO COMPLETOS

### Caso 1: Flujo de Solicitud Completo

**1. Jefe de Planta crea solicitud**
```sql
-- ✅ Permitido por: jefe_planta_create_solicitudes
INSERT INTO solicitudes (proveedor_id, created_by, estado)
VALUES (1, auth.uid(), 'pendiente');
```

**2. Auxiliar de Compras revisa y aprueba**
```sql
-- ✅ Permitido por: users_update_solicitudes
UPDATE solicitudes 
SET estado = 'aprobado_auxiliar', 
    approved_by = auth.uid()
WHERE id = 123;
```

**3. Jefe de Compras crea pedido**
```sql
-- ✅ Permitido por: jefe_compras_create_pedidos
INSERT INTO pedidos (solicitud_id, proveedor_id, created_by)
VALUES (123, 1, auth.uid());
```

**4. Almacenista recibe factura**
```sql
-- ✅ Permitido por: almacenista_create_facturas
INSERT INTO facturas (solicitud_id, proveedor_id, numero_factura, recibido_por)
VALUES (123, 1, 'F-001', auth.uid());
```

**5. Almacenista actualiza inventario**
```sql
-- ✅ Permitido por: almacenista_update_stock_materia_prima
UPDATE arbol_materia_prima 
SET stock_actual = stock_actual + 100
WHERE id = 456;
```

---

### Caso 2: Chef Gestiona Recetas

**1. Chef crea nueva receta**
```sql
-- ✅ Permitido por: admin_chef_manage_recetas
INSERT INTO arbol_recetas (codigo, nombre, plato_id, created_by)
VALUES ('REC-001', 'Arroz con Pollo', 10, auth.uid());
```

**2. Chef agrega ingredientes**
```sql
-- ✅ Permitido por: admin_chef_manage_receta_ingredientes
INSERT INTO receta_ingredientes (receta_id, materia_prima_id, cantidad_requerida)
VALUES (1, 456, 2.5);
```

**3. Jefe de Planta consulta receta**
```sql
-- ✅ Permitido por: users_view_recetas
SELECT * FROM arbol_recetas WHERE id = 1;
```

**4. Almacenista NO puede modificar**
```sql
-- ❌ DENEGADO: Solo lectura para almacenista
UPDATE arbol_recetas SET nombre = 'Otro Nombre' WHERE id = 1;
-- ERROR: new row violates row-level security policy
```

---

### Caso 3: Administrador Gestiona Empleados

**1. Admin registra empleado**
```sql
-- ✅ Permitido por: admin_manage_empleados
INSERT INTO empleados (codigo_unidad, documento_identidad, nombres, apellidos)
VALUES ('UN-001', '123456789', 'Juan', 'Pérez');
```

**2. Admin registra datos de talento humano**
```sql
-- ✅ Permitido por: admin_manage_empleados_th
INSERT INTO empleados_talento_humano (empleado_id, salario, eps, afp)
VALUES (1, 2500000, 'Sura', 'Protección');
```

**3. Jefe de Planta intenta ver empleados**
```sql
-- ❌ DENEGADO: Solo administrador
SELECT * FROM empleados;
-- Resultado: 0 filas (RLS bloquea acceso)
```

---

## 🧪 TESTING Y VERIFICACIÓN

### Script de Verificación Completo

```sql
-- ==========================================
-- SCRIPT DE VERIFICACIÓN DE RLS
-- ==========================================

-- 1. Verificar que TODAS las tablas tengan RLS habilitado
SELECT 
    tablename,
    rowsecurity AS rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false
ORDER BY tablename;
-- Resultado esperado: 0 filas

-- 2. Contar políticas por tabla
SELECT 
    schemaname,
    tablename,
    COUNT(*) as num_politicas
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 3. Ver detalle de políticas de una tabla específica
SELECT 
    policyname,
    CASE polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS comando,
    pg_get_expr(polqual, polrelid) AS condicion_using,
    pg_get_expr(polwithcheck, polrelid) AS condicion_check
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
WHERE c.relname = 'arbol_materia_prima';

-- 4. Verificar función get_user_role
SELECT get_user_role();
-- Debe devolver el rol del usuario actual

-- 5. Test de políticas (ejecutar como diferentes usuarios)
-- Como jefe_de_planta:
SELECT COUNT(*) FROM solicitudes; -- Debe ver solo sus solicitudes

-- Como administrador:
SELECT COUNT(*) FROM solicitudes; -- Debe ver todas

-- Como almacenista:
SELECT COUNT(*) FROM empleados; -- Debe ver 0 (sin acceso)
```

---

## 🔧 TROUBLESHOOTING

### Problema 1: Usuario no puede ver datos

**Síntomas:**
```sql
SELECT * FROM arbol_materia_prima;
-- Resultado: 0 filas (pero sé que hay datos)
```

**Diagnóstico:**
```sql
-- Verificar rol del usuario
SELECT get_user_role();

-- Ver políticas activas
SELECT * FROM pg_policies WHERE tablename = 'arbol_materia_prima';
```

**Soluciones:**
1. Verificar que el usuario tenga un rol asignado
2. Verificar que el rol está correctamente en la tabla `profiles`
3. Verificar que existe una política SELECT para ese rol

---

### Problema 2: Error "new row violates row-level security policy"

**Síntomas:**
```sql
INSERT INTO arbol_recetas (...) VALUES (...);
-- ERROR: new row violates row-level security policy for table "arbol_recetas"
```

**Diagnóstico:**
```sql
-- Ver políticas INSERT de la tabla
SELECT 
    policyname,
    pg_get_expr(polwithcheck, polrelid) AS with_check
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
WHERE c.relname = 'arbol_recetas'
AND polcmd = 'a'; -- INSERT
```

**Soluciones:**
1. Verificar que el rol tiene permiso INSERT en esa tabla
2. Verificar que la condición WITH CHECK se cumple
3. Verificar que `get_user_role()` devuelve el rol correcto

---

### Problema 3: Almacenista no puede actualizar stock

**Síntomas:**
```sql
UPDATE arbol_materia_prima SET stock_actual = 100 WHERE id = 1;
-- ERROR: new row violates row-level security policy
```

**Causa:** El almacenista tiene una política separada que solo permite actualizar campos específicos.

**Solución:**
```sql
-- Verificar que solo actualizas campos de stock
UPDATE arbol_materia_prima 
SET 
    stock_actual = 100,
    stock_minimo = 10,
    stock_maximo = 200,
    costo_promedio = 50
WHERE id = 1;
-- ✅ Esto debería funcionar

-- Esto NO funcionará:
UPDATE arbol_materia_prima 
SET nombre = 'Nuevo Nombre'  -- ❌ Campo no permitido
WHERE id = 1;
```

---

## 📋 PLAN DE MIGRACIÓN

### Fase 1: Pre-Migración (ANTES de ejecutar el SQL)

**1. Backup completo**
```bash
# Hacer backup de la base de datos
pg_dump -h your-host -U postgres -d your-db > backup_pre_rls.sql
```

**2. Documentar estado actual**
```sql
-- Guardar políticas actuales
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

**3. Crear usuario de prueba para cada rol**
```sql
-- Crear usuarios de prueba (en Supabase Auth)
-- admin@test.com → rol: administrador
-- chef@test.com → rol: jefe
-- planta@test.com → rol: jefe_de_planta
-- etc.
```

---

### Fase 2: Ejecución (Ejecutar el SQL)

**1. Ejecutar en ambiente de desarrollo primero**
```sql
-- Ejecutar todo el contenido de RLS_COMPLETAS_SUPABASE.sql
```

**2. Verificar ejecución**
```sql
-- Verificar que no hubo errores
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- Debe devolver un número alto de políticas

-- Verificar RLS habilitado en todas las tablas
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
-- Debe devolver 0 filas
```

---

### Fase 3: Testing Post-Migración

**1. Testing por rol (ejecutar como cada usuario)**

```sql
-- Como administrador
SELECT COUNT(*) FROM empleados; -- ✅ Debe ver todos

-- Como jefe_de_planta
SELECT COUNT(*) FROM empleados; -- ❌ Debe ver 0

-- Como chef
SELECT COUNT(*) FROM arbol_recetas; -- ✅ Debe ver todas
INSERT INTO arbol_recetas (...); -- ✅ Debe poder insertar

-- Como almacenista
UPDATE arbol_materia_prima SET stock_actual = 100 WHERE id = 1; -- ✅ OK
UPDATE arbol_materia_prima SET nombre = 'Test' WHERE id = 1; -- ❌ Error
```

**2. Testing de flujos completos**
- [ ] Flujo de solicitud completo (planta → aux → compras → almacén)
- [ ] Creación de receta por chef
- [ ] Actualización de inventario por almacenista
- [ ] Consultas de reportes por diferentes roles

---

### Fase 4: Monitoreo

**1. Monitorear logs de errores**
```sql
-- Ver intentos de acceso denegados (si tienes logging habilitado)
SELECT * FROM auth.audit_log 
WHERE error_message LIKE '%row-level security%'
ORDER BY created_at DESC
LIMIT 20;
```

**2. Ajustes finos**
Si encuentras que un rol necesita acceso adicional:
```sql
-- Ejemplo: Permitir a jefe_de_planta ver empleados de su unidad (futuro)
CREATE POLICY "jefe_planta_view_empleados_unidad" ON public.empleados
FOR SELECT
TO authenticated
USING (
    get_user_role() = 'jefe_de_planta'
    AND codigo_unidad = (SELECT codigo_unidad FROM profiles WHERE id = auth.uid())
);
```

---

## 🚀 PREPARACIÓN PARA EL FUTURO

### Aislamiento por Unidad Médica

Cuando estés listo para implementar aislamiento por unidad médica:

**1. Agregar campo a profiles**
```sql
ALTER TABLE public.profiles 
ADD COLUMN codigo_unidad VARCHAR REFERENCES public.unidades_medicas(codigo);
```

**2. Crear función helper**
```sql
CREATE OR REPLACE FUNCTION get_user_unidad()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_unidad VARCHAR;
BEGIN
  SELECT codigo_unidad INTO user_unidad
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN user_unidad;
END;
$$;
```

**3. Modificar políticas existentes**
```sql
-- Ejemplo: Solicitudes solo de la unidad del usuario
DROP POLICY "users_view_solicitudes" ON public.solicitudes;
CREATE POLICY "users_view_solicitudes_unidad" ON public.solicitudes
FOR SELECT
TO authenticated
USING (
    get_user_role() = 'administrador'
    OR (
        codigo_unidad = get_user_unidad()
        AND get_user_role() = ANY (ARRAY['jefe_de_planta', 'auxiliar_de_compras', 'jefe_de_compras', 'almacenista'])
    )
);
```

---

## 📞 SOPORTE

Si encuentras problemas:

1. **Revisa los logs de Supabase**
2. **Ejecuta los scripts de verificación** de esta guía
3. **Compara con los ejemplos** de casos de uso
4. **Documenta el error** con el query exacto y el rol del usuario

---

## ✅ CHECKLIST FINAL

Antes de dar por completada la implementación:

- [ ] Todas las tablas tienen RLS habilitado
- [ ] Cada tabla tiene al menos 1 política
- [ ] La función `get_user_role()` funciona correctamente
- [ ] Probaste cada rol en las tablas críticas
- [ ] El flujo de solicitudes funciona de extremo a extremo
- [ ] Los datos sensibles (empleados) están protegidos
- [ ] La auditoría solo es visible para admin
- [ ] Documentaste cualquier cambio adicional que hayas hecho

---

**¡Implementación completada! 🎉**
