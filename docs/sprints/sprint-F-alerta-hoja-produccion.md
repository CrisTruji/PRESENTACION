# Sprint F — Alerta Hora Límite + Hoja de Producción

**Estado:** ✅ Completado — 2026-03-06
**Build:** ✓ 42.73 s · 1,234 kB (sin errores nuevos)

---

## Problema

1. **F1/F2:** El coordinador de unidad solo veía un badge estático (verde/rojo) en
   `PedidoServicioForm.jsx`. No había conteo regresivo ni alerta proactiva si no estaba
   en pantalla. La comparación era un string estático que no se reacualizaba.

2. **F3:** La cocina no tenía una hoja imprimible del consolidado del día. Solo existía
   un botón de exportación a Excel con datos de pedidos (no de producción).

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/features/food-orders/components/PedidoServicioForm.jsx` | F1 + F2 frontend |
| `src/features/food-orders/services/consolidadoService.js` | F3 — nueva función `generarHojaProduccion` |
| `src/features/food-orders/components/ConsolidadoSupervisor.jsx` | F3 — botón "Hoja PDF" |
| Supabase BD — función `fn_alerta_pedido_limite` | F2 SQL (migración aplicada) |
| Supabase BD — `distribuir_notificaciones()` | F2 SQL — tipo `pedido_proximo_vencimiento` |

---

## F1 — Countdown en `PedidoServicioForm.jsx`

### Cambio
Reemplazado el badge estático de hora límite por un contador regresivo en vivo
que se actualiza cada 60 s mediante `setInterval`.

```js
// Estado de tiempo vivo
const [ahora, setAhora] = useState(new Date());
useEffect(() => {
  const id = setInterval(() => setAhora(new Date()), 60_000);
  return () => clearInterval(id);
}, []);

// Cálculo robusto con objetos Date (no comparación de strings)
function calcMinutosRestantes(limit) {
  if (!limit) return null;
  const [hh, mm] = limit.split(':').map(Number);
  const d = new Date(ahora);
  d.setHours(hh, mm, 0, 0);
  return Math.floor((d - ahora) / 60_000);
}
const mins = calcMinutosRestantes(horaLimite);
```

### UI resultante (3 estados)
| Condición | Color | Icono |
|-----------|-------|-------|
| `mins > 30` o sin límite | Verde (`alert-success`) | CheckCircle |
| `10 < mins ≤ 30` | Amarillo (`bg-yellow-50`) | AlertCircle |
| `mins ≤ 10` o vencida | Rojo (`alert-error`) | AlertCircle parpadeante |

---

## F2 — Notificación automática 15 min antes

### SQL aplicado: `fn_alerta_pedido_limite`
- Función que crea un evento `pedido_proximo_vencimiento` en `eventos_sistema`
- Solo actúa si:
  - El límite está entre 1 y 20 minutos en el futuro
  - El pedido está en estado `borrador` (no enviado)
  - No existe ya un evento para esa operación/servicio/fecha hoy
- El trigger `trg_auto_distribuir` llama automáticamente `distribuir_notificaciones()`

### SQL actualizado: `distribuir_notificaciones()`
Agregado el tipo `pedido_proximo_vencimiento`:
```sql
WHEN 'pedido_proximo_vencimiento' THEN
  -- Título: 'Pedido Próximo a Vencer'
  -- URL: '/pedido'
  -- Roles: coordinador_unidad, administrador
```

### Frontend — fire-and-forget
```js
useEffect(() => {
  if (operacionActual?.id && servicioPedido && mins !== null && mins <= 20 && mins > 0 && !pedidoActual?.hora_envio) {
    supabase.rpc('fn_alerta_pedido_limite', {
      p_operacion_id: operacionActual.id,
      p_servicio: servicioPedido,
    });
  }
}, [mins]); // eslint-disable-line react-hooks/exhaustive-deps
```

---

## F3 — Hoja de Producción (PDF)

### Nueva función `generarHojaProduccion` en `consolidadoService.js`
- Exportación nombrada fuera del objeto `consolidadoService`
- Llama `getVistaRecetas()` y `getIngredientesTotales()` en paralelo (`Promise.all`)
- Importación dinámica de jsPDF + jspdf-autotable (mismo patrón que `CierreCostosMensual.jsx`)
- PDF A4 portrait con dos secciones:

**Sección 1 — RECETAS A PRODUCIR**
```
Componente | Receta | Código | Cantidad
PROTEÍNA   | Pollo al ajillo | REC-001 | 45
...
           | TOTAL PORCIONES |         | 120
```

**Sección 2 — INGREDIENTES REQUERIDOS**
```
Ingrediente | Código | Requerido | Unidad | Stock | Estado
Pechuga pollo | MP-023 | 45.6 | kg | 3.2 | INSUFICIENTE  ← rojo
Arroz | MP-011 | 18.0 | kg | 22.5 | SUFICIENTE  ← teal
```
- Ingredientes INSUFICIENTE en rojo + bold
- Footer del consolidado muestra resumen de alertas de stock
- Nombre de archivo: `hoja-produccion-{fecha}-{servicio}.pdf`

### Nuevo botón en `ConsolidadoSupervisor.jsx`
- Posición: junto al botón Excel en el header
- Deshabilitado cuando no hay consolidado activo
- Muestra spinner mientras genera
- Icono: `FileText` (lucide-react, ya importado)

---

## Verificación

### F1 — Countdown vivo
- Abrir `PedidoServicioForm` con un servicio que tenga `hora_limite` configurada
- Verificar que el badge cambia de color según los minutos restantes
- El texto muestra "Faltan X min" o "Faltan Xh Ymin" o "Hora límite vencida"

### F2 — Notificación proactiva
- Con un pedido en `borrador` y `hora_limite` a ≤20 min:
  - La función `fn_alerta_pedido_limite` crea un evento en `eventos_sistema`
  - El trigger distribuye una notificación a `coordinador_unidad` y `administrador`
  - Aparece en la campana de notificaciones del coordinador

### F3 — PDF Hoja de Producción
- Generar un consolidado para fecha/servicio con pedidos
- Hacer clic en "Hoja PDF" → se descarga `hoja-produccion-YYYY-MM-DD-servicio.pdf`
- El PDF contiene dos secciones: recetas con cantidades e ingredientes con estado de stock
- El botón está deshabilitado si no hay consolidado

---

## Notas técnicas

- `generarHojaProduccion` es una **exportación nombrada** (no método del objeto service)
  para evitar referencia circular y porque usa `async import()` pesado.
- El patrón `fire-and-forget` de F2 sigue el mismo approach de `fn_notif_presupuesto_critico`
  en `DashboardPresupuesto.jsx` (Sprint D).
- Los warnings del build (`dynamic import + static import` en `shared/api`) son pre-existentes
  desde Sprint A y no afectan el comportamiento en producción.
