# 🏗️ Plan de Reorganización - Arquitectura Enterprise

## 📋 Objetivo

Reorganizar el proyecto siguiendo **Feature-Sliced Design (FSD)**, una arquitectura escalable y mantenible usada en aplicaciones enterprise.

---

## 🎯 Arquitectura Propuesta: Feature-Based + Domain-Driven

### Estructura Actual (Problemática)

```
src/
├── components/          # ❌ Mezclados sin contexto
│   ├── arbol/
│   ├── recetas/
│   ├── stock/
│   └── auditoria/
├── screens/             # ❌ Organizados por rol (rígido)
│   ├── admin/
│   ├── chef/
│   └── planta/
├── hooks/               # ❌ Todos juntos
├── services/            # ❌ Todos juntos
└── stores/              # ❌ Todos juntos
```

**Problemas:**
- ❌ Difícil encontrar código relacionado
- ❌ Duplicación entre roles
- ❌ Acoplamiento alto
- ❌ Difícil de escalar
- ❌ Testing complejo

---

### Estructura Propuesta (Feature-Sliced Design)

```
src/
├── app/                           # 🎯 Configuración global de la app
│   ├── providers/                 # Providers (React Query, Zustand, Theme)
│   ├── router/                    # Configuración de rutas
│   └── styles/                    # Estilos globales
│
├── features/                      # 🎯 Funcionalidades de negocio
│   ├── auth/                      # Autenticación y autorización
│   │   ├── components/
│   │   │   ├── LoginForm.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── RoleGuard.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── usePermissions.js
│   │   ├── services/
│   │   │   └── authService.js
│   │   ├── store/
│   │   │   └── authStore.js
│   │   └── index.js               # Public API
│   │
│   ├── inventory/                 # Gestión de Inventario (Stock)
│   │   ├── components/
│   │   │   ├── StockManager.jsx
│   │   │   ├── StockManagerVirtualized.jsx
│   │   │   ├── StockTable.jsx
│   │   │   ├── StockFilters.jsx
│   │   │   └── StockUpdateModal.jsx
│   │   ├── hooks/
│   │   │   └── useStock.js
│   │   ├── services/
│   │   │   └── stockService.js
│   │   └── index.js
│   │
│   ├── recipes/                   # Gestión de Recetas
│   │   ├── components/
│   │   │   ├── RecipeEditor.jsx
│   │   │   ├── RecipeList.jsx
│   │   │   ├── IngredientPicker.jsx
│   │   │   └── CostCalculator.jsx
│   │   ├── hooks/
│   │   │   ├── useRecipes.js
│   │   │   └── useCostosAutomaticos.js
│   │   ├── services/
│   │   │   ├── recetasService.js
│   │   │   └── costosAutomaticosService.js
│   │   ├── store/
│   │   │   └── recetasStore.js
│   │   └── index.js
│   │
│   ├── products/                  # Gestión de Productos (Árbol)
│   │   ├── components/
│   │   │   ├── ProductTree.jsx
│   │   │   ├── ProductForm.jsx
│   │   │   └── ProductFilters.jsx
│   │   ├── hooks/
│   │   │   └── useArbolRecetas.js
│   │   ├── services/
│   │   │   ├── arbolRecetasService.js
│   │   │   └── BaseArbolService.js
│   │   ├── store/
│   │   │   └── arbolRecetasStore.js
│   │   └── index.js
│   │
│   ├── presentations/             # Gestión de Presentaciones (Nivel 6)
│   │   ├── components/
│   │   │   ├── PresentacionesManager.jsx
│   │   │   ├── PresentacionesManagerVirtualized.jsx
│   │   │   └── PresentacionModal.jsx
│   │   └── index.js
│   │
│   ├── audit/                     # Auditoría del Sistema
│   │   ├── components/
│   │   │   ├── AuditoriaViewer.jsx
│   │   │   ├── AuditoriaViewerVirtualized.jsx
│   │   │   ├── AuditoriaFilters.jsx
│   │   │   └── AuditoriaDetailModal.jsx
│   │   ├── hooks/
│   │   │   └── useAuditoria.js
│   │   ├── services/
│   │   │   └── auditoriaService.js
│   │   └── index.js
│   │
│   ├── purchases/                 # Gestión de Compras
│   │   ├── components/
│   │   │   ├── PurchaseOrderForm.jsx
│   │   │   ├── SupplierSelector.jsx
│   │   │   └── PurchaseHistory.jsx
│   │   └── index.js
│   │
│   └── dishes/                    # Gestión de Platos
│       ├── components/
│       │   ├── DishManager.jsx
│       │   └── DishForm.jsx
│       └── index.js
│
├── pages/                         # 🎯 Páginas por ROL (composición)
│   ├── admin/                     # Rol: Administrador
│   │   ├── AdminDashboard.jsx
│   │   ├── UserManagement.jsx
│   │   ├── SystemSettings.jsx
│   │   └── index.js
│   │
│   ├── chef/                      # Rol: Chef / Jefe de Cocina
│   │   ├── ChefDashboard.jsx
│   │   ├── RecipeManagement.jsx
│   │   ├── MenuPlanning.jsx
│   │   └── index.js
│   │
│   ├── planta/                    # Rol: Jefe de Planta
│   │   ├── PlantaDashboard.jsx
│   │   ├── ProductionControl.jsx
│   │   ├── InventoryOverview.jsx
│   │   └── index.js
│   │
│   ├── compras/                   # Rol: Compras
│   │   ├── ComprasDashboard.jsx
│   │   ├── PurchaseOrders.jsx
│   │   └── index.js
│   │
│   ├── almacen/                   # Rol: Almacén
│   │   ├── AlmacenDashboard.jsx
│   │   ├── StockControl.jsx
│   │   └── index.js
│   │
│   └── public/                    # Páginas públicas
│       ├── LoginPage.jsx
│       ├── NotFoundPage.jsx
│       └── UnauthorizedPage.jsx
│
├── widgets/                       # 🎯 Componentes complejos de UI
│   ├── Navbar/
│   │   ├── Navbar.jsx
│   │   ├── NavItem.jsx
│   │   └── UserMenu.jsx
│   │
│   ├── Sidebar/
│   │   ├── Sidebar.jsx
│   │   └── SidebarMenu.jsx
│   │
│   └── Dashboard/
│       ├── DashboardLayout.jsx
│       ├── StatsCard.jsx
│       └── ChartWidget.jsx
│
├── shared/                        # 🎯 Código compartido
│   ├── ui/                        # Componentes UI genéricos
│   │   ├── Button/
│   │   │   ├── Button.jsx
│   │   │   ├── Button.test.jsx
│   │   │   └── index.js
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Table/
│   │   ├── VirtualizedTable/     # Componente de virtualización
│   │   ├── Badge/
│   │   └── Card/
│   │
│   ├── hooks/                     # Hooks genéricos
│   │   ├── useDebounce.js
│   │   ├── useLocalStorage.js
│   │   └── useMediaQuery.js
│   │
│   ├── utils/                     # Utilidades
│   │   ├── formatters.js
│   │   ├── validators.js
│   │   └── constants.js
│   │
│   ├── api/                       # Cliente API base
│   │   ├── supabase.js
│   │   └── queryClient.js
│   │
│   └── types/                     # TypeScript types (futuro)
│       └── common.types.ts
│
├── assets/                        # 🎯 Recursos estáticos
│   ├── images/
│   ├── icons/
│   └── fonts/
│
└── tests/                         # 🎯 Tests organizados
    ├── unit/                      # Tests unitarios
    │   ├── services/
    │   ├── hooks/
    │   └── utils/
    │
    ├── integration/               # Tests de integración
    │   └── features/
    │
    └── e2e/                       # Tests end-to-end (futuro)
        └── scenarios/
```

