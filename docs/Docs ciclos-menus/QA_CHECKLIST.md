# ✅ QA CHECKLIST - Healthy App

**Fecha de Testing:** [Llenar]
**Tester:** [Llenar]
**Navegador:** [Chrome/Firefox/Safari]
**Ambiente:** [DEV/QA/PROD]

---

## 🔴 SUITE A: Bugs Críticos (Sprint A)

### A1: Botón "Activar Ciclo"
- [ ] **Crear nuevo ciclo** → Estado "Borrador" visible
- [ ] **Botón "Activar Ciclo"** → Visible solo en estado Borrador
- [ ] **Click en botón** → Sin errores en console
- [ ] **Estado cambio** → Ahora muestra "Activo" con badge ✅
- [ ] **Badge en dashboard** → Muestra "Borrador" o "Activo" correctamente
- [ ] **Ciclo activado** → Coordinadores pueden crear pedido
- [ ] **Validación** → No permite activar si faltan servicios

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### A2: PanelIngredientes (Fix receta plana)
- [ ] **Abrir CicloEditor** → Sin errores
- [ ] **Click Tab "Ingredientes"** → Carga datos
- [ ] **Nombre receta** → Se muestra (no "undefined")
- [ ] **Es Local** → Se muestra correctamente (sí/no)
- [ ] **Costo porción** → Se muestra con formato $ (ej: $5,234)
- [ ] **Rendimiento** → Se muestra correctamente
- [ ] **Tabla ingredientes** → Se carga sin errores
- [ ] **Actualizar receta** → Cambios persisten

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### A3: SolicitudCambioModal (NOT NULL fix)
- [ ] **Abrir PedidoServicioForm**
- [ ] **Click "Solicitar Cambio"** → Abre modal
- [ ] **Editar descripción** → Sin error
- [ ] **Click "Enviar"** → Se guarda sin error de constraint
- [ ] **Notificación** → "Solicitud enviada correctamente" ✓
- [ ] **Verificar BD** → Registro en tabla sin NULL errors
- [ ] **Volver a abrir modal** → Solicitud visible

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### A4: crearRecetaLocal (columna codigo_unidad)
- [ ] **En CicloEditor**
- [ ] **Crear receta local** (botón + modal)
- [ ] **Llenar datos** (nombre, código, rendimiento)
- [ ] **Click "Crear"** → Sin error de columna inexistente
- [ ] **Notificación éxito** → "Receta local creada"
- [ ] **Verificar BD** → Registro en `arbol_recetas` sin errores
- [ ] **Usar en ciclo** → Se puede seleccionar la receta local

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### A5: RPC consolidar_pedidos_servicio (idempotencia)
- [ ] **Crear consolidado** → Se crea sin errores
- [ ] **Llamar RPC dos veces** (simular con script) → Retorna mismo ID
- [ ] **BD verificación** → Un solo registro consolidado (no duplicado)
- [ ] **Fecha/Servicio** → Combinación única mantenida
- [ ] **Estado consolidado** → Correcto después de llamadas

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

## 🟠 SUITE B: Mejoras UX (Sprint B)

### B1: Reset Stores al cambiar rol
- [ ] **Dev Panel** → Cambiar a rol "Chef"
- [ ] **Crear ciclo** → `cicloSeleccionado` en store
- [ ] **Dev Panel** → Cambiar a rol "Almacen"
- [ ] **Verificar ciclo** → Debe estar NULL (no persistir)
- [ ] **Cambiar a "Coordinador"**
- [ ] **Verificar pedido** → Debe estar NULL (no persistir)
- [ ] **Cambiar a "Admin"**
- [ ] **Verificar estados** → Todos limpios

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### B2: Badge "Día X del Ciclo"
- [ ] **PedidoServicioForm** → Abrir como coordinador
- [ ] **Seleccionar operación** con ciclo activo
- [ ] **Seleccionar fecha** → Badge aparece
- [ ] **Badge dice** "Día X del Ciclo" (ej: "Día 5 del Ciclo") ✓
- [ ] **Cambiar fecha** → Badge actualiza al día correcto
- [ ] **Operación sin ciclo activo** → "Sin ciclo activo"
- [ ] **Fecha anterior al ciclo** → "Sin ciclo activo"

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### B3: Error Handling (Sin spinners eternos)
- [ ] **Apagar conexión internet**
- [ ] **CicloEditor** → Spinner aparece, luego error con Reintentar
- [ ] **PedidoServicioForm** → Error state visible, Reintentar funciona
- [ ] **PanelIngredientes** → Error state con AlertCircle
- [ ] **Click Reintentar** → Se reconecta automáticamente
- [ ] **Volver online** → Datos cargan correctamente
- [ ] **No hay spinner infinito** → Siempre hay feedback o error

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### B4: Filtrar dietas por gramajes configurados
- [ ] **PedidoDietas** → Abrir
- [ ] **Operación con muchas dietas** (ej: Alcalá con 19)
- [ ] **Operación pequeña** (ej: Carval con 5)
- [ ] **Verificar dietas mostradas** → Solo las con gramaje > 0
- [ ] **No hay "Excluido"** → No muestra dietas deshabilitadas
- [ ] **Menos abrumador** → Interfaz limpia

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### B5: Buscar recetas por código
- [ ] **SelectorReceta** → Abre modal
- [ ] **Buscar por nombre** (ej: "Arroz") → Encuentra receta
- [ ] **Buscar por código** (ej: "ARROZ001") → Encuentra receta ✓ NUEVO
- [ ] **Buscar con mayúsculas** → Case-insensitive
- [ ] **Resultados apropiados** → No devuelve irrelevantes
- [ ] **Debounce** → No hace 1000 queries por keystroke

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### B6: Colores Mini-calendario
- [ ] **ChefDashboard** → Ver mini-calendario
- [ ] **Día 100% completo** → 🟢 verde
- [ ] **Día con algo pero no todo** → 🟡 amarillo
- [ ] **Día sin nada** → ⚪ gris
- [ ] **Cambios dinámicos** → Colores actualizan al editar
- [ ] **Visual claro** → Se ve fácilmente el progreso

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

