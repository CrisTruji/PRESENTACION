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
    ├── sprint-D-notificaciones.md          🔲 Pendiente
    └── sprint-E-semaforo-operativo.md      🔲 Pendiente
```

## Sprints

| Sprint | Nombre | Estado | Descripción |
|--------|--------|--------|-------------|
| A | Correcciones Técnicas Críticas | ✅ Completado | Casing router, imports dinámicos, code splitting |
| B | ProyeccionSemanal con Datos Reales | ✅ Completado | columna `capacidad_promedio` + editor admin |
| C | Módulo Económico Completo | ✅ Completado | CostosPorUnidad, CierreCostos, varianza presupuesto |
| D | Notificaciones Automáticas | 🔲 Pendiente | triggers stock, presupuesto crítico, pedidos del día |
| E | Semáforo Operativo | 🔲 Pendiente | Widget de estado del día en AdminDashboard |

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
