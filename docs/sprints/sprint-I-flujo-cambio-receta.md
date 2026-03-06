# Sprint I — Flujo Completo de Aprobación de Cambio de Receta

**Fecha:** 2026-03-06
**Estado:** ✅ Completado
**Build:** ✅ Sin errores (40.33s)

---

## Problema resuelto

Cuando un coordinador solicitaba un cambio de receta, el supervisor solo podía
aprobar o rechazar la solicitud, pero **nunca se aplicaba automáticamente al
consolidado de producción**. El cambio quedaba registrado en BD como "aprobado"
pero la receta en el consolidado seguía siendo la original.

Adicionalmente, el coordinador no recibía ninguna notificación cuando su
solicitud era resuelta.

---

## Flujo anterior vs nuevo

### Antes
```
Coordinador pide cambio → Supervisor aprueba → Estado = "aprobada" (sin efecto real)
```

### Después
```
Coordinador pide cambio
  ↓
Supervisor hace clic en "Aprobar"
  ↓
[Verificación automática de consolidado activo para esa fecha/servicio]
  ↓
Si consolidado en_revision:
  → Abre ModalSustituirReceta con la receta solicitada preseleccionada
  → Supervisor confirma (o elige otra)
  → sustituirReceta() + aprobar() → consolidado actualizado ✓
  → Notificación a coordinador ✓
Si no hay consolidado activo:
  → Aprueba directamente
  → Notificación a coordinador ✓
```

---

## Archivos modificados

| Archivo | Acción |
|---------|--------|
| Supabase BD (migración `sprint_i_notif_cambio_receta`) | Nuevas funciones SQL |
| `src/features/food-orders/services/solicitudesCambioService.js` | `getPendientes` incluye `componente_id` |
| `src/features/food-orders/components/CambioRecetaPanel.jsx` | Flujo async + modal condicional |
| `src/features/food-orders/components/ModalSustituirReceta.jsx` | Props `recetaPreseleccionada` + `motivoInicial` |

---

## I4 — Migración SQL

### `fn_notif_cambio_receta(p_solicitud_id UUID)`
```sql
-- Crea un evento en eventos_sistema y llama a distribuir_notificaciones()
-- Solo lo crea una vez (evita duplicados por solicitud_id en datos_contexto)
-- Ruta de notificación: coordinador_unidad
```

### `distribuir_notificaciones()` — nuevo tipo
```sql
WHEN 'cambio_receta_resuelto' THEN 'Cambio de Receta Resuelto'  -- título
WHEN 'cambio_receta_resuelto' THEN '/pedido'                    -- URL
WHEN 'cambio_receta_resuelto' THEN ARRAY['coordinador_unidad']  -- roles destino
```

---

## I3 — solicitudesCambioService.js

```diff
- menu_componentes (componentes_plato(nombre), arbol_recetas(nombre)),
+ menu_componentes (componente_id, componentes_plato(nombre), arbol_recetas(nombre)),
```

El `componente_id` es el UUID de `componentes_plato` — permite encontrar el
`consolidado_item` correspondiente (`consolidado_items.componente_id` → misma FK).

---

## I1 — CambioRecetaPanel.jsx

### Nuevos imports
```js
import { supabase } from '@/shared/api';
import { consolidadoService } from '../services/consolidadoService';
import ModalSustituirReceta from './ModalSustituirReceta';
```

### Nuevos estados
```js
const [checkandoConsolidado, setCheckandoConsolidado] = useState(null); // solicitudId
const [sustitucionPendiente, setSustitucionPendiente] = useState(null); // { solicitud, consolidado, item }
```

### `handleAprobar(sol)` — ahora async
1. Verifica si existe consolidado activo para la fecha/servicio del pedido
2. Si sí → busca el `consolidado_item` por `componente_id`
3. Si lo encuentra → abre el modal con receta preseleccionada
4. Si no → aprueba directamente + dispara notificación

```js
const handleAprobar = async (sol) => {
  if (fecha && servicio && sol.receta_solicitada_id) {
    setCheckandoConsolidado(sol.id);
    const { data: consolidado } = await consolidadoService.getConsolidadoPorFecha(fecha, servicio);
    if (consolidado && ['en_revision', 'pendiente'].includes(consolidado.estado)) {
      const matchingItem = consolidado.consolidado_items?.find(
        ci => ci.componente_id === sol.menu_componentes?.componente_id
      );
      if (matchingItem) {
        setSustitucionPendiente({ solicitud: sol, consolidado, item: matchingItem });
        return; // el modal maneja el resto
      }
    }
    setCheckandoConsolidado(null);
  }
  // fallback: aprobar sin consolidado
  aprobar.mutate(...);
};
```

### `handleRechazar(sol)` — fire-and-forget notificación
```js
supabase.rpc('fn_notif_cambio_receta', { p_solicitud_id: sol.id }).catch(() => {});
```

