# Sprint B — ProyeccionSemanal con Datos Reales

**Fecha:** 2026-03-05
**Estado:** ✅ Completado
**Duración estimada:** 2–3 días | **Duración real:** 1 sesión

---

## Resumen Ejecutivo

Se eliminó la dependencia de valores hardcodeados en `ProyeccionSemanal.jsx` migrando los
promedios de capacidad de raciones a la base de datos. Se creó una pantalla de administración
(`ConfiguracionCapacidades`) para que el equipo pueda ajustar los valores directamente desde
la app sin necesidad de despliegues.

---

## B1 — Migración SQL: columna `capacidad_promedio` en `servicios_unidad`

### Problema
La tabla `servicios_unidad` no tenía columna para almacenar la capacidad promedio de raciones.
Los valores estaban hardcodeados en el frontend como una constante `PROMEDIOS_BASE`.

### Migración aplicada (`add_capacidad_promedio_servicios_unidad`)
```sql
ALTER TABLE servicios_unidad
  ADD COLUMN IF NOT EXISTS capacidad_promedio INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capacidad_descripcion TEXT;

COMMENT ON COLUMN servicios_unidad.capacidad_promedio IS
  'Promedio esperado de raciones por servicio/día para esta unidad';
COMMENT ON COLUMN servicios_unidad.capacidad_descripcion IS
  'Nota o descripción adicional sobre la capacidad configurada';
```

---

## B2 — Poblado de valores iniciales

Se cargaron los valores del hardcode original para el servicio `almuerzo` de cada operación
(referencia: totales diarios del sistema anterior). Los servicios `desayuno`, `cena` y otros
quedan en 0 hasta que el administrador los configure manualmente.

```sql
UPDATE servicios_unidad su
SET capacidad_promedio = CASE
  WHEN o.nombre ILIKE 'Coordinadora' THEN 170
  WHEN o.nombre ILIKE 'Carval'       THEN 65
  WHEN o.nombre ILIKE 'Presentes'    THEN 18
  WHEN o.nombre ILIKE 'IDIME'        THEN 120
  WHEN o.nombre ILIKE 'Red Humana'   THEN 35
  WHEN o.nombre ILIKE 'Virrey Solis' THEN 40
  WHEN o.nombre ILIKE 'Alcala'       THEN 20
  WHEN o.nombre ILIKE 'Eiren'        THEN 80
  WHEN o.nombre ILIKE 'Brune'        THEN 25
  WHEN o.nombre ILIKE 'Ventas'       THEN 70
  ELSE 0
END,
capacidad_descripcion = 'Valor inicial migrado del sistema anterior (capacidad total diaria)'
FROM operaciones o
WHERE su.operacion_id = o.id
  AND su.servicio = 'almuerzo';
```

**Resultado:** 11 operaciones con capacidad en almuerzo. Archroma queda en 0 (no estaba en el sistema anterior).

---

## B3 — Nuevo servicio y pantalla de configuración

### Archivos creados

#### `src/features/planta/services/capacidadesService.js`
Tres funciones exportadas:

| Función | Descripción |
|---------|-------------|
| `getCapacidadesPorOperacion()` | Todas las filas de `servicios_unidad` JOIN `operaciones`, activas |
| `getCapacidadesPorOperacionAgrupadas()` | `SUM(capacidad_promedio)` agrupado por `operacion_id` → Mapa `{ id: total }` |
| `updateCapacidad(id, valor, descripcion?)` | UPDATE de una fila específica |

#### `src/features/planta/components/ConfiguracionCapacidades.jsx`
Pantalla para rol `administrador` y `jefe_de_planta` con:
- **Un bloque por operación**: muestra el total estimado de raciones diarias
- **Una fila por servicio**: input numérico editable + campo de descripción/nota
- **Guardado por fila**: botón "Guardar" activado solo cuando hay cambios; ícono ✓ de confirmación
- **Botón descartar**: aparece cuando hay cambios no guardados
- **Banner informativo**: explica para qué sirve el valor y cómo afecta la proyección

