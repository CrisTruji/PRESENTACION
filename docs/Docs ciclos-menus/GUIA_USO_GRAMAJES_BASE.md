# Guía de Uso - Sistema de Gramajes Base

## 🎯 Propósito

El sistema de **Gramajes Base** permite al chef preconfigurar los valores estándar de gramaje para cada componente de alimento **por operación**. Estos valores sirven como **base de cálculo** para las variaciones de dieta.

**Ejemplo:**
- Gramaje Base de Proteína: **180 gr**
- Dieta Pediátrica: **80%** del base → 144 gr
- Dieta Terapéutica: **120%** del base → 216 gr

---

## 📍 Ubicación en la Interfaz

### Opción 1: Desde Chef Dashboard

```
┌─ Chef Dashboard (Gestion de Menus)
│
├─ Operaciones
│  └─ [Operación: "Alcalá"]
│     ├─ [Crear Menu] (si no tiene ciclo)
│     ├─ [Editar]        ← Para editar servicios y recetas
│     ├─ [Gramajes]      ← NUEVO: Para preconfigurar gramajes base
│     ├─ [Duplicar]      ← Para copiar un ciclo anterior
│     └─ [Ver]           ← Para ver el ciclo en vista readonly
│
└─ [Nuevo Ciclo] (botón global)
```

### Opción 2: Desde Ciclo Editor

> Para implementar en futuro: agregar pestaña en CicloEditor

```
┌─ Ciclo Editor
│
├─ [← Volver a Dashboard]
├─
├─ Tabs:
│  ├─ Calendario    (actual)
│  ├─ Gramajes      (actual)
│  ├─ Ingredientes  (actual)
│  └─ Gramajes Base (FUTURO)
│
└─
```

---

## 🔄 Flujo Recomendado

### Fase 1: Crear Ciclo
```
1. Chef hace click en [Nuevo Ciclo]
2. Modal pide nombre y operación
3. Se crea ciclo en estado "Borrador"
```

### Fase 2: Configurar Gramajes Base (NUEVO)
```
1. De vuelta en Dashboard, aparece ciclo en "Borrador"
2. Chef hace click en [Gramajes]
3. Se abre modal "Configurar Gramajes Base"
4. Tabla muestra todos los componentes:

   ┌─────────────┬─────────┬────────┬───────────────┐
   │ Componente  │ Gramaje │ Unidad │ Descripción   │
   ├─────────────┼─────────┼────────┼───────────────┤
   │ Cereal      │ 200     │ gr     │ Desayuno base │
   │ Jugo        │ 250     │ ml     │               │
   │ Proteína    │ 180     │ gr     │ Almuerzo      │
   │ Sopa        │ 200     │ gr     │               │
   │ ...         │ ...     │ ...    │ ...           │
   └─────────────┴─────────┴────────┴───────────────┘

5. Chef edita valores según necesidad
6. Click [Guardar] → Guardado en `gramajes_componentes_base`
7. Modal se cierra
```

### Fase 3: Configurar Servicios y Recetas
```
1. Click en [Editar] en el ciclo
2. Abre CicloEditor
3. Configura servicios, recetas y componentes
4. Los gramajes base configurados estarán disponibles
   como referencia o valores iniciales
```

### Fase 4: Configurar Variaciones por Dieta
```
1. En CicloEditor, Tab "Gramajes"
2. Ver gramaje base de cada componente
3. Editar porcentaje de modificación por dieta:

   ┌──────────────────┬─────────┬────────┬──────────┐
   │ Tipo de Dieta    │ Gramaje │ % Mod. │ Notas    │
   ├──────────────────┼─────────┼────────┼──────────┤
   │ Normal           │ 180     │ 100    │          │
   │ Pediátrica       │ 144     │ 80     │ (del base)│
   │ Terapéutica      │ 216     │ 120    │ (del base)│
   └──────────────────┴─────────┴────────┴──────────┘

4. Los valores se calculan automáticamente
```

### Fase 5: Activar Ciclo
```
1. En CicloEditor, click [Activar Ciclo]
   (una vez todos los servicios estén configurados)
2. Ciclo cambia de "Borrador" a "Activo"
3. Los coordinadores pueden hacer pedidos
```

---

## 💾 Datos Guardados

### Tabla `gramajes_componentes_base`