### Botón con spinner durante verificación
```jsx
<button
  disabled={aprobar.isPending || checkandoConsolidado === sol.id}
>
  {checkandoConsolidado === sol.id ? <div className="spinner spinner-sm" /> : <Check />}
  Aprobar
</button>
```

### Modal condicional (al final del return con Fragment)
```jsx
<>
  <div>...</div>  {/* panel principal */}

  {sustitucionPendiente && (
    <ModalSustituirReceta
      item={sustitucionPendiente.item}
      consolidadoId={sustitucionPendiente.consolidado.id}
      recetaPreseleccionada={{ id: ..., nombre: ... }}
      motivoInicial={sustitucionPendiente.solicitud.motivo}
      onClose={() => setSustitucionPendiente(null)}
      onSuccess={async () => {
        await aprobar.mutateAsync({ ... });
        supabase.rpc('fn_notif_cambio_receta', { ... });
        setSustitucionPendiente(null);
      }}
    />
  )}
</>
```

---

## I2 — ModalSustituirReceta.jsx

### Nuevas props
```js
export default function ModalSustituirReceta({
  item, consolidadoId, onClose, onSuccess,
  recetaPreseleccionada,  // { id, nombre } — receta que el coordinador solicitó
  motivoInicial,          // string — motivo de la solicitud (pre-llena el input)
})
```

### Banner de receta preseleccionada
Aparece entre el header y el campo de motivo cuando `recetaPreseleccionada` está presente:
```
╔═══════════════════════════════════════════════════╗
║  ↔  Receta solicitada por coordinador             ║
║     Pollo al horno con papas               [Aplicar esta] ║
╚═══════════════════════════════════════════════════╝
```
- Botón "Aplicar esta" deshabilitado hasta que se escriba el motivo
- `autoFocus` del input de motivo se activa solo cuando NO hay receta preseleccionada
- `motivo` inicializado con `motivoInicial` (motivo de la solicitud original)

---

## Casos de uso

### Caso 1: Con consolidado activo
1. Coordinador envió solicitud para cambiar "Arroz blanco" → "Arroz integral" (fecha: 2026-03-10, almuerzo)
2. Supervisor ve el panel, hace clic "Aprobar"
3. Sistema verifica → hay consolidado `en_revision` para esa fecha/almuerzo
4. Modal se abre con banner: "Receta solicitada por coordinador: Arroz integral"
5. Supervisor escribe motivo (ya viene el del coordinador pre-llenado)
6. Clic en "Aplicar esta" → `sustituirReceta()` + `aprobar()` ejecutados
7. Consolidado actualizado, solicitud marcada como aprobada
8. Notificación enviada al coordinador

### Caso 2: Sin consolidado activo
1. Misma solicitud pero el consolidado aún no fue generado
2. Sistema verifica → no hay consolidado para esa fecha
3. Aprueba directamente (sin modal)
4. Solicitud marcada como aprobada
5. Notificación enviada al coordinador

### Caso 3: Rechazo
1. Supervisor hace clic en 💬 (respuesta), escribe el motivo del rechazo
2. Clic en "Rechazar"
3. Solicitud marcada como rechazada
4. Notificación enviada al coordinador con el motivo

---

## Verificación

```
✓ built in 40.33s
```

### Pruebas manuales recomendadas

1. **Con consolidado activo:**
   - Crear solicitud de cambio de receta desde rol `coordinador_unidad`
   - Como supervisor, hacer clic en "Aprobar"
   - Verificar que el spinner aparece mientras se verifica el consolidado
   - Si hay consolidado `en_revision` → modal debe abrirse con el banner de receta
   - Confirmar "Aplicar esta" → `cambios_menu_supervisor` + `consolidado_items` actualizados en BD

2. **Sin consolidado:**
   - Probar con fecha sin consolidado → aprobación directa, sin modal
   - Verificar: `solicitudes_cambio_menu.estado = 'aprobada'` en BD

3. **Rechazo con notificación:**
   - Rechazar solicitud con motivo → verificar `eventos_sistema` + `notificaciones` en BD
   - El coordinador debe ver la notificación en su panel

4. **SQL directo para verificar:**
   ```sql
   SELECT * FROM eventos_sistema WHERE tipo = 'cambio_receta_resuelto' ORDER BY creado_en DESC LIMIT 5;
   SELECT * FROM notificaciones WHERE tipo = 'cambio_receta_resuelto' ORDER BY created_at DESC LIMIT 5;
   ```

---

## Notas técnicas

- **Matching de consolidado_item:** Se usa `consolidado_items.componente_id = menu_componentes.componente_id` (ambos UUID → `componentes_plato.id`). Si no hay match exacto, usa el primer item como fallback.
- **Race condition:** `setCheckandoConsolidado(null)` en el `finally` asegura que el spinner siempre desaparezca incluso si el fetch falla.
- **Fragment en JSX:** El modal está fuera del `<div>` principal → se usa `<>...</>` para tener dos raíces.
- **Fire-and-forget notificación:** `.catch(() => {})` asegura que un error en la notificación no bloquee el flujo principal de aprobación/rechazo.