---

## B4 — Actualización de `ProyeccionSemanal.jsx`

### Cambios en `src/features/planta/components/ProyeccionSemanal.jsx`

#### 1. Imports — eliminar hardcode, agregar servicio + router
```diff
- import { supabase } from '@/shared/api';
+ import { supabase } from '@/shared/api';
+ import { useRouter } from '@/router';
+ import { getCapacidadesPorOperacionAgrupadas } from '../services/capacidadesService';
```

La constante `PROMEDIOS_BASE` (10 entradas hardcodeadas) fue eliminada completamente.

#### 2. Estado + carga paralela en `TabProyeccionSemanal`
```diff
+ const { navigate } = useRouter();
+ const [capacidadesDB, setCapacidadesDB] = useState({});

  // En init():
- const { data: ops } = await supabase.from('operaciones')...
+ const [{ data: ops }, capDB] = await Promise.all([
+   supabase.from('operaciones').select('id, nombre, codigo').eq('activo', true).order('nombre'),
+   getCapacidadesPorOperacionAgrupadas(),
+ ]);
+ setCapacidadesDB(capDB);
```

#### 3. Reemplazo del fallback (2 lugares)
```diff
- const nombreOp = operaciones.find(...)?.nombre?.toUpperCase() || '';
- const promBase = PROMEDIOS_BASE[nombreOp] || 50;
+ const promBase = capacidadesDB[opSeleccionada] || 50;
```

#### 4. UI — enlace rápido a configuración
```diff
  {promInfo?.calculado
    ? <span className="text-success">Calculado ({promInfo.dias} días reales)</span>
-   : <span className="text-warning">Estimado (base histórica)</span>
+   : <span className="text-warning">
+       Estimado (base configurada:{' '}
+       <button onClick={() => navigate('configuracion_capacidades')} className="underline">
+         editar →
+       </button>
+     </span>
  }
```

---

## Integración en Router y Navbar

### `src/router/rolerouter.jsx`
```diff
- import { ProyeccionSemanal, CostosServicio, Productos } from "@/features/planta";
+ import { ProyeccionSemanal, CostosServicio, Productos, ConfiguracionCapacidades } from "@/features/planta";

+ case "configuracion_capacidades":
+   return <ConfiguracionCapacidades />;
```

### `src/shared/ui/Navbar.jsx`
Agregado tab "Capacidades" para `administrador` y `jefe_de_planta`:
```diff
// En administrador:
+ { label: "Capacidades", name: "configuracion_capacidades", icon: icons.management },

// En jefe_de_planta:
+ { label: "Capacidades", name: "configuracion_capacidades", icon: icons.management },
```

### `src/features/planta/index.js`
```diff
+ export { default as ConfiguracionCapacidades } from './components/ConfiguracionCapacidades';
+ export * from './services/capacidadesService';
```

---

## Verificación

- **Build:** 1,196 kB (+6 kB sobre Sprint A) ✅
- **Navegar a "Capacidades"** como admin o jefe de planta → tabla editable por operación/servicio ✅
- **En ProyeccionSemanal**, cuando la operación tiene < 7 días de historial:
  - Muestra "Estimado (base configurada: editar →)"
  - El valor base viene de la BD, no del hardcode
- **Editar un valor en ConfiguracionCapacidades** → guardar → volver a ProyeccionSemanal → el nuevo valor refleja inmediatamente

---

## Notas

- `Archroma` quedó con `capacidad_promedio = 0` en todos los servicios porque no estaba en el sistema anterior. El administrador debe configurarla manualmente.
- El hardcode eliminado asumía un número único por operación (sin distinción de servicio). La nueva arquitectura permite configurar desayuno, almuerzo, cena, etc. por separado.
- La Proyección calcula `capacidadesDB[opId]` como la SUMA de todos los servicios activos, lo que equivale al comportamiento anterior cuando se configura solo el almuerzo.

**Siguiente sprint:** C — Módulo Económico Completo (CostosPorUnidad, CierreCostosMensual, varianza presupuesto).
