# Documentación: Proceso Completo de Ciclos de Menú
**Versión:** Marzo 2026
**Enfoque:** Todo el proceso desde la creación del ciclo hasta el impacto en producción y stock

---

## ÍNDICE
1. [¿Qué es un Ciclo de Menú?](#1-qué-es-un-ciclo-de-menú)
2. [Crear un Ciclo de Menú](#2-crear-un-ciclo-de-menú)
3. [Estructura del Ciclo en la DB](#3-estructura-del-ciclo-en-la-db)
4. [Configurar Recetas por Día y Servicio](#4-configurar-recetas-por-día-y-servicio)
5. [Gramajes: Qué son y cómo funcionan](#5-gramajes-qué-son-y-cómo-funcionan)
6. [Gramajes BASE vs Gramajes por Dieta](#6-gramajes-base-vs-gramajes-por-dieta)
7. [Activar el Ciclo](#7-activar-el-ciclo)
8. [Pedir una Solicitud (Coordinador)](#8-pedir-una-solicitud-coordinador)
9. [¿Cómo calcula el sistema qué día del ciclo es?](#9-cómo-calcula-el-sistema-qué-día-del-ciclo-es)
10. [El Consolidado: cómo se genera](#10-el-consolidado-cómo-se-genera)
11. [Viaje de la Materia Prima](#11-viaje-de-la-materia-prima)
12. [Cómo afectan los gramajes al cálculo final](#12-cómo-afectan-los-gramajes-al-cálculo-final)
13. [Diferencia entre tipos de ciclo y operaciones](#13-diferencia-entre-tipos-de-ciclo-y-operaciones)
14. [Diagrama completo de flujo](#14-diagrama-completo-de-flujo)
15. [Casos especiales](#15-casos-especiales)
16. [Estado actual y pendientes](#16-estado-actual-y-pendientes)

---

## 1. ¿QUÉ ES UN CICLO DE MENÚ?

Un **ciclo de menú** es un plan repetitivo de alimentación que define qué se va a servir en cada día del ciclo, para cada servicio del día, asignado a una operación (unidad de negocio).

### Ejemplo práctico
- Operación: Hospital Alcalá
- Ciclo: 28 días
- Día 1, Almuerzo: Sopa de pasta / Pollo asado / Arroz / Ensalada / Jugo
- Día 1, Cena: Crema de zanahoria / Pechuga en salsa / Papa cocida / Fruta

Cuando el ciclo llega al día 28, vuelve a empezar desde el día 1.

### Servicios disponibles (6)
| Código | Nombre | Descripción |
|---|---|---|
| `desayuno` | Desayuno | Servicio de mañana |
| `nueves` | Medias Nueve | Refrigerio media mañana |
| `almuerzo` | Almuerzo | Servicio principal del mediodía |
| `onces` | Onces | Refrigerio de tarde |
| `cena` | Cena | Servicio de noche |
| `cena_ligera` | Cena Ligera | Versión liviana de cena |

No todas las operaciones tienen todos los servicios. Solo se activan los servicios que corresponden a cada unidad.

---

## 2. CREAR UN CICLO DE MENÚ

**Quién lo hace:** Chef (`chef`)
**Pantalla:** ChefDashboard → botón "Nuevo Ciclo"

### Paso a paso
```
1. Chef abre ChefDashboard
   → Ve listado de todas las operaciones activas
   → Cada operación muestra: nombre del ciclo activo (si existe), estado, progreso %

2. Para crear un nuevo ciclo:
   → Botón "+ Nuevo" en la tarjeta de la operación
   → Abre ModalNuevoCiclo

3. ModalNuevoCiclo pide:
   - Nombre del ciclo (ej: "Ciclo Marzo 2026")
   - Número de días del ciclo (ej: 28)
   - Servicios que incluirá (checkboxes: desayuno, almuerzo, cena, etc.)

4. Al confirmar → ciclosService.crearCiclo(operacionId, nombre, numDias, servicios[])
```

### Qué crea en la base de datos
```sql
-- 1. Cabecera del ciclo
INSERT INTO ciclos_menu (
  operacion_id, nombre, estado='borrador', dia_actual_ciclo=1, activo=true
)

-- 2. Estructura de días × servicios (numDias × len(servicios) filas)
-- Ejemplo: 28 días × 3 servicios = 84 filas
INSERT INTO ciclo_dia_servicios (ciclo_id, numero_dia, servicio, completo=false)
-- Para cada combinación: día 1 almuerzo, día 1 cena, día 2 almuerzo... etc.
```

### Estado inicial
- El ciclo nace en estado `BORRADOR`
- No está activo, no acepta pedidos todavía
- El chef puede editarlo libremente

---

## 3. ESTRUCTURA DEL CICLO EN LA DB

### Jerarquía de tablas
```
ciclos_menu (1 por operación en estado activo)
  └── ciclo_dia_servicios (N días × M servicios)
        └── menu_componentes (K componentes por día/servicio)
              ├── componentes_plato (referencia: Sopa, Proteína, Guarnición...)
              ├── arbol_recetas (qué receta específica)
              └── gramajes_componente_menu (gramaje por tipo de dieta)
```

### Ejemplo concreto para Día 1 / Almuerzo
```
ciclos_menu: id=1, operacion_id=5, nombre="Ciclo Alcalá", estado='activo'
  ↓
ciclo_dia_servicios: id=101, ciclo_id=1, numero_dia=1, servicio='almuerzo', completo=true
  ↓
menu_componentes:
  id=201: componente='Sopa',      receta_id=50  (Sopa de Pasta)
  id=202: componente='Proteína',  receta_id=75  (Pollo Asado)
  id=203: componente='Cereal',    receta_id=88  (Arroz Blanco)
  id=204: componente='Ensalada',  receta_id=92  (Ensalada Verde)
  id=205: componente='Bebida',    receta_id=110 (Jugo de Mora)
  ↓
gramajes_componente_menu (para id=202 Pollo Asado):
  tipo_dieta='normal':      gramaje=150g
  tipo_dieta='hipocalorica':gramaje=100g
  tipo_dieta='pediatrica':  gramaje=80g
  tipo_dieta='blanda':      gramaje=130g
  tipo_dieta='licuada':     excluir=true (no aplica)
```

### Restricción de unicidad
```sql
UNIQUE(ciclo_id, numero_dia, servicio)
-- Solo puede haber UN ciclo_dia_servicios por día/servicio
-- Pero puede haber MÚLTIPLES menu_componentes (opción A y opción B)
```

---

## 4. CONFIGURAR RECETAS POR DÍA Y SERVICIO

**Pantalla:** CicloEditor → Tab "Calendario"

### Flujo del Chef en el editor
```
1. Chef selecciona la operación → Abre CicloEditor
2. Panel izquierdo: selecciona día del ciclo (1, 2, 3... N)
3. Selector de servicio (Desayuno / Almuerzo / Cena...)
4. Panel derecho "Calendario" muestra los componentes del día:
   - Cada fila = un componente del plato (Sopa, Proteína, Cereal...)
   - Columna "Receta asignada" con nombre actual + botón cambiar
   - Botón "+" para añadir una opción alternativa (A/B)

5. Para asignar/cambiar receta:
   → Buscador reactivo (min 2 caracteres)
   → Muestra resultados de arbol_recetas WHERE nombre ILIKE '%término%'
   → Chef selecciona → UPDATE menu_componentes SET receta_id=$

6. Para agregar opción B:
   → Botón "+ Opción" en el componente
   → INSERT menu_componentes (mismo componente_id, distinta receta_id)
   → El coordinador verá opción A y B al hacer el pedido

7. Botón "Marcar día completo"
   → UPDATE ciclo_dia_servicios SET completo=true
   → El progreso del ciclo avanza en el dashboard
```

### Recetas locales
El chef puede crear una **receta local** específica para una operación:
```
Menu: Pollo Asado → "Crear Variante Local"
  → Nombre: "Pollo Asado - Alcalá (sin condimentos)"
  → INSERT arbol_recetas (es_local=true, operacion_id=5)
  → Chef define los ingredientes de esta variante
  → Solo visible en esta operación
```

---

## 5. GRAMAJES: QUÉ SON Y CÓMO FUNCIONAN

### Definición
El **gramaje** es la cantidad en gramos (o ml, oz, etc.) de un componente del plato que le corresponde a cada tipo de dieta.

### Por qué son importantes
No todos los pacientes/comensales reciben la misma cantidad:
- Una dieta **pediátrica** lleva menos cantidad
- Una dieta **hipocalórica** reduce grasas y carbohidratos
- Una dieta **licuada** cambia la presentación pero puede excluir algunos componentes
- Una dieta **terapéutica** puede tener restricciones específicas

Los gramajes definen exactamente cuántos gramos va a preparar cocina de cada componente, multiplicado por el número de porciones de esa dieta.

### Unidades de medida soportadas
- `gr` → gramos
- `ml` → mililitros
- `oz` → onzas
- `cc` → centímetros cúbicos
- `taza` → tazas
- `cda` → cucharadas

---

## 6. GRAMAJES BASE VS GRAMAJES POR DIETA

El sistema maneja dos niveles de gramajes:

### Nivel 1: Gramaje BASE por Componente (por Operación)
**Dónde:** `GramajeBASEModal` → `PanelGramajeBASE`
**Tabla:** `gramajes_base_componentes`

```
gramajes_base_componentes:
  operacion_id=5 (Alcalá), componente='Proteína', gramaje_base=150, unidad='gr'
  operacion_id=5 (Alcalá), componente='Cereal',   gramaje_base=200, unidad='gr'
  operacion_id=5 (Alcalá), componente='Sopa',     gramaje_base=250, unidad='ml'
```

Esto define el gramaje **por defecto** para CUALQUIER dieta en esa operación.
Si no hay un gramaje específico por dieta → se usa este valor base.

### Nivel 2: Gramaje ESPECÍFICO por Tipo de Dieta (por componente del menú)
**Dónde:** CicloEditor → Tab "Gramajes" → `PanelGramajes`
**Tabla:** `gramajes_componente_menu`

```
gramajes_componente_menu:
  menu_componente_id=202, tipo_dieta='normal',       gramaje=150, excluir=false
  menu_componente_id=202, tipo_dieta='hipocalorica',  gramaje=100, excluir=false
  menu_componente_id=202, tipo_dieta='pediatrica',    gramaje=80,  excluir=false
  menu_componente_id=202, tipo_dieta='licuada',       gramaje=0,   excluir=true
```

### Jerarquía de aplicación
```
¿Existe gramaje específico en gramajes_componente_menu para este tipo_dieta?
    SÍ → Usar ese gramaje
    NO → ¿Existe gramaje_base en gramajes_base_componentes para la operación?
              SÍ → Usar gramaje_base
              NO → Mostrar "REQUERIDO" (campo obligatorio pendiente de configurar)
```

### El campo `excluir`
- `excluir=true`: Este componente NO se sirve para esta dieta
- Ej: Una dieta licuada excluye ensaladas sólidas
- Ej: Una dieta líquida excluye proteínas sólidas
- Al consolidar, las porciones con dieta excluida para ese componente no se suman

### Diferencia clave entre los dos niveles
| | Gramaje BASE | Gramaje por Dieta |
|---|---|---|
| **Tabla** | `gramajes_base_componentes` | `gramajes_componente_menu` |
| **Scope** | Toda la operación, todos los ciclos | Solo este componente específico del menú |
| **Granularidad** | Por componente (Sopa, Proteína...) | Por componente × tipo de dieta |
| **Cuándo se usa** | Como valor por defecto / fallback | Como valor preciso para producción |
| **Quién lo configura** | Chef (GramajeBASEModal) | Chef (Tab Gramajes en CicloEditor) |
| **Persiste entre ciclos** | SÍ (aplica a futuros ciclos) | NO (específico de este ciclo/día) |

---

## 7. ACTIVAR EL CICLO

Una vez que el chef terminó de configurar todos los días, activa el ciclo:

```
Chef → ChefDashboard → botón "Activar"
    → ciclosService.activarCiclo(cicloId)
    → UPDATE ciclos_menu SET estado='activo', fecha_inicio=TODAY
```

### Qué pasa al activar
1. El ciclo queda en estado `ACTIVO`
2. Se establece `fecha_inicio` = fecha de hoy
3. A partir de mañana, los coordinadores pueden crear pedidos para esta operación
4. Solo puede haber **un ciclo activo por operación** a la vez

### Activar servicios individualmente
Además de activar el ciclo completo, el chef debe activar cada servicio:
```
Chef → CicloEditor → botón "Activar Servicio: Almuerzo"
    → ciclosService.activarServicio(cicloId, 'almuerzo')
    → UPDATE ciclo_dia_servicios SET activo=true WHERE servicio='almuerzo'
```
Solo los servicios activados aparecerán disponibles al coordinador para hacer pedidos.

---

## 8. PEDIR UNA SOLICITUD (COORDINADOR)

**Quién:** Coordinador de Unidad (`coordinador_unidad`)
**Pantalla:** PedidoServicioForm

### Flujo completo
```
1. Coordinador abre PedidoServicioForm
2. Selecciona:
   - Operación (su unidad asignada)
   - Fecha (hoy por defecto)
   - Servicio (Almuerzo, Cena, etc.)

3. Sistema carga automáticamente:
   a. Menú del día → getMenuDelDia(operacion_id, fecha)
      → Busca ciclo activo de la operación
      → Calcula qué día del ciclo corresponde a la fecha
      → Carga componentes + recetas del día/servicio
   b. Hora límite → servicios_unidad WHERE operacion_id AND servicio
   c. Pedido existente → getPedidoDelDia() si ya hay uno

4. Vista según tipo de operación:
   ┌─────────────────────────────────────────────────────┐
   │ Operación NORMAL (mayoría)                          │
   │ → PedidoDietas: tabla de tipos de dieta con campo   │
   │   de cantidad + gramaje aplicado                    │
   ├─────────────────────────────────────────────────────┤
   │ Operación CON PACIENTES (Alcalá, Presentes)         │
   │ → PedidoPacientes: lista de pacientes con:          │
   │   nombre, cédula, cuarto, tipo dieta, alergias      │
   ├─────────────────────────────────────────────────────┤
   │ Operación CARTA MENÚ (Eiren)                        │
   │ → PedidoCartaMenu: el coordinador elige por         │
   │   componente si quiere opción A o B                 │
   └─────────────────────────────────────────────────────┘

5. Guardar borrador:
   → Persiste en localStorage (Zustand)
   → El coordinador puede cerrar y volver

6. Enviar pedido (antes de hora_limite):
   → enviarPedido(pedidoId, horaEnvio, horaLimite)
   → Registra hora_envio, calcula enviado_en_hora (bool)
   → UPDATE pedidos_servicio SET estado='enviado'

7. Si ya pasó la hora límite:
   → Alerta visual (RPC fn_alerta_pedido_limite devuelve minutos negativos)
   → El pedido queda como "TARDÍO" (enviado_en_hora=false)
   → El supervisor verá el contador de tardíos
```

### Datos que guarda el pedido
```javascript
// pedidos_servicio (cabecera)
{
  operacion_id,
  fecha,
  servicio,
  dia_ciclo_calculado,  // ← qué día del ciclo es este fecha
  estado: 'enviado',
  hora_envio: '11:45:00',
  enviado_en_hora: true,  // hora_envio <= hora_limite
  creado_por: usuario_id
}

// pedido_items_servicio (líneas para operación normal)
[
  { tipo_dieta_id: 1, cantidad: 45, gramaje_aplicado: 150, opcion_seleccionada: null },
  { tipo_dieta_id: 2, cantidad: 12, gramaje_aplicado: 100, opcion_seleccionada: null },
  { tipo_dieta_id: 3, cantidad: 8,  gramaje_aplicado: 80,  opcion_seleccionada: null },
]

// pedido_pacientes (para operaciones con pacientes)
[
  { nombre: 'Juan García', identificacion: '12345678', cuarto: '205', tipo_dieta_id: 1, alergias: 'ninguna' },
  ...
]
```

---

## 9. ¿CÓMO CALCULA EL SISTEMA QUÉ DÍA DEL CICLO ES?

Este es uno de los aspectos más importantes del sistema.

### RPC `calcular_dia_ciclo(operacion_id, fecha)`

La lógica es:
```sql
-- Pseudo-código del RPC
1. Buscar ciclo activo de la operación:
   SELECT * FROM ciclos_menu
   WHERE operacion_id = $operacion_id
   AND estado = 'activo'
   AND activo = true
   LIMIT 1

2. Si no hay ciclo activo → retornar NULL

3. Calcular días transcurridos desde fecha_inicio:
   dias_transcurridos = fecha - ciclo.fecha_inicio

4. Calcular día del ciclo (con módulo para rotación):
   dia_ciclo = (dias_transcurridos % numero_dias_ciclo) + 1
   -- Ej: ciclo de 28 días, día 29 → día 1
   -- Ej: ciclo de 28 días, día 56 → día 1

5. Retornar dia_ciclo
```

### Ejemplo práctico
```
Ciclo "Alcalá Marzo":
  - fecha_inicio: 2026-03-01
  - numero_dias: 28

Pedido del 2026-03-11:
  dias_transcurridos = 11 - 1 = 10 días
  dia_ciclo = (10 % 28) + 1 = 11

Pedido del 2026-03-29:
  dias_transcurridos = 28 días
  dia_ciclo = (28 % 28) + 1 = 1  ← vuelve al día 1

Pedido del 2026-04-05:
  dias_transcurridos = 35 días
  dia_ciclo = (35 % 28) + 1 = 8  ← día 8 del ciclo
```

### El campo `dia_ciclo_calculado`
Este valor se guarda en `pedidos_servicio.dia_ciclo_calculado` al crear el pedido. Sirve como referencia histórica: "este pedido corresponde al día X del ciclo".

---

## 10. EL CONSOLIDADO: CÓMO SE GENERA

**Quién:** Supervisor de Producción
**Pantalla:** ConsolidadoSupervisor

### ¿Qué es el consolidado?
Es la **suma total** de todos los pedidos de todas las operaciones para un mismo día y servicio. Es lo que cocina necesita preparar.

### RPC `consolidar_pedidos_servicio(p_fecha, p_servicio, p_forzar)`

```sql
-- Lógica del RPC (simplificada)

1. Buscar todos los pedidos enviados:
   SELECT pedidos_servicio
   WHERE fecha = p_fecha
   AND servicio = p_servicio
   AND estado IN ('enviado', 'consolidado')

2. Para cada pedido, leer los ítems:
   SELECT pedido_items_servicio
   WHERE pedido_id = pedido.id

3. Para cada ítem, obtener el componente del menú:
   → Buscar ciclo activo de la operación
   → Buscar ciclo_dia_servicios (dia=pedido.dia_ciclo_calculado, servicio=p_servicio)
   → Buscar menu_componentes del día/servicio

4. Agregar por componente:
   -- Suma cantidades de todos los pedidos que tienen ese componente
   total_porciones_componente_A = SUM(pedido_items donde tipo_dieta Y componente)

5. Crear registro:
   INSERT consolidados_produccion (fecha, servicio, estado='en_revision', total_porciones)

6. Por cada componente/receta:
   INSERT consolidado_items (consolidado_id, componente_id, receta_id, cantidad_total)

7. Si p_forzar=true:
   → Si ya existe un consolidado para fecha/servicio, actualizarlo
   → Útil para incluir pedidos tardíos que llegaron después
```

### Ejemplo del resultado del consolidado
```
Consolidado: Fecha 2026-03-11, Servicio: Almuerzo
  total_porciones: 340

consolidado_items:
  Sopa de Pasta:    240 porciones
  Pollo Asado:      280 porciones
  Arroz Blanco:     340 porciones
  Ensalada Verde:   180 porciones (excluida para dietas liquidas)
  Jugo de Mora:     340 porciones
```

### Los 3 tabs del consolidado (supervisor)

**Tab 1: Por Receta**
- Lista cada receta a producir con su cantidad
- Muestra ingredientes necesarios por receta
- Botón "Cambiar receta" (sustituir con auditoría)

**Tab 2: Por Unidad**
- Agrupa los pedidos por operación
- Muestra cuántas porciones pidió cada unidad
- Útil para saber a dónde va qué cantidad

**Tab 3: Ingredientes**
- Lista de TODAS las materias primas necesarias
- Muestra stock disponible vs. requerido
- Semáforo: SUFICIENTE (verde) / INSUFICIENTE (rojo, aparece primero)
- Calcula con RPC `get_ingredientes_totales` o fallback JS

---

## 11. VIAJE DE LA MATERIA PRIMA

Este es el recorrido completo de un ingrediente desde la receta hasta el consumo.

### Paso 1: Definición en la receta
```
arbol_recetas: "Pollo Asado"
  rendimiento: 100 porciones
  ↓
receta_ingredientes:
  materia_prima: "Pechuga de pollo"  cantidad_requerida: 15 kg  para 100 porciones
  materia_prima: "Aceite"            cantidad_requerida: 0.5 L   para 100 porciones
  materia_prima: "Sal"               cantidad_requerida: 200 g   para 100 porciones
  materia_prima: "Ajo en polvo"      cantidad_requerida: 50 g    para 100 porciones
```

### Paso 2: El consolidado sabe cuántas porciones necesita
```
consolidado_items:
  receta: "Pollo Asado"
  cantidad_total: 280 porciones
```

### Paso 3: Cálculo de ingredientes totales
```javascript
// Para cada ingrediente de la receta:
total_requerido = cantidad_requerida × (cantidad_total / rendimiento)

// Ejemplo:
pechuga_requerida = 15 kg × (280 / 100) = 42 kg
aceite_requerido  = 0.5 L × (280 / 100) = 1.4 L
sal_requerida     = 200 g × (280 / 100) = 560 g
```

### Paso 4: Verificación contra stock
```
arbol_materia_prima: "Pechuga de pollo"
  stock_actual: 50 kg
  stock_minimo: 10 kg

Comparación:
  requerido: 42 kg
  disponible: 50 kg
  diferencia: +8 kg
  estado: SUFICIENTE ✓
```

Si el stock es insuficiente, el supervisor tiene dos opciones:
1. Autorizar con stock insuficiente (lo acepta conscientemente)
2. Sustituir la receta por una con ingredientes disponibles

### Paso 5: Descuento del stock al preparar
```
Supervisor marca "Preparado" →
  RPC descontar_stock_consolidado(consolidado_id)

  Para "Pechuga de pollo":
    stock_actual: 50 kg → 50 - 42 = 8 kg
    INSERT movimientos_inventario (tipo='consumo_produccion', cantidad=-42)

  Para "Aceite":
    stock_actual: 5 L → 5 - 1.4 = 3.6 L
    INSERT movimientos_inventario (tipo='consumo_produccion', cantidad=-1.4)
```

### Paso 6: Reposición (ciclo completo)
```
Stock bajo →
  Jefe de Planta crea solicitud de compra →
  Proceso de aprobación →
  Almacenista recibe factura →
  Stock se actualiza +cantidad_recibida →
  INSERT movimientos_inventario (tipo='ingreso_factura')
```

---

## 12. CÓMO AFECTAN LOS GRAMAJES AL CÁLCULO FINAL

Los gramajes determinan **cuánto** de cada componente se prepara, pero también afectan cuántas porciones se contabilizan.

### Caso 1: Operación con tipos de dieta (sin pacientes individuales)
```
Pedido de la Unidad "Archroma" para Almuerzo:
  Dieta Normal:       45 porciones, gramaje=150g
  Dieta Hipocalórica:  8 porciones, gramaje=100g
  Dieta Vegetariana:   5 porciones, gramaje=150g
  Total porciones: 58

El gramaje_aplicado queda guardado en pedido_items_servicio
```

### Caso 2: Operación con pacientes (Alcalá, Presentes)
```
Pedido de "Hospital Alcalá":
  Paciente: Juan García, dieta: Normal     → gramaje componente Pollo: 150g
  Paciente: Ana López,   dieta: Hipocal.   → gramaje componente Pollo: 100g
  Paciente: Pedro Ruiz,  dieta: Pediátrica → gramaje componente Pollo: 80g
  Total porciones: 3 (individualmente diferenciadas)
```

### Efecto en la producción total
```
Consolidado: Pollo Asado - 280 porciones

Desglose por gramaje:
  Normal (200 porciones × 150g)    = 30,000g = 30 kg
  Hipocalórica (50 porciones × 100g) = 5,000g = 5 kg
  Pediátrica (30 porciones × 80g)   = 2,400g = 2.4 kg
  Total a preparar: 37.4 kg de Pollo

NOTA: El sistema actualmente suma porciones, no calcula kg totales directamente.
El gramaje se usa para calcular la cantidad de ingredientes por receta.
```

### ¿Cómo se usa el gramaje en el cálculo de ingredientes?
```javascript
// Flujo actual en el sistema:
// 1. El consolidado suma PORCIONES (no gramos)
// 2. El RPC get_ingredientes_totales usa la RECETA para calcular ingredientes
//    (receta_ingredientes.cantidad_requerida × cantidad_total / rendimiento)
// 3. El gramaje_aplicado se guarda en el pedido pero NO modifica directamente
//    el cálculo de ingredientes del RPC (el rendimiento de la receta ya lo define)

// DIFERENCIA IMPORTANTE:
// El gramaje afecta cuánto sale en el plato (presentación)
// La receta define cuánto se necesita para producir N porciones (ingredientes)
```

### El gramaje y la diferencia entre dietas
La diferencia de gramaje entre dietas es relevante para:
1. **Control de costos**: Una porción pediátrica cuesta menos que una normal
2. **Presentación en cocina**: Saben cuánto servir en cada plato
3. **Pacientes individuales**: En Alcalá, cada paciente tiene su bandeja personalizada
4. **Dietas excluidas** (`excluir=true`): Ese componente no se prepara/sirve para esa dieta

---

## 13. DIFERENCIA ENTRE TIPOS DE CICLO Y OPERACIONES

### Tipo: CÍCLICO (mayoría de operaciones)
```
- El menú rota automáticamente según los días del ciclo
- Día 1 → Día 2 → ... → Día N → vuelve al Día 1
- El sistema calcula automáticamente qué día del ciclo es cada fecha
- Ejemplo: Archroma, Alcalá, Hospital Presentes
```

### Tipo: CARTA MENÚ (operaciones especiales — ej: Eiren)
```
- No hay ciclo rotativo
- Cada servicio tiene opciones A y B que el coordinador elige
- El coordinador selecciona la opción por componente
- Más flexible, menos automatizable
- Se diferencia por: tipo_operacion='carta_menu' en tabla operaciones
```

### Operaciones CON PACIENTES vs SIN PACIENTES
```
CON PACIENTES (Alcalá, Presentes):
  - El coordinador ingresa CADA paciente individualmente
  - Nombre, cédula, cuarto, tipo de dieta, alergias
  - Útil para hospitales donde hay dieta personalizada por cama
  - Tabla: pedido_pacientes

SIN PACIENTES (la mayoría):
  - El coordinador ingresa solo CANTIDADES por tipo de dieta
  - 45 normales, 8 hipocalóricas, 5 vegetarianas
  - Más rápido, para comedores empresariales/industriales
  - Tabla: pedido_items_servicio
```

### Identificación en el código
```javascript
// src/shared/types/menu.js

export const OPERACIONES_CARTA_MENU = ['eiren'];
export const OPERACIONES_CON_PACIENTES = ['alcala', 'presentes'];

// En PedidoServicioForm:
const esCarta = OPERACIONES_CARTA_MENU.includes(operacion?.codigo?.toLowerCase());
const conPacientes = OPERACIONES_CON_PACIENTES.includes(operacion?.codigo?.toLowerCase());

if (esCarta)      return <PedidoCartaMenu />;
if (conPacientes) return <PedidoPacientes />;
return <PedidoDietas />;
```

---

## 14. DIAGRAMA COMPLETO DE FLUJO

```
╔══════════════════════════════════════════════════════════════════════╗
║                         CHEF                                         ║
║  1. Crear Ciclo (nombre, días, servicios)                            ║
║  2. Por cada Día × Servicio:                                         ║
║     - Asignar recetas a cada componente del plato                    ║
║     - Configurar gramajes por tipo de dieta                          ║
║  3. Activar el ciclo                                                 ║
╚══════════════════════════════════════════════════════════════════════╝
                               ↓
          ciclos_menu + ciclo_dia_servicios + menu_componentes
          gramajes_componente_menu + gramajes_base_componentes
                               ↓
╔══════════════════════════════════════════════════════════════════════╗
║                  COORDINADOR DE UNIDAD                               ║
║  Cada día, antes de la hora límite:                                  ║
║  1. Sistema detecta: ciclo activo → calcular_dia_ciclo(op, fecha)   ║
║  2. Carga menú del día (componentes + recetas del día del ciclo)     ║
║  3. Ingresa cantidades por tipo de dieta (o por paciente)            ║
║  4. Envía el pedido                                                  ║
╚══════════════════════════════════════════════════════════════════════╝
                               ↓
          pedidos_servicio + pedido_items_servicio (+ pedido_pacientes)
                               ↓
╔══════════════════════════════════════════════════════════════════════╗
║               SUPERVISOR DE PRODUCCIÓN                               ║
║  1. Genera consolidado (RPC agrupa todos los pedidos del día)        ║
║  2. Revisa:                                                          ║
║     - Recetas a producir + cantidades                                ║
║     - Ingredientes totales vs. stock (semáforo)                      ║
║     - Pedidos por unidad                                             ║
║  3. Si falta stock → sustituye receta (auditado)                     ║
║  4. Aprueba → cocina recibe la orden                                 ║
║  5. Exporta Hoja de Producción (PDF) para cocina                     ║
║  6. Cuando termina → Marca Preparado                                 ║
║     → RPC descuenta stock de arbol_materia_prima                     ║
╚══════════════════════════════════════════════════════════════════════╝
                               ↓
          consolidados_produccion + consolidado_items
          movimientos_inventario (consumo registrado)
                               ↓
╔══════════════════════════════════════════════════════════════════════╗
║              COCINA / PLANTA                                         ║
║  1. Recibe Hoja de Producción (PDF)                                  ║
║  2. Prepara según cantidades de recetas                              ║
║  3. La información de gramajes guía la porción por bandeja           ║
╚══════════════════════════════════════════════════════════════════════╝
                               ↓
╔══════════════════════════════════════════════════════════════════════╗
║              STOCK → COMPRAS → ALMACÉN                               ║
║  1. Stock bajo por consumo de producción                             ║
║  2. Jefe de Planta crea solicitud de compra                          ║
║  3. Proceso de aprobación (Auxiliar → Jefe Compras)                 ║
║  4. Almacenista recibe mercancía + registra factura                  ║
║  5. Stock se repone automáticamente                                  ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 15. CASOS ESPECIALES

### Caso 1: Pedido tardío
```
Situación: La hora límite era 10:00am, el pedido llegó a 10:30am

→ El coordinador igual puede enviar
→ hora_envio='10:30', enviado_en_hora=false
→ En el consolidado aparece en el contador "X tardíos"
→ Si el supervisor ya generó el consolidado:
   Puede Re-generar con forzar=true para incluir el tardío
→ La modal de re-generación confirma que el estado se reinicia
```

### Caso 2: Sustitución de receta por falta de stock
```
Situación: Stock de "Pechuga de pollo" insuficiente para 280 porciones

→ Supervisor en Tab Ingredientes ve: INSUFICIENTE (rojo)
→ Supervisor en Tab Por Receta → botón "Cambiar receta"
→ Abre ModalSustituirReceta con buscador
→ El buscador muestra recetas con stock OK marcadas primero
→ Supervisor selecciona alternativa + escribe motivo
→ INSERT cambios_menu_supervisor (auditoría permanente)
→ UPDATE consolidado_items SET receta_id=nueva_receta
```

### Caso 3: Ciclo que termina y empieza de nuevo
```
Situación: Ciclo de 28 días, llega el día 29

→ RPC calcular_dia_ciclo devuelve 1 automáticamente
→ El coordinador ve el menú del Día 1 del ciclo
→ No requiere intervención del chef
→ El ciclo sigue en estado 'activo' indefinidamente
```

### Caso 4: Copiar un día del ciclo a otro
```
Situación: El chef quiere que el Día 8 tenga el mismo menú que el Día 1

Chef → CicloEditor → "Copiar Día" → selecciona Día 1 como origen, Día 8 como destino
→ ciclosService.copiarDia(cicloId, diaOrigen=1, diaDestino=8)
→ Lee todos los menu_componentes del Día 1
→ Los duplica en el Día 8 (incluyendo gramajes)
→ El chef puede ajustar después si es necesario
```

### Caso 5: Receta local para una operación
```
Situación: Hospital Alcalá necesita "Pollo sin condimentos picantes" (distinto al estándar)

Chef → CicloEditor → en el componente "Proteína" → "Crear Variante Local"
→ Nombre: "Pollo Alcalá - sin condimentos"
→ Ingredientes: mismos pero sin ají, sin pimienta
→ INSERT arbol_recetas (es_local=true, operacion_id=5)
→ Esta receta SOLO aparece disponible para Alcalá
→ No afecta las recetas globales
```

---

## 16. ESTADO ACTUAL Y PENDIENTES

### Lo que está funcionando
| Funcionalidad | Estado |
|---|---|
| Crear ciclo con días y servicios | ✅ Completo |
| Asignar recetas por componente | ✅ Completo |
| Configurar gramajes por dieta | ✅ Completo |
| Gramajes BASE por operación | ✅ Completo |
| Activar ciclo y servicios | ✅ Completo |
| Pedido con tipos de dieta | ✅ Completo |
| Pedido con pacientes (Alcalá) | ✅ Completo |
| Pedido carta menú (Eiren) | ✅ Completo |
| Validación hora límite | ✅ Completo |
| Calcular día del ciclo (RPC) | ✅ Completo |
| Generar consolidado (RPC) | ✅ Completo |
| Vista por receta, unidad, ingrediente | ✅ Completo |
| Sustituir receta con auditoría | ✅ Completo |
| Aprobar y marcar preparado | ✅ Completo |
| Descuento de stock al preparar | ✅ Completo (bug corregido en Sprint L) |
| Exportar hoja de producción PDF | ✅ Completo |
| Exportar pedidos Excel | ✅ Completo |
| Recetas locales por operación | ✅ Completo |
| Copiar día a día | ✅ Completo |

### Lo que falta implementar (del análisis del roadmap)
| Funcionalidad | Prioridad | Requiere definición |
|---|---|---|
| Restricción de ingreso solo para códigos tipo 3 | Media | Sí — ¿qué define "código 3"? |
| Materias primas marcadas como "entregables" | Media | Sí — ¿campo booleano o categoría? |
| Ciclo personalizado por unidad (solo ve la suya) | Media | Sí — ¿qué formato aplica a cada unidad? |
| Que el consolidado muestre también la receta de preparación en vista de planta | Baja | No — reutilizar VistaRecetas |
| Desechables en el pedido (con/sin desechables) | Media | Sí — ¿cómo se calculan por porción? |
| Configurar gramajes por kg (no solo por porción) | Baja | A definir |

### Observaciones técnicas sobre los gramajes
El sistema guarda `gramaje_aplicado` en el pedido pero el cálculo de ingredientes para producción usa la **receta** (`rendimiento` + `cantidad_requerida`), no el gramaje del pedido. Esto puede generar una diferencia si:
- La receta tiene un rendimiento basado en porciones estándar (ej: 150g)
- Pero para esta unidad, la porción real es diferente (ej: 200g porque es hospital)

**Recomendación:** Validar con el chef que los `rendimientos` de las recetas estén calibrados con los gramajes reales de producción. Si no, puede haber diferencias entre el ingrediente calculado y el ingrediente real usado.
