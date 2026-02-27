# CHECKLIST DE AUDITORÍA - HEALTHY APP

**Fecha:** 25 de Febrero de 2026
**Usuario:** Sistema de Catering para UCIs/Hospitales
**Leyenda:** ✅ Bien | ⏳ Por Terminar | 🔄 Por Cambiar | ❌ Eliminar

---

# I. ANÁLISIS FUNCIONAL VS. REQUERIMIENTOS

## 1. CONTROLAR STOCK (CUÁNTO ENTRA, CUÁNTO SALE)

### ✅ LO QUE ESTÁ BIEN

- **Tabla `arbol_materia_prima` (nivel 5):** Almacena `stock_actual`, `costo_promedio`, `unidad_medida`
- **Tabla `movimientos_inventario`:** Registra CADA entrada/salida con:
  - `tipo_movimiento` (entrada|salida|ajuste)
  - `cantidad_presentacion`, `cantidad_unidad_base`
  - `costo_unitario`, `stock_anterior`, `stock_posterior`
  - `factura_id` trazable
- **RPC `procesar_factura_stock()`:** Automáticamente:
  1. Recibe factura con presentaciones (nivel 6)
  2. Convierte a unidad base: `cantidad_base = cantidad_recibida × contenido_unidad`
  3. Actualiza `stock_actual` en nivel 5
  4. Calcula costo promedio ponderado automáticamente
  5. Registra movimiento_inventario
  6. Evoluciona `proveedor_presentaciones.precio_referencia`
- **Frontend:** `inventory/Inventario.jsx` + `StockManager.jsx` visualizan stock en tiempo real
- **Hooks:** `useStock()` con métodos:
  - `useStockConAlertas()` - Muestra CRÍTICO/BAJO/NORMAL/EXCESO
  - `useCostoPromedio()` - Costo actual
  - `useActualizarStock()` - Ajustes manuales
- **Alertas:** Vista de stock bajo con `vista_stock_alertas`
- **Historial:** `movimientos_inventario` permite auditoría completa

**Evidencia de funcionamiento:**
```javascript
// stockService.js
async getStockConAlertas() {
  from('vista_stock_alertas')
    .select('*')
    .in('estado_stock', ['CRÍTICO', 'BAJO'])
    .order('estado_stock')
}

// RPC en factura
RPC procesar_factura_stock(p_factura_id)
  FOR EACH factura_item WHERE presentacion_id IS NOT NULL:
    - Lee contenido_unidad de nivel 6
    - Calcula: cantidad_base = cantidad_recibida × contenido_unidad
    - Nuevo costo = (stock_anterior × costo_anterior + cantidad_base × costo_nuevo) / nuevo_stock
    - UPDATE arbol_materia_prima SET stock_actual, costo_promedio
    - INSERT movimientos_inventario
```

**Test ejecutado:** Se cargaron 1,705 productos con stock ficticio ✅

### ⏳ POR TERMINAR

- **Proyección de stock semanal:** Existe `ProyeccionSemanal.jsx` pero NO calcula automáticamente:
  - Debería predecir: "En base a los últimos 3 ciclos, necesitarás X kg de carne esta semana"
  - Actualmente solo muestra lo que se ESTÁ pidiendo
  - **Tarea:** Agregar servicio `proyeccionStockService.js` con RPC que calcule:
    - Consumo promedio por producto en últimos 3 ciclos
    - Conversión a cantidad solicitada
    - Recomendación de compra

- **Alertas automáticas por email/notificación:**
  - Stock bajo no notifica a jefe de planta
  - Debería enviar email/notificación cuando `stock < stock_minimo`
  - **Tarea:** Webhook o función en Supabase que dispare notificaciones

- **Exportación de movimientos a Excel/CSV:**
  - No hay opción de descargar historial de movimientos
  - **Tarea:** Agregar export en `StockManager.jsx`

- **Cálculo de rotación de inventario (FIFO):**
  - Sistema no sigue FIFO (First In, First Out)
  - Debería marcar fecha de ingreso de cada lote
  - **Tarea:** Agregar `fecha_lote` a `movimientos_inventario`

### 🔄 POR CAMBIAR

- **Vista de stock por presentación vs. unidad base:**
  - Actualmente `stock_actual` en nivel 5 está EN UNIDAD BASE (g, ml, etc.)
  - Frontend NO muestra equivalencia a presentación (paquetes de 1kg)
  - **Cambio necesario:** En `StockManager.jsx`:
    ```javascript
    // ACTUAL
    Stock: 500 g

    // DEBERÍA SER
    Stock: 500 g (0.5 paquetes de 1 kg)
    Presentación: Bulto x 1 kg
    ```
  - **Acción:** Agregar columna de presentaciones con conversión

- **Costo promedio vs. Costo real del lote:**
  - `costo_promedio` es histórico, pero no muestra costo del ÚLTIMO ingreso
  - Puede haber variación importante en precios
  - **Cambio:** Agregar `costo_ultimo_ingreso` + `fecha_ultimo_ingreso` a `arbol_materia_prima`

- **Stock máximo no se respeta:**
  - La columna `stock_maximo` existe pero NO se valida en recepción
  - Debería alertar: "Recepción de 100 kg cuando máximo es 80 kg"
  - **Cambio:** Validación en `registrarRecepcionFactura()`

### ❌ POR ELIMINAR

- **Tabla `movimientos_inventario` duplicidad:**
  - Tiene campo `factura_id` pero también está en `factura_items`
  - Podría consolidarse para evitar redundancia
  - **Opción:** Mantener como está (auditoría clara) pero eliminar campos redundantes

---

## 2. SABER EL COSTO DE CADA PLATO

### ✅ LO QUE ESTÁ BIEN

- **Tabla `arbol_recetas.costo_porcion`:** Almacena costo automáticamente calculado
- **Cálculo automático en:** `receta_ingredientes`
  ```javascript
  costo_porcion = SUM(cantidad_requerida × costo_promedio) / rendimiento
  ```
- **RPC `procesar_factura_stock()`:** Actualiza `costo_promedio` cuando entra nueva factura
  - Costo promedio ponderado se recalcula automáticamente
  - `proveedor_presentaciones.precio_referencia` evoluciona con compras reales

- **Frontend:** `recipes/CostoReceta.jsx` muestra:
  - Costo por porción
  - Costo total por rendimiento
  - Desglose de ingredientes con precios

- **Hook:** `useCostosAutomaticos()` permite:
  - Recalcular costo de UNA receta: `recalcularCostoReceta(receta_id)`
  - Recalcular todos (expensive): `recalcularTodasRecetas()`
  - Toggle automático: `habilitarRecalculoAutomatico()`

- **Auditoría:** Cada cambio de costo queda registrado en `audit_log`

**Ejemplo de cálculo:**
```
ALBÓNDIGAS DE POLLO (Receta ID: 1234)
Ingredientes:
- Pechuga de pollo: 40g × $25/kg = $1.00
- Molipollo: 100g × $15/kg = $1.50
- Sal fina: 1g × $0.5/kg = $0.0005
- Aceite palma: 1ml × $8/L = $0.008
TOTAL: $2.51 por porción
Rendimiento: 120 porciones
COSTO RECETA: $301.20 por preparación
```

### ⏳ POR TERMINAR

- **Histórico de costos:**
  - No hay tabla que guarde `costo_porcion_historico` por fecha
  - Debería poder comparar: "Hace 3 meses costaba $2.10, ahora cuesta $2.51"
  - **Tarea:** Crear `audit_costo_recetas` con:
    ```sql
    id | receta_id | costo_anterior | costo_nuevo | fecha_cambio | razon
    ```

- **Proyección de costos mensuales:**
  - No existe dashboard que diga:
    - "Este mes la albóndiga cuesta $X más que el mes anterior"
    - "Carnes subieron 15%, verduras bajaron 3%"
  - **Tarea:** Agregar en `AnalisisCostos.jsx`:
    ```javascript
    costos_mes_actual - costos_mes_anterior = variación
    ```

- **Costos indirectos:**
  - No incluye gastos de:
    - Agua, energía para cocina
    - Empaquetado (bolsas, bandejas)
    - Transporte a unidades
  - **Tarea:** Agregar tabla `costos_indirectos_por_servicio` con porcentaje