## 🟡 SUITE C: Performance (Sprint C)

### C1: Ingredientes (40 queries → 1 RPC)
- [ ] **Abrir consolidado**
- [ ] **Tab "Ingredientes"** → Carga en <500ms (antes 5-10s)
- [ ] **Network tab** → 1 sola llamada RPC `get_ingredientes_totales`
- [ ] **Datos correctos** → Sumas y cálculos exactos
- [ ] **Sin timeout** → Nunca causa timeout
- [ ] **Con muchos items** → Mantiene velocidad

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### C3: Descuento de stock (automático)
- [ ] **Consolidado** → Mostrar ingredientes
- [ ] **Nota stock inicial** (ej: Arroz = 50000 gr)
- [ ] **Click "Marcar como Preparado"**
- [ ] **BD check** → Stock actualizado en `arbol_materia_prima`
- [ ] **Cálculo correcto** → Stock = 50000 - 5000 = 45000 gr
- [ ] **Sin error** → Operación completó exitosamente
- [ ] **Auditoria** → updated_at cambió al timestamp actual

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### C4: calcular_dia_ciclo (fechas negativas)
- [ ] **Ciclo comienza** 15/02/2025
- [ ] **Seleccionar fecha** 10/02/2025 (anterior)
- [ ] **RPC retorna** NULL (no error, no negativo)
- [ ] **Badge dice** "Sin ciclo activo" (correcto)
- [ ] **No error en console** → Sin SQL errors
- [ ] **Comportamiento consistente** → Todas las fechas anteriores dan NULL

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### C5: Índices en BD
- [ ] **Query "mis pedidos"** → Rápido con muchos usuarios
- [ ] **Cargar dashboard chef** → <200ms con 11 operaciones
- [ ] **Filtrar consolidados** → Instantáneo
- [ ] **Explain ANALYZE** → Mostrar índices siendo usados (no seq scan)
- [ ] **Sin diferencia perceptible** → Performance mejorado

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

## 🟢 SUITE EXTRA: Gramajes Base

### EXTRA1: Tabla gramajes_componentes_base
- [ ] **BD query** → Tabla existe
- [ ] **Columnas correctas** → id, operacion_id, componente_id, gramaje, unidad_medida, descripcion, activo, created_at, updated_at
- [ ] **Constraints** → UNIQUE(operacion_id, componente_id) funciona
- [ ] **Índices** → 2 índices creados
- [ ] **RLS** → Habilitado
- [ ] **Datos semilla** → 10 registros de prueba

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### EXTRA2-3: Services & Hooks
- [ ] **Hook `useGramajeBASEComponentes`** → Carga datos correctamente
- [ ] **Hook `useGuardarGramajeBASEComponentes`** → Guarda sin errores
- [ ] **Service `getGramajeBASEComponentes`** → Retorna array correcto
- [ ] **Service `guardarGramajeBASEComponentes`** → Upsert funciona
- [ ] **Fallback global** → Si no hay específico por operación, usa global
- [ ] **Error handling** → Maneja errores de BD gracefully

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### EXTRA4: PanelGramajeBASE Component
- [ ] **Abre modal** "Configurar Gramajes Base"
- [ ] **Tabla visible** con todos los componentes
- [ ] **Orden alfabético** → Componentes ordenados por nombre
- [ ] **Columnas correctas** → Componente | Gramaje | Unidad | Descripción
- [ ] **Input Gramaje** → type="number", min=0, step=0.5
- [ ] **Select Unidad** → Dropdown con 6 opciones (gr, ml, oz, cc, taza, cucharada)
- [ ] **Input Descripción** → type="text", libre
- [ ] **Botón Guardar** → Disabled en loading, muestra spinner
- [ ] **Botón Descartar** → Recarga datos desde BD (sin guardar cambios)
- [ ] **Loading state** → Spinner mientras carga
- [ ] **Error state** → AlertCircle + botón Reintentar visible

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### EXTRA5: GramajeBASEModal Component
- [ ] **Modal abre** sobre ChefDashboard
- [ ] **Header visible** → "Configurar Gramajes Base" + "Operación: Alcalá"
- [ ] **Botón X** → Cierra modal correctamente
- [ ] **Fondo oscuro** → Overlay visible (z-50)
- [ ] **PanelGramajeBASE dentro** → Se renderiza dentro del modal
- [ ] **Scroll si necesario** → max-h-[90vh] con overflow-y-auto
- [ ] **Responsive** → Se ve bien en móvil/tablet/desktop

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### EXTRA6: Integración ChefDashboard
- [ ] **Botón "Gramajes"** → Visible en cada operación con ciclo
- [ ] **Ubicación correcta** → Entre "Editar" y "Duplicar"
- [ ] **Icon Gauge** → Se ve el ícono ⚖️ (o equivalente)
- [ ] **Click botón** → Abre GramajeBASEModal
- [ ] **Pasa props** → operacionId y operacionNombre correctos
- [ ] **onClose handler** → Cierra modal y limpia estado
- [ ] **Sin botón en operaciones sin ciclo** → Solo cuando hay ciclo

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### EXTRA7: Store (modalGramajeBASE)
- [ ] **Estado existe** → `modalGramajeBASE` en store
- [ ] **Acciones existen** → `abrirModalGramajeBASE()` y `cerrarModalGramajeBASE()`
- [ ] **Reset incluida** → `reset()` también resetea modal
- [ ] **No hay conflictos** → Con otros modales (ModalNuevoCiclo, etc)
- [ ] **Sincronización** → ChefDashboard y modal están sincronizados

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

