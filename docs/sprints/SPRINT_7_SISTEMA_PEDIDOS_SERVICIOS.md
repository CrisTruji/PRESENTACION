# SPRINT 7 - SISTEMA DE PEDIDOS DE SERVICIOS DE ALIMENTACION (V2)

**Fecha:** 2026-02-17
**Estado:** COMPLETADO
**Fase:** DESARROLLO

---

## Resumen Ejecutivo

Sprint 7 implementa el sistema completo de gestion de ciclos de menu, pedidos de servicio por unidad y consolidado de produccion para el supervisor. Incluye 17 nuevas tablas en la base de datos, 2 features completas siguiendo FSD, 3 nuevos roles y la integracion con el router/navbar existente.

### Logros Principales
- 17 tablas nuevas en PostgreSQL (migracion ejecutada exitosamente)
- 2 RPCs (calcular_dia_ciclo, consolidar_pedidos_servicio)
- Feature `menu-cycles`: 4 services + 5 hooks + 1 store + 10 componentes UI
- Feature `food-orders`: 3 services + 4 hooks + 2 stores + 11 componentes UI
- 3 nuevos roles integrados: chef, supervisor_produccion, coordinador_unidad
- Shared types y hooks reutilizables
- Build exitoso sin errores

---

## Objetivos Completados

### 1. Base de Datos (SQL Migration)
**Archivo:** `sql/migration_v2_pedidos_servicios.sql`

17 tablas creadas:
- `tipos_dieta` - 19 tipos del Manual Keralty (C1-C4, CE, AD, LQ, LT, S1, S2, SM, BL, NR, HG, HP, BR, RF, VE, etc.)
- `componentes_plato` - 11 componentes dinamicos (Sopa, Proteina, Farinaceo, Verdura, etc.)
- `operaciones` - 11 operaciones (Coordinadora, Carval, Presentes, IDIME, Red Humana, etc.)
- `servicios_unidad` - Servicios habilitados por operacion con hora limite
- `ciclos_menu` - Ciclos de menu (5-21 dias)
- `ciclo_dia_servicios` - Dia x Servicio de cada ciclo
- `menu_componentes` - Componente asignado a un dia/servicio con receta
- `menu_gramajes` - Gramaje por tipo de dieta para cada componente
- `pedidos_servicio` - Pedido diario de cada unidad
- `pedido_items_servicio` - Cantidades por tipo de dieta (nombre evita conflicto con `pedido_items` existente)
- `pedido_pacientes` - Lista de pacientes (solo Alcala/Presentes)
- `consolidado_produccion` - Consolidado diario del supervisor
- `consolidado_items` - Items consolidados por receta
- `cambios_receta_consolidado` - Log de sustituciones de receta
- `solicitudes_cambio_menu` - Solicitudes de cambio de unidad al supervisor

Ademas:
- ALTER a `arbol_recetas`: campos `es_local` y `tipo_local` para recetas locales
- ALTER a `profiles`: nuevos roles en el check constraint
- 2 RPCs: `calcular_dia_ciclo` (calcula que dia del ciclo corresponde a una fecha) y `consolidar_pedidos_servicio` (genera consolidado sumando pedidos)
- Indices para performance en queries frecuentes
- RLS policies para todas las tablas
- Seed data: 19 tipos dieta, 11 componentes, 11 operaciones, 3 roles

### 2. Feature: menu-cycles (Gestion de Ciclos de Menu)

**Ubicacion:** `src/features/menu-cycles/`

Flujo: El Chef configura ciclos de menu para cada operacion. Cada ciclo tiene N dias, cada dia tiene servicios (desayuno, media manana, almuerzo, onces, cena, refrigerio nocturno), y cada servicio tiene componentes (platos) con recetas asignadas.

#### Services (4 archivos)
| Archivo | Funciones |
|---------|-----------|
| `catalogosService.js` | getTiposDieta, getTiposDietaPorCategoria, getComponentesPlato, crearComponente |
| `operacionesService.js` | getAll, getById, getConCicloActivo (deep fetch con progreso) |
| `ciclosService.js` | getCiclosActivos, getCicloCompleto, crearCiclo (auto-genera dias x servicios), activarCiclo, copiarDia, marcarDiaCompleto |
| `menuComponentesService.js` | getComponentesDia, asignarComponente, guardarGramajes, crearRecetaLocal, buscarRecetas |