- **Costo real vs. Presupuestado:**
  - No hay comparación: "Presupuestaste $X, gastaste $Y"
  - **Tarea:** Agregar presupuestos mensuales en `facturas_servicio`

### 🔄 POR CAMBIAR

- **Rendimiento de receta:**
  - Actualmente `rendimiento` es cantidad de porciones (ej: 120)
  - Pero no define PESO de la porción
  - Debería ser:
    ```sql
    rendimiento_porciones: 120
    peso_porcion: 180g  -- Necesario para conversión
    ```
  - **Cambio:** Agregar `peso_porcion_gr` a `arbol_recetas`

- **Recalculo automático vs. Manual:**
  - Actualmente necesita activación manual
  - Debería recalcular AUTOMÁTICO cuando:
    1. Entra nueva factura (costo_promedio cambia)
    2. Se modifica una receta
  - **Cambio:** Agregar trigger PostgreSQL
    ```sql
    CREATE TRIGGER actualizar_costo_recetas
    AFTER UPDATE ON arbol_materia_prima (costo_promedio)
    FOR EACH ROW
    EXECUTE recalcular_recetas_afectadas()
    ```

- **Costo de presentación vs. Producto:**
  - Nivel 5 tiene costo_promedio pero Nivel 6 no
  - Si el mismo producto viene en diferentes tamaños (500g, 1kg), costos diferentes
  - Debería poder almacenar costo por presentación
  - **Cambio:** Agregar `costo_especifico` a nivel 6

### ❌ POR ELIMINAR

- **Nada claramente** - El cálculo de costos está bien estructurado
- **Podría consolidarse:** Algunos campos redundantes en audit_log

---

## 3. HACER PEDIDOS DE COMIDA PARA LAS UNIDADES

### ✅ LO QUE ESTÁ BIEN

- **Componentes:**
  - `PedidoServicioForm.jsx` - Interfaz principal
  - `PedidoDietas.jsx` - Ingreso rápido por dieta
  - `PedidoPacientes.jsx` - Ingreso de pacientes individuales
  - `PedidoCartaMenu.jsx` - Selección de opciones A/B

- **Flujo completo:**
  1. Coordinador selecciona: Operación → Fecha → Servicio
  2. Sistema carga menú del día automáticamente (RPC `calcular_dia_ciclo`)
  3. Ingresa cantidad por tipo_dieta (C1, AD, LQ, etc. - 19 tipos)
  4. Opcionalmente ingresa pacientes individuales
  5. Envía (validación de hora límite)
  6. Queda registrado en `pedidos_servicio` + `pedido_items_servicio`

- **Validaciones:**
  - ✅ Hora límite (no envía fuera de hora)
  - ✅ Operación activa
  - ✅ Ciclo activo
  - ✅ Menú definido para el día

- **Datos guardados:**
  - `pedidos_servicio` (estado, hora_envio, observaciones)
  - `pedido_items_servicio` (cantidad, tipo_dieta, opcion_seleccionada si A/B)
  - `pedido_pacientes` (nombre, ID, cuarto, alergias, restricciones)

- **Hook:** `usePedidos()` con métodos:
  - `useCrearPedido()` - Crea pedido con RPC calcular_dia_ciclo
  - `useEnviarPedido()` - Envía con validación hora
  - `useGuardarItems()` - Guarda items
  - `useActualizarPedido()` - Actualiza
  - `useMenuDelDia()` - Carga menú

- **Almacenamiento:** Zustand `usePedidoStore` maneja todo el estado del formulario

### ⏳ POR TERMINAR

- **Guardado automático (auto-save):**
  - Usuario llena formulario pero se desconecta
  - Pedido se pierde
  - **Tarea:** Implementar auto-save cada 30 segundos a `localStorage` + backend

- **Validación de cantidades vs. Stock:**
  - No valida: "Pidieron 100 kg de pollo pero solo hay 50 kg"
  - Debería alertar MIENTRAS LLENA el pedido
  - **Tarea:** Hook `useValidarStockDisponible()` que:
    1. Itera receta_ingredientes
    2. Calcula `cantidad_total_necesaria`
    3. Compara con `stock_actual`
    4. Alerta si no hay suficiente
    ```javascript
    // Ejemplo
    Pollo para hoy: 80 kg necesarios
    Stock disponible: 50 kg ❌ INSUFICIENTE
    Recomendación: Cambiar 40 porciones a receta alternativa
    ```

- **Historial de pedidos por unidad:**
  - No hay vista de: "Últimos 10 pedidos de esta unidad"
  - Útil para recomendaciones
  - **Tarea:** Agregar en `PedidoServicioForm.jsx`:
    ```javascript
    HistorialPedidosRecientes.jsx
    - Últimos 5 servicios similares
    - Cantidades promedio
    - Botón "repetir pedido anterior"
    ```

- **Cancelación de pedidos:**
  - Pedido enviado no se puede cancelar
  - Debería poder cancelarse si aún NO está consolidado
  - **Tarea:** Agregar método `useCancelarPedido()` si estado es 'enviado'

- **Confirmación de recepción en unidad:**
  - Sistema no sabe si la unidad recibió lo que pidió
  - Debería haber campo: "recibido: boolean"
  - **Tarea:** Agregar tabla `pedido_confirmacion_unidad` con:
    ```sql
    id | pedido_id | confirmado_por_unidad | hora_recepcion | observaciones_recepcion
    ```

### 🔄 POR CAMBIAR

- **Interfaz de entrada es complicada:**
  - Múltiples tabs + modales
  - Usuario nuevo se confunde
  - **Cambio:** Agregar wizard de 3 pasos:
    ```
    Paso 1: Seleccionar operación/fecha/servicio
    Paso 2: Ingresar cantidades (con presets/histórico)
    Paso 3: Agregar pacientes (si aplica) + revisar
    ```

- **Opción A/B no es clara:**
  - `opciones_carta` está en JSONB pero UI es confusa
  - Debería mostrar VISUALMENTE: "Pollo (A) vs. Res (B) - selecciona uno"
  - **Cambio:** Mejorar UI en `PedidoCartaMenu.jsx`

- **Tipos de dieta duplicados:**
  - Algunas operaciones usan sus propias categorías
  - Debería unificar a las 19 tipos Keralty
  - **Cambio:** RLS + validación que solo permita 19 tipos

### ❌ POR ELIMINAR

- **Modal antiguo:** `ModalRecetaLocal.jsx` está duplicado con editor de ciclo
  - Debería haber UN SOLO lugar para crear recetas locales
  - **Eliminar:** Versión redundante

---

## 4. PODER CREAR CICLOS-MENÚS PARA CADA UNIDAD

### ✅ LO QUE ESTÁ BIEN

- **Componentes:**
  - `ChefDashboard.jsx` - Vista principal del chef
  - `CicloEditor.jsx` - Editor interactivo (muy bueno)

- **Estructura de datos:**
  - `ciclos_menu` - Ciclo con fecha_inicio, cantidad_ciclos, estado
  - `ciclo_dia_servicios` - Cada día/servicio del ciclo
  - `menu_componentes` - Componentes asignados (sopa, proteína, etc.)
  - `gramajes_componente_menu` - Gramajes por tipo_dieta

- **Funcionalidades:**
  1. Chef crea ciclo (duración configurable)
  2. Para cada día/servicio, asigna componentes
  3. Para cada componente, elige receta
  4. Define gramajes por tipo_dieta (C1: 200g, AD: 180g, etc.)
  5. Puede crear recetas locales in-situ (variantes por unidad)
  6. Valida que todos los días sean "completos" antes de activar
  7. Marca como activo y se activa para unidades

- **Hooks:** `useCiclos()` con métodos:
  - `useCiclosActivos()` - Obtiene ciclos vigentes
  - `useCicloCompleto()` - Carga con toda la estructura
  - `useCrearCiclo()` - Crea nuevo
  - `useActivarCiclo()` - Activa
  - `useDiaServicios()` - Carga servicios del día

- **Store:** `useCicloEditorStore` mantiene estado de edición

