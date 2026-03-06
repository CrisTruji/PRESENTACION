# Documentación Técnica — Healthy SC

Directorio centralizado de documentación técnica del proyecto.

## Estructura

```
docs/
├── README.md               ← Este archivo (índice general)
└── sprints/
    ├── sprint-A-correcciones-tecnicas.md   ✅ Completado (2026-03-05)
    ├── sprint-B-proyeccion-semanal.md      ✅ Completado (2026-03-05)
    ├── sprint-C-modulo-economico.md        ✅ Completado (2026-03-05)
    ├── sprint-D-notificaciones-automaticas.md ✅ Completado (2026-03-05)
    ├── sprint-E-semaforo-operativo.md      ✅ Completado (2026-03-05)
    ├── sprint-F-alerta-hoja-produccion.md  ✅ Completado (2026-03-06)
    ├── sprint-G-ajuste-inventario.md       ✅ Completado (2026-03-06)
    ├── sprint-H-estado-pago-facturas.md    ✅ Completado (2026-03-06)
    ├── sprint-I-flujo-cambio-receta.md     ✅ Completado (2026-03-06)
    └── sprint-J-proyeccion-compras.md      ✅ Completado (2026-03-06)
```

## Sprints

| Sprint | Nombre | Estado | Descripción |
|--------|--------|--------|-------------|
| A | Correcciones Técnicas Críticas | ✅ Completado | Casing router, imports dinámicos, code splitting |
| B | ProyeccionSemanal con Datos Reales | ✅ Completado | columna `capacidad_promedio` + editor admin |
| C | Módulo Económico Completo | ✅ Completado | CostosPorUnidad, CierreCostos, varianza presupuesto |
| D | Notificaciones Automáticas | ✅ Completado | pipeline completo, fn_presupuesto_critico, verificar_pedidos_del_dia |
| E | Semáforo Operativo | ✅ Completado | Widget de estado del día en AdminDashboard |
| F | Alerta Hora Límite + Hoja de Producción | ✅ Completado | Countdown vivo, fn_alerta_pedido_limite, PDF hoja cocina |
| G | Ajustes con Motivo + Historial Movimientos | ✅ Completado | ajustes_stock_manual, motivo obligatorio, drawer historial |
| H | Estado de Pago de Facturas | ✅ Completado | estado_pago, fecha_pago, badge inline, filtro, banner pendientes |
| I | Flujo Completo Cambio de Receta | ✅ Completado | aprobarYSustituir, modal preseleccionado, fn_notif_cambio_receta |
| J | Proyección Automática de Compras | ✅ Completado | calcular_necesidades_compra(), ProyeccionCompras.jsx, CSV export |

## Convenciones

- Cada sprint tiene su propio archivo `.md` en `docs/sprints/`
- Los archivos documentan: problema, archivos modificados, diff del cambio y verificación
- Se registra la fecha de completado y el resultado del build cuando aplica

## Arquitectura General

- **Framework:** React + Vite (Feature-Sliced Design)
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Estado:** Zustand + TanStack React Query
- **Estilos:** Tailwind CSS
- **Roles:** administrador, jefe_de_planta, jefe_de_compras, auxiliar_de_compras,
  almacenista, chef, supervisor_produccion, coordinador_unidad, usuario, nomina

Ver `MEMORY.md` en `.claude/projects/` para más contexto del proyecto.