#### Hooks (5 archivos)
| Archivo | Hooks exportados |
|---------|-----------------|
| `useTiposDieta.js` | useTiposDieta, useTiposDietaPorCategoria |
| `useComponentesPlato.js` | useComponentesPlato, useCrearComponente |
| `useOperaciones.js` | useOperaciones, useOperacionesConCiclo, useOperacion, useCrearOperacion |
| `useCiclos.js` | useCiclosActivos, useCicloCompleto, useProgresoCiclo, useDiaServicios, useCrearCiclo, useActivarCiclo, useCopiarDia, useMarcarDiaCompleto |
| `useMenuComponentes.js` | useComponentesDia, useAsignarComponente, useEliminarComponente, useGramajes, useGuardarGramajes, useCrearRecetaLocal, useBuscarRecetas, useRecetaConIngredientes |

#### Store
| Archivo | Proposito |
|---------|-----------|
| `useCicloEditorStore.js` | Estado UI del editor: ciclo/dia/servicio/componente seleccionados, panel activo, modales |

#### Componentes UI (10 archivos)
| Componente | Descripcion |
|------------|-------------|
| `ChefDashboard.jsx` | Dashboard principal: lista operaciones con progreso, stats cards, acceso a editor |
| `CicloEditor.jsx` | Layout master 3 paneles: calendario + tabs (menu/gramajes/ingredientes) |
| `PanelCalendario.jsx` | Grid de dias + selector de servicio + navegacion dia anterior/siguiente |
| `PanelGramajes.jsx` | Tabla dietas x gramajes con edicion inline, % modificacion, excluir |
| `PanelIngredientes.jsx` | Lista read-only de ingredientes de receta con boton "Crear Variante Local" |
| `ComponenteSlot.jsx` | Card individual de un plato en el menu con acciones (gramajes, ingredientes, eliminar) |
| `MiniCalendario.jsx` | Vista thumbnail de todos los dias del ciclo con indicador de completado |
| `ProgressBar.jsx` | Barra de progreso reutilizable con dias completos/totales |
| `SelectorReceta.jsx` | Modal buscador de recetas con debounce y preview |
| `ModalRecetaLocal.jsx` | Modal para crear variante local: edita cantidades de ingredientes, muestra % cambio |

### 3. Feature: food-orders (Pedidos y Consolidado)

**Ubicacion:** `src/features/food-orders/`

Flujo: Las unidades (coordinador_unidad) realizan pedidos diarios indicando cantidades por tipo de dieta (o lista de pacientes para Alcala/Presentes). El supervisor consolida todos los pedidos, verifica stock, puede sustituir recetas y aprueba para cocina.

#### Services (3 archivos)
| Archivo | Funciones |
|---------|-----------|
| `pedidosService.js` | getPedidoDelDia, crearPedido (llama RPC calcular_dia_ciclo), enviarPedido (valida hora limite), guardarItems, guardarPacientes, getMenuDelDia |
| `solicitudesCambioService.js` | getPendientes, getPorPedido, crear, aprobar, rechazar |
| `consolidadoService.js` | consolidar (llama RPC), getConsolidadoPorFecha, getVistaRecetas, getIngredientesTotales (calcula stock), sustituirReceta, aprobarConsolidado, marcarPreparado |

#### Hooks (4 archivos)
| Archivo | Hooks exportados |
|---------|-----------------|
| `usePedidos.js` | usePedidoDelDia, usePedidosPorFecha, useMenuDelDia, useCrearPedido, useEnviarPedido, useGuardarItems |
| `usePedidoPacientes.js` | useGuardarPacientes |
| `useSolicitudesCambio.js` | useSolicitudesPendientes, useSolicitudesPorPedido, useCrearSolicitudCambio, useAprobarSolicitud, useRechazarSolicitud |
| `useConsolidado.js` | useConsolidadoPorFecha, useConsolidado, useVistaRecetas, useIngredientesTotales, useCambiosRealizados, useConsolidar, useSustituirReceta, useAprobarConsolidado, useMarcarPreparado |

