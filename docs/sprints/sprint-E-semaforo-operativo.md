# Sprint E — Semáforo Operativo

**Estado:** ✅ Completado
**Fecha:** 2026-03-05
**Bundle principal:** 1,229 kB (baseline Sprint D: 1,222 kB, delta: +7 kB)

---

## Objetivo

Agregar un widget de "estado del día" al `AdminDashboard` (tab Resumen) que muestre
en tiempo visual si cada operación ha enviado sus pedidos a tiempo, está pendiente, o
ya venció su hora límite.

---

## Estado auditado antes de implementar

| Dato | Resultado |
|------|-----------|
| Operaciones activas | 11 |
| Tipos de servicio | 6: desayuno, nueves, almuerzo, onces, cena, cena_ligera |
| `servicios_unidad.hora_limite` | ✅ definido en todas las filas activas |
| `pedidos_servicio.hora_envio` | ✅ columna existente |
| `pedidos_servicio.enviado_en_hora` | ✅ columna existente |
| Función SQL de semáforo | ❌ no existe — lógica calculada en frontend |
| Nuevo SQL requerido | **Ninguno** — 2 queries directas suficientes |

**Sin cambios en router ni Navbar** — el semáforo es un widget embebido en `TabResumen`,
no una pantalla separada navegable.

---

## Lógica del semáforo (calculada en frontend)

```
Para cada (operacion, servicio) en servicios_unidad.activo = true:

  ¿Existe pedido hoy con estado != 'borrador'?
    SÍ → 🟢  Verde   (enviado)
    NO →
      hora_actual < hora_limite  → 🟡  Amarillo (pendiente, aún a tiempo)
      hora_actual ≥ hora_limite  → 🔴  Rojo     (vencido)

  Operación sin ese servicio → ⬜ guión (—)
```

**Actualización dual:**
- **Datos de pedidos:** `refetchInterval: 5 min` (React Query) — refresca desde BD
- **Hora local:** `setInterval` cada 60s — re-calcula colores sin refetch (cambia
  amarillo→rojo automáticamente cuando pasa `hora_limite` sin necesidad de una nueva
  query)

---

## E1 — Hook `useSemaforoOperativo.js`

**Archivo nuevo:** `src/features/admin/hooks/useSemaforoOperativo.js`

```js
async function fetchSemaforoData() {
  const hoy = new Date().toISOString().split('T')[0];
  const [serviciosResult, pedidosResult] = await Promise.all([
    supabase
      .from('servicios_unidad')
      .select('id, operacion_id, servicio, hora_limite, capacidad_promedio, operaciones!inner(id, nombre)')
      .eq('activo', true),
    supabase
      .from('pedidos_servicio')
      .select('operacion_id, servicio, estado, hora_envio')
      .eq('fecha', hoy)
      .neq('estado', 'borrador'),
  ]);
  return { servicios: serviciosResult.data || [], pedidos: pedidosResult.data || [] };
}

export function useSemaforoOperativo() {
  return useQuery({
    queryKey: ['semaforo-operativo'],
    queryFn:  fetchSemaforoData,
    staleTime:       2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
```

---

## E2 — Componente `SemaforoOperativo.jsx`

**Archivo nuevo:** `src/features/admin/components/SemaforoOperativo.jsx`

### Estructura visual

```
┌──────────────────────────────────────────────────────────────┐
│ 🕐 Semáforo Operativo — jueves 5 mar 2026  [Actualizar]      │
│   actualizado 14:32                                           │
├────────────────┬──────────┬────────┬──────────┬──────┬───────┤
│ Operación      │ Desayuno │ Nueves │ Almuerzo │ Cena │ C.Lig│
├────────────────┼──────────┼────────┼──────────┼──────┼───────┤
│ Alcala         │  [✓]     │  [·]   │  [!]     │  —   │  [·]  │
│ Archroma       │  [✓]     │   —    │  [✓]     │  —   │   —   │
│ Brune          │   —      │   —    │  [!]     │  —   │   —   │
│ ...            │  ...     │  ...   │  ...     │  ... │  ...  │
├────────────────┴──────────┴────────┴──────────┴──────┴───────┤
│ 🟢 Enviado  🟡 Pendiente  🔴 Vencido  — No aplica            │
│                               Click en celda para detalles ℹ │
└──────────────────────────────────────────────────────────────┘
```

