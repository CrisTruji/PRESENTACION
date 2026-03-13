# Sprint N — Food Orders (refactor/fixes) + Nómina (bugfix desprendibles)

**Fecha:** 2026-03-13
**Estado:** En desarrollo — pendiente de commit
**Rama:** main
**Archivos modificados:** 14

---

## Resumen

Este sprint agrupa dos grupos de cambios independientes:
1. **Refactor y corrección** del módulo `food-orders` (pedidos, cambio de recetas, consolidado)
2. **Bugfix crítico** en `nomina/PanelNomina` para reconocimiento de nombres de archivo de desprendibles

---

## 1. Módulo food-orders

### Archivos modificados
| Archivo | Tipo de cambio |
|---|---|
| `CambioRecetaPanel.jsx` | Refactor mayor (367 líneas cambiadas) |
| `ConsolidadoSupervisor.jsx` | Funcionalidad adicional (+24 líneas) |
| `MenuDelDia.jsx` | Refactor / reducción de código |
| `PedidoDietas.jsx` | Correcciones de lógica |
| `PedidoServicioForm.jsx` | Extensión de funcionalidad |
| `SolicitudCambioModal.jsx` | Refactor mayor (351 líneas cambiadas) |
| `VistaRecetas.jsx` | Ajustes menores |
| `VistaUnidades.jsx` | Correcciones y refactor |
| `hooks/usePedidos.js` | +18 líneas (nuevos hooks/funciones) |
| `services/pedidosService.js` | Ajuste menor |
| `services/solicitudesCambioService.js` | Correcciones de servicio |
| `store/usePedidoStore.js` | +27 líneas (nuevo estado en store) |

### Descripción de cambios
- **CambioRecetaPanel** y **SolicitudCambioModal**: Refactor mayor del flujo de solicitud de cambio de receta. Mejoras en UX y corrección de bugs en el ciclo de estados.
- **ConsolidadoSupervisor**: Funcionalidades adicionales para vista de supervisor.
- **MenuDelDia** / **PedidoDietas** / **VistaUnidades**: Correcciones en renderizado y lógica de pedidos.
- **usePedidoStore**: Nuevo estado agregado al store Zustand para manejar el flujo de pedidos.

---

## 2. Módulo nomina — Bugfix desprendibles

### Archivo modificado
`src/features/nomina/components/PanelNomina.jsx`

### Problema
La función `parsearNombreArchivo` no reconocía archivos con formato:
```
{cedula}_{NOMBRE APELLIDOS}.pdf
Ej: 1000127175_CASTILLO HURTADO KENNIA MILADIS.pdf
```

**Causa raíz 1:** El patrón 1 solo detecta `{cedula}_{YYYY-MM}` (con fecha), no `{cedula}_{texto}`.

**Causa raíz 2:** El patrón 4 usaba `\b` (word boundary) que falla cuando el número va seguido de `_` porque `_` es un word character en regex — no hay boundary entre dígito y underscore.

### Solución aplicada

```js
// Patrón 1b (NUEVO) — captura {cedula}_{NOMBRE}
const m1b = sinExt.match(/^(\d{6,12})_[^\d]/);
if (m1b) return { cedula: m1b[1], periodo: periodoFallback };

// Patrón 4 (CORREGIDO) — \b → lookarounds
const m4 = sinExt.match(/(?<!\d)(\d{8,12})(?!\d)/);
```

### Resultado
Archivos como `1000127175_CASTILLO HURTADO KENNIA MILADIS.pdf` ahora son reconocidos correctamente. El período se toma del selector de UI (periodoFallback).

---

## Recomendación de commit

Cuando estés listo para subir, puedes hacer **un commit** con mensaje sugerido:

```
fix: food-orders refactor + bugfix parseo nombres desprendibles nómina

- Refactor CambioRecetaPanel y SolicitudCambioModal
- Correcciones MenuDelDia, PedidoDietas, VistaUnidades
- Extensión ConsolidadoSupervisor y PedidoServicioForm
- Fix: parsearNombreArchivo ahora reconoce formato {cedula}_{NOMBRE}.pdf
- Fix: patrón regex \b → lookarounds para nombres con underscore
```

O si prefieres separar los cambios en dos commits:
1. `refactor(food-orders): mejoras CambioRecetaPanel, SolicitudCambioModal y pedidos`
2. `fix(nomina): parsearNombreArchivo reconoce formato cedula_NOMBRE.pdf`