- **Validación:**
  - ✅ No permite activar si hay días incompletos
  - ✅ Verifica que todas las recetas existan
  - ✅ Revisa gramajes por dieta

- **Recetas locales:**
  - Permite crear variantes de recetas para una unidad específica
  - Útil si la operación tiene preferencias especiales
  - Almacena en `arbol_recetas` con `es_local: true`

### ⏳ POR TERMINAR

- **Plantillas de ciclos:**
  - Chef crea ciclo nuevo desde CERO cada vez
  - Debería poder:
    - Copiar ciclo anterior: "Usa el ciclo de la semana pasada como base"
    - Guardar como plantilla: "Ciclo estándar de invierno"
  - **Tarea:** Agregar métodos:
    ```javascript
    useCopiarCicloAnterior(operacion_id)
    useGuardarComoPlantilla(ciclo_id, nombre)
    useCargarDePlantilla(plantilla_id)
    ```

- **Validación de ingredientes en ciclo:**
  - No valida si hay stock suficiente para TODO el ciclo
  - Debería alertar: "Este ciclo necesita 500kg de pollo, solo hay 50kg"
  - **Tarea:** Agregar en `CicloEditor.jsx`:
    ```javascript
    useValidarStockParaCiclo(ciclo_id)
    - Calcula consumo total del ciclo
    - Compara con stock disponible
    - Muestra faltantes
    ```

- **Aprobación de ciclo:**
  - Chef activa ciclo solo
  - Debería ir a aprobación de supervisor
  - **Tarea:** Agregar campo `aprobado_por` y workflow

- **Proyección de costos del ciclo:**
  - Chef NO ve cuánto cuesta el ciclo completo
  - Debería mostrar:
    ```
    Ciclo 5 días:
    - Costo total: $5,000
    - Costo promedio por servicio: $1,000
    - Costo por porción promedio: $25
    ```
  - **Tarea:** Hook `useCalcularCostoCiclo(ciclo_id)`

- **Mantenimiento de ciclos:**
  - Si stock se agota, chef no sabe
  - NO puede hacer ajustes sobre la marcha
  - Debería poder:
    - Cambiar una receta en el ciclo activo
    - Ver alertas de stock en tiempo real
  - **Tarea:** Componente `AlertasStockCicloActivo.jsx`

### 🔄 POR CAMBIAR

- **Interfaz de gramajes es manual:**
  - Chef ingresa gramaje para CADA tipo_dieta y CADA componente
  - Muy tedioso si hay 19 tipos × 4 componentes × 5 días = 380 entradas
  - **Cambio:** Permitir:
    1. Cargar gramajes base por componente (de tabla `gramajes_componentes_base`)
    2. Ajustar globalmente: "Aumentar todos los gramajes en 10%"
    3. Copiar gramajes de día anterior
    ```javascript
    // MEJOR
    [Preset: Gramajes Normales] [Preset: Dieta Blanda] [Preset: Aumento 10%]
    O
    [Copiar del día anterior]
    ```

- **Validación de recetas está débil:**
  - No verifica si ingredientes de receta tienen stock
  - Debería mostrar estado ROJO si ingrediente está bajo
  - **Cambio:** Colorear componentes según stock:
    ```
    🟢 PROTEÍNA (Pollo en stock)
    🟡 VERDURA (Zanahoria baja)
    🔴 FARINÁCEO (Arroz agotado)
    ```

- **Recetas locales sin límites:**
  - Chef puede crear muchas variantes locales
  - Debería haber límite (máx 3 por componente)
  - **Cambio:** Validación + interfaz que muestre cuántas ya existen

### ❌ POR ELIMINAR

- **Ciclos viejos no se archivan:**
  - Tabla `ciclos_menu` tiene miles de registros históricos
  - Debería haber:
    - Soft delete: `deleted_at`
    - Vista de historial separada
  - **Acción:** Agregar `deleted_at` a `ciclos_menu`

---

## 5. PODER VISUALIZAR LOS PEDIDOS

### ✅ LO QUE ESTÁ BIEN

- **ConsolidadoSupervisor.jsx:**
  - Supervisor ve todos los pedidos de una fecha/servicio consolidados
  - Muestra:
    - Cada receta con cantidad total (sumada de todos los pedidos)
    - Desglose por tipo_dieta (C1: 40 porciones, AD: 5, etc.)
    - Desglose por operación/unidad
    - Ingredientes totales necesarios

- **Visualizaciones:**
  - `VistaRecetas.jsx` - Desglose de qué se debe preparar
  - `VistaIngredientes.jsx` - Qué ingredientes comprar/usar
  - `VistaUnidades.jsx` - Qué va a cada unidad

- **Interfaz:**
  - Recetas listadas con checkbox (verificar conforme se prepara)
  - Opción de imprimir PDF para cocina
  - Desglose detallado con tablas

- **Datos:**
  - Consolidado se genera automáticamente con RPC `consolidar_pedidos_servicio(fecha, servicio)`
  - Almacena en `consolidados_produccion` + `consolidado_items`

- **Hook:** `useConsolidado()` con:
  - `useConsolidadoPorFecha()` - Obtiene consolidado
  - `useVistaRecetas()` - Desglose recetas
  - `useIngredientesTotales()` - RPC calcula ingredientes

### ⏳ POR TERMINAR

- **Vista de pedidos ANTES de consolidar:**
  - Supervisor NO ve pedidos individuales de cada unidad
  - Solo ve el consolidado final
  - Debería poder:
    - Ver cada pedido por separado
    - Ver qué pidió cada unidad
    - Comparar: "Unidad A pidió 50kg pollo, promedio es 30kg"
  - **Tarea:** Componente `VistaDetallePedidos.jsx`:
    ```javascript
    Pedido 1: Operación UCÍ A, 25 C1 + 5 AD
    Pedido 2: Operación Pediatría, 15 C1 + 2 CE
    Pedido 3: Operación Maternidad, 20 LQ
    (Comparación con histórico)
    ```

- **Alertas de anomalías:**
  - No detecta si una unidad pidió cantidad ANORMAL
  - Debería alertar: "UCÍ A pidió 200 dietas cuando promedio es 50"
  - **Tarea:** Hook `useDetectarAnomalías()`:
    ```javascript
    promedio_historico = media(últimos 10 servicios)
    if (pedido_actual > promedio × 1.5) {
      alerta("Cantidad inusualmente alta")
    }
    ```

- **Filtrado dinámico:**
  - No hay opciones para filtrar consolidado por:
    - Tipo de dieta
    - Operación/unidad
    - Rango de costo
  - **Tarea:** Agregar filtros en `ConsolidadoSupervisor.jsx`

- **Exportación de consolidado:**
  - NO hay opción de descargar como Excel
  - Debería poder exportar tabla completa
  - **Tarea:** Agregar botón "Descargar Excel"

- **Historial de cambios:**
  - No registra qué cambios hizo supervisor en consolidado
  - Si cambió 5 recetas, no hay registro
  - **Tarea:** Crear tabla `auditoria_consolidados`:
    ```sql
    id | consolidado_id | cambio | usuario_id | fecha
    ```

### 🔄 POR CAMBIAR

- **Consolidación automática vs. Manual:**
  - Actualmente se consolida automáticamente cada día (RPC)
  - Supervisor NO puede rechazar consolidado
  - Debería haber flujo:
    ```
    1. Consolidado generado automáticamente
    2. Supervisor revisa
    3. Aprueba o rechaza
    4. Si rechaza, vuelve a estado "enviado" para que coordinador corrija
    ```
  - **Cambio:** Agregar campo `aprobado_por` + workflow

- **Presentación de consolidado es textual:**
  - No hay representación VISUAL
  - Debería mostrar gráfico:
    ```
    🥘 PROTEÍNA: 450 porciones
      - Pollo: 300 porciones
      - Res: 150 porciones

    🥗 VERDURA: 450 porciones
      - Zanahoria: 200
      - Brócoli: 150
      - Lechuga: 100
    ```
  - **Cambio:** Agregar gráfico de pastel o barras en `ConsolidadoSupervisor.jsx`

