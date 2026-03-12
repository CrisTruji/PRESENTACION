# Documentación Completa del Sistema — Healthy App
**Versión:** Marzo 2026
**Stack:** React 19 + Vite + Supabase (PostgreSQL) + Tailwind CSS

---

## ÍNDICE
1. [Arquitectura General](#1-arquitectura-general)
2. [Autenticación y Roles](#2-autenticación-y-roles)
3. [Módulo: Ciclos de Menú](#3-módulo-ciclos-de-menú)
4. [Módulo: Pedidos de Servicio](#4-módulo-pedidos-de-servicio)
5. [Módulo: Consolidado de Producción](#5-módulo-consolidado-de-producción)
6. [Módulo: Compras y Solicitudes](#6-módulo-compras-y-solicitudes)
7. [Módulo: Inventario y Stock](#7-módulo-inventario-y-stock)
8. [Módulo: Almacén y Facturas](#8-módulo-almacén-y-facturas)
9. [Módulo: Presupuesto y Costos](#9-módulo-presupuesto-y-costos)
10. [Módulo: Portal Empleados](#10-módulo-portal-empleados)
11. [Módulo: Administración](#11-módulo-administración)
12. [Módulos Auxiliares](#12-módulos-auxiliares)
13. [Base de Datos](#13-base-de-datos)
14. [Flujos de Trabajo Completos](#14-flujos-de-trabajo-completos)
15. [Flujo de la Información](#15-flujo-de-la-información)
16. [Infraestructura Técnica](#16-infraestructura-técnica)

---

## 1. ARQUITECTURA GENERAL

### Patrón: Feature-Sliced Design (FSD)
```
src/
├── app.jsx               → Punto de entrada, auth + routing global
├── main.jsx              → Bootstrap (providers: Auth, QueryClient, Router)
├── features/             → 22 módulos funcionales
│   ├── admin/            → Panel administración
│   ├── auth/             → Login, registro, roles
│   ├── chat/             → Mensajería interna
│   ├── employees/        → Gestión RRHH (SST + TH)
│   ├── food-orders/      → Pedidos y consolidado
│   ├── gerencia/         → Dashboard gerencial
│   ├── informes/         → Generador de reportes
│   ├── inventory/        → Stock y movimientos
│   ├── menu-cycles/      → Ciclos de menú (chef)
│   ├── nomina/           → Panel nómina
│   ├── notifications/    → Sistema de notificaciones
│   ├── planta/           → Dashboard planta
│   ├── portal-empleado/  → Portal self-service empleados
│   ├── presentations/    → Gestión de presentaciones
│   ├── presupuesto/      → Módulo económico
│   ├── products/         → Árboles MP/recetas
│   ├── purchases/        → Solicitudes de compra
│   ├── recipes/          → Costos de recetas
│   ├── recommendations/  → Motor de recomendaciones
│   └── warehouse/        → Recepción de facturas
├── shared/               → Recursos compartidos
│   ├── api/              → supabase.js + queryClient.js
│   ├── lib/              → exportService, notifier
│   ├── types/            → menu.js (constantes globales)
│   └── ui/               → Navbar, ErrorBoundary
├── router/               → rolerouter.jsx (enrutamiento por rol)
├── context/              → auth.jsx (AuthProvider)
└── widgets/              → Componentes reutilizables complejos
```

### Estructura interna de cada feature (FSD)
```
features/{nombre}/
├── components/   → Componentes React (.jsx)
├── hooks/        → Custom hooks con React Query
├── services/     → Capa de acceso a datos (Supabase)
├── store/        → Estado UI con Zustand
└── index.js      → Barrel export (API pública del módulo)
```

### Gestión de estado
| Tipo de estado | Herramienta | Persistencia |
|---|---|---|
| Estado del servidor (datos DB) | React Query (TanStack) | Cache en memoria (configurable) |
| Estado UI / formularios | Zustand | Memoria (opcional localStorage) |
| Estado de autenticación | Context API + Supabase Auth | Session (cookie/token) |
| Borrador de pedidos | Zustand + localStorage | Permanente (key: pedido-draft-v1) |

---

## 2. AUTENTICACIÓN Y ROLES

### Flujo de autenticación
```
Usuario abre la app
    ↓
app.jsx verifica session (Supabase Auth)
    ├── Sin session → LoginUnificado
    │       ├── /login → LoginScreen (corporativo)
    │       ├── /empleado-login → PortalEmpleadoLogin
    │       └── /empleado-registro → EmpleadoRegistroScreen (3 pasos)
    │
    └── Con session
            ├── portal_mode=1 en sessionStorage → PortalEmpleadoDashboard
            ├── rol = "usuario" → PortalEmpleadoDashboard (sin Navbar)
            └── Rol corporativo → Navbar + RoleRouter
```

### Roles del sistema y pantalla de inicio
| Rol | Pantalla inicial | Módulos accesibles |
|---|---|---|
| `administrador` | AdminDashboard | Todos |
| `chef` | ChefDashboard | Ciclos menú, recetas, productos |
| `supervisor_produccion` | ConsolidadoSupervisor | Consolidado, inventario, ciclos |
| `coordinador_unidad` | PedidoServicioForm | Pedidos, menú del día |
| `jefe_de_planta` | CrearSolicitud | Compras, planta, producción |
| `auxiliar_de_compras` | GestionAux | Solicitudes (revisión) |
| `jefe_de_compras` | GestionCompras | Solicitudes (aprobación), proveedores |
| `almacenista` | RecepcionFactura | Facturas, stock, inventario |
| `usuario` | PortalEmpleadoDashboard | Portal empleado (aislado) |
| `nomina` | PanelNomina | Desprendibles, vacaciones |

### Tabla de usuarios en DB
- `auth.users` (Supabase Auth — email, password_hash, metadata)
- `usuarios` (tabla pública — id_auth, rol, nombre, operacion_id, estado)
- Estados de usuario: `pendiente` → `activo` | `rechazado`

### Tabla de operaciones (unidades de negocio)
```
operaciones (id, codigo, nombre, tipo_operacion, activo)
```
- `tipo_operacion`: 'ciclico' (mayoría) | 'carta_menu' (Eiren)
- Operaciones con pacientes (requieren datos individuales): Alcalá, Presentes

---

## 3. MÓDULO: CICLOS DE MENÚ

**Rol:** Chef (`chef`)
**Ubicación:** `src/features/menu-cycles/`
**Pantalla:** `ChefDashboard` → `CicloEditor`

### Propósito
El chef define qué se va a servir en cada unidad, para cada día del ciclo, para cada servicio del día. Asigna recetas a cada componente del plato y configura los gramajes por tipo de dieta.

### Componentes principales
| Componente | Función |
|---|---|
| `ChefDashboard` | Vista de todas las operaciones con estado del ciclo, progreso |
| `CicloEditor` | Editor principal del ciclo (4 paneles) |
| `PanelCalendario` | Selección de día del ciclo |
| `PanelGramajes` | Configurar gramaje por tipo de dieta para un componente |
| `PanelGramajeBASE` | Configurar gramajes base por operación |
| `ModalNuevoCiclo` | Crear ciclo nuevo |
| `ModalVerCiclo` | Ver resumen del ciclo |
| `ModalCicloCompleto` | Vista completa del ciclo (solo lectura, para supervisor) |
| `GramajeBASEModal` | Wrapper modal para PanelGramajeBASE |

### Estructura del CicloEditor (4 tabs)
```
CicloEditor
├── Tab: Calendario (Menú del Día)
│   └── ComponentesDia: lista de componentes con receta asignada
│       ├── Botón A/B: hasta 2 opciones por componente
│       ├── Buscar receta: buscador reactivo (min 2 chars)
│       └── Ver ingredientes: detalle de insumos
│
├── Tab: Gramajes
│   └── PanelGramajes: tabla gramaje × tipo de dieta
│       (una fila por dieta, columnas: gramaje / % modif / excluir / notas)
│
├── Tab: Ingredientes
│   └── Resumen de ingredientes totales del día
│
└── Tab: Entregables
    └── Configuración de entregas directas (sin preparación)
```

### Servicios — `ciclosService.js`
```javascript
getActivos(operacionId)          → SELECT ciclos_menu WHERE estado IN ('activo','borrador')
getConDias(cicloId)              → SELECT ciclo_dia_servicios + menu_componentes (deep join)
crearCiclo(operacionId, nombre, numDias, servicios[])
    → INSERT ciclos_menu
    → INSERT ciclo_dia_servicios (numDias × len(servicios) filas)
activarCiclo(cicloId)            → UPDATE estado='activo', fecha_inicio=TODAY
activarServicio(cicloId, servicio) → UPDATE ciclo_dia_servicios SET activo=true WHERE servicio=$
copiarDia(cicloId, diaOrigen, diaDestino)
    → GET menu_componentes del día origen
    → INSERT menu_componentes en día destino (deep copy con gramajes)
marcarDiaCompleto(cicloDiaServicioId) → UPDATE completo=true
eliminarCiclo(cicloId)           → DELETE ciclos_menu (cascade)
```

### Servicios — `operacionesService.js`
```javascript
getActivas()                     → SELECT operaciones WHERE activo=true ORDER BY nombre
getConCicloActivo()
    → SELECT operaciones + ciclos_menu + ciclo_dia_servicios
    → Calcula en JS: diasCompletos, diasTotales, progreso%, diasData (mini-calendar)
```

### Servicios — `menuComponentesService.js` (via hooks)
```javascript
getComponentesDia(cicloDiaServicioId)
    → SELECT menu_componentes + arbol_recetas + componentes_plato + gramajes

asignarComponente(cicloDiaServicioId, componenteId, recetaId)
    → INSERT menu_componentes (permite duplicados para opción A/B)

actualizarReceta(menuComponenteId, recetaId)
    → UPDATE menu_componentes SET receta_id=$

eliminarComponente(menuComponenteId)
    → UPDATE menu_componentes SET activo=false

getGramajes(menuComponenteId)
    → SELECT gramajes_componente_menu + tipos_dieta

guardarGramajes(menuComponenteId, gramajes[])
    → UPSERT gramajes_componente_menu (uno por tipo de dieta)

getGramajeBASEComponentes(operacionId)
    → SELECT gramajes_base_componentes + componentes_plato

guardarGramajeBASEComponentes(operacionId, gramajes[])
    → UPSERT gramajes_base_componentes

crearRecetaLocal(nombre, recetaBaseId, ingredientes[], operacionId)
    → INSERT arbol_recetas (es_local=true, operacion_id=$)
    → INSERT receta_ingredientes

buscarRecetas(termino)
    → SELECT arbol_recetas WHERE nombre ILIKE %termino% LIMIT 20
```

### Tablas de base de datos
| Tabla | Campos clave | Descripción |
|---|---|---|
| `ciclos_menu` | id, operacion_id, nombre, estado, dia_actual_ciclo, fecha_inicio, activo | Un ciclo por operación |
| `ciclo_dia_servicios` | id, ciclo_id, numero_dia, servicio, completo, activo | Un registro por día × servicio |
| `menu_componentes` | id, ciclo_dia_servicio_id, componente_id, receta_id, orden, activo | Asignación receta → componente |
| `componentes_plato` | id, codigo, nombre, orden | Catálogo: Sopa, Proteína, Guarnición… |
| `arbol_recetas` | id, codigo, nombre, costo_porcion, rendimiento, es_local, operacion_id | Recetas globales y locales |
| `receta_ingredientes` | receta_id, materia_prima_id, cantidad_requerida, unidad_medida, activo | Ingredientes por receta |
| `gramajes_componente_menu` | menu_componente_id, tipo_dieta_id, gramaje, unidad_medida, excluir | Gramaje específico por dieta |
| `gramajes_base_componentes` | operacion_id, componente_id, gramaje_base, unidad | Gramaje base por operación |
| `tipos_dieta` | id, codigo, nombre, categoria | Tipos de dieta (PEDIATRICA, etc.) |

### Estado del ciclo (máquina de estados)
```
BORRADOR → ACTIVO → PAUSADO ↔ ACTIVO
                  ↓
              FINALIZADO
```

### Zustand store — `useCicloEditorStore`
```javascript
cicloSeleccionado: null       // Ciclo en edición
diaSeleccionado: 1            // Día activo en el calendario
servicioSeleccionado: null    // Servicio activo (desayuno, almuerzo…)
componenteSeleccionado: null  // Componente con foco para gramajes
panelActivo: 'calendario'     // Tab activa en CicloEditor
modalNuevoCiclo: false
modalRecetaLocal: false
modalGramajeBASE: false
```

---

## 4. MÓDULO: PEDIDOS DE SERVICIO

**Rol:** Coordinador de Unidad (`coordinador_unidad`)
**Ubicación:** `src/features/food-orders/`
**Pantalla:** `PedidoServicioForm`

### Propósito
Cada coordinador ingresa diariamente cuántas porciones necesita por tipo de dieta, para cada servicio (desayuno, almuerzo, cena, etc.). El sistema valida la hora de envío contra los límites configurados.

### Flujo del pedido
```
1. Coordinador selecciona: Operación → Fecha → Servicio
2. Sistema consulta:
   - Menú del día (ciclo activo → dia_ciclo calculado por RPC)
   - Hora límite del servicio (servicios_unidad)
   - Pedido existente (borrador/enviado)
3. Si operación = carta_menu (Eiren):
   → PedidoCartaMenu (el coordinador elige A o B por componente)
   Else si operación requiere pacientes (Alcalá, Presentes):
   → PedidoPacientes (nombre, cédula, cuarto, tipo de dieta, alergias)
   Else:
   → PedidoDietas (cantidad por tipo de dieta)
4. Guardar borrador → datos en localStorage (Zustand persist)
5. Enviar pedido → UPDATE estado='enviado', registra hora_envio
   Sistema compara hora_envio vs hora_limite → enviado_en_hora (bool)
```

### Servicio — `pedidosService.js`
```javascript
getPedidoDelDia(operacionId, fecha, servicio)
    → SELECT pedidos_servicio + pedido_items_servicio + pedido_pacientes

crearPedido(operacionId, fecha, servicio, creadorId)
    → RPC calcular_dia_ciclo(operacion_id, fecha) → dia_ciclo
    → INSERT pedidos_servicio

enviarPedido(pedidoId, horaEnvio, horaLimite)
    → Calcula enviado_en_hora (horaEnvio <= horaLimite)
    → UPDATE pedidos_servicio SET estado='enviado', hora_envio, enviado_en_hora

guardarItems(pedidoId, items[])
    → DELETE pedido_items_servicio WHERE pedido_id=$
    → INSERT pedido_items_servicio (tipo_dieta_id, cantidad, gramaje_aplicado, opcion_seleccionada)

guardarPacientes(pedidoId, pacientes[])
    → DELETE pedido_pacientes WHERE pedido_id=$
    → INSERT pedido_pacientes (nombre, identificacion, cuarto, tipo_dieta_id, alergias)

getMenuDelDia(operacionId, fecha)
    → SELECT ciclo_dia_servicios + menu_componentes + arbol_recetas + gramajes
    (busca el ciclo activo de la operación y calcula qué día del ciclo corresponde a la fecha)
```

### Tablas de base de datos
| Tabla | Campos clave | Descripción |
|---|---|---|
| `pedidos_servicio` | id, operacion_id, fecha, servicio, dia_ciclo_calculado, estado, hora_envio, enviado_en_hora, creado_por | Un pedido por operación/fecha/servicio |
| `pedido_items_servicio` | id, pedido_id, tipo_dieta_id, cantidad, gramaje_aplicado, opcion_seleccionada, observaciones | Líneas del pedido |
| `pedido_pacientes` | id, pedido_id, nombre, identificacion, cuarto, tipo_dieta_id, alergias | Solo para operaciones con pacientes |
| `servicios_unidad` | id, operacion_id, servicio, hora_limite, activo | Horario límite de envío por servicio |

### Estado del pedido
```
BORRADOR → ENVIADO → CONSOLIDADO
                   ↘ RECHAZADO (si supervisor rechaza)
```

### Zustand store — `usePedidoStore` (persiste en localStorage)
```javascript
operacionActual: null
fechaPedido: hoy
servicioPedido: 'almuerzo'
pedidoActual: null | { id, estado, hora_envio, enviado_en_hora }
items: [{ tipo_dieta_id, cantidad, gramaje_aplicado, opcion_seleccionada, observaciones }]
pacientes: [{ nombre, identificacion, cuarto, tipo_dieta_id, alergias }]
menuDelDia: null | { componentes[], gramajes }
horaLimite: null | "HH:MM"
modoEdicion: false
```

---

## 5. MÓDULO: CONSOLIDADO DE PRODUCCIÓN

**Rol:** Supervisor de Producción (`supervisor_produccion`)
**Ubicación:** `src/features/food-orders/components/ConsolidadoSupervisor.jsx`

### Propósito
El supervisor consolida todos los pedidos del día para un servicio, verifica el stock disponible, aprueba y envía a cocina, y registra la producción completada.

### Flujo del consolidado
```
1. Supervisor selecciona Fecha + Servicio (+ Unidad opcional)
2. Sistema muestra:
   - Pedidos recibidos/enviados/tardíos
   - Horarios límite de cada unidad
   - Menú del día (si hay unidad seleccionada)
   - Solicitudes de cambio pendientes
3. Generar Consolidado:
   → RPC consolidar_pedidos_servicio(fecha, servicio, forzar)
   → Agrupa pedidos por componente, suma cantidades por dieta
   → Crea consolidados_produccion + consolidado_items
4. Supervisor revisa 3 tabs:
   - Por Receta: recetas a producir con cantidades
   - Por Unidad: pedidos agrupados por operación
   - Ingredientes: total de materias primas necesarias (con semáforo de stock)
5. Si necesario: Sustituir receta (modal de búsqueda + auditoría)
6. Aprobar: → UPDATE estado='aprobado', registra supervisor_id + fecha_aprobacion
7. Marcar Preparado:
   → RPC descontar_stock_consolidado (descuenta stock de arbol_materia_prima)
   → UPDATE estado='completado', registra fecha_preparacion
8. Exportar:
   - Excel: pedidos del día
   - PDF: hoja de producción para cocina (jsPDF)
```

### RPC `consolidar_pedidos_servicio`
```sql
-- Lógica aproximada del RPC
1. Fetch all pedidos_servicio WHERE fecha=$fecha AND servicio=$servicio
   AND estado IN ('enviado', 'consolidado')
2. Para cada pedido → leer pedido_items_servicio
3. Buscar componente del día via ciclo activo de la operación
4. Agregar por componente: SUM(cantidad) por tipo_dieta
5. INSERT consolidados_produccion (fecha, servicio, total_porciones, estado='en_revision')
6. INSERT consolidado_items (consolidado_id, componente_id, receta_id, cantidad_total)
7. Si forzar=true: actualizar consolidado existente
```

### RPC `get_ingredientes_totales`
```sql
-- Para cada consolidado_item:
--   total_requerido = receta_ingredientes.cantidad_requerida × (cantidad_total / rendimiento)
-- Agregar por materia_prima
-- JOIN stock para stock_actual
-- Calcular diferencia y estado_stock (SUFICIENTE | INSUFICIENTE)
-- Si RPC no disponible: cálculo JS fallback en consolidadoService.js
```

### RPC `descontar_stock_consolidado`
```sql
-- Para cada ingrediente en el consolidado:
--   UPDATE arbol_materia_prima SET stock_actual = stock_actual - total_requerido
--   INSERT movimientos_inventario (tipo='consumo_produccion')
```

### Estado del consolidado
```
EN_REVISION → APROBADO → COMPLETADO
           ↘ (regenerar forzar=true) ↗
```

### Tablas de base de datos
| Tabla | Campos clave | Descripción |
|---|---|---|
| `consolidados_produccion` | id, fecha, servicio, estado, total_porciones, supervisor_id, fecha_aprobacion, fecha_preparacion | Un consolidado por fecha/servicio |
| `consolidado_items` | id, consolidado_id, componente_id, receta_id, cantidad_total | Items del consolidado |
| `cambios_menu_supervisor` | id, consolidado_id, receta_original_id, receta_nueva_id, motivo, supervisor_id | Auditoría de sustituciones |

---

## 6. MÓDULO: COMPRAS Y SOLICITUDES

**Roles:** Jefe de Planta, Auxiliar de Compras, Jefe de Compras, Almacenista
**Ubicación:** `src/features/purchases/`

### Propósito
Gestionar el flujo de compras desde la necesidad de planta hasta la recepción en almacén.

### Máquina de estados de solicitudes
```
PENDIENTE (Jefe de Planta crea)
    ↓
EN_REVISION_AUXILIAR (Auxiliar revisa ítem por ítem)
    ├── RECHAZADO_AUXILIAR → DEVUELTA_JEFE_PLANTA (Jefe puede corregir y reenviar)
    └── APROBADO_AUXILIAR
            ↓
        APROBADO_COMPRAS (Jefe de Compras aprueba definitivo)
            ↓
        COMPRADO (Auxiliar/Jefe marca como comprado)
            ├── FINALIZADO (Almacenista confirma recepción)
            └── DEVUELTO (Rechazo en recepción)
```

### Máquina de estados de ítems
```
Ítem PENDIENTE → APROBADO_AUXILIAR | RECHAZADO_AUXILIAR (requiere motivo)
              → APROBADO_COMPRAS | RECHAZADO_COMPRAS
```

### Filtrado por rol
```javascript
ESTADOS_POR_ROL = {
  auxiliar_de_compras: ['pendiente', 'en_revision_auxiliar'],
  jefe_de_compras:     ['aprobado_auxiliar'],
  jefe_de_planta:      ['devuelta_jefe_planta', 'rechazado_auxiliar'],
  almacenista:         ['comprado']
}
```

### Componentes principales
| Componente | Rol | Función |
|---|---|---|
| `CrearSolicitud` | Jefe de Planta | Crear nueva solicitud con ítems |
| `SolicitudesPlanta` | Jefe de Planta | Ver mis solicitudes + estado |
| `GestionAux` | Auxiliar Compras | Revisar ítems, aprobar/rechazar con motivo |
| `GestionCompras` | Jefe de Compras | Aprobación final, gestión proveedores |
| `VerDetallesSolicitud` | Todos | Vista detalle de una solicitud |
| `ProyeccionCompras` | Jefe/Compras | Análisis de tendencias y proyección |
| `Proveedores` | Compras/Admin | CRUD de proveedores |

### Servicio — `solicitudesService.js`
```javascript
crearSolicitud(datos)                  → INSERT solicitudes
agregarItems(solicitudId, items[])     → INSERT solicitud_items
  items: { producto_arbol_id, presentacion_id, cantidad_solicitada, unidad }

getSolicitudes()                       → SELECT con joins (proveedor, items, usuario)
getSolicitudConItems(id)               → SELECT + nested items + estados
getSolicitudesPorRol(rol)              → Filtrar por ESTADOS_POR_ROL

aprobarItemAuxiliar(itemId, sol)       → UPDATE estado_item='aprobado_auxiliar'
rechazarItemAuxiliar(itemId, motivo)   → UPDATE estado_item='rechazado_auxiliar' (motivo requerido)
cerrarRevisionAuxiliar(solicitudId)    → UPDATE solicitud estado siguiente
getPresentacionesPorProveedor(provId)  → SKUs vinculados a un proveedor
```

### Tablas de base de datos
| Tabla | Campos clave | Descripción |
|---|---|---|
| `solicitudes` | id, proveedor_id, codigo_unidad, estado, created_by, email_creador, observaciones, created_at | Cabecera solicitud |
| `solicitud_items` | id, solicitud_id, producto_arbol_id, presentacion_id, cantidad_solicitada, unidad, estado_item, motivo_rechazo | Líneas de la solicitud |
| `proveedores` | id, nombre, nit, telefono, email, activo | Catálogo de proveedores |
| `presentaciones` | id, codigo, nombre, contenido_unidad, unidad_contenido, proveedor_id | SKUs/presentaciones de productos |

---

## 7. MÓDULO: INVENTARIO Y STOCK

**Roles:** Almacenista, Administrador (lectura todos)
**Ubicación:** `src/features/inventory/`

### Propósito
Controlar los niveles actuales de stock, registrar entradas y salidas manuales, ver historial de movimientos.

### Tipos de movimientos de stock
| Tipo | Origen | Tabla |
|---|---|---|
| `ingreso_factura` | Recepción de factura | `movimientos_inventario` |
| `consumo_produccion` | Marcar consolidado preparado (RPC) | `movimientos_inventario` |
| `ajuste_manual` | Almacenista corrige manualmente | `ajustes_stock_manual` |
| `devolucion` | Devolución a proveedor | `movimientos_inventario` |

### Servicio — `stockService.js`
```javascript
actualizarStock(stockId, cantidad, operacion, motivo, notas)
    RPC: actualizar_stock(p_stock_id, p_cantidad, p_operacion, p_motivo, p_notas)
    operacion: 'incrementar' | 'decrementar' | 'establecer'
    → Actualiza stock, inserta en ajustes_stock_manual

getHistorialMovimientos(materiaPrimaId, fechaDesde, fechaHasta)
    → SELECT ajustes_stock_manual (manual)
    → SELECT movimientos_inventario (facturas/producción)
    → Combina y ordena por fecha DESC
```

### Semáforo de stock
```javascript
estado_stock:
  'SUFICIENTE'     → stock_actual >= stock_minimo × 1.5
  'BAJO'           → stock_minimo <= stock_actual < stock_minimo × 1.5
  'INSUFICIENTE'   → stock_actual < stock_minimo
  'SIN_MINIMO'     → stock_minimo no configurado
```

### Tablas de base de datos
| Tabla | Campos clave | Descripción |
|---|---|---|
| `arbol_materia_prima` | id, codigo, nombre, costo_promedio, unidad_stock, stock_actual, stock_minimo, activo | Materias primas con stock |
| `stock` | id, materia_prima_id, presentacion_id, cantidad_actual, cantidad_minima, cantidad_alerta | Stock por presentación/SKU |
| `ajustes_stock_manual` | id, producto_id, tipo_operacion, cantidad, stock_anterior, stock_posterior, motivo, usuario_id, created_at | Auditoría ajustes manuales |
| `movimientos_inventario` | id, producto_id, tipo_movimiento, cantidad_unidad_base, stock_anterior, stock_posterior, facturas_id, created_at | Auditoría movimientos automáticos |

---

## 8. MÓDULO: ALMACÉN Y FACTURAS

**Rol:** Almacenista (`almacenista`)
**Ubicación:** `src/features/warehouse/`

### Propósito
Recepción de mercancía, registro de facturas, actualización automática de stock.

### Componentes principales
| Componente | Función |
|---|---|
| `RecepcionFactura` | Ingresar factura del proveedor con ítems |
| `Facturas` | Listado de facturas con estados y filtros |

### Flujo de recepción
```
1. Almacenista recibe mercancía física
2. Abre RecepcionFactura:
   - Selecciona proveedor
   - Ingresa número de factura, fecha, total
   - Agrega ítems: producto, cantidad recibida, presentación, precio unitario
3. Confirma recepción → INSERT facturas + factura_items
4. RPC actualiza stock: +cantidad_recibida por ítem
5. INSERT movimientos_inventario (tipo='ingreso_factura')
6. Factura queda en estado 'recibida' / 'pendiente_pago'
```

### Tablas de base de datos
| Tabla | Campos clave | Descripción |
|---|---|---|
| `facturas` | id, proveedor_id, numero_factura, fecha, total, estado, almacenista_id | Cabecera factura |
| `factura_items` | id, factura_id, producto_id, presentacion_id, cantidad, precio_unitario, subtotal | Líneas de factura |

---

## 9. MÓDULO: PRESUPUESTO Y COSTOS

**Roles:** Jefe de Planta, Administrador, Gerencia
**Ubicación:** `src/features/presupuesto/`

### Componentes principales
| Componente | Función |
|---|---|
| `DashboardPresupuesto` | KPIs presupuestales: ejecutado vs. presupuestado |
| `CierreCostosMensual` | Cierre mensual con exportación PDF |
| `AnalisisCostos` | (admin) Análisis de variaciones |
| `CostosPorUnidad` | (admin) Desglose por operación |
| `CostosServicio` | (planta) Costo por servicio/día |

### Indicadores clave
- Costo por porción vs. presupuesto
- Variación % por servicio y operación
- Tendencia semanal/mensual
- Semáforo: VERDE (≤presupuesto) / AMARILLO (≤+10%) / ROJO (>+10%)

### Tablas de base de datos
| Tabla | Campos clave | Descripción |
|---|---|---|
| `presupuestos_operacion` | id, operacion_id, mes, año, monto_presupuestado | Presupuesto por período |
| `costos_servicio` | id, operacion_id, fecha, servicio, costo_total, porciones, costo_por_porcion | Costo real por servicio |

---

## 10. MÓDULO: PORTAL EMPLEADOS

**Roles:** `usuario` (empleado), `nomina` (RRHH nómina)
**Ubicación:** `src/features/portal-empleado/`, `src/features/nomina/`

### Propósito
Auto-servicio para empleados: ver desprendibles, vacaciones, incapacidades, documentos. RRHH sube los desprendibles masivamente.

### PortalEmpleadoDashboard (5 tabs)
| Tab | Función |
|---|---|
| Mi Información | Datos personales del empleado |
| Desprendibles | Ver desprendibles de nómina propios |
| Vacaciones | Consultar estado de vacaciones |
| Incapacidades | Subir y consultar incapacidades |
| Mis Documentos | Documentos del empleado |

### Registro de empleado (`EmpleadoRegistroScreen`) — 3 pasos
```
Paso 1: Ingresa número de cédula
    → Edge Function 'employee-register' verifica en tabla empleados
    → Si existe → continúa
Paso 2: Datos de acceso (email, contraseña)
    → Edge Function crea cuenta en Supabase Auth
    → UPDATE empleados SET auth_user_id=$
Paso 3: Confirmación y acceso
    → Redirect a portal empleado
```

### PanelNomina (rol `nomina`)
| Funcionalidad | Descripción |
|---|---|
| `SubirDesprendiblesMasivos` | Upload masivo de PDFs de desprendibles por período |
| Gestión de vacaciones | Aprobar/rechazar solicitudes de vacaciones |

### Buckets de Supabase Storage
| Bucket | Acceso | Uso |
|---|---|---|
| `desprendibles-nomina` | Privado | PDFs de desprendibles por empleado/período |
| `incapacidades-docs` | Privado | Documentos de incapacidad |
| `empleado-documentos` | Público | Documentos varios del empleado |

### Tablas de base de datos
| Tabla | Campos clave | Descripción |
|---|---|---|
| `empleados` | id, cedula, nombre, cargo, auth_user_id, activo | Datos del empleado |
| `empleado_desprendibles` | id, empleado_id, periodo, archivo_path (UNIQUE por empleado/periodo) | Desprendibles por período |
| `solicitudes_vacaciones` | id, empleado_id, fecha_inicio, fecha_fin, estado, aprobado_por | Solicitudes de vacaciones |
| `incapacidades` | id, empleado_id, fecha_inicio, fecha_fin, archivo_path, tipo | Incapacidades |
| `empleado_documentos` | id, empleado_id, tipo_documento, archivo_path (URL pública completa) | Documentos varios |

---

## 11. MÓDULO: ADMINISTRACIÓN

**Rol:** `administrador`
**Ubicación:** `src/features/admin/`

### Pantallas
| Pantalla | Función |
|---|---|
| `AdminDashboard` | Usuarios, roles, solicitudes de acceso, operaciones sin pedido hoy |
| `AdminRequests` | Gestión de solicitudes de nuevo usuario (aprobar/rechazar/asignar rol) |
| `AnalisisCostos` | Análisis de costos completo |
| `CostosPorUnidad` | Desglose por unidad de negocio |
| `SemaforoOperativo` | Vista de estado de todas las operaciones |

### Gestión de usuarios
```
Usuario se registra → estado='pendiente'
Admin ve en "Pendientes (N)"
Admin asigna rol + operacion_id → estado='activo'
O Admin rechaza → estado='rechazado'
```

---

## 12. MÓDULOS AUXILIARES

### Chat (`src/features/chat/`)
- Mensajería interna en tiempo real (Supabase Realtime)
- `ChatButton` en Navbar → abre `ChatPanel`
- Componentes: `ConversacionItem`, `MensajeBurbuja`, `ChatWindow`

### Notificaciones (`src/features/notifications/`)
- Sistema de notificaciones automáticas (Supabase triggers → inserts en tabla notificaciones)
- Bell icon en Navbar con badge de pendientes

### Auditoría (`src/features/audit/`)
- `AuditoriaViewer` + `AuditoriaViewerVirtualized`
- Tabla `auditoria` con todos los cambios del sistema
- Filtros: fecha, usuario, acción, tabla afectada

### Informes (`src/features/informes/`)
- `GeneradorInformes`: Exportación de reportes en Excel/PDF
- Combina datos de múltiples módulos

### Gerencia (`src/features/gerencia/`)
- `DashboardGerencia`: KPIs consolidados para dirección
- Solo lectura, datos de presupuesto + costos + pedidos

### Presentaciones (`src/features/presentations/`)
- `VincularPresentaciones`: Asociar presentaciones/SKUs a materias primas
- `PresentacionesManager`: CRUD de presentaciones

### Recomendaciones (`src/features/recommendations/`)
- Motor de recomendaciones de compras basado en consumo histórico

### Empleados (`src/features/employees/`)
- `EmpleadosSST`: Gestión seguridad y salud en el trabajo
- `EmpleadosTH`: Gestión talento humano

---

## 13. BASE DE DATOS

### Proyecto Supabase
- **ID:** ulboklgzjriatmaxzpsi
- **Nombre:** TecFood_DB
- **Region:** (Supabase default)

### Esquema de tablas completo
```
OPERACIONES
  operaciones (id, codigo, nombre, tipo_operacion, activo)

USUARIOS Y AUTH
  auth.users (gestionado por Supabase)
  usuarios (id, auth_user_id, nombre, email, rol, operacion_id, estado, created_at)
  empleados (id, cedula, nombre, cargo, auth_user_id, activo)

CICLOS DE MENÚ
  ciclos_menu (id, operacion_id, nombre, estado, dia_actual_ciclo, fecha_inicio, activo)
  ciclo_dia_servicios (id, ciclo_id, numero_dia, servicio, completo, activo)
    UNIQUE(ciclo_id, numero_dia, servicio)
  menu_componentes (id, ciclo_dia_servicio_id, componente_id, receta_id, orden, activo)
  componentes_plato (id, codigo, nombre, orden)
  gramajes_componente_menu (menu_componente_id, tipo_dieta_id, gramaje, unidad_medida, excluir)
  gramajes_base_componentes (operacion_id, componente_id, gramaje_base, unidad)
  tipos_dieta (id, codigo, nombre, categoria)

RECETAS E INGREDIENTES
  arbol_recetas (id, codigo, nombre, costo_porcion, rendimiento, nivel_actual, es_local, operacion_id, activo)
  receta_ingredientes (id, receta_id, materia_prima_id, cantidad_requerida, unidad_medida, activo)
  arbol_materia_prima (id, codigo, nombre, costo_promedio, unidad_stock, stock_actual, stock_minimo, activo)

PEDIDOS
  pedidos_servicio (id, operacion_id, fecha, servicio, dia_ciclo_calculado, estado, hora_envio, enviado_en_hora, creado_por)
    UNIQUE(operacion_id, fecha, servicio)
  pedido_items_servicio (id, pedido_id, tipo_dieta_id, cantidad, gramaje_aplicado, opcion_seleccionada, observaciones)
  pedido_pacientes (id, pedido_id, nombre, identificacion, cuarto, tipo_dieta_id, alergias)
  servicios_unidad (id, operacion_id, servicio, hora_limite, activo)
    UNIQUE(operacion_id, servicio)

CONSOLIDADO
  consolidados_produccion (id, fecha, servicio, estado, total_porciones, supervisor_id, fecha_aprobacion, fecha_preparacion)
    UNIQUE(fecha, servicio)
  consolidado_items (id, consolidado_id, componente_id, receta_id, cantidad_total)
  cambios_menu_supervisor (id, consolidado_id, receta_original_id, receta_nueva_id, motivo, supervisor_id, created_at)

COMPRAS
  solicitudes (id, proveedor_id, codigo_unidad, estado, created_by, email_creador, observaciones)
  solicitud_items (id, solicitud_id, producto_arbol_id, presentacion_id, cantidad_solicitada, unidad, estado_item, motivo_rechazo)
  proveedores (id, nombre, nit, telefono, email, activo)
  presentaciones (id, codigo, nombre, contenido_unidad, unidad_contenido, proveedor_id)

STOCK E INVENTARIO
  stock (id, materia_prima_id, presentacion_id, cantidad_actual, cantidad_minima, cantidad_alerta)
  ajustes_stock_manual (id, producto_id, tipo_operacion, cantidad, stock_anterior, stock_posterior, motivo, usuario_id, created_at)
  movimientos_inventario (id, producto_id, tipo_movimiento, cantidad_unidad_base, stock_anterior, stock_posterior, facturas_id, created_at)

FACTURAS
  facturas (id, proveedor_id, numero_factura, fecha, total, estado, almacenista_id)
  factura_items (id, factura_id, producto_id, presentacion_id, cantidad, precio_unitario, subtotal)

PRESUPUESTO
  presupuestos_operacion (id, operacion_id, mes, año, monto_presupuestado)
  costos_servicio (id, operacion_id, fecha, servicio, costo_total, porciones, costo_por_porcion)

EMPLEADOS
  empleado_desprendibles (id, empleado_id, periodo, archivo_path) UNIQUE(empleado_id, periodo)
  solicitudes_vacaciones (id, empleado_id, fecha_inicio, fecha_fin, estado, aprobado_por)
  incapacidades (id, empleado_id, fecha_inicio, fecha_fin, archivo_path, tipo)
  empleado_documentos (id, empleado_id, tipo_documento, archivo_path)

SISTEMA
  notificaciones (id, usuario_id, tipo, mensaje, leida, created_at)
  mensajes_chat (id, remitente_id, destinatario_id, contenido, leido, created_at)
  auditoria (id, tabla, accion, registro_id, datos_anteriores, datos_nuevos, usuario_id, created_at)
```

### RPCs (Stored Procedures) principales
| RPC | Parámetros | Función |
|---|---|---|
| `calcular_dia_ciclo` | operacion_id, fecha | Calcula qué día del ciclo corresponde a una fecha |
| `consolidar_pedidos_servicio` | p_fecha, p_servicio, p_forzar | Consolida todos los pedidos de un día/servicio |
| `get_ingredientes_totales` | p_consolidado_id | Suma ingredientes necesarios con estado de stock |
| `descontar_stock_consolidado` | p_consolidado_id | Descuenta del stock los ingredientes usados |
| `actualizar_stock` | p_stock_id, p_cantidad, p_operacion, p_motivo | Ajuste de stock con auditoría |
| `fn_alerta_pedido_limite` | operacion_id, servicio | Minutos restantes para el límite de pedido |

### Edge Functions (Supabase)
| Función | verify_jwt | Uso |
|---|---|---|
| `employee-register` | false (pública) | Verificar cédula y crear cuenta Auth de empleado |

---

## 14. FLUJOS DE TRABAJO COMPLETOS

### Flujo 1: Configuración inicial de una nueva operación
```
Admin
  1. Crear operación en DB (operaciones table)
  2. Asignar servicios con hora límite (servicios_unidad)
  3. Crear usuario coordinador y asignar operacion_id

Chef
  4. Crear ciclo de menú para la operación
  5. Configurar gramajes BASE por componente
  6. Para cada día del ciclo:
     a. Asignar recetas a cada componente × servicio
     b. Configurar gramajes por tipo de dieta
  7. Activar el ciclo

→ La operación ya puede recibir pedidos
```

### Flujo 2: Operación diaria de pedidos
```
(Cada día, por cada servicio)

Coordinador de Unidad
  1. Abre PedidoServicioForm: Fecha + Servicio
  2. Sistema carga: menú del día + gramajes + hora límite
  3. Ingresa cantidades por tipo de dieta (o por paciente)
  4. Guarda borrador (localStorage)
  5. Antes de hora límite: envía pedido

Supervisor de Producción
  6. Verifica que todos los pedidos estén enviados
  7. Genera consolidado (RPC consolida todos los pedidos)
  8. Revisa ingredientes vs. stock (semáforo)
  9. Si falta stock: sustituye receta (queda auditado)
  10. Aprueba consolidado → va a cocina
  11. Exporta Hoja de Producción (PDF) para cocina
  12. Cuando cocina termina: Marcar como Preparado
      → Stock se descuenta automáticamente
```

### Flujo 3: Proceso de compras
```
Jefe de Planta
  1. Detecta necesidad (stock bajo o proyección)
  2. Crea solicitud de compra con ítems y cantidades
  3. Solicitud en estado PENDIENTE

Auxiliar de Compras
  4. Ve solicitudes PENDIENTE / EN_REVISION
  5. Revisa ítem por ítem: aprueba o rechaza con motivo
  6. Cierra revisión → estado APROBADO_AUXILIAR o RECHAZADO

Jefe de Compras
  7. Ve solicitudes APROBADO_AUXILIAR
  8. Aprueba definitivo → APROBADO_COMPRAS
  9. (Opcional) Rechaza con motivo

Auxiliar de Compras
  10. Realiza la compra con el proveedor
  11. Marca como COMPRADO

Almacenista
  12. Recibe la mercancía física
  13. Registra factura con ítems y cantidades reales
  14. Confirma recepción → FINALIZADO
  15. Stock se actualiza automáticamente (+cantidad)
  16. INSERT movimientos_inventario (tipo='ingreso_factura')
```

---

## 15. FLUJO DE LA INFORMACIÓN

### Información del menú (de la receta al plato servido)
```
arbol_materia_prima (insumo básico: harina, carne, etc.)
    ↓ (receta_ingredientes: cantidad_requerida)
arbol_recetas (receta: "Arroz blanco", rendimiento=100 porciones)
    ↓ (menu_componentes: asignación receta → componente)
componentes_plato (componente: "Cereal/Arroz")
    ↓ (ciclo_dia_servicios: día × servicio)
ciclos_menu (ciclo: "Ciclo Enero - Hospital Alcalá")
    ↓ (calcular_dia_ciclo RPC: ¿qué día del ciclo es HOY?)
pedido_items_servicio (coordinador pide 50 porciones de dieta Normal)
    ↓ (consolidar_pedidos_servicio RPC: suma todos los pedidos)
consolidado_items (total: 340 porciones de Arroz blanco para hoy)
    ↓ (get_ingredientes_totales RPC: cuánta harina necesito)
arbol_materia_prima.stock_actual (verificar stock disponible)
    ↓ (descontar_stock_consolidado RPC: cuando se prepara)
movimientos_inventario (registro permanente del consumo)
```

### Información del gramaje (cómo afecta la cantidad)
```
gramajes_base_componentes
  (operacion_id, componente_id, gramaje_base=150g)
       ↓ sobrescrito por →
gramajes_componente_menu
  (menu_componente_id, tipo_dieta_id='normal', gramaje=150g)
  (menu_componente_id, tipo_dieta_id='hipocalorica', gramaje=100g)
  (menu_componente_id, tipo_dieta_id='pediatrica', gramaje=80g)
       ↓ se aplica en →
pedido_items_servicio.gramaje_aplicado
  (registra qué gramaje se usó al momento del pedido)
       ↓ multiplica por →
consolidado: cantidad_total × gramaje_aplicado = total_gramos_requeridos
       ↓ divide por →
receta_ingredientes.cantidad_requerida / rendimiento × cantidad_total
= total de cada materia prima necesaria
```

### Información del stock (ciclo completo)
```
ENTRADA DE STOCK:
  Factura recibida → factura_items → RPC/trigger → +stock en arbol_materia_prima
  Ajuste manual → ajustes_stock_manual → UPDATE arbol_materia_prima.stock_actual

CONSUMO DE STOCK:
  Consolidado preparado → RPC descontar_stock_consolidado
  → Calcula ingredientes según recetas × cantidades
  → -stock en arbol_materia_prima
  → INSERT movimientos_inventario

ALERTA DE STOCK:
  Semáforo en VistaIngredientes: compara stock_actual vs total_requerido
  Si INSUFICIENTE → rojo, aparece primero en la lista
```

---

## 16. INFRAESTRUCTURA TÉCNICA

### Dependencias clave
| Librería | Versión | Uso |
|---|---|---|
| React | 19.2.0 | UI framework |
| Vite | 7.2.2 | Build tool + HMR |
| @supabase/supabase-js | 2.81.0 | DB + Auth + Storage |
| @tanstack/react-query | 5.90.20 | Server state + cache |
| zustand | 5.0.11 | UI state |
| tailwindcss | 3.4.18 | Styling |
| lucide-react | 0.556.0 | Iconos |
| jspdf + jspdf-autotable | 4.2.0 / 5.0.7 | Generación PDF |
| exceljs | 4.4.0 | Generación Excel |
| recharts | 3.7.0 | Gráficas |
| react-hot-toast + sonner | 2.6.0 / 2.0.7 | Notificaciones toast |

### Module aliases (vite.config.js)
```javascript
'@/'        → 'src/'
'@shared/'  → 'src/shared/'
'@features/'→ 'src/features/'
'@pages/'   → 'src/pages/'
'@widgets/' → 'src/widgets/'
'@app/'     → 'src/app/'
'@assets/'  → 'src/assets/'
```

### Patrones de código
```javascript
// Patrón de servicio (siempre retorna { data, error })
async miServicio(id) {
  const { data, error } = await supabase
    .from('tabla').select('*').eq('id', id).single();
  return { data, error };
}

// Patrón de hook (React Query)
export function useMiDato(id) {
  return useQuery({
    queryKey: ['mi-dato', id],
    queryFn: () => miServicio(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,  // 5 min cache
  });
}

// Patrón de mutación con invalidación
export function useCrearMiDato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos) => crearEnServicio(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mi-dato'] });
    }
  });
}

// Patrón de notificación
notify.success('Operación exitosa');
notify.error('Error: ' + error.message);
notify.warning('Advertencia');
```