## 🔵 SUITE DE INTEGRACIÓN: Flujos Completos

### Flujo 1: Chef configura ciclo de cero a Activo
- [ ] 1. Click [Nuevo Ciclo] en ChefDashboard
- [ ] 2. Modal pide nombre y operación
- [ ] 3. Ciclo creado en "Borrador"
- [ ] 4. Click [Gramajes] en la operación
- [ ] 5. Modal abre con PanelGramajeBASE
- [ ] 6. Editar 3 gramajes diferentes
- [ ] 7. Click [Guardar] → Notificación de éxito
- [ ] 8. Click [Editar] en ciclo
- [ ] 9. Configurar servicios y recetas
- [ ] 10. Click [Activar Ciclo]
- [ ] 11. Ciclo ahora muestra "Activo" ✓

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### Flujo 2: Coordinador crea pedido con ciclo activo
- [ ] 1. Login como "Coordinador"
- [ ] 2. Ir a Food Orders
- [ ] 3. Seleccionar operación con ciclo activo
- [ ] 4. Seleccionar fecha → Ver badge "Día X del Ciclo"
- [ ] 5. Ver servicios del día (Desayuno, Almuerzo, Cena, etc.)
- [ ] 6. Ver gramajes base de componentes
- [ ] 7. Seleccionar dietas (solo las configuradas)
- [ ] 8. Seleccionar pacientes
- [ ] 9. Crear pedido → Sin errores
- [ ] 10. Pedido guardado con éxito ✓

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### Flujo 3: Supervisor consolida y ve ingredientes rápido
- [ ] 1. Login como "Supervisor"
- [ ] 2. Ir a Consolidados
- [ ] 3. Seleccionar un consolidado
- [ ] 4. Tab "Ingredientes" → Carga en <500ms
- [ ] 5. Ver tabla correcta con sumas y cálculos
- [ ] 6. Click [Marcar como Preparado]
- [ ] 7. Stock descontado automáticamente ✓
- [ ] 8. Verificar en BD: arbol_materia_prima.stock_actual actualizado

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

## 📊 BUILD & TESTING

### Build Verification
- [ ] `npm run build` ejecuta sin errores
- [ ] `npm run build` completa en <10s
- [ ] No hay errores de compilación TypeScript (si aplica)
- [ ] No hay warnings de importes sin usar
- [ ] `npm run dev` inicia sin errores
- [ ] Página carga en localhost:5173 (o puerto correcto)

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

### Console & Network
- [ ] **Console (F12)** → Sin errores rojos (solo warnings OK)
- [ ] **Network tab** → Sin 404s o 500s
- [ ] **Request timing** → <1s para queries (excepto N+1 antes)
- [ ] **Memory** → No memory leaks detectados
- [ ] **React DevTools** → Componentes renderean correctamente

**Resultado:** ☐ PASS | ☐ FAIL | ☐ PENDING
**Notas:** _______________

---

## 📋 RESUMEN FINAL

**Total Tests:** [Contar]
**Passed:** [ ]
**Failed:** [ ]
**Pending:** [ ]

**Critical Issues:** [ ]
**Major Issues:** [ ]
**Minor Issues:** [ ]

---

## 🎯 Decisión Final

### ☐ READY FOR PRODUCTION
Todos los tests pasaron. App está lista para deploy.

### ☐ READY WITH MINOR FIXES
Algunos tests menores fallaron. Necesita arreglos pequeños.

### ☐ BLOCKING ISSUES
Tests críticos fallaron. No hacer deploy sin resolver.

---

**Tester:** _________________
**Fecha:** _________________
**Firma:** _________________

---

**Notas Adicionales:**

```


```

---

**Enviado al equipo de desarrollo para review.**