- **PDF de cocina incompleto:**
  - PDF muestra recetas pero NO tiempo de preparación
  - Cocinero no sabe en qué orden empezar
  - **Cambio:** Agregar:
    - Tiempo de preparación por receta
    - Orden recomendado
    - Equipos necesarios

### ❌ POR ELIMINAR

- **Vista redundante:** `VistaRecetas` y `VistaUnidades` tienen mucha información duplicada
  - Podrían combinarse en tabs
  - **Acción:** Consolidar en un único componente con tabs

---

## 5.1 CALCULAR CUÁNTO SE REQUIERE DE CADA INGREDIENTE

### ✅ LO QUE ESTÁ BIEN

- **RPC `get_ingredientes_totales(p_consolidado_id)`:**
  ```sql
  Para cada consolidado_item:
    Para cada ingrediente de receta:
      cantidad_necesaria = ingrediente.cantidad_requerida × consolidado_item.cantidad_total
      costo_total = cantidad_necesaria × (costo_promedio / unidad_base)
    SUMA por ingrediente
  Retorna JSONB con:
    {
      "ingrediente_id": cantidad_total,
      "costo_total": X,
      "unidad_medida": "g"
    }
  ```

- **Frontend:** `VistaIngredientes.jsx` muestra:
  - Lista de ingredientes ordenados por cantidad
  - Cantidad necesaria
  - Costo total
  - Unidad de medida
  - Stock disponible vs. necesario

- **Hook:** `useIngredientesTotales()` - Llama RPC automáticamente

- **Validación:**
  - ✅ Detecta si hay stock insuficiente
  - ✅ Muestra advertencia roja
  - ✅ Permite sustituir receta si no hay ingrediente

**Ejemplo:**
```
CONSOLIDADO del 25/Feb ALMUERZO

POLLO (arbol_id: 1234)
  Necesario: 80 kg
  Stock: 50 kg
  Falta: 30 kg ❌

ARROZ BLANCO (id: 5678)
  Necesario: 25 kg
  Stock: 100 kg ✅

ZANAHORIA (id: 3456)
  Necesario: 18 kg
  Stock: 5 kg
  Falta: 13 kg ❌
```

### ⏳ POR TERMINAR

- **Conversión de unidades:**
  - Sistema calcula en unidad BASE (g, ml)
  - Pero jefe de cocina necesita en kg/L
  - **Tarea:** Agregar conversión:
    ```javascript
    // ACTUAL
    80000 g de pollo

    // DEBERÍA SER
    80 kg de pollo (80,000 g)
    ```
  - Hook: `useConvertirUnidadBase(cantidad_g, unidad_destino)`

- **Desglose por presentación:**
  - Sistema calcula total pero NO muestra cuántos BULTOS comprar
  - **Tarea:** Agregar en `VistaIngredientes.jsx`:
    ```javascript
    Pollo necesario: 80 kg
    Presentación disponible: Bulto x 10 kg
    Bultos a comprar: 8 unidades
    Costo estimado: 8 × $150 = $1,200
    ```

- **Comparación con stock en presentación:**
  - Stock actual está en unidad base pero se compra en presentación
  - Debería mostrar ambos
  - **Tarea:** Agregar columna `stock_en_presentaciones`:
    ```javascript
    Stock: 50 kg = 5 bultos de 10kg
    Necesario: 80 kg = 8 bultos
    Falta: 3 bultos
    ```

- **Reorden automático:**
  - Si falta ingrediente, NO dispara compra automática
  - Debería:
    1. Detectar falta
    2. Crear solicitud de compra automática
    3. Notificar jefe de compras
  - **Tarea:** Función `generarSolicitudCompraAutomatica(consolidado_id)`:
    ```javascript
    Para cada ingrediente faltante:
      INSERT solicitudes (productos_faltantes)
      NOTIFY jefe_compras
    ```

### 🔄 POR CAMBIAR

- **RPC es inefficiente:**
  - `get_ingredientes_totales()` recalcula cada vez
  - Debería cachear resultado (no cambia hasta que se modifique consolidado)
  - **Cambio:** Agregar `ingredientes_totales JSONB` a `consolidados_produccion`
    - Se calcula al crear consolidado
    - Se actualiza si supervisor sustituye receta
    - Lectura mucho más rápida

- **Costo de ingredientes no incluye variación de compra:**
  - Calcula con `costo_promedio` pero precio real puede variar
  - Debería usar `precio_referencia` de `proveedor_presentaciones`
  - **Cambio:** En RPC, usar:
    ```sql
    costo = COALESCE(
      proveedor_presentaciones.precio_referencia,
      arbol_materia_prima.costo_promedio
    )
    ```

- **Unidades inconsistentes:**
  - Algunos ingredientes en g, otros en ml, otros en unidades
  - Debería normalizar la visualización
  - **Cambio:** Conversión automática a unidad de compra:
    ```javascript
    // En presentación
    200g de carne → 0.2 kg
    100ml de aceite → 0.1 L
    ```

### ❌ POR ELIMINAR

- **Nada.**

---

## 6. PODER SABER CUÁNTO CUESTA TODO LO QUE SE ESTÁ GASTANDO

### ✅ LO QUE ESTÁ BIEN

- **AnalisisCostos.jsx:**
  - Muestra costos por servicio/fecha
  - Desglose por operación
  - Costo total del consolidado

- **Cálculo de costos:**
  - `costo_total_consolidado = SUM(cantidad × costo_porcion)` por cada receta
  - Registrado en `consolidados_produccion`

- **Facturas de servicio:**
  - Tabla `facturas_servicio` guarda:
    - `periodo_inicio`, `periodo_fin` (mes)
    - `desglose_servicios` (desayuno, almuerzo, etc.)
    - `desglose_dietas` (costo por tipo de dieta)
    - `subtotal`, `total`
  - Puede generar PDF

- **Auditoría de costos:**
  - `audit_log` registra cambios de costo_promedio
  - Puede verse histórico

**Ejemplo:**
```
CONSOLIDADO 25/Feb ALMUERZO

Pollo al horno (400 porciones) × $28/porción = $11,200
Arroz blanco (400) × $8 = $3,200
Ensalada (400) × $5 = $2,000
TOTAL: $16,400

DESGLOSE POR OPERACIÓN:
- UCÍ A (200 dietas): $8,200
- Pediatría (100): $4,100
- Maternidad (100): $4,100
```

### ⏳ POR TERMINAR

- **Dashboard de costos en tiempo real:**
  - No existe vista que diga:
    - "Hoy hemos gastado $X hasta ahora"
    - "Este mes vamos en $Y (presupuesto: $Z)"
    - "Proyección de mes: $Z × 1.2"
  - **Tarea:** Componente `DashboardCostosEnTiempoReal.jsx`:
    ```javascript
    HOY: $16,400 gastados
    ESTE MES: $412,000 (presupuesto: $450,000 ✅ dentro)
    PROYECCIÓN: $486,000 (exceso: $36,000)
    ```

- **Costos por operación/unidad:**
  - Jefe no sabe cuánto CUESTA cada unidad por mes
  - Debería ver:
    - "UCÍ A cuesta $85,000/mes"
    - "Pediatría: $45,000/mes"
    - "Total: $130,000/mes"
  - **Tarea:** Agregar filtro por operación en AnalisisCostos

- **Comparación año a año:**
  - No hay análisis de: "Este febrero vs. febrero pasado"
  - **Tarea:** Agregar gráfico comparativo

- **Proyección de costos mensuales:**
  - Jefe NO sabe si mes actual va sobre presupuesto
  - Debería calcular automáticamente:
    ```
    Días transcurridos: 25
    Costo acumulado: $412,000
    Costo promedio/día: $16,480
    Proyección mes completo: $494,400
    Presupuesto: $450,000
    ALERTA: Sobre presupuesto en $44,400
    ```
  - **Tarea:** Hook `useProyeccionCostoMesActual()`

- **Costos indirectos:**
  - No incluye gastos operacionales:
    - Agua: $X
    - Gas/energía: $X
    - Empaquetado: $X
    - Transporte: $X
  - **Tarea:** Tabla `costos_indirectos`:
    ```sql
    id | fecha | tipo | monto | porcentaje_distribucion
    ```