```sql
CREATE TABLE gramajes_componentes_base (
  id UUID PRIMARY KEY,
  operacion_id UUID,        -- NULL = valor global (futuro)
  componente_id UUID NOT NULL,
  gramaje NUMERIC(10,2),    -- Ej: 180.50
  unidad_medida VARCHAR(10), -- 'gr', 'ml', 'oz', 'cc', 'taza', 'cucharada'
  descripcion TEXT,         -- Ej: "Para almuerzo base"
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  UNIQUE(operacion_id, componente_id)
);
```

### Ejemplo de Registros

```
id                  | operacion_id | componente_id | gramaje | unidad | descripcion
─────────────────────────────────────────────────────────────────────────────────────────
uuid-1              | op-alcala    | comp-cereal   | 200.00  | gr     | Desayuno base
uuid-2              | op-alcala    | comp-jugo     | 250.00  | ml     | Jugo natural
uuid-3              | op-alcala    | comp-proteina | 180.00  | gr     | Almuerzo base
uuid-4              | op-alcala    | comp-verdura  | 150.00  | gr     | Almuerzo base
```

---

## 🎛️ Interacciones en PanelGramajeBASE

### Editar Gramaje

```
Campo de input type="number"
- min="0"
- step="0.5"  (permite 0, 0.5, 1, 1.5, ... 199.5, 200)
- placeholder="0"

Ejemplo:
  [  180  ] gr
```

### Seleccionar Unidad

```
Select dropdown con opciones:
- gr       (gramos - sólidos)
- ml       (mililitros - líquidos)
- oz       (onzas)
- cc       (centímetros cúbicos)
- taza     (taza - aproximada)
- cucharada (cda. - aproximada)

Ejemplo:
  [  ml     ▼  ]
  ├─ gr
  ├─ ml      ← seleccionado
  ├─ oz
  └─ ...
```

### Agregar Descripción

```
Campo de input type="text"
- placeholder="Ej: Para almuerzo, ensalada mixta..."
- Opcional (no guardará si está vacío)

Ejemplo:
  [ Para desayuno, base fria  ]
```

---

## ⚙️ Comportamiento del Sistema

### Al Guardar
```
1. Validar que gramaje > 0 (si está lleno)
2. Parsear a float
3. Hacer UPSERT en `gramajes_componentes_base`
   - Si (operacion_id, componente_id) existe → UPDATE
   - Si no existe → INSERT
4. Mostrar notificación de éxito
5. Mantener modal abierto para más ediciones
```

### Al Descartar
```
1. Click botón [Descartar]
2. Recarga datos desde DB (refetch)
3. Los cambios sin guardar se pierden
4. Modal permanece abierto
```

### Estados de Carga
```
- Inicial: Spinner mientras carga componentes
- Guardando: Botón [Guardar] con spinner
- Error: AlertCircle + Reintentar
- Éxito: Notificación verde
```

---

## 🔗 Relación con Otros Sistemas

### Gramajes Base → Gramajes por Dieta

```
Tabla: gramajes_componentes_base
       ↓
       └─ Define valores BASE por componente
          Ej: Proteína = 180 gr

       ↓

Tabla: menu_componentes_gramajes
       ├─ Usa el BASE como referencia
       ├─ Calcula variaciones por tipo de dieta
       │  Ej: Pediátrica = BASE × 0.80 = 144 gr
       └─ Guarda valores específicos por dieta y componente
```

### Gramajes Base → Consolidados y Ingredientes

```
Cuando supervisor ve el consolidado:
1. Ve cantidad total de cada componente
   Ej: 50 porciones de Proteína a 180 gr = 9000 gr total

2. Sistema calcula ingredientes requeridos
   Basándose en:
   - Recetas de cada componente
   - Ingredientes en cada receta
   - Cantidades ajustadas al gramaje

3. Actualiza stock de materia prima
   (descuento automático al marcar preparado)
```

---

## ❓ Preguntas Frecuentes

### P: ¿Puedo cambiar gramajes después de activar el ciclo?
**R:** Sí, puedes cambiar los gramajes base en cualquier momento. Afectará a los nuevos pedidos que se creen después del cambio.

### P: ¿Afecta cambiar gramajes base a los pedidos ya hechos?
**R:** No. Los pedidos ya creados tienen sus valores congelados. Solo afecta a nuevos pedidos.

### P: ¿Y si una operación no tiene gramajes base configurados?
**R:** El sistema usará valores por defecto global (seed data) hasta que el chef configure los específicos de la operación.

### P: ¿Puedo ver el histórico de cambios?
**R:** Actualmente no hay vista de histórico. Se recomienda anotar en Descripción ("Cambio a 200gr - 15/02/2025").

