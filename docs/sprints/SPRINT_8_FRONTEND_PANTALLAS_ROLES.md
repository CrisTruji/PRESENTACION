# Sprint 8 — Frontend Pantallas por Rol (Funcionalidades Completas)

## Contexto

En Sprint 7 se implementó el backend completo del sistema de pedidos de servicios de catering (SQL, servicios, hooks, stores, componentes UI básicos con el design system real).

**Sprint 8** cierra el ciclo: integra todas las funcionalidades funcionales en las pantallas de cada rol, basándose en los mockups de diseño en `C:\Users\crist\Downloads\diseños\` como referencia visual y funcional.

---

## Roles y Pantallas

### 1. Chef (`chef`)
- **Ruta por defecto:** `chef_dashboard`
- **Pantalla:** `ChefDashboard.jsx` → Lista de operaciones con ciclos activos
- **Editor:** `CicloEditor.jsx` → 3 paneles (Calendario + Menú del Día / Gramajes / Ingredientes)

### 2. Coordinador de Unidad (`coordinador_unidad`)
- **Ruta por defecto:** `pedido_servicio`
- **Pantalla:** `PedidoServicioForm.jsx` → Formulario de pedido diario

### 3. Supervisor de Producción (`supervisor_produccion`)
- **Ruta por defecto:** `consolidado_supervisor`
- **Pantalla:** `ConsolidadoSupervisor.jsx` → Dashboard de consolidación y aprobación

---

## Cambios Implementados en Sprint 8

### ✅ 1. `ModalNuevoCiclo.jsx` (NUEVO)
**Archivo:** `src/features/menu-cycles/components/ModalNuevoCiclo.jsx`

**Problema:** El store `useCicloEditorStore` tenía `abrirModalNuevoCiclo()` pero no existía el modal UI.

**Implementación:**
- Modal con formulario: selección de operación, nombre del ciclo, fecha de inicio, día actual del ciclo
- Al seleccionar una operación, autorrellena el nombre: `"Menú [Operación] [Año]"`
- Al crear exitosamente, abre el `CicloEditor` directamente con el ciclo recién creado
- Usa `useCrearCiclo()` mutation y `useCicloEditorStore` para flujo completo
- Patrón: `card > card-header + card-body + card-footer`

### ✅ 2. `ChefDashboard.jsx` — Botón Duplicar funcional
**Archivo:** `src/features/menu-cycles/components/ChefDashboard.jsx`

**Problema:** El botón "Duplicar" no tenía handler.

**Cambios:**
- Import de `ModalNuevoCiclo` y `useCrearCiclo`
- Lee `modalNuevoCiclo` del store
- `handleDuplicarCiclo(operacion)`: crea un ciclo nuevo con nombre `"[Nombre original] (Copia)"`, con fecha hoy y día 1. Llama `useCrearCiclo` mutation y hace `refetch()` al éxito.
- Botón Duplicar ahora muestra spinner mientras está pendiente
- Renderiza `{modalNuevoCiclo && <ModalNuevoCiclo />}` al final del componente

### ✅ 3. `MenuDelDia.jsx` — Gramajes por tipo de dieta
**Archivo:** `src/features/food-orders/components/MenuDelDia.jsx`

**Problema:** El sidebar del formulario de pedido solo mostraba el nombre de la receta, sin información de gramajes (el mockup `PedidoUnidad.jsx` mostraba "Normal: 80gr • Hiperproteica: 100gr").

**Cambios:**
- Cada plato (`menu_componentes`) ahora lee `mc.gramajes_componente_menu`
- Muestra resumen compacto: `"NR: 80gr • HG: 100gr • HP: 70gr…"` (hasta 3, truncado con `…`)
- Botón chevron para expandir/contraer lista completa de gramajes
- Gramajes excluidos se muestran en rojo tachados: `"VE: excluido"`
- Indicador de receta local (`es_local`) con badge `badge-accent`
- Estado de carga mejorado con spinner

### ✅ 4. `VistaRecetas.jsx` — Alertas de stock + Sugerencias alternativas
**Archivo:** `src/features/food-orders/components/VistaRecetas.jsx`

**Problema:** El consolidado no mostraba las alertas de stock por receta ni las sugerencias alternativas (funcionalidad clave del mockup `ConsolidadoSupervisor.jsx`).

**Cambios:**
- Lee `item.alerta_stock`, `item.ingredientes_insuficientes[]`, `item.sugerencias_alternativas[]` de la respuesta del servicio
- Cuando `tieneAlertaStock === true`: muestra header en `bg-error/5`, badge rojo "Stock insuficiente"
- En el panel expandido: sección de ingredientes insuficientes con necesario/disponible/faltante
- Sugerencias alternativas: cards con nombre, stock disponible, diferencia de costo, y botón "Usar esta"
- "Usar esta" llama directamente a `useSustituirReceta()` con el motivo auto-generado
- Importa y usa `useAuth` para pasar `supervisorId`

### ✅ 5. `ConsolidadoSupervisor.jsx` — Fix estado `en_revision`
**Archivo:** `src/features/food-orders/components/ConsolidadoSupervisor.jsx`

**Problema:** El botón "Aprobar Consolidado" solo aparecía si `estado === 'pendiente'`, pero el SQL genera consolidados con `estado = 'en_revision'` inicialmente. Nunca aparecía el botón.

**Fix:**
- Condición cambiada a `estado === 'en_revision' || estado === 'pendiente'`
- Texto del botón actualizado a "Aprobar y Enviar a Cocina" (alineado con mockup)

---

## Flujos de Usuario Completos

### Flujo Chef
1. Login como `chef` → redirige a `chef_dashboard`
2. Ve lista de operaciones con progreso y mini calendario
3. Botón **"Nuevo Ciclo"** → abre `ModalNuevoCiclo`:
   - Seleccionar operación, nombre, fecha inicio, día actual
   - Clic "Crear y Editar" → abre `CicloEditor` inmediatamente
4. En `CicloEditor`:
   - Columna izquierda: calendario de días + selector de servicio
   - Tab "Menú del Día": lista de componentes (Proteína, Farináceo, etc.)
   - Agregar componente → abre `SelectorReceta` → busca y selecciona receta
   - Clic ⚖️ en un componente → tab "Gramajes" → editar por dieta
   - Clic 🧪 en un componente → tab "Ingredientes" → editar / crear receta local
5. Botón **"Duplicar"** en una operación → crea copia del ciclo, notificación éxito

### Flujo Coordinador de Unidad
1. Login como `coordinador_unidad` → redirige a `pedido_servicio`
2. Seleccionar Operación, Fecha, Servicio
3. Sidebar izquierdo: **Menú del Día** con platos y gramajes expandibles:
   - `"NR: 80gr • HG: 100gr…"` + chevron para ver todos
4. Alerta de hora límite (verde si en hora, roja si tardío)
5. Si no hay pedido → botón "Crear Pedido"
6. Modo `sin_pacientes` (IDIME, Coordinadora, etc.):
   - Grid de cantidades por tipo de dieta con totales
7. Modo `con_pacientes` (Alcalá, Presentes):
   - Tabla de pacientes con nombre, identificación, cuarto, dieta
8. Footer: **"Guardar Borrador"** + **"Solicitar Cambio"** + **"Enviar Pedido"**

### Flujo Supervisor de Producción
1. Login como `supervisor_produccion` → redirige a `consolidado_supervisor`
2. Filtrar por fecha y servicio
3. Botón **"Generar Consolidado"** → llama RPC `consolidar_pedidos`
4. Si hay solicitudes de cambio → aparece `CambioRecetaPanel` con botones Aprobar/Rechazar
5. Tabs del consolidado:
   - **Por Receta**: cards expandibles con desglose por dieta + unidad + alertas de stock
     - Si hay stock insuficiente: muestra ingredientes faltantes + **sugerencias alternativas**
     - Botón "Usar esta" sustituye la receta directamente
   - **Por Unidad**: tabla con estado, hora envío, en hora, observaciones
   - **Ingredientes**: tabla completa necesario/disponible/diferencia con alertas `AlertaStock`
6. Footer: **"Aprobar y Enviar a Cocina"** (si estado `en_revision`)
7. Después de aprobar: **"Marcar como Preparado"** (descuenta stock)

---

## Archivos Modificados

| Archivo | Tipo | Descripción del cambio |
|---------|------|----------------------|
| `src/features/menu-cycles/components/ModalNuevoCiclo.jsx` | NUEVO | Modal para crear ciclo de menú |
| `src/features/menu-cycles/components/ChefDashboard.jsx` | MODIFICADO | Import ModalNuevoCiclo, Duplicar funcional, renderizar modal |
| `src/features/food-orders/components/MenuDelDia.jsx` | MODIFICADO | Gramajes expandibles por tipo de dieta |
| `src/features/food-orders/components/VistaRecetas.jsx` | MODIFICADO | Alertas de stock + sugerencias alternativas integradas |
| `src/features/food-orders/components/ConsolidadoSupervisor.jsx` | MODIFICADO | Fix estado `en_revision`, texto botón actualizado |

---

## Verificación

```bash
cd C:\PRESENTACION && npm run build
# ✓ 1914 modules transformed. 0 errors. ✓ built in ~17s
```

**Módulos:** 1914 (Sprint 7: 1913 + 1 nuevo ModalNuevoCiclo)

---

## Pendiente (Backlog)

- **Generación de PDF para Cocina**: El mockup tiene botón "Generar PDF para Cocina" en ConsolidadoSupervisor. Se requiere librería PDF (jsPDF, react-pdf) o edge function en Supabase.
- **Exportar a Excel**: Botón "Exportar" en ConsolidadoSupervisor (datos de consolidado).
- **Validaciones adicionales PedidoServicioForm**: Validar que la suma de porciones sea > 0 antes de enviar.
- **Dashboard de métricas Admin**: Ver todos los consolidados históricos.
- **Notificaciones en tiempo real**: Supabase Realtime para notificar al supervisor cuando llega un pedido nuevo.