### 🔄 POR CAMBIAR

- **Facturación manual:**
  - Jefe debe crear factura manualmente
  - Debería generarse automáticamente cada mes
  - **Cambio:** Trigger que genere `facturas_servicio` el 1º de cada mes

- **Costo por porción no es consistente:**
  - Si el mismo plato se entrega 2 veces en un mes, costo es diferente
  - Porque ingredientes cambiaron de precio
  - Debería mostrar:
    ```
    Pollo al horno
    - 25/Feb: $28/porción × 400 = $11,200
    - 26/Feb: $29/porción × 300 = $8,700
    TOTAL: $19,900
    ```
  - **Cambio:** Registro histórico por consolidado, no por mes

- **No hay presupuesto:**
  - Sistema no tiene noción de "presupuesto" vs. "real"
  - Debería permitir cargar presupuesto mensual
  - **Cambio:** Agregar tabla `presupuestos_operacion`:
    ```sql
    id | operacion_id | mes | año | presupuesto_total
    ```

### ❌ POR ELIMINAR

- **Nada.**

---

## 7. PODER CAMBIAR CUALQUIER RECETA EN CASO EXTREMO

### ✅ LO QUE ESTÁ BIEN

- **Cambios en consolidado:**
  - Supervisor puede cambiar receta en consolidado
  - Componente: `ModalSustituirReceta.jsx`
  - Hook: `useSustituirReceta()`

- **Datos guardados:**
  - Tabla `cambios_menu_supervisor`:
    ```sql
    id | consolidado_id | receta_original_id | receta_nueva_id | motivo | supervisor_id | created_at
    ```
  - Auditoría completa del cambio

- **Validación:**
  - ✅ Verifica que nueva receta exista
  - ✅ Actualiza ingredientes totales automáticamente
  - ✅ Recalcula costos

- **Frontend:**
  - Supervisor abre modal, selecciona receta nueva, confirma
  - Actualiza consolidado al instante

- **Recetas locales:**
  - Chef puede crear variantes locales en ciclo
  - Supervisor puede usarlas como sustitución

### ⏳ POR TERMINAR

- **Cambios en pedido individual:**
  - Actualmente solo se puede cambiar en CONSOLIDADO (después de consolidar)
  - Coordinador de unidad NO puede cambiar en su pedido ANTES de enviar
  - **Tarea:** Permitir cambios en `PedidoServicioForm.jsx`:
    ```javascript
    "Esta receta no me agrada, mostrar alternativas"
    → Sugiere 3 recetas similares del menú
    ```

- **Sugerencias de recetas alternativas:**
  - No sugiere qué cambiar por
  - Supervisor debe elegir a ciegas
  - **Tarea:** Hook `useObtenerRecetasAlternativas(receta_id)`:
    ```javascript
    Receta original: Pollo al horno
    Alternativas:
    - Pollo frito (costo similar, similar nutrición)
    - Res a la brasa (costo similar)
    - Tilapia al vapor (costo más bajo, proteína similar)

    Criterios: mismo componente, costo parecido, calorías parecidas
    ```

- **Cambios por falta de stock:**
  - Sistema detecta falta pero no sugiere alternativa automáticamente
  - Debería:
    1. "No hay 80kg pollo"
    2. "¿Cambiar a res? (42kg disponible)"
    3. Click = cambio automático
  - **Tarea:** Función `useSustituirPorStockInsuficiente()`:
    ```javascript
    Si stock < requerido:
      obtener_recetas_alternativas()
      mostrar_opción_reemplazo()
      si_aceptar: cambiar_automático()
    ```

- **Historial de cambios por coordinador:**
  - No registra cambios que hizo coordinador en pedido
  - Debería saber: "Cambié de pollo a res antes de enviar"
  - **Tarea:** Tabla `auditoria_cambios_pedido`:
    ```sql
    id | pedido_id | cambio | razon | usuario_id | fecha
    ```

- **Cambios en recetas de ciclo:**
  - NO se puede cambiar una receta en ciclo ACTIVO
  - Si ciclo corre y aparece problema, no hay flexibilidad
  - **Tarea:** Permitir cambios en ciclo con aprobación de chef:
    ```javascript
    Supervisor: "Cambiar Pollo al horno por Res"
    → Notifica Chef
    Chef aprueba/rechaza
    Si aprueba → aplica a consolidados futuros del ciclo
    ```

### 🔄 POR CAMBIAR

- **Interfaz de cambio es confusa:**
  - Modal pide "nueva receta" sin contexto
  - Debería mostrar:
    ```
    Cambiar POLLO AL HORNO (Proteína - $28/porción)
    Selecciona alternativa:
    ☐ Res a la brasa ($28/porción)
    ☐ Pollo frito ($24/porción) ← más barato
    ☐ Tilapia ($26/porción)
    ```
  - **Cambio:** Mejorar UI del modal

- **Validación de cambio es débil:**
  - No verifica si nueva receta tiene suficiente stock
  - Debería alertar: "Res no tiene 80kg, solo 30kg"
  - **Cambio:** Validación en `useSustituirReceta()`:
    ```javascript
    if (stock_ingredientes_nueva_receta < cantidad_necesaria) {
      alerta("No hay stock suficiente para esta receta")
      no_permitir_cambio()
    }
    ```

### ❌ POR ELIMINAR

- **Cambios históricos se puede limpiar:**
  - Tabla `cambios_menu_supervisor` crece sin límite
  - Debería archivarse anualmente
  - **Acción:** Agregar política de retención

---

## 8. RECOMENDAR POR CUÁL RECETA SE PUEDE CAMBIAR EN CASO DE NO HAYA MATERIA PRIMA

### ✅ LO QUE ESTÁ BIEN

- **Validación de stock existe:**
  - Sistema detecta si no hay stock suficiente
  - Alerta en rojo cuando falta ingrediente

- **Opción de cambiar existe:**
  - Supervisor puede cambiar receta si hay problema

### ⏳ POR TERMINAR (CRÍTICO - NO EXISTE)

- **Sistema de recomendación (0% implementado):**

  NO EXISTE un motor de recomendación de recetas. Esto es **muy importante** porque:

  ```
  Escenario:
  - Consolidado necesita: 80kg Pollo al horno
  - Stock disponible: 20kg Pollo
  - Falta: 60kg ❌

  Supervisor debe: Manualmente buscar alternativa

  DEBERÍA:
  - Sistema automáticamente sugiere:
    1. "Res a la brasa" (costo similar, stock: 100kg) ✅
    2. "Pescado al vapor" (costo similar, stock: 80kg) ✅
    3. "Pechuga rellena" (más costoso, stock: 150kg) ⚠️
    Ranked por: similitud nutricional, disponibilidad, costo
  ```

  **Tarea CRÍTICA:** Crear servicio `recomendacionesRecetaService.js`:

  ```javascript
  async obtenerRecetasAlternativas(receta_id, cantidad_necesaria) {
    // 1. Obtener metadatos de receta original
    receta_original = await getReceta(receta_id)
    componente_original = receta_original.componente_id
    costo_original = receta_original.costo_porcion
    calorias_original = calcularCalorias(receta_original)
    proteina_original = calcularProteina(receta_original)

    // 2. Obtener todas recetas del mismo componente
    recetas_alternativas = await getRecetasPorComponente(componente_original)
      .filter(r => r.id !== receta_id && r.activo)

    // 3. Score cada alternativa (0-100)
    scored_recetas = recetas_alternativas.map(r => {
      score = 0

      // a) Stock disponible (50 puntos máx)
      stock_score = Math.min(100, (stock_producto / cantidad_necesaria) * 100) * 0.5

      // b) Similitud de costo (20 puntos)
      costo_delta = Math.abs(r.costo_porcion - costo_original) / costo_original
      costo_score = Math.max(0, 20 - (costo_delta * 20))

      // c) Similitud nutricional (20 puntos)
      cal_delta = Math.abs(r.calorias - calorias_original) / calorias_original
      nutri_score = Math.max(0, 20 - (cal_delta * 20))

      // d) Protein match (10 puntos)
      proteina_delta = Math.abs(r.proteina - proteina_original) / proteina_original
      proteina_score = Math.max(0, 10 - (proteina_delta * 10))

      return {
        receta_id: r.id,
        nombre: r.nombre,
        costo: r.costo_porcion,
        stock: stock_producto,
        score: Math.round(stock_score + costo_score + nutri_score + proteina_score),
        razon: "Stock suficiente" | "Costo similar" | "Nutrición parecida"
      }
    })

    // 4. Ordenar por score descendente
    return scored_recetas.sort((a,b) => b.score - a.score).slice(0, 5)
  }
  ```

  **Frontend:** Componente `RecomendacionesReceta.jsx`:

  ```jsx
  <div className="recomendaciones">
    <h3>Recetas alternativas para POLLO AL HORNO</h3>
    <div className="alert">Falta: 60kg de pollo</div>

    <div className="opciones">
      <div className="opcion" score="95">
        <h4>🏆 Res a la brasa</h4>
        <p>Costo: $28 (igual)</p>
        <p>Stock: 100kg ✅</p>
        <p>Nutrición: similar</p>
        <button onClick={() => cambiarReceta('res_brasa')}>
          Cambiar ahora
        </button>
      </div>

      <div className="opcion" score="88">
        <h4>Pescado al vapor</h4>
        <p>Costo: $26 (-7%)</p>
        <p>Stock: 80kg ✅</p>
        <p>Nutrición: similar, menos grasa</p>
        <button>Cambiar ahora</button>
      </div>

      <div className="opcion" score="72">
        <h4>Pechuga rellena</h4>
        <p>Costo: $35 (+25%)</p>
        <p>Stock: 150kg ✅✅</p>
        <p>Nutrición: más calories</p>
        <button>Cambiar ahora</button>
      </div>
    </div>
  </div>
  ```