---

## 🔑 Conceptos Clave

### 1. **Features (Funcionalidades)**

Cada feature es **autónomo** y contiene todo lo necesario para funcionar:

```
features/inventory/
├── components/     # UI específica de inventory
├── hooks/          # Lógica de negocio de inventory
├── services/       # API calls de inventory
├── store/          # Estado global de inventory (si aplica)
└── index.js        # Public API - solo exporta lo necesario
```

**Beneficios:**
- ✅ Todo el código relacionado está junto
- ✅ Fácil de encontrar y modificar
- ✅ Se puede eliminar/mover sin romper otras features
- ✅ Testing aislado

### 2. **Pages (Páginas por Rol)**

Las páginas **componen features** según el rol:

```jsx
// pages/admin/AdminDashboard.jsx
import { AuditoriaViewer } from '@/features/audit';
import { StockManager } from '@/features/inventory';
import { UserManagement } from '@/features/auth';

export function AdminDashboard() {
  return (
    <DashboardLayout>
      <StatsCard />
      <AuditoriaViewer />
      <StockManager />
    </DashboardLayout>
  );
}
```

**Beneficios:**
- ✅ Cada rol tiene su propia página
- ✅ Reutiliza features
- ✅ Sin duplicación de lógica

### 3. **Shared (Compartido)**