#### Stores (2 archivos)
| Archivo | Proposito |
|---------|-----------|
| `usePedidoStore.js` | Estado UI del formulario pedido: operacion, fecha, servicio, items, pacientes, hora limite |
| `useConsolidadoStore.js` | Estado UI del consolidado: vista activa, filtros, alertas stock, sustitucion en curso |

#### Componentes UI (11 archivos)
| Componente | Descripcion |
|------------|-------------|
| `PedidoServicioForm.jsx` | Pagina principal del pedido: selectores + alerta hora limite + menu lateral + formulario |
| `PedidoDietas.jsx` | Grid de cantidades por tipo de dieta (modo sin_pacientes) |
| `PedidoPacientes.jsx` | Formulario lista de pacientes con datos (modo con_pacientes: Alcala/Presentes) |
| `MenuDelDia.jsx` | Vista read-only del menu del dia con componentes y recetas |
| `SolicitudCambioModal.jsx` | Modal para solicitar cambio de receta con motivo y sugerencia |
| `ConsolidadoSupervisor.jsx` | Dashboard supervisor: filtros + stats + 3 tabs + acciones aprobar/preparar |
| `VistaRecetas.jsx` | Tab consolidado por receta: expandible con desglose dietas/unidades |
| `VistaUnidades.jsx` | Tab consolidado por unidad: tabla de pedidos con estado y hora |
| `VistaIngredientes.jsx` | Tab ingredientes totales: tabla + alertas stock insuficiente |
| `AlertaStock.jsx` | Componente alerta inline para ingredientes con stock insuficiente |
| `CambioRecetaPanel.jsx` | Panel de solicitudes de cambio pendientes: aprobar/rechazar con respuesta |

### 4. Shared (Types y Hooks reutilizables)

| Archivo | Contenido |
|---------|-----------|
| `src/shared/types/menu.js` | Constantes: SERVICIOS (6), ESTADOS_* (4 enums), ETIQUETAS_*, COLORES_*, CATEGORIAS_DIETA, OPERACIONES_CON_PACIENTES |
| `src/shared/hooks/useUnidades.js` | useUnidadesMedicas() - Hook compartido para fetch unidades_medicas activas |

### 5. Integracion con Sistema Existente

#### Router (`src/router/rolerouter.jsx`)
- 3 imports nuevos: ChefDashboard, PedidoServicioForm, ConsolidadoSupervisor
- 3 nuevos default screens: chef -> chef_dashboard, supervisor_produccion -> consolidado_supervisor, coordinador_unidad -> pedido_servicio
- 3 nuevos cases en renderInternalScreen: chef_dashboard, pedido_servicio, consolidado_supervisor

#### Navbar (`src/components/navbar.jsx`)
- 3 iconos SVG nuevos: menu, order, consolidado
- 3 nuevos arrays de tabs para roles: chef, supervisor_produccion, coordinador_unidad
- 2 tabs adicionales en administrador: "Ciclos de Menu", "Consolidado"

#### Permisos (`src/lib/permissions.js`)
- 6 nuevas acciones: gestionar_ciclos_menu, crear_pedido_servicio, consolidar_pedidos, aprobar_consolidado, sustituir_receta, aprobar_cambio_menu

---

## Decisiones Tecnicas

### Nombrar `pedido_items_servicio` (no `pedido_items`)
La tabla existente `pedido_items` se usa para items de ordenes de compra. Para evitar conflictos, la nueva tabla de items por dieta se llama `pedido_items_servicio`.

### FK a `arbol_recetas` usa BIGINT (no UUID)
El campo `arbol_recetas.id` existente es `bigserial` (BIGINT). Todas las foreign keys nuevas que apuntan a arbol_recetas usan BIGINT para consistencia.

### Recetas locales via `arbol_recetas`
En lugar de crear una tabla separada `recetas_locales`, se reutiliza `arbol_recetas` con campos `es_local` y `tipo_local`. El `parent_id` existente vincula la variante local a la receta estandar.

### Componentes dinamicos via tabla `componentes_plato`
En lugar de hardcodear los 11 componentes (Sopa, Proteina, etc.), se usa una tabla BD para flexibilidad futura.

### Servicios como VARCHAR
Los servicios (desayuno, almuerzo, etc.) se almacenan como VARCHAR en `ciclo_dia_servicios.servicio`, no como FK a otra tabla. Esto simplifica queries y es suficiente dado que los servicios son fijos del dominio.

