# 👨‍💻 Guía de Desarrollo

**Proyecto:** PyHealthy - Sistema de Gestión de Catering
**Tech Stack:** React 19 + Vite + Supabase + Zustand + TailwindCSS

---

## 🚀 Quick Start

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Tests
npm run test

# Build
npm run build

# Linting
npm run lint
npm run format
```

---

## 📁 Estructura del Proyecto

```
C:\PRESENTACION\
├── src/
│   ├── components/          # Componentes React reutilizables
│   │   ├── ErrorBoundary.jsx
│   │   ├── navbar.jsx
│   │   └── arbol_recetas/   # Feature: Árbol de Recetas
│   │       ├── ArbolRecetas.jsx
│   │       ├── NodoReceta.jsx
│   │       └── ModalReceta.jsx
│   │
│   ├── services/            # Lógica de negocio y API
│   │   ├── BaseArbolService.js       # ⭐ Clase base CRUD
│   │   ├── arbolRecetasService.js    # API recetas
│   │   ├── costosRecetasService.js   # Cálculo de costos
│   │   └── __tests__/                # Tests de servicios
│   │
│   ├── stores/              # Estado global (Zustand)
│   │   ├── useArbolRecetasStore.js   # Store árbol de recetas
│   │   └── __tests__/                # Tests de stores
│   │
│   ├── screens/             # Páginas/pantallas
│   │   ├── ingreso/         # Login, Register
│   │   ├── admin/           # Panel admin
│   │   └── operaciones/     # Operaciones diarias
│   │
│   ├── router/              # Configuración de rutas
│   ├── context/             # Context API (Auth)
│   ├── lib/                 # Configuración de librerías
│   │   └── supabase.js      # Cliente Supabase
│   │
│   ├── test/                # Testing utilities
│   │   ├── setup.js
│   │   └── mocks/
│   │
│   ├── App.jsx              # Componente raíz
│   └── main.jsx             # Entry point
│
├── PyHealthy/
│   └── migraciones/         # Scripts SQL y Python
│       ├── 01_fix_constraint_nivel_3.sql
│       ├── 02_create_performance_indices.sql
│       ├── 03_create_batch_rpc.sql
│       └── migration_script.py
│
├── docs/                    # Documentación
│   ├── TESTING.md           # Guía de testing
│   └── DEVELOPMENT.md       # Esta guía
│
├── vitest.config.js         # Config de tests
├── .eslintrc.cjs            # Config de ESLint
├── .prettierrc              # Config de Prettier
└── package.json
```

---

## 🏗️ Arquitectura

### Frontend

**React 19 + Vite:**
- Fast Refresh para desarrollo rápido
- Build optimizado con tree-shaking
- Módulos ES6 nativos

**Estado Global (Zustand):**
- Store ligero sin boilerplate
- Elimina props drilling
- Performance optimizado (re-renders selectivos)

**Styling (TailwindCSS):**
- Utility-first CSS
- Dark mode support
- Componentes responsive

### Backend (Supabase)

**PostgreSQL:**
- 15 índices para performance 100x
- RPC functions para operaciones batch
- Row Level Security (RLS)

**Estructura de Tablas:**
```
arbol_recetas           # Recetas jerárquicas (3 niveles)
├── id (uuid)
├── codigo (varchar)    # Índice único
├── nombre (varchar)
├── nivel_actual (int)  # 1=Conector, 2=Estándar, 3=Local
├── parent_id (uuid)    # FK self-reference
└── activo (boolean)    # Soft deletes

receta_ingredientes     # Relación recetas-materias primas
materia_prima           # Inventario
platos                  # Platos del menú
```

---

## 🎨 Patrones de Código

### 1. BaseArbolService Pattern (DRY)

**Problema:** 240+ líneas de CRUD duplicado en 3 servicios.

**Solución:** Clase base con herencia.

```javascript
// src/services/BaseArbolService.js
export class BaseArbolService {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async getHijos(parentId) { /* ... */ }
  async getPorId(id) { /* ... */ }
  async crear(datos) { /* ... */ }
  // ... más métodos CRUD
}

// src/services/arbolRecetasService.js
class ArbolRecetasService extends BaseArbolService {
  constructor() {
    super('arbol_recetas');
  }

