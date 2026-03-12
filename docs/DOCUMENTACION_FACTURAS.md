# Documentación: Proceso Completo de Facturas
**Versión:** Marzo 2026
**Análisis:** Técnico + Lenguaje Natural

---

## ÍNDICE
1. [¿Qué hace el sistema de facturas hoy?](#1-qué-hace-el-sistema-de-facturas-hoy)
2. [Flujo completo: de la necesidad a la bodega](#2-flujo-completo-de-la-necesidad-a-la-bodega)
3. [Cómo viaja la información técnicamente](#3-cómo-viaja-la-información-técnicamente)
4. [Cómo se actualiza el stock con una factura](#4-cómo-se-actualiza-el-stock-con-una-factura)
5. [Las dos pantallas de facturas](#5-las-dos-pantallas-de-facturas)
6. [Lo que funciona bien](#6-lo-que-funciona-bien)
7. [Bugs confirmados](#7-bugs-confirmados)
8. [Problemas de diseño](#8-problemas-de-diseño)
9. [Lo que falta (funcionalidades ausentes)](#9-lo-que-falta-funcionalidades-ausentes)
10. [Resumen de problemas por impacto](#10-resumen-de-problemas-por-impacto)
11. [Plan de mejoras sugerido](#11-plan-de-mejoras-sugerido)

---

## 1. ¿QUÉ HACE EL SISTEMA DE FACTURAS HOY?

### En lenguaje natural
El sistema de facturas es la forma en que la empresa registra que recibió mercancía de un proveedor. **No es una factura independiente**: siempre está ligada a una solicitud de compra que ya pasó por todo el proceso de aprobaciones.

El almacenista recibe la caja/mercancía, busca la solicitud correspondiente en el sistema, ingresa el número de factura del proveedor, confirma cuánto llegó realmente de cada producto, y el sistema actualiza automáticamente el inventario.

### Lo que sí puede hacer hoy
- Registrar una factura vinculada a una solicitud de compra aprobada
- Manejar recepciones parciales (llegó menos de lo pedido)
- Subir el PDF de la factura física al sistema
- Ver el historial de todas las facturas registradas
- Marcar si una factura está pagada, pendiente o en disputa
- Registrar un "número de romaneo" (número interno del almacén)
- Reintentar el procesamiento de stock si falló la primera vez

### Lo que NO puede hacer hoy
- Crear una factura sin una solicitud previa (caja menor)
- Manejar notas crédito, devoluciones o traspasos
- Editar una factura ya registrada
- Cancelar una factura
- Ver el total acumulado de facturas (solo muestra la página actual)
- Saber qué proveedor se usó en el flujo de solicitud directamente
- Crear remisiones separadas de facturas

---

## 2. FLUJO COMPLETO: DE LA NECESIDAD A LA BODEGA

### Paso 1 — Jefe de Planta crea la solicitud
**Pantalla:** `CrearSolicitud`
**Rol:** `jefe_de_planta`

```
Jefe detecta que falta un ingrediente o insumo
    ↓
Abre CrearSolicitud → Selecciona proveedor
    ↓
Busca productos por categoría (Materiales, Insumos, Químicos...)
    ↓
Agrega ítems con cantidad y unidad
    ↓
INSERT solicitudes (estado='pendiente')
INSERT solicitud_items (estado_item='pendiente')
```

**Nota importante:** En este paso el jefe selecciona el proveedor Y los productos. Sin embargo, los productos se ligan a `arbol_materia_prima` (el árbol de materias primas) vía `producto_arbol_id`. La presentación (SKU específico del proveedor) es opcional en este punto.

---

### Paso 2 — Auxiliar de Compras revisa ítem por ítem
**Pantalla:** `GestionAux`
**Rol:** `auxiliar_de_compras`

```
Auxiliar ve solicitudes en estado 'pendiente' / 'en_revision_auxiliar'
    ↓
Para cada ítem decide: APROBAR o RECHAZAR
    - Si rechaza: DEBE escribir motivo (validación obligatoria)
    ↓
Al terminar → cierra la revisión
    ↓
Si algún ítem rechazado → solicitud va a 'devuelta_jefe_planta'
Si todos aprobados      → solicitud va a 'aprobado_auxiliar'
```

**Lógica de transición** (archivo `estados.js`):
```javascript
determinarProximoEstado(items):
  ¿Alguno rechazado?  → 'devuelta_jefe_planta'
  ¿Todos aprobados?   → 'aprobado_auxiliar'
  ¿Hay pendientes?    → 'en_revision_auxiliar' (sigue en revisión)
```

---

### Paso 3 — Jefe de Compras aprueba definitivamente
**Pantalla:** `GestionCompras`
**Rol:** `jefe_de_compras`

```
Ve solicitudes en 'aprobado_auxiliar'
    ↓
Aprueba → estado = 'aprobado_compras'
    ↓
(alguien, no está claro quién en el código) realiza la compra
    ↓
Marca como 'comprado' → estado = 'comprado'
```

**Punto ciego:** El paso de "aprobado_compras" a "comprado" no tiene flujo claro en la UI. Es un estado intermedio que puede causar confusión sobre quién lo hace.

---

### Paso 4 — Almacenista registra la factura (el momento crítico)
**Pantalla:** `RecepcionFactura`
**Rol:** `almacenista`

```
Almacenista ve solicitudes en estado 'comprado'
    ↓
Filtra por proveedor si quiere
    ↓
Hace clic en "Registrar factura" de una solicitud
    ↓
Sistema carga automáticamente:
  - Los ítems de la solicitud (productos + cantidades pedidas)
  - Los precios de referencia del proveedor (si están configurados)
    ↓
Almacenista llena:
  1. Número de factura del proveedor (obligatorio)
  2. Fecha de la factura (obligatoria, por defecto hoy)
  3. PDF del documento (opcional, máx 5MB)
  4. Por cada ítem:
     - Cantidad realmente recibida (default = cantidad pedida)
     - Precio unitario (default = precio referencia del proveedor)
     - Observación (obligatoria si llegó menos de lo pedido)
    ↓
Confirma → guardarRecepcion()
```

---

### Paso 5 — El sistema procesa internamente (4 operaciones)
**Código:** `registrarRecepcionFactura()` en `facturasService.js`

```
OPERACIÓN 1: Crear la factura
  INSERT facturas {
    solicitud_id, proveedor_id, numero_factura, fecha_factura,
    fecha_recepcion=HOY, valor_total, pdf_url,
    estado_recepcion: 'recibido_completo' | 'recibido_parcial',
    estado_procesamiento: 'pendiente',
    created_by, recibido_por
  }

OPERACIÓN 2: Crear los ítems de factura
  INSERT factura_items {
    factura_id, producto_arbol_id, presentacion_id,
    cantidad, cantidad_recibida, precio_unitario, observacion_recepcion
  }

OPERACIÓN 3: Actualizar stock (RPC)
  → Solo para ítems CON presentacion_id
  → RPC: procesar_factura_stock(p_factura_id)
  → Si falla: estado_procesamiento = 'error'
  → Si funciona: stock_actual += cantidad_recibida × contenido_unidad

OPERACIÓN 4: Actualizar estado de la solicitud
  → Si todo llegó completo: solicitud.estado = 'finalizado'
  → Si algo faltó:          solicitud.estado = 'recibido_parcial'
```

---

### Paso 6 — El almacenista ve el resultado
```
Si items_con_presentacion > 0:
  → Muestra modal con movimientos de inventario generados
  → Muestra stock anterior → stock posterior por cada producto

Si items_con_presentacion = 0:
  → Mensaje: "Recepción registrada correctamente"
  → Stock NO se actualizó (pero el usuario no lo sabe claramente)
```

---

## 3. CÓMO VIAJA LA INFORMACIÓN TÉCNICAMENTE

### Tablas involucradas
```
solicitudes (cabecera)
  └── solicitud_items (lo que se pidió)
        ├── producto_arbol_id → arbol_materia_prima
        └── presentacion_id → presentaciones

facturas (cabecera de recepción)
  ├── solicitud_id → solicitudes
  ├── proveedor_id → proveedores
  └── factura_items (lo que llegó)
        ├── producto_arbol_id → arbol_materia_prima
        └── presentacion_id → presentaciones

movimientos_inventario (auditoría automática, la crea el RPC)
  ├── producto_id → arbol_materia_prima
  ├── presentacion_id → presentaciones
  └── factura_id → facturas
```

### Relación entre presentaciones y materia prima
```
arbol_materia_prima (el ingrediente en sí: "Aceite de soya")
  └── presentaciones (el SKU del proveedor: "Caneca 20L Aceite Soya")
        └── proveedor_presentaciones (precio de referencia por proveedor)
```

El RPC `procesar_factura_stock` convierte:
```
cantidad_recibida (en unidades de presentación)
× contenido_unidad (ej: 20 litros por caneca)
= cantidad en unidad base de arbol_materia_prima (litros)
```

### Diagrama de tablas
```
solicitudes ──────────────────────────┐
  (pendiente → comprado)              │ solicitud_id
                                      ↓
                                   facturas
                                      │ factura_id
                ┌─────────────────────┤
                ↓                     ↓
         factura_items       movimientos_inventario
                │                     │
     presentacion_id           producto_id
                │                     │
                ↓                     ↓
         presentaciones    arbol_materia_prima
         (SKU, contenido)  (stock_actual se actualiza)
```

---

## 4. CÓMO SE ACTUALIZA EL STOCK CON UNA FACTURA

### El RPC `procesar_factura_stock`
Este es el corazón del proceso. Cuando se llama, hace aproximadamente:

```sql
-- Para cada factura_item con presentacion_id:
1. Obtener contenido_unidad de la presentación
   (ej: una caneca = 20 litros)

2. Calcular cantidad en unidad base:
   cantidad_base = cantidad_recibida × contenido_unidad

3. Actualizar stock del producto:
   UPDATE arbol_materia_prima
   SET stock_actual = stock_actual + cantidad_base
   WHERE id = producto_arbol_id

4. Actualizar costo promedio ponderado:
   nuevo_costo = (stock_anterior × costo_anterior + cantidad_base × precio_unitario)
                 / (stock_anterior + cantidad_base)

5. Insertar movimiento de inventario (auditoría):
   INSERT movimientos_inventario {
     tipo_movimiento = 'ingreso_factura',
     cantidad_unidad_base = cantidad_base,
     stock_anterior, stock_posterior,
     costo_promedio_anterior, costo_promedio_posterior,
     factura_id, producto_id, presentacion_id
   }
```

### Qué pasa si el RPC falla
```javascript
// En registrarRecepcionFactura():
if (stockError) {
  console.error('Error actualizando stock:', stockError);
  await supabase.from("facturas").update({
    estado_procesamiento: 'error',
    intentos_procesamiento: 1
  }).eq("id", factura.id);
}
// ⚠️ El proceso CONTINÚA aunque el stock no se haya actualizado
// ⚠️ El usuario ve notificación de éxito igual
```

### Función de reintento
Si el stock falló, existe `reintentarProcesamientoStock(facturaId)`:
```javascript
UPDATE facturas SET estado_procesamiento='procesando'
→ RPC procesar_factura_stock
→ Si falla: estado='error'
→ Si funciona: stockResult disponible
```
**Problema:** No hay botón visible en la UI de `Facturas.jsx` para usar esta función.

---

## 5. LAS DOS PANTALLAS DE FACTURAS

### Pantalla 1: Recepción de Facturas (`RecepcionFactura.jsx`)
**Rol:** Almacenista
**Propósito:** Registrar la llegada de mercancía

| Elemento | Descripción |
|---|---|
| Lista de solicitudes | Solicitudes en estado `comprado`, ordenables, filtrables |
| Filtros | Por proveedor (dropdown), por texto (búsqueda debounce 400ms) |
| Modal de registro | Número factura, fecha, PDF, ítems con cantidades y precios |
| Auto-relleno de precios | Carga precio de referencia desde `proveedor_presentaciones` |
| Validaciones | Número factura requerido, fecha requerida, precio >0 obligatorio, motivo si hay faltante |
| Resultado de stock | Modal post-guardado mostrando movimientos generados |

**Flujo interno del modal:**
```
Abrir modal
  → Cargar presentaciones del proveedor (para precios de referencia)
  → Inicializar ítems con cantidad_recibida = cantidad_solicitada (optimista)
  → Almacenista ajusta lo que sea diferente

Guardar
  → Validar número, fecha, precios, motivos de faltantes
  → Si hay PDF: subirPDFFactura() → Supabase Storage (bucket 'facturas-pdf')
  → registrarRecepcionFactura() → 4 operaciones en secuencia
  → Recargar lista de solicitudes
  → Mostrar resultado de stock si aplica
```

---

### Pantalla 2: Facturas (`Facturas.jsx`)
**Roles:** Almacenista (editar romaneo), Administrador, Jefe/Auxiliar de Compras (editar pago)
**Propósito:** Consultar historial + gestionar pagos

| Elemento | Descripción |
|---|---|
| Lista paginada | 10 por página, total count en header |
| Filtros | Por número de factura (ilike), por proveedor, por estado de pago |
| Ordenamiento | Por fecha factura, número, proveedor, valor |
| Estadísticas | Facturas en página, total $ página, proveedores en página |
| Modal de ítems | Ver productos de la factura con cantidades y precios |
| Romaneo | Campo editable inline (solo almacenista/admin) — número interno de almacén |
| Estado de pago | Badge editable: Pendiente / Pagada / En Disputa (permisos: admin, jefe compras, auxiliar) |

**Estados de pago y quién los puede cambiar:**
```
PENDIENTE (default al crear)
    ↓ (admin / jefe_compras / auxiliar_compras)
PAGADA → registra fecha_pago automáticamente
    ↓
EN_DISPUTA → para facturas con problema
```

---

## 6. LO QUE FUNCIONA BIEN

### ✅ Máquina de estados de solicitudes
El archivo `estados.js` está muy bien hecho. Es la fuente única de verdad para todos los estados, transiciones y colores de UI. Cada rol solo ve lo que le corresponde. La lógica de `determinarProximoEstado` es clara y correcta.

### ✅ Cálculo del total de la factura en tiempo real
En `RecepcionFactura.jsx`, el total se calcula reactivamente:
```javascript
const totalFactura = itemsRecepcion.reduce((sum, item) =>
  sum + (item.cantidad_recibida * item.precio_unitario), 0
);
```
El almacenista ve el total antes de confirmar.

### ✅ Auto-relleno de precios de referencia
Cuando el almacenista abre el modal, el sistema carga automáticamente los precios de referencia del proveedor (`proveedor_presentaciones.precio_referencia`). Esto ahorra tiempo y reduce errores de digitación.

### ✅ Validación de faltantes con motivo obligatorio
Si `cantidad_recibida < cantidad_solicitada`, el sistema exige una observación. Esto garantiza que los faltantes queden documentados.

### ✅ Mecanismo de reintento de stock
Si el RPC falla al procesar el stock, la factura queda en `estado_procesamiento='error'` y existe `reintentarProcesamientoStock()` para volver a intentarlo. La función está bien implementada técnicamente.

### ✅ Auditoría de movimientos de inventario
El RPC registra en `movimientos_inventario` el stock anterior, stock posterior, costo promedio anterior y posterior. Esto permite rastrear el historial completo de cada ingrediente.

### ✅ Paginación del lado del servidor en Facturas
`Facturas.jsx` usa `.range(from, to)` de Supabase con `count: 'exact'`. Esto evita cargar todas las facturas en memoria.

### ✅ Permisos por rol bien definidos
```javascript
const puedeEditarRomaneo = roleName === "almacenista" || roleName === "administrador";
const puedeEditarPago = roleName === "administrador" || roleName === "jefe_de_compras" || roleName === "auxiliar_de_compras";
```

---

## 7. BUGS CONFIRMADOS

### 🔴 BUG-F01 — Stock falla silenciosamente (CRÍTICO)

**Severidad:** ALTA

**En lenguaje natural:**
Si hay un problema al actualizar el stock (por ejemplo, el RPC falla o hay un error de conexión), el sistema igual muestra "Recepción registrada correctamente". El almacenista no tiene forma de saber que el stock NO se actualizó. La factura queda en `estado_procesamiento='error'` pero nadie lo ve.

**Técnicamente:**
```javascript
// facturasService.js línea 166-187
const { data: stockData, error: stockError } = await supabase.rpc(
  'procesar_factura_stock', { p_factura_id: factura.id }
);

if (stockError) {
  console.error('Error actualizando stock:', stockError);  // Solo en consola
  await supabase.from("facturas").update({ estado_procesamiento: 'error' })
  // ← NO retorna error
  // ← El código CONTINÚA al paso 4
  // ← La solicitud se marca como 'finalizado' aunque el stock esté mal
}
// El usuario ve: notify.success('Recepción registrada correctamente') ← SIEMPRE
```

**Consecuencia real:** El inventario queda desactualizado sin que nadie lo sepa. Los pedidos futuros pueden mostrar stock incorrecto.

**Fix sugerido:**
```javascript
if (stockError) {
  notify.warning('⚠️ Factura guardada pero el stock NO se actualizó. Contacte al administrador.');
  // Mostrar el error visualmente, no solo en consola
}
```

---

### 🔴 BUG-F02 — Ítems sin presentación actualizan stock silenciosamente (ALTO)

**Severidad:** ALTA

**En lenguaje natural:**
Hay ítems en las solicitudes que tienen `producto_arbol_id` pero NO tienen `presentacion_id`. Si el almacenista recibe uno de esos productos, el sistema guarda la factura pero el stock de ese producto **nunca se actualiza**. Y no hay ninguna advertencia.

**Técnicamente:**
```javascript
// facturasService.js línea 161
const itemsConPresentacion = items.filter(i => i.presentacion_id);
// ← Ítems sin presentacion_id son IGNORADOS para el stock

if (itemsConPresentacion.length > 0) {
  // Solo estos actualizan stock
} else {
  // Stock no se actualiza, pero el mensaje dice "Recepción registrada correctamente"
}
```

**Consecuencia real:** Productos llegan a la empresa, se registran, pero el inventario sigue en cero. El problema es silencioso y difícil de detectar.

**Fix sugerido:**
```
- Mostrar advertencia clara en el modal si algún ítem no tiene presentación vinculada
- Texto: "Advertencia: X productos no tienen presentación vinculada y no actualizarán el inventario"
- Botón de acceso rápido para configurar la presentación del producto
```

---

### 🟡 BUG-F03 — Función `marcarEstadoPago` del servicio es código muerto (MEDIO)

**Severidad:** MEDIA

**En lenguaje natural:**
El código tiene dos formas de marcar el pago de una factura, y la que está en el servicio nunca se usa. Esto crea inconsistencia y confusión al hacer mantenimiento.

**Técnicamente:**
```javascript
// facturasService.js línea 440-453 — NUNCA SE LLAMA
export async function marcarEstadoPago(facturaId, estadoPago, notasPago) {
  return supabaseRequest(supabase.from('facturas').update({
    estado_pago: estadoPago,
    fecha_pago: estadoPago === 'pagada' ? new Date().toISOString() : null,
    notas_pago: notasPago || null,
  })...)
}

// Facturas.jsx línea 335-341 — LA QUE REALMENTE SE USA
await supabase.from("facturas").update({
  estado_pago: nuevoEstadoPago,
  fecha_pago: nuevoEstadoPago === "pagada" ? new Date().toISOString() : null,
  notas_pago: notasPago.trim() || null,
}).eq("id", facturaId);
// ← Llama directo a supabase, bypaseando el servicio
```

**Consecuencia:** Código duplicado, inconsistente. Si alguien modifica el servicio no ve cambios. Si hay un bug en el servicio no importa porque nunca se usa.

---

### 🟡 BUG-F04 — N+1 Query en `getPresentacionesPorProveedor` (MEDIO)

**Severidad:** MEDIA (performance)

**En lenguaje natural:**
Cuando el almacenista abre el modal de registro, el sistema hace una consulta a la base de datos por CADA presentación del proveedor para obtener el producto padre. Si el proveedor tiene 50 presentaciones → 50 consultas separadas. Esto puede hacer el modal muy lento.

**Técnicamente:**
```javascript
// facturasService.js línea 239-255
const presentacionesConProducto = await Promise.all(
  (data || []).map(async (item) => {
    if (item.presentacion?.parent_id) {
      const { data: producto } = await supabase
        .from('arbol_materia_prima')
        .select('...')
        .eq('id', item.presentacion.parent_id)
        .single();
      // ← UNA consulta por cada presentación = N+1 problem
      return { ...item, producto };
    }
    return item;
  })
);
```

**Fix sugerido:** Usar un JOIN directo en la query principal:
```javascript
supabase.from('proveedor_presentaciones').select(`
  ...,
  presentacion:presentacion_id (
    id, codigo, nombre, contenido_unidad, unidad_contenido,
    producto:parent_id (id, codigo, nombre, unidad_stock, costo_promedio, stock_actual)
  )
`)
```

---

### 🟡 BUG-F05 — Totales solo de la página actual (MENOR)

**Severidad:** BAJA

**En lenguaje natural:**
La estadística "Total $" en `Facturas.jsx` solo suma las facturas de la página actual (10 facturas). Si hay 200 facturas, el total mostrado es engañoso.

**Técnicamente:**
```javascript
const calcularTotalPagina = () => {
  return facturas.reduce((sum, factura) => sum + (factura.valor_total || 0), 0);
  // ← facturas[] solo tiene los 10 de la página actual
};
```

---

### 🟡 BUG-F06 — Error de manejo en `getProveedoresConSolicitudesPendientes` (MENOR)

**Severidad:** BAJA (puede causar crash)

**Técnicamente:**
```javascript
// facturasService.js línea 70-94
export async function getProveedoresConSolicitudesPendientes() {
  const data = await supabaseRequest(query);
  // supabaseRequest puede lanzar un error (throw)
  // Si lanza, data es undefined y data.forEach() crashea
  data.forEach(item => {
    // ← TypeError si data es undefined o null
  });
}
```

---

## 8. PROBLEMAS DE DISEÑO

### ⚠️ DISEÑO-F01 — La factura no puede existir sin una solicitud

**En lenguaje natural:**
El sistema fue diseñado pensando en que SIEMPRE hay una solicitud previa antes de una factura. Pero en la realidad hay compras de caja menor, compras urgentes, o gastos no planeados donde no hay solicitud de compra. En esos casos el sistema actual no sirve.

**Impacto:** Alto — bloquea casos de uso reales del negocio.

---

### ⚠️ DISEÑO-F02 — No hay rastro de quién compró

**En lenguaje natural:**
El flujo pasa de "aprobado_compras" a "comprado" pero no queda registrado quién realizó físicamente la compra, con qué proveedor final, a qué precio negociado, o si hay una cotización de por medio.

**Técnicamente:**
```javascript
// No existe en la DB:
// - quien_compro (user_id)
// - precio_negociado (puede ser diferente al precio_referencia)
// - numero_orden_compra (OC - documento de compra oficial)
// - cotizaciones previas
```

---

### ⚠️ DISEÑO-F03 — No hay flujos para documentos relacionados

Los siguientes tipos de documento no existen en el sistema:
| Tipo | Descripción | Impacto |
|---|---|---|
| **Nota Crédito** | El proveedor devuelve dinero por producto mal cobrado o devuelto | Sin esto no hay como ajustar |
| **Remisión** | Mercancía que llega sin factura todavía (se factura después) | Bloquea recepciones parciales sin factura |
| **Devolución** | Mercancía que se regresa al proveedor | Sin esto el stock queda mal |
| **Traspaso** | Movimiento de mercancía entre unidades | No existe en el sistema |
| **Caja Menor** | Compra directa sin solicitud previa | Sin esto no hay forma de registrarlo |

---

### ⚠️ DISEÑO-F04 — El `numero_romaneo` no está documentado

**En lenguaje natural:**
Hay un campo "romaneo" en las facturas que el almacenista puede editar. No hay documentación de qué es exactamente, cuándo se usa, si es obligatorio, o qué formato debe tener. Para alguien nuevo que ve el sistema, es un misterio.

**Técnicamente:** Es un campo `VARCHAR` libre sin validaciones, solo accesible para almacenista/admin.

*Nota: en Colombia, el "romaneo" suele referirse al registro de pesos y medidas verificados al recibir mercancía.*

---

### ⚠️ DISEÑO-F05 — No hay vinculación visible entre factura y solicitud original

**En lenguaje natural:**
Cuando alguien está en la pantalla de Facturas, ve el número de factura y el proveedor. Pero no puede hacer clic para ver cuál fue la solicitud original que originó esa compra, quién la hizo, o cuáles ítems se aprobaron. La trazabilidad está rota en la UI aunque en la DB existe la relación (`factura.solicitud_id`).

---

### ⚠️ DISEÑO-F06 — El botón "Reintentar procesamiento de stock" no existe en la UI

**En lenguaje natural:**
Existe la función `reintentarProcesamientoStock()` en el código, pero en ninguna parte de la pantalla de Facturas hay un botón para usarla. Las facturas con `estado_procesamiento='error'` quedan atrapadas sin solución visible para el usuario.

**Técnicamente:**
```javascript
// Exportada en index.js
export { reintentarProcesamientoStock } from './services/facturasService';

// Pero en Facturas.jsx: NO se importa, NO se usa, NO hay botón
```

---

## 9. LO QUE FALTA (FUNCIONALIDADES AUSENTES)

### Funcionalidades que requieren definición previa antes de implementar

| Funcionalidad | Descripción | Definición necesaria |
|---|---|---|
| **Caja Menor** | Facturas sin solicitud previa | ¿Qué campos tiene? ¿Quién la aprueba? ¿Hay presupuesto de caja menor? |
| **Remisiones** | Mercancía sin factura todavía | ¿Cómo se convierte en factura después? |
| **Notas Crédito** | Ajuste negativo de una factura | ¿Se vincula a la factura original? ¿Afecta el stock? |
| **Devoluciones** | Devolver mercancía al proveedor | ¿Quita del stock? ¿Genera nota crédito? |
| **Traspasos** | Mover mercancía entre unidades | ¿Las unidades tienen stock propio? |
| **Orden de Compra** | Documento oficial de compra | ¿Es antes o después de la solicitud? |

### Funcionalidades que se pueden implementar SIN definición previa

| Funcionalidad | Esfuerzo | Descripción |
|---|---|---|
| Botón "Reintentar stock" en Facturas | Bajo | Mostrar el botón para facturas con estado_procesamiento='error' |
| Advertencia de ítems sin presentación | Bajo | Avisar en el modal antes de guardar |
| Total acumulado real (todas las páginas) | Bajo | Query adicional para sumar total sin paginación |
| Enlace Factura → Solicitud original | Bajo | Botón "Ver solicitud" que navegue al detalle |
| Eliminar código muerto `marcarEstadoPago` | Bajo | Limpieza de código — usar el del componente en el servicio |
| Fix N+1 query en presentaciones | Medio | Reescribir query con join |
| Indicador visual de `estado_procesamiento` | Bajo | Badge en la lista de facturas |

---

## 10. RESUMEN DE PROBLEMAS POR IMPACTO

### 🔴 Críticos (afectan datos reales del negocio)
| ID | Descripción | Consecuencia |
|---|---|---|
| BUG-F01 | Stock falla silenciosamente | Inventario incorrecto sin aviso |
| BUG-F02 | Ítems sin presentación no actualizan stock | Mismo problema, diferente causa |
| DISEÑO-F01 | No hay facturas sin solicitud | No se pueden registrar compras de caja menor |
| DISEÑO-F03 | No hay devoluciones/notas crédito | Si llega mercancía mala no hay cómo registrarlo |

### 🟡 Importantes (afectan operación o mantenibilidad)
| ID | Descripción | Consecuencia |
|---|---|---|
| BUG-F04 | N+1 query | Modal lento con proveedores con muchas presentaciones |
| BUG-F03 | Código muerto de pago | Confusión al mantener el código |
| DISEÑO-F06 | Sin botón de reintento de stock | Facturas con error quedan atrapadas |
| DISEÑO-F05 | Sin enlace a solicitud original | Trazabilidad rota en UI |

### ⚪ Menores (mejoras de calidad)
| ID | Descripción |
|---|---|
| BUG-F05 | Total solo de la página |
| BUG-F06 | Posible crash en error handling |
| DISEÑO-F02 | Quién compró no queda registrado |
| DISEÑO-F04 | Romaneo sin documentar |

---

## 11. PLAN DE MEJORAS SUGERIDO

### Sprint Inmediato (sin reuniones previas — solo correcciones)

**Sprint M-F1: Correcciones críticas de UX de facturas**

1. **Fix BUG-F01:** Mostrar alerta visible al usuario cuando el stock falla
   ```
   - Cambiar console.error por notify.warning con mensaje claro
   - Mostrar badge "Error de stock" en la lista de solicitudes después de guardar
   ```

2. **Fix BUG-F02:** Advertir sobre ítems sin presentación antes de guardar
   ```
   - En el modal, mostrar alerta si algún ítem no tiene presentacion_id
   - Texto: "Los productos sin presentación no actualizarán el inventario"
   ```

3. **DISEÑO-F06:** Agregar botón "Reintentar Stock" en Facturas
   ```
   - Para facturas con estado_procesamiento='error': mostrar badge rojo
   - Botón "Reintentar" que llame a reintentarProcesamientoStock()
   ```

4. **BUG-F03:** Unificar el manejo de estado de pago en el servicio
   ```
   - Mover la lógica inline de Facturas.jsx al servicio
   - Eliminar código duplicado
   ```

5. **DISEÑO-F05:** Enlace a solicitud original desde la factura
   ```
   - Mostrar número/id de la solicitud como link en el detalle de la factura
   ```

---

### Sprint Mediano plazo (requieren reunión de definición)

**Sprint M-F2: Facturas de Caja Menor**
- Definir con encargado: campos obligatorios, límite de monto, quién aprueba
- Crear tipo de factura `tipo='caja_menor'` que no requiera solicitud
- Formulario independiente de RecepcionFactura

**Sprint M-F3: Devoluciones y Notas Crédito**
- Definir el proceso: ¿quién inicia la devolución? ¿afecta el stock automáticamente?
- Crear flujo de devolución vinculado a la factura original
- RPC para revertir stock en caso de devolución

**Sprint M-F4: Remisiones**
- Definir cómo una remisión se convierte en factura
- Crear estado intermedio `tipo='remision'` en la tabla facturas

---

### Largo plazo (requieren diseño de base de datos)

**Rediseño del módulo de documentos de compra:**
Considerar una tabla `documentos_compra` que unifique:
- Facturas
- Remisiones
- Notas Crédito
- Devoluciones
- Caja Menor
Con un campo `tipo_documento` y lógica diferenciada por tipo.

---

## APÉNDICE: Tablas de BD del sistema de facturas

```sql
-- Tablas principales
facturas (
  id UUID,
  solicitud_id UUID → solicitudes,
  proveedor_id INT → proveedores,
  numero_factura VARCHAR,
  fecha_factura DATE,
  fecha_recepcion DATE,
  valor_total NUMERIC,
  pdf_url TEXT,
  numero_romaneo VARCHAR,          -- Número interno del almacén
  estado_recepcion VARCHAR,        -- 'recibido_completo' | 'recibido_parcial'
  estado_procesamiento VARCHAR,    -- 'pendiente' | 'procesando' | 'error' (stock)
  estado_pago VARCHAR,             -- 'pendiente' | 'pagada' | 'en_disputa'
  fecha_pago TIMESTAMPTZ,
  notas_pago TEXT,
  intentos_procesamiento INT,
  created_by UUID → auth.users,
  recibido_por UUID → auth.users
)

factura_items (
  id UUID,
  factura_id UUID → facturas,
  producto_arbol_id UUID → arbol_materia_prima,
  presentacion_id INT → presentaciones,
  cantidad NUMERIC,
  cantidad_recibida NUMERIC,
  precio_unitario NUMERIC,
  observacion_recepcion TEXT
)

movimientos_inventario (
  id BIGINT,
  producto_id UUID → arbol_materia_prima,
  presentacion_id INT → presentaciones,
  factura_id UUID → facturas,
  tipo_movimiento VARCHAR,           -- 'ingreso_factura' | 'consumo_produccion'
  cantidad_presentacion NUMERIC,
  cantidad_unidad_base NUMERIC,
  costo_unitario NUMERIC,
  stock_anterior NUMERIC,
  stock_posterior NUMERIC,
  costo_promedio_anterior NUMERIC,
  costo_promedio_posterior NUMERIC,
  created_at TIMESTAMPTZ
)
```

## APÉNDICE: RPCs del sistema de facturas

| RPC | Parámetros | Función |
|---|---|---|
| `procesar_factura_stock` | p_factura_id | Lee factura_items, actualiza stock, registra movimientos |
| `resumen_inventario` | p_tipo_rama | Resumen de stock por categoría |
| `obtener_stock_producto` | p_producto_id | Stock actual de un producto |

## APÉNDICE: Storage Buckets

| Bucket | Acceso | Uso |
|---|---|---|
| `facturas-pdf` | Público | PDFs de facturas de proveedor |