### Construcción de la matriz

```js
// 1. Servicios únicos en orden cronológico (filtrados a los que existen en BD)
const ORDEN_SERVICIOS = ['desayuno','nueves','almuerzo','onces','cena','cena_ligera'];
const serviciosEnUso = ORDEN_SERVICIOS.filter(s => servicios.some(su => su.servicio === s));

// 2. Mapa rápido de pedidos de hoy: "operacion_id|servicio" → pedido
const pedidoMap = new Map();
for (const p of pedidos) pedidoMap.set(`${p.operacion_id}|${p.servicio}`, p);

// 3. Agrupar servicios por operacion_id → matriz
const opMap = new Map();
for (const su of servicios) {
  // ...
  opMap.get(opId).celdas[su.servicio] = {
    horaLimite: su.hora_limite,
    capacidad:  su.capacidad_promedio || 0,
    tienePedido: !!pedidoMap.get(key),
    horaEnvio:  pedidoMap.get(key)?.hora_envio || null,
    estado:     calcularEstado(su.hora_limite, !!pedidoMap.get(key), horaActual),
  };
}
```

### Click en celda → InfoPopup

Modal inline (no pantalla, no router) con:
- Operación y tipo de servicio
- Badge de estado (verde/amarillo/rojo)
- Hora límite
- Hora de envío (si está enviado)
- Capacidad esperada (si `capacidad_promedio > 0`)

### Funcionalidades adicionales

- Botón "Actualizar" manual con spinner mientras `isFetching`
- Leyenda al pie con los 4 estados
- Accesibilidad: `title` en cada botón con tooltip contextual, `focus:ring` para teclado

---

## E3 — Integración en AdminDashboard.jsx y admin/index.js

### `AdminDashboard.jsx`

```diff
  import { RecommendationWidget } from '@/features/recommendations';
+ import SemaforoOperativo from './SemaforoOperativo';

  // En TabResumen, entre el grid de KPIs y RecommendationWidget:
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">...</div>

+ <SemaforoOperativo />

  <RecommendationWidget diasProyeccion={7} />
```

### `admin/index.js`

```diff
  export { default as CostosPorUnidad } from './components/CostosPorUnidad';
+ export { default as SemaforoOperativo } from './components/SemaforoOperativo';
```

---

## Verificación

### Build

```
✓ built in 27.41s
Bundle principal: 1,229 kB (Sprint D baseline: 1,222 kB, delta: +7 kB)
```
Sin errores de compilación. Los warnings de chunks son pre-existentes.

### Funcional

1. Abrir AdminDashboard > tab Resumen
2. El semáforo aparece entre los KPI cards y RecommendationWidget
3. Celdas verdes = operaciones que ya enviaron pedido hoy
4. Celdas amarillas = sin pedido, hora actual < hora_limite
5. Celdas rojas = sin pedido, hora ya vencida
6. Click en cualquier celda → InfoPopup con detalle
7. Botón "Actualizar" → re-fetch manual
8. En DevTools > Network: verificar request a `servicios_unidad` y `pedidos_servicio` cada 5 min

---

## Archivos Modificados / Creados

| Tipo | Archivo |
|------|---------|
| 🆕 Nuevo | `src/features/admin/hooks/useSemaforoOperativo.js` |
| 🆕 Nuevo | `src/features/admin/components/SemaforoOperativo.jsx` |
| ✏️ Modificado | `src/features/admin/components/AdminDashboard.jsx` |
| ✏️ Modificado | `src/features/admin/index.js` |