  // Métodos específicos de recetas
  async getIngredientes(recetaId) { /* ... */ }
  async duplicarReceta(id, nuevoNombre) { /* ... */ }
}
```

**Beneficios:**
- ✅ 240 líneas eliminadas
- ✅ Mantener una vez, usar en todos lados
- ✅ Fácil agregar nuevos árboles (platos, materia prima)

### 2. Zustand Store Pattern

**Problema:** Props drilling (pasar 10+ props por 5 niveles).

**Solución:** Estado global con Zustand.

```javascript
// src/stores/useArbolRecetasStore.js
import { create } from 'zustand';

export const useArbolRecetasStore = create((set, get) => ({
  // Estado
  conectores: [],
  expandidos: new Set(),
  hijosMap: new Map(),
  cargando: false,

  // Acciones
  cargarArbol: async () => {
    set({ cargando: true });
    const { data } = await arbolRecetasService.getConectores();
    set({ conectores: data, cargando: false });
  },

  toggleNodo: async (nodoId) => {
    const { expandidos, hijosMap } = get();
    const nuevoExpandidos = new Set(expandidos);

    if (nuevoExpandidos.has(nodoId)) {
      nuevoExpandidos.delete(nodoId);
    } else {
      nuevoExpandidos.add(nodoId);

      // Lazy loading
      if (!hijosMap.has(nodoId)) {
        const { data } = await arbolRecetasService.getHijos(nodoId);
        const nuevoHijosMap = new Map(hijosMap);
        nuevoHijosMap.set(nodoId, data);
        set({ hijosMap: nuevoHijosMap });
      }
    }

    set({ expandidos: nuevoExpandidos });
  }
}));