---

## Archivos Creados (50 archivos nuevos)

### SQL (1)
- `sql/migration_v2_pedidos_servicios.sql`

### Shared (2)
- `src/shared/types/menu.js`
- `src/shared/hooks/useUnidades.js`

### Feature: menu-cycles (20)
- `src/features/menu-cycles/services/catalogosService.js`
- `src/features/menu-cycles/services/operacionesService.js`
- `src/features/menu-cycles/services/ciclosService.js`
- `src/features/menu-cycles/services/menuComponentesService.js`
- `src/features/menu-cycles/hooks/useTiposDieta.js`
- `src/features/menu-cycles/hooks/useComponentesPlato.js`
- `src/features/menu-cycles/hooks/useOperaciones.js`
- `src/features/menu-cycles/hooks/useCiclos.js`
- `src/features/menu-cycles/hooks/useMenuComponentes.js`
- `src/features/menu-cycles/store/useCicloEditorStore.js`
- `src/features/menu-cycles/components/ChefDashboard.jsx`
- `src/features/menu-cycles/components/CicloEditor.jsx`
- `src/features/menu-cycles/components/PanelCalendario.jsx`
- `src/features/menu-cycles/components/PanelGramajes.jsx`
- `src/features/menu-cycles/components/PanelIngredientes.jsx`
- `src/features/menu-cycles/components/ComponenteSlot.jsx`
- `src/features/menu-cycles/components/MiniCalendario.jsx`
- `src/features/menu-cycles/components/ProgressBar.jsx`
- `src/features/menu-cycles/components/SelectorReceta.jsx`
- `src/features/menu-cycles/components/ModalRecetaLocal.jsx`
- `src/features/menu-cycles/index.js`

### Feature: food-orders (21)
- `src/features/food-orders/services/pedidosService.js`
- `src/features/food-orders/services/solicitudesCambioService.js`
- `src/features/food-orders/services/consolidadoService.js`
- `src/features/food-orders/hooks/usePedidos.js`
- `src/features/food-orders/hooks/usePedidoPacientes.js`
- `src/features/food-orders/hooks/useSolicitudesCambio.js`
- `src/features/food-orders/hooks/useConsolidado.js`
- `src/features/food-orders/store/usePedidoStore.js`
- `src/features/food-orders/store/useConsolidadoStore.js`
- `src/features/food-orders/components/PedidoServicioForm.jsx`
- `src/features/food-orders/components/PedidoDietas.jsx`
- `src/features/food-orders/components/PedidoPacientes.jsx`
- `src/features/food-orders/components/MenuDelDia.jsx`
- `src/features/food-orders/components/SolicitudCambioModal.jsx`
- `src/features/food-orders/components/ConsolidadoSupervisor.jsx`
- `src/features/food-orders/components/VistaRecetas.jsx`
- `src/features/food-orders/components/VistaUnidades.jsx`
- `src/features/food-orders/components/VistaIngredientes.jsx`
- `src/features/food-orders/components/AlertaStock.jsx`
- `src/features/food-orders/components/CambioRecetaPanel.jsx`
- `src/features/food-orders/index.js`

## Archivos Modificados (3)

- `src/router/rolerouter.jsx` - Imports + 3 roles default + 3 cases
- `src/components/navbar.jsx` - 3 iconos + 3 roles tabs + 2 admin tabs
- `src/lib/permissions.js` - 6 nuevas acciones

---

## Estado de Compilacion

Build exitoso sin errores:
```
vite v7.2.2 building client environment for production...
1913 modules transformed.
Built in 15.76s
```

---

## Proximos Pasos Sugeridos

1. **Asignar roles en Supabase** - Crear usuarios con roles chef, supervisor_produccion, coordinador_unidad en la tabla profiles
2. **Testing funcional** - Probar cada flujo end-to-end: crear ciclo, configurar menu, hacer pedido, consolidar
3. **Generacion PDF** - Implementar generacion de PDF del consolidado para cocina
4. **Notificaciones** - Alertas en tiempo real cuando se reciben pedidos o se detecta stock bajo
5. **Ajuste visual** - Refinar UI segun feedback del usuario en cada pantalla