### 🔄 POR CAMBIAR

- **Criteria de similitud:**
  - Sistema debería considerar:
    - ✅ Stock disponible
    - ✅ Costo parecido
    - ✅ Calorías similares
    - ✅ Proteína similar
    - ❌ Alergias comunes
    - ❌ Preferencias culturales/religiosasde la unidad
    - ❌ Historial de aceptación (if gusto)

  - **Cambio:** Agregar campos a `arbol_recetas`:
    ```sql
    alergenos_comunes JSONB  -- ["maní", "mariscos"]
    preferencias_unidad JSONB -- por operacion_id
    historial_aceptacion INT  -- 0-100
    ```

### ❌ POR ELIMINAR

- **Nada (esta funcionalidad no existe)**

---

## 9. MOSTRAR QUÉ ES LO QUE ESTÁN PIDIENDO Y CUÁNTO CUENTA

### ✅ LO QUE ESTÁ BIEN

- **Vista de consolidado:**
  - `ConsolidadoSupervisor.jsx` muestra qué se va a preparar
  - `VistaRecetas.jsx` - Detalle de recetas
  - `VistaIngredientes.jsx` - Ingredientes totales
  - `VistaUnidades.jsx` - Desglose por operación

- **Detalles mostrados:**
  - Receta, cantidad, costo por porción
  - Total por receta
  - Desglose por tipo de dieta
  - Desglose por operación/unidad

- **Costo total:**
  - Se calcula: `SUM(cantidad × costo_porcion)`
  - Se muestra en consolidado

### ⏳ POR TERMINAR

- **Facturación a unidades:**
  - Sistema calcula costo pero NO factura a las unidades
  - Debería generar:
    - Factura de servicio por operación
    - Desglose de lo que consumió
    - Monto a pagar
  - **Tarea:** Generar `facturas_servicio_por_operacion`:
    ```sql
    id | operacion_id | fecha_servicio | servicio |
    cantidad_dietas | costo_total | desglose
    ```

- **Comparación con presupuesto de unidad:**
  - Unidad tiene presupuesto asignado?
  - Sistema NO valida si cobro supera presupuesto
  - **Tarea:** Tabla `presupuestos_operacion`:
    ```sql
    operacion_id | mes | año | presupuesto | gasto_actual
    ```

- **Proyección mensual de costos por unidad:**
  - Jefe no sabe: "UCÍ A me cuesta $X/mes"
  - Debería mostrar:
    ```
    UCÍ A (25 dietas/servicio promedio)
    - Almuerzo: 25 dietas × $28/porción × 20 días = $14,000
    - Cena: 25 × $22 × 20 = $11,000
    - TOTAL MES: $25,000
    ```
  - **Tarea:** Hook `useProyeccionCostoOperacion(operacion_id)`

- **Desglose por tipo de dieta:**
  - Sistema NO muestra: "¿Cuánto cuesta servir dietas diabéticas?"
  - Debería mostrar costo por tipo_dieta
  - **Tarea:** Agregar columna en `VistaRecetas.jsx`:
    ```
    Pollo al horno
    - C1 (200 porciones): $5,600
    - AD (30): $840
    - CE (20): $560
    TOTAL: $7,000
    ```

### 🔄 POR CAMBIAR

- **Costo no incluye servicios:**
  - Solo incluye costo de ingredientes
  - Debería incluir:
    - MOD (mano de obra)
    - Servicios (agua, gas, luz)
    - Empaquetado
  - **Cambio:** Agregar `margen_operacional_%` a `operaciones`:
    ```
    Costo ingredientes: $100
    Margen operacional (20%): $20
    TOTAL A COBRAR: $120
    ```

- **No hay descuentos por volumen:**
  - Si unidad pide 100 dietas, debería ser más barato
  - Sistema cobra lo mismo
  - **Cambio:** Agregar escala de precios:
    ```
    1-50 dietas: $28/porción
    51-100: $27
    100+: $26
    ```

### ❌ POR ELIMINAR

- **Nada.**

---

## 10. PODER HACER LOS PEDIDOS Y NOTIFICAR A LOS ENCARGADOS DE COMPRAS

### ✅ LO QUE ESTÁ BIEN

- **Creación de solicitudes:**
  - `CrearSolicitud.jsx` - Jefe de planta crea solicitud
  - Selecciona proveedor, productos, cantidades
  - Se guarda en `solicitudes` + `solicitud_items`

- **Flujo de aprobación:**
  - Auxiliar revisa: `VerificarSolicitud.jsx`
    - Aprueba o rechaza items
    - Valida contra catálogo de proveedores
  - Jefe de compras: `GestionCompras.jsx`
    - Marca como comprado
    - Seguimiento
  - Almacenista: `RecepcionFactura.jsx`
    - Recibe factura
    - Verifica contra pedido
    - Procesa stock automáticamente (RPC)

- **Estados:**
  - pendiente → rectificado → aprobado → comprado → recibido

- **Datos guardados:**
  - Solicitud (proveedor, fecha, estado)
  - Items (producto, cantidad, estado_item, motivo_rechazo)
  - Factura (número, items, precios)

### ⏳ POR TERMINAR (CRÍTICO - NOTIFICACIONES)