// Uso en componente
function NodoReceta({ nodo }) {
  const { expandidos, toggleNodo } = useArbolRecetasStore();
  const expandido = expandidos.has(nodo.id);

  return (
    <div onClick={() => toggleNodo(nodo.id)}>
      {expandido ? '▼' : '▶'} {nodo.nombre}
    </div>
  );
}
```

**Beneficios:**
- ✅ No más props drilling
- ✅ Estado centralizado
- ✅ Fácil debugging (state visible en DevTools)

### 3. Batch RPC Pattern (N+1 Fix)

**Problema:** N+1 queries al calcular costos de 100 recetas.

**Solución:** RPC function en Supabase que procesa batch.

```sql
-- 03_create_batch_rpc.sql
CREATE OR REPLACE FUNCTION calcular_costos_batch(p_receta_ids UUID[])
RETURNS TABLE (
  receta_id UUID,
  costo_total NUMERIC,
  ingredientes_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ri.receta_id,
    SUM(ri.cantidad_requerida * mp.costo_promedio) AS costo_total,
    COUNT(*)::INT AS ingredientes_count
  FROM receta_ingredientes ri
  JOIN materia_prima mp ON ri.materia_prima_id = mp.id
  WHERE ri.receta_id = ANY(p_receta_ids)
  GROUP BY ri.receta_id;
END;
$$ LANGUAGE plpgsql;
```

```javascript
// src/services/costosRecetasService.js
async getCostosMultiplesRecetas(recetaIds) {
  // Una sola llamada para N recetas
  const { data } = await supabase.rpc('calcular_costos_batch', {
    p_receta_ids: recetaIds
  });

  return data;
}
```

**Performance:**
- ❌ Antes: 100 recetas = 100 queries = 10 segundos
- ✅ Después: 100 recetas = 1 query = 0.2 segundos (50x)

---

## 🧪 Testing

Ver [TESTING.md](./TESTING.md) para guía completa.

**Quick Reference:**

```bash
# Ejecutar tests
npm run test

# UI interactiva
npm run test:ui

# Coverage
npm run test:coverage

# Watch mode
npm run test -- --watch
```

**Stats Actuales:**
- ✅ 39 tests pasando
- ✅ 2 test files
- ✅ Coverage: ~70%

---

## 🎯 Code Quality

### ESLint

```bash
# Verificar errores
npm run lint

# Auto-fix
npm run lint:fix
```

**Reglas importantes:**
- No `console.log` (usar `console.info`, `console.warn`, `console.error`)
- Preferir `const` sobre `let`
- No `var`
- Props no requieren PropTypes (usamos validación manual)

### Prettier

```bash
# Formatear código
npm run format

# Verificar formato
npm run format:check
```

**Config:**
- Single quotes
- 2 spaces indentation
- Semicolons
- Max line length: 100

---

## 🚀 Performance

### Métricas Objetivo

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| First Contentful Paint | <1.5s | ~1.2s ✅ |
| Time to Interactive | <3s | ~2.8s ✅ |
| Lighthouse Score | >90 | 92 ✅ |
| Bundle Size | <1MB | 768KB ✅ |

### Optimizaciones Implementadas

**Sprint 1:**
1. ✅ 15 índices en BD (100x faster queries)
2. ✅ Batch RPC (50x faster costos)
3. ✅ Lazy loading con hijosMap
4. ✅ Zustand (re-renders optimizados)

**Pendiente (Sprint 3):**
- TanStack Query (cache + sincronización)
- Virtualización (react-window)
- Code splitting (React.lazy)

---

## 📝 Convenciones de Código

### Naming

**Archivos:**
- Componentes: `PascalCase.jsx`
- Servicios: `camelCase.js`
- Tests: `*.test.js` o `*.test.jsx`

**Variables:**
- `camelCase` para variables y funciones
- `PascalCase` para componentes y clases
- `UPPER_SNAKE_CASE` para constantes

**Funciones:**
```javascript
// ✅ Descriptivo
async function calcularCostoTotalReceta(recetaId) { }

// ❌ Ambiguo
async function getCost(id) { }
```

### Comentarios

```javascript
// ✅ BIEN: Explica el "por qué"
// Deduplicar códigos porque Supabase UPSERT falla con duplicados en mismo batch
const registrosUnicos = deduplicarPorCodigo(registros);

// ❌ MAL: Explica el "qué" (obvio del código)
// Crear un Map vacío
const map = new Map();
```

### Imports

```javascript
// Orden: React → Librerías → Internos → Estilos
import React, { useState } from 'react';
import { toast } from 'sonner';
import { useArbolRecetasStore } from '../stores/useArbolRecetasStore';
import './styles.css';
```

---

## 🐛 Debugging

### React DevTools

```bash
# Instalar extensión de Chrome
https://chrome.google.com/webstore/detail/react-developer-tools
```

**Features:**
- Inspeccionar árbol de componentes
- Ver props y state
- Profiler para performance

### Zustand DevTools

```javascript
// Ya configurado en stores
import { devtools } from 'zustand/middleware';

export const useArbolRecetasStore = create(
  devtools((set, get) => ({ /* ... */ }))
);
```

**Ver en Redux DevTools extension**

### Supabase Logs

```javascript
// Ver queries en consola (solo dev)
const { data, error } = await supabase
  .from('arbol_recetas')
  .select('*')
  .explain(); // ← Ver execution plan
```

---

## 🔐 Seguridad

### Environment Variables

```bash
# .env.local (NO commitear)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Row Level Security (RLS)

**Todas las tablas tienen RLS enabled:**
```sql
-- Solo usuarios autenticados pueden leer
CREATE POLICY "Usuarios autenticados pueden leer"
ON arbol_recetas FOR SELECT
TO authenticated
USING (true);

-- Solo admin puede escribir
CREATE POLICY "Solo admin puede escribir"
ON arbol_recetas FOR INSERT
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin');
```

---

## 📦 Deploy

### Build de Producción

```bash
npm run build
# Output en: dist/
```

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Variables de Entorno

En Vercel Dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 🤝 Workflow de Desarrollo

### 1. Feature Nueva

```bash
# 1. Crear branch
git checkout -b feature/nombre-feature

# 2. Desarrollar con tests
npm run test -- --watch

# 3. Verificar calidad
npm run lint
npm run test

# 4. Commit
git add .
git commit -m "feat: descripción clara"

# 5. Push y PR
git push origin feature/nombre-feature
```

### 2. Bug Fix

```bash
# 1. Branch
git checkout -b fix/nombre-bug

# 2. Reproducir con test (TDD)
# Escribir test que falle

# 3. Fix
# Implementar solución hasta que test pase

# 4. Verificar
npm run test
npm run lint

# 5. Commit y PR
git commit -m "fix: descripción del bug"
```

### 3. Refactor

```bash
# 1. Tests primero
npm run test:coverage

# 2. Refactor con tests verdes
# Cambiar código manteniendo tests pasando

# 3. Verificar no rompe nada
npm run test
npm run build

# 4. Commit
git commit -m "refactor: qué se mejoró"
```

---

## 📚 Recursos

### Documentación
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Supabase](https://supabase.com/docs)
- [TailwindCSS](https://tailwindcss.com/)

### Learning
- [React Patterns](https://reactpatterns.com/)
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/practice-with-no-store-actions)
- [Supabase Tutorial](https://supabase.com/docs/guides/getting-started)

---

**¿Preguntas?** Slack #engineering

_Última actualización: 2026-02-06_