### P: ¿Qué unidades de medida debo usar?
**R:**
- **Sólidos:** gr (gramos)
- **Líquidos:** ml (mililitros)
- **Aproximadas:** taza, cucharada (cda.)
- **Internacionales:** oz (onzas)

### P: ¿Está disponible en inglés?
**R:** No, actualmente solo en español.

---

## 🐛 Solución de Problemas

### Problema: Al abrir modal "Configurar Gramajes", carga infinitamente

**Solución:**
1. Click botón [Reintentar]
2. Si persiste, recargar página (F5)
3. Verificar conexión a internet
4. Contactar soporte técnico

### Problema: Cambios no se guardan

**Solución:**
1. Verificar que el botón [Guardar] no esté en loading
2. Revisar notificación de error (esquina inferior derecha)
3. Intentar guardar nuevamente
4. Si falla, descartar y reabrir modal

### Problema: No veo un componente en la lista

**Solución:**
1. El componente existe pero no está en tabla `componentes_plato`
2. Contactar administrador del sistema para agregar componente
3. O crear como "componente local" en el ciclo

---

## 📊 Ejemplo Práctico Completo

### Escenario: Chef de Alcalá crea ciclo de 14 días

**Paso 1: Crear ciclo**
```
Chef: Click [Nuevo Ciclo]
Modal pide:
  - Nombre: "Ciclo Feb 2025"
  - Operación: "Alcalá"
  - Fecha inicio: "15/02/2025"
Chef: Click [Crear]
→ Ciclo creado en estado "Borrador"
```

**Paso 2: Configurar gramajes base**
```
Chef: Click [Gramajes] en "Alcalá"
Se abre modal con tabla:
  Componente    │ Gramaje │ Unidad │ Descripción
  ──────────────┼─────────┼────────┼────────────
  Cereal        │   200   │ gr     │ (vacío)
  Jugo          │   250   │ ml     │ (vacío)
  Proteína      │   150   │ gr     │ (vacío)  ← Chef quiere 180, no 150
  Verdura       │   150   │ gr     │ (vacío)
  ...

Chef:
  1. Click en Proteína, gramaje
  2. Borra 150, escribe 180
  3. Click en descripción
  4. Escribe "Base para almuerzo"
  5. Click [Guardar]

→ Guardado en `gramajes_componentes_base`
→ Notificación: "Gramajes base guardados correctamente"
```

**Paso 3: Editar ciclo y servicios**
```
Chef: Click [Editar]
CicloEditor abre:
  - Calendario con 14 días
  - Cada día tiene servicios: Desayuno, Nueves, Almuerzo, Onces, Cena, Cena Ligera

Chef configura:
  - Día 1, Desayuno: Cereal + Jugo
  - Día 1, Almuerzo: Sopa + Proteína + Verdura + Farináceo
  - ...

Los gramajes base de Proteína (180 gr) están disponibles como referencia
```

**Paso 4: Configurar dietas**
```
Chef: Tab "Gramajes"
Tabla de dietas x componente:
  Tipo de Dieta │ Gramaje │ % Mod. │ Estado
  ──────────────┼─────────┼────────┼──────────
  Normal        │ 180     │ 100    │ Incluido
  Pediátrica    │ 144     │ 80     │ Incluido  ← Se calcula: 180 × 0.80
  Terapéutica   │ 180     │ 100    │ Incluido
  ...

Chef edita % Mod. para Pediátrica si lo desea
→ Gramajes recalculados automáticamente
```

**Paso 5: Activar ciclo**
```
Chef: Click [Activar Ciclo]
Sistema verifica:
  ✓ Todos los días tienen servicios configurados
  ✓ Todos los servicios tienen componentes

→ Ciclo cambia a "Activo"
→ Aparece badge "Activo" en el Dashboard
→ Los coordinadores pueden crear pedidos
```

---

## 📈 Métricas Esperadas

Después de implementar gramajes base:

| Métrica | Antes | Después |
|---------|-------|---------|
| Tiempo configuración ciclo | 20 min | 25 min (+5 min por gramajes) |
| Errores de gramaje en pedidos | 5-10% | <1% (valores preconfigurados) |
| Consultas sobre recetas | Alta | Media (referencia disponible) |
| Precisión de costos | 70% | 95% (datos consistentes) |

---

**¡Sistema listo para usar! 🎉**

Para preguntas o soporte, contactar al equipo de desarrollo.