- **Notificaciones NO existen:**

  ```
  Escenario actual:
  - Jefe de planta crea solicitud
  - Auxiliar NO recibe notificación
  - Debe chequear manualmente "¿hay solicitudes nuevas?"

  DEBERÍA:
  - Email a auxiliar
  - Notificación en app
  - SMS? (importante)
  ```

  **Tarea CRÍTICA:** Sistema de notificaciones:

  ```javascript
  // notificacionesService.js
  async notificarNuevaSolicitud(solicitud_id) {
    solicitud = await getSolicitud(solicitud_id)

    // Email
    await sendEmail({
      to: auxiliar_compras.email,
      subject: `Nueva solicitud de compra #${solicitud_id}`,
      body: `
        Jefe de planta: ${solicitud.created_by}
        Proveedor: ${solicitud.proveedor}
        Items: ${solicitud.solicitud_items.length}
        Acción: Revisa en https://app/verificar-solicitud/${solicitud_id}
      `
    })

    // Notificación en app (Zustand)
    notificaciones.add({
      tipo: 'nueva_solicitud',
      titulo: 'Nueva solicitud de compra',
      descripcion: `${solicitud.solicitud_items.length} items de ${solicitud.proveedor}`,
      urgencia: 'media',
      link: `/verificar-solicitud/${solicitud_id}`
    })

    // SMS (si crítico)
    if (solicitud.solicitud_items.some(i => i.es_urgente)) {
      await sendSMS(auxiliar_compras.phone,
        `Solicitud urgente #${solicitud_id}`)
    }
  }
  ```

  **Similar para:** cambios de estado, aprobaciones, rechazos, llegadas de facturas

- **Dashboard de notificaciones:**
  - Usuario NO ve notificaciones actuales
  - Debería haber campana con contador
  - **Tarea:** Componente `NotificacionesBell.jsx`:
    ```jsx
    <div className="notificaciones">
      🔔 (3)  ← 3 notificaciones sin leer
      └─ Nueva solicitud de compra
      └─ Factura recibida - validar
      └─ Solicitud aprobada
    </div>
    ```

- **Historial de notificaciones:**
  - NO hay registro de notificaciones pasadas
  - Debería poder ver: "¿Cuándo me notificaron?"
  - **Tarea:** Tabla `notificaciones_historial`:
    ```sql
    id | usuario_id | tipo | titulo | descripcion |
    fecha_creacion | leida | fecha_lectura
    ```

- **Preferencias de notificación:**
  - Usuario NO puede elegir cómo recibir notificaciones
  - Debería poder:
    - Email (sí/no)
    - SMS (sí/no)
    - Push (sí/no)
    - Frecuencia (inmediata/diaria/nunca)
  - **Tarea:** Tabla `notificacion_preferencias`:
    ```sql
    usuario_id | tipo_evento | email | sms | push | frecuencia
    ```

### 🔄 POR CAMBIAR

- **Integraciones faltantes:**
  - Email usa SMTP estándar (probablemente)
  - Debería usar SendGrid o similar (profesional)
  - SMS usa Twilio o Nexmo
  - **Cambio:** Variables de entorno + servicios:
    ```
    SENDGRID_API_KEY=...
    TWILIO_ACCOUNT_SID=...
    TWILIO_AUTH_TOKEN=...
    ```

- **Validación de solicitud incompleta:**
  - Usuario crea solicitud pero NO valida campos requeridos
  - Debería bloquear envío si:
    - Falta proveedor
    - Falta items
    - Items sin cantidad
  - **Cambio:** Validación en `CrearSolicitud.jsx`:
    ```javascript
    if (!formulario.proveedor) error("Selecciona proveedor")
    if (solicitud_items.length === 0) error("Agrega al menos 1 item")
    if (solicitud_items.some(i => !i.cantidad))
      error("Todos los items deben tener cantidad")
    ```

- **No hay seguimiento de tiempo:**
  - Solicitud no tiene SLA (Service Level Agreement)
  - Debería alertar: "Solicitud pendiente hace 3 días"
  - **Cambio:** Agregar `fecha_creacion` + alerta si > X días

### ❌ POR ELIMINAR

- **Solicitudes rechazadas antiguas:**
  - Nunca se limpian
  - Debería haber política: archivar después de 90 días
  - **Acción:** Agregar `deleted_at` soft delete

---

## 11. TENER UN CONTROL DE LA EMPRESA

### ✅ LO QUE ESTÁ BIEN

- **Auditoría completa:**
  - Tabla `audit_log` registra TODO:
    - INSERT/UPDATE/DELETE en tablas clave
    - Usuario, fecha, cambios antes/después
  - `AuditoriaViewer.jsx` - Búsqueda y filtrado
  - Exportación disponible

- **Dashboards:**
  - `AdminDashboard.jsx` - Vista general
  - `AnalisisCostos.jsx` - Análisis de costos
  - `Nomina.jsx` - Nómina de empleados

- **Reportes:**
  - Consolidados generados diariamente
  - Facturas por operación
  - Historial de movimientos

### ⏳ POR TERMINAR (CRÍTICO)

- **Dashboard ejecutivo:**
  - NO existe vista que muestre KPIs principales
  - Gerente NO sabe:
    - "¿Cómo va este mes?"
    - "¿Cuál es la unidad más rentable?"
    - "¿Cuál es el plato más costoso?"

  **Tarea CRÍTICA:** Crear `DashboardEjecutivo.jsx`:

  ```jsx
  <Dashboard>
    <KPI titulo="Ingresos (mes)">$450,000</KPI>
    <KPI titulo="Costos (mes)">$380,000</KPI>
    <KPI titulo="Margen">$70,000 (15.5%)</KPI>

    <Gráfico titulo="Ingresos por operación">
      Bar chart: UCÍ A ($200k), Pediatría ($150k), Maternidad ($100k)
    </Gráfico>

    <Gráfico titulo="Costo por servicio">
      Line: Almuerzo ($28/porción), Cena ($22), Desayuno ($18)
    </Gráfico>

    <Tabla titulo="Platos más caros">
      1. Pechuga rellena: $35
      2. Filete a la parrilla: $32
      3. Arroz con pollo premium: $30
    </Tabla>

    <Tabla titulo="Unidades por margen">
      1. Maternidad: 18% margen
      2. Pediatría: 16%
      3. UCÍ A: 14%
    </Tabla>
  </Dashboard>
  ```

- **Reportes automáticos:**
  - NO hay reportes programados
  - Debería enviar cada lunes:
    - "Resumen de la semana anterior"
    - "KPIs principales"
    - "Desviaciones vs. presupuesto"
  - **Tarea:** Crear `reportesAutomaticosService.js`:
    ```javascript
    // Cron job: Cada lunes 8am
    async generarReporteSemanal() {
      ingresos = calcularIngresos(fecha_inicio, fecha_fin)
      costos = calcularCostos(fecha_inicio, fecha_fin)
      margen = ingresos - costos
      variacion = compararConPresupuesto()

      await enviarEmail({
        to: gerente@empresa.com,
        asunto: "Reporte Semanal",
        cuerpo: generarHTML(ingresos, costos, margen, variacion)
      })
    }
    ```

- **Análisis de tendencias:**
  - NO hay análisis de: "¿Cuál es la tendencia?"
  - Debería mostrar gráficos de:
    - Costos últimos 6 meses (línea)
    - Ingresos últimos 6 meses
    - Margen trending
    - Operación con mejor/peor performance
  - **Tarea:** Componente `AnálisisTendencias.jsx` con React Charts

- **Alertas de desviación:**
  - Si margen cae debajo de 15%, no hay alerta
  - Debería notificar: "Margen en 12%, por debajo del 15% objetivo"
  - **Tarea:** Crear `sistemaalertasDesviaciones.js`:
    ```javascript
    if (margen_actual < margen_objetivo * 0.95) {
      alerta_critica("Margen bajo: " + margen_actual)
    }
    if (costos_mes > presupuesto * 1.1) {
      alerta("Costos 10% sobre presupuesto")
    }
    ```

- **Control de operaciones:**
  - Admin NO tiene vista que diga cuántas operaciones activas hay
  - Debería mostrar:
    - Total operaciones: 5
    - Activas: 4
    - Ciclos en progreso: 3
    - Pedidos sin consolidar: 12
  - **Tarea:** Widget en AdminDashboard

### 🔄 POR CAMBIAR

- **Permisos muy permisivos:**
  - RLS está habilitado pero políticas son "auth_all"
  - Admin puede ver TODO, otros roles SIN restricción
  - **Cambio:** Implementar RLS real:
    ```sql
    -- coordinador_unidad solo ve su operación
    ALTER POLICY auth_all_pedidos
    ON pedidos_servicio
    USING (
      operacion_id IN (
        SELECT operacion_id FROM user_operaciones
        WHERE user_id = auth.uid()
      )
    )
    ```

- **Sin encriptación de datos sensibles:**
  - Salarios, datos de empleados en plain text
  - Debería haber encriptación
  - **Cambio:** Usar `pgcrypto`:
    ```sql
    ALTER TABLE empleados_talento_humano
    ADD COLUMN salario_encrypted BYTEA
    ```

- **Auditoría sin retención:**
  - `audit_log` crece infinitamente
  - Debería haber política: guardar 2 años, después archivar
  - **Cambio:** Crear job que archive logs antiguos

### ❌ POR ELIMINAR

- **Datos obsoletos:**
  - Ciclos viejos (> 1 año) no se archivan
  - Auditoría antigua acumula
  - **Acción:** Crear política de limpieza

---

# II. RESUMEN EJECUTIVO DEL CHECKLIST

## CUMPLIMIENTO POR REQUERIMIENTO

| # | Requerimiento | Cumple | Completo | Observación |
|---|---|---|---|---|
| 1 | Controlar stock | ✅ | 95% | Falta: alertas automáticas, proyección semanal |
| 2 | Costo de platos | ✅ | 85% | Falta: histórico de costos, costos indirectos |
| 3 | Pedidos de comida | ✅ | 90% | Falta: auto-save, validación stock en formulario |
| 4 | Ciclos-menús | ✅ | 80% | Falta: plantillas, validación stock para ciclo |
| 5 | Visualizar pedidos | ✅ | 75% | Falta: vista pedidos pre-consolidado, anomalías |
| 5.1 | Ingredientes totales | ✅ | 90% | Falta: conversión unidades, reorden automático |
| 6 | Costo total | ✅ | 70% | Falta: dashboard, presupuesto vs. real, proyecciones |
| 7 | Cambiar recetas | ✅ | 80% | Falta: cambios en pedido pre-envío, historial |
| 8 | Recomendar receta | ❌ | 0% | **NO EXISTE** - Crítico implementar |
| 9 | Mostrar costo | ✅ | 75% | Falta: facturación a unidades, desglose por dieta |
| 10 | Pedidos y notificar | ⚠️ | 50% | **FALTA:** Sistema de notificaciones (crítico) |
| 11 | Control empresa | ⚠️ | 50% | Falta: dashboard ejecutivo, reportes automáticos |

**Promedio: 74% de cumplimiento**

---

## PRIORIDAD DE TAREAS

### 🔴 CRÍTICAS (Implementar PRIMERO)

1. **Sistema de notificaciones** - Jefe de planta/compras NO se enteras de cambios
2. **Motor de recomendación de recetas** - Sin sugerencias cuando hay falta de stock
3. **Dashboard ejecutivo** - Gerencia NO ve KPIs
4. **Alertas de stock bajo** - No notifica cuando hay que comprar
5. **Auto-save en formularios** - Pérdida de datos en pedidos/solicitudes

### 🟠 ALTAS (Implementar en próxima iteración)

6. **Proyección de costos mensuales** - Planificación financiera
7. **Validación de stock en pedidos** - Evitar compromisos imposibles
8. **Cambios en recetas pre-consolidado** - Flexibilidad para coordinadores
9. **Facturación automática a unidades** - Cierre de período
10. **Reportes automáticos** - Control gerencial
11. **Análisis de tendencias** - Insights de negocio

### 🟡 MEDIAS (Mejoras)

12. Histórico de costos de platos
13. Presupuesto vs. real
14. Plantillas de ciclos
15. Recetas alternativas por nutrición/alergias
16. Conversión de unidades automática
17. Descuentos por volumen
18. Permisos granulares (RLS real)
19. Política de retención de datos

---

## PUNTOS CRÍTICOS A REVISAR INMEDIATAMENTE

### ✋ PROBLEMAS DE LÓGICA

1. **Stock de ingredientes vs. Pedidos:**
   - Sistema NO valida en tiempo real si hay stock para servir pedido
   - Un coordinador puede prometer algo que no se puede servir
   - **Impacto:** ALTO - puede dejar sin comida a pacientes
   - **Solución:** Validación en `PedidoServicioForm`

2. **Costo de recetas no recalcula automático:**
   - Si entra factura con precio nuevo, costo de plato NO se actualiza
   - Puede afectar facturación
   - **Impacto:** MEDIO - errores de presupuesto
   - **Solución:** Trigger PostgreSQL auto-recalcul

3. **Consolidado no se aprueba:**
   - Supervisor NO puede rechazar consolidado
   - Es inflexible
   - **Impacto:** MEDIO - sin flexibilidad operacional
   - **Solución:** Agregar estado "rechazado"

4. **Cambios de receta no tienen historial:**
   - Si supervisor cambió 5 recetas, no hay registro
   - Imposible auditar
   - **Impacto:** BAJO - auditoría
   - **Solución:** Tabla `auditoria_consolidados`

### ✋ PROBLEMAS DE NEGOCIO

5. **Sin facturación a unidades:**
   - Sistema genera consolidados pero NO facturas
   - Cómo se cobran los servicios?
   - **Impacto:** CRÍTICO - ingresos no se registran
   - **Solución:** Generar facturas automáticas

6. **Sin control de presupuesto:**
   - No hay presupuesto definido por operación
   - No se valida si gasto supera presupuesto
   - **Impacto:** ALTO - gastos sin control
   - **Solución:** Tabla presupuestos + alertas

7. **Sin notificaciones:**
   - Nadie se entera de cambios
   - Rol de compras NO sabe cuándo hay solicitud nueva
   - **Impacto:** CRÍTICO - procesos lentos
   - **Solución:** Sistema de notificaciones email/app

### ✋ PROBLEMAS DE UX

8. **Interfaz compleja de ciclos:**
   - Requiere muchos clics para definir gramajes
   - Chef gasta 2+ horas por ciclo
   - **Impacto:** BAJO - eficiencia
   - **Solución:** Presets + copiar-pegar día anterior

9. **Sin búsqueda en árboles:**
   - Si árbol tiene 1000 nodos, encontrar uno es tedioso
   - **Impacto:** BAJO - rendimiento
   - **Solución:** Full-text search en arbol_materia_prima

10. **Reportes manuales:**
    - Gerente debe pedir reportes cada mes
    - NO llegan automáticos
    - **Impacto:** BAJO - automatización
    - **Solución:** Reportes programados

---

## ARQUITECTURA - EVALUACIÓN GENERAL

### ✅ FORTALEZAS

- ✅ FSD bien estructurado, migración en progreso
- ✅ 15 features independientes y cohesivos
- ✅ Servicios reutilizables y limpios
- ✅ State management (Zustand) adecuado
- ✅ RPC functions complejos bien implementados
- ✅ Auditoría completa
- ✅ 71 componentes organizados
- ✅ Seguridad básica (JWT, RLS)
- ✅ Flujos de compras correctamente implementados
- ✅ Ciclos y consolidación compleja bien orquestada

### ⚠️ DEBILIDADES

- ⚠️ Falta sistema de notificaciones (CRÍTICO)
- ⚠️ Falta validación de stock en tiempo real
- ⚠️ Sin facturación a unidades
- ⚠️ Sin presupuesto/proyecciones
- ⚠️ Sin motor de recomendación
- ⚠️ Sin dashboard ejecutivo
- ⚠️ Permisos RLS muy permisivos
- ⚠️ Sin encriptación de datos sensibles
- ⚠️ Sin reportes automáticos
- ⚠️ Legacy code aún pendiente de migrar

### 📊 SCORES FINALES

- **Arquitectura:** 8.5/10
- **Cumplimiento funcional:** 7.4/10
- **Usabilidad:** 7/10
- **Seguridad:** 6.5/10
- **Operabilidad:** 5.5/10 (sin notificaciones, sin reportes)

**SCORE GENERAL: 7.0/10**

---

## ROADMAP RECOMENDADO

### Fase 1 (URGENTE - 2-3 semanas)

1. Sistema de notificaciones (email/app)
2. Motor de recomendación de recetas
3. Validación de stock en pedidos
4. Dashboard ejecutivo
5. Alertas de anomalías

### Fase 2 (1-2 meses)

6. Facturación automática a unidades
7. Presupuestos y proyecciones
8. Reportes automáticos
9. RLS real (permisos granulares)
10. Cambios pre-consolidado

### Fase 3 (2-3 meses)

11. Análisis de tendencias
12. Plantillas de ciclos
13. Conversión automática de unidades
14. Full-text search en árboles
15. Descuentos por volumen
16. Encriptación de datos sensibles
17. Finalizar migración FSD

---

**FIN DEL CHECKLIST**

Documento preparado para ayudarte a priorizar las tareas y mejorar el sistema.