Código **reutilizable** entre features:

- `shared/ui/` - Componentes visuales genéricos (Button, Modal, Table)
- `shared/hooks/` - Hooks genéricos (useDebounce, useLocalStorage)
- `shared/utils/` - Utilidades (formatters, validators)
- `shared/api/` - Cliente de API base (Supabase, React Query)

**Regla:** Si un componente se usa en 2+ features → moverlo a `shared/`

### 4. **Public API (index.js)**

Cada feature expone **solo lo necesario**:

```js
// features/inventory/index.js
export { StockManager } from './components/StockManager';
export { useStock } from './hooks/useStock';
// No exporta: StockTable, StockFilters (internos)
```

**Beneficios:**
- ✅ Encapsulación
- ✅ Control de dependencias
- ✅ Refactoring interno sin romper otros módulos

---

## 📦 Patrón de Importación

### Imports Absolutos con Alias

```js
// ❌ ANTES: Imports relativos caóticos
import { StockManager } from '../../../components/stock/StockManager';
import { useStock } from '../../../hooks/useStock';
import { Button } from '../../../components/common/Button';

// ✅ DESPUÉS: Imports absolutos claros
import { StockManager, useStock } from '@/features/inventory';
import { Button } from '@/shared/ui';
```

**Configuración en vite.config.js:**
```js
resolve: {
  alias: {
    '@': '/src',
    '@features': '/src/features',
    '@shared': '/src/shared',
    '@pages': '/src/pages',
    '@app': '/src/app',
  }
}
```

---

## 🔄 Plan de Migración (Paso a Paso)

### Fase 1: Preparación (1 día)

1. ✅ Crear estructura de carpetas nueva
2. ✅ Configurar alias en vite.config.js
3. ✅ Crear index.js en cada feature con Public API
4. ✅ Documentar arquitectura

### Fase 2: Migrar Shared (1 día)

1. Mover componentes comunes a `shared/ui/`
   - VirtualizedTable → `shared/ui/VirtualizedTable/`
   - Otros componentes reutilizables

2. Mover hooks genéricos a `shared/hooks/`
   - (Si existen hooks genéricos)

3. Mover utils a `shared/utils/`

4. Mover API base a `shared/api/`
   - supabase.js
   - queryClient.js

### Fase 3: Migrar Features (3 días)

**Orden sugerido:**

1. **auth** (Autenticación) - Base para todo
   - Mover login, AuthContext, authService
   - Crear ProtectedRoute, RoleGuard

2. **inventory** (Stock)
   - Mover StockManager, useStock, stockService

3. **audit** (Auditoría)
   - Mover AuditoriaViewer, useAuditoria, auditoriaService

4. **recipes** (Recetas)
   - Mover RecipeEditor, useRecipes, recetasService

5. **products** (Árbol de productos)
   - Mover ProductTree, useArbolRecetas, arbolRecetasService

6. **presentations** (Presentaciones)
   - Mover PresentacionesManager

### Fase 4: Crear Pages por Rol (1 día)

1. Crear página para cada rol:
   - `pages/admin/AdminDashboard.jsx`
   - `pages/chef/ChefDashboard.jsx`
   - `pages/planta/PlantaDashboard.jsx`
   - etc.

2. Cada página compone features según permisos del rol

### Fase 5: Actualizar Router (1 día)

1. Actualizar rutas para usar nuevas páginas
2. Eliminar carpetas antiguas vacías
3. Verificar que todo funciona

### Fase 6: Tests (1 día)

1. Actualizar imports en tests
2. Reorganizar tests según nueva estructura
3. Verificar que todos los tests pasan

---

## 🎨 Ejemplo Completo: Feature Inventory

### Estructura

```
features/inventory/
├── components/
│   ├── StockManager.jsx               # Componente principal
│   ├── StockManagerVirtualized.jsx    # Versión optimizada
│   ├── StockTable.jsx                 # Tabla (interna)
│   ├── StockFilters.jsx               # Filtros (interna)
│   └── StockUpdateModal.jsx           # Modal (interna)
├── hooks/
│   └── useStock.js                    # Lógica de negocio
├── services/
│   └── stockService.js                # API calls
├── __tests__/
│   ├── StockManager.test.jsx
│   └── useStock.test.jsx
└── index.js                            # Public API
```

### index.js (Public API)

```js
// features/inventory/index.js

// ✅ Exportar solo lo público
export { StockManager } from './components/StockManager';
export { StockManagerVirtualized } from './components/StockManagerVirtualized';
export { useStock, useStockBajo, useActualizarStock } from './hooks/useStock';

// ❌ NO exportar componentes internos:
// - StockTable
// - StockFilters
// - StockUpdateModal
```

### Uso desde Páginas

```jsx
// pages/admin/AdminDashboard.jsx
import { StockManagerVirtualized } from '@/features/inventory';
import { AuditoriaViewer } from '@/features/audit';
import { DashboardLayout } from '@/widgets/Dashboard';

export function AdminDashboard() {
  return (
    <DashboardLayout>
      <h1>Dashboard de Administrador</h1>
      <StockManagerVirtualized />
      <AuditoriaViewer />
    </DashboardLayout>
  );
}
```

```jsx
// pages/almacen/AlmacenDashboard.jsx
import { StockManager } from '@/features/inventory';
import { DashboardLayout } from '@/widgets/Dashboard';

export function AlmacenDashboard() {
  return (
    <DashboardLayout>
      <h1>Dashboard de Almacén</h1>
      <StockManager />
      {/* Sin auditoría - no tiene permisos */}
    </DashboardLayout>
  );
}
```

---

## ✅ Beneficios de la Nueva Arquitectura

### 1. **Escalabilidad**
- ✅ Agregar nuevas features sin afectar existentes
- ✅ Equipos pueden trabajar en paralelo en diferentes features
- ✅ Código crece sin volverse caótico

### 2. **Mantenibilidad**
- ✅ Todo el código relacionado está junto
- ✅ Fácil encontrar y modificar código
- ✅ Refactoring seguro (cambios internos no afectan external)

### 3. **Testing**
- ✅ Tests aislados por feature
- ✅ Mocks más simples
- ✅ Coverage más claro

### 4. **Reusabilidad**
- ✅ Features se pueden reutilizar entre roles
- ✅ Sin duplicación de lógica
- ✅ Componentes shared claros

### 5. **Onboarding**
- ✅ Nuevos desarrolladores entienden rápido
- ✅ Estructura predecible
- ✅ Documentación clara

---

## 📊 Comparativa: Antes vs Después

### Caso de Uso: Agregar filtro de fecha en Auditoría

**ANTES:**
```
❌ Buscar en components/auditoria/
❌ Buscar en hooks/ (¿cuál es el hook?)
❌ Buscar en services/ (¿cuál es el service?)
❌ Actualizar 3 archivos en 3 carpetas diferentes
❌ Buscar tests en tests/ (¿dónde están?)
```

**DESPUÉS:**
```
✅ Ir a features/audit/
✅ Todo está ahí: components, hooks, services, tests
✅ Actualizar archivos relacionados
✅ Tests en la misma carpeta
✅ Listo en minutos
```

---

## 🚀 Próximos Pasos

1. **Revisar y aprobar** este plan
2. **Ejecutar Fase 1** (crear estructura)
3. **Migrar incrementalmente** (features uno por uno)
4. **Actualizar tests** conforme migramos
5. **Documentar aprendizajes**

---

## 📚 Referencias

### Arquitecturas Similares Usadas en la Industria

1. **Feature-Sliced Design** - https://feature-sliced.design/
   - Usado por: Yandex, GitLab

2. **Domain-Driven Design (DDD)** - Eric Evans
   - Usado por: Netflix, Uber

3. **Atomic Design** - Brad Frost
   - Usado por: Airbnb, Shopify

4. **Clean Architecture** - Robert C. Martin
   - Usado por: Google, Microsoft

### Empresas que usan Feature-Based

- **Airbnb** - Feature folders
- **Netflix** - Domain-driven modules
- **Uber** - Micro-frontends by feature
- **Spotify** - Feature teams architecture

---

**Autor:** Claude Sonnet 4.5
**Fecha:** Febrero 2026
**Versión:** 1.0
**Estado:** 📋 Pendiente de Aprobación
