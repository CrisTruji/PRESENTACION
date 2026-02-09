# 🧪 Guía de Testing

**Proyecto:** PyHealthy Catering Management
**Framework:** Vitest + React Testing Library
**Última actualización:** 2026-02-06

---

## 📚 Índice

1. [Setup Rápido](#setup-rápido)
2. [Ejecutar Tests](#ejecutar-tests)
3. [Escribir Tests](#escribir-tests)
4. [Patrones y Mejores Prácticas](#patrones-y-mejores-prácticas)
5. [Mocking](#mocking)
6. [Coverage](#coverage)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Setup Rápido

### Dependencias Instaladas

```json
{
  "vitest": "^4.0.18",
  "@vitest/ui": "^4.0.18",
  "jsdom": "^28.0.0",
  "@testing-library/react": "^16.3.2",
  "@testing-library/jest-dom": "^6.9.1",
  "@testing-library/user-event": "^14.6.1"
}
```

### Configuración

**vitest.config.js:**
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js'
  }
});
```

---

## ▶️ Ejecutar Tests

### Comandos Disponibles

```bash
# Ejecutar todos los tests
npm run test

# UI interactiva (recomendado para desarrollo)
npm run test:ui

# Watch mode (re-ejecuta en cambios)
npm run test -- --watch

# Tests con coverage
npm run test:coverage

# Un solo archivo
npm run test -- src/services/__tests__/BaseArbolService.test.js

# Filtrar por nombre de test
npm run test -- -t "debe tener conectores vacío"
```

### Resultados Esperados

```
✓ src/services/__tests__/BaseArbolService.simple.test.js (13 tests)
✓ src/stores/__tests__/useArbolRecetasStore.test.js (26 tests)

Test Files  2 passed (2)
Tests       39 passed (39)
Duration    4.41s
```

---

## ✍️ Escribir Tests

### Estructura de un Test

```javascript
// src/services/__tests__/MiServicio.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { MiServicio } from '../MiServicio';

describe('MiServicio', () => {
  let service;

  beforeEach(() => {
    service = new MiServicio();
  });

  describe('método1', () => {
    it('debe hacer X cuando Y', () => {
      // Arrange (preparar)
      const input = { foo: 'bar' };

      // Act (ejecutar)
      const result = service.método1(input);

      // Assert (verificar)
      expect(result).toBe(expected);
    });
  });
});
```

### Naming Conventions

**Archivos:**
- `MiComponente.test.jsx` - Tests de componentes React
- `miServicio.test.js` - Tests de servicios/utils

**Describe blocks:**
- Nivel 1: Nombre del componente/servicio
- Nivel 2: Nombre del método/feature
- Tests: `debe [comportamiento esperado] cuando [condición]`

**Ejemplos:**
```javascript
describe('useArbolRecetasStore', () => {
  describe('Estado inicial', () => {
    it('debe tener conectores vacío', () => { });
    it('debe tener cargando en false', () => { });
  });

  describe('abrirModal', () => {
    it('debe actualizar estado correctamente', () => { });
    it('debe establecer padre cuando modo es crear', () => { });
  });
});
```

---

## 🎯 Patrones y Mejores Prácticas

### 1. Test de Interface Pública (No Implementación)

❌ **MAL** (test frágil, depende de implementación):
```javascript
it('debe llamar a fetch con URL correcta', () => {
  const spy = vi.spyOn(window, 'fetch');
  service.getData();
  expect(spy).toHaveBeenCalledWith('https://api.example.com/data');
});
```

✅ **BIEN** (test robusto, verifica comportamiento):
```javascript
it('debe retornar datos correctos', async () => {
  const result = await service.getData();
  expect(result).toHaveProperty('id');
  expect(result).toHaveProperty('nombre');
});
```

### 2. Test de Comportamiento (No Detalles)

❌ **MAL**:
```javascript
it('debe actualizar state.expandidos', () => {
  store.toggleNodo('id-1');
  expect(store.expandidos.has('id-1')).toBe(true);
});
```

✅ **BIEN**:
```javascript
it('debe expandir nodo cuando está colapsado', () => {
  const nodoId = 'id-1';
  const estadoInicial = store.expandidos.has(nodoId);

  store.toggleNodo(nodoId);

  expect(store.expandidos.has(nodoId)).toBe(!estadoInicial);
});
```

### 3. Arrange-Act-Assert Pattern

```javascript
it('debe calcular costo total correctamente', () => {
  // Arrange - Preparar datos
  const ingredientes = [
    { cantidad: 2, precio: 10 },
    { cantidad: 3, precio: 5 }
  ];

  // Act - Ejecutar función
  const total = calcularCostoTotal(ingredientes);

  // Assert - Verificar resultado
  expect(total).toBe(35); // (2*10) + (3*5)
});
```

### 4. Tests Independientes

❌ **MAL** (tests dependen entre sí):
```javascript
let sharedData;

it('debe crear usuario', () => {
  sharedData = service.crearUsuario();
  expect(sharedData).toBeDefined();
});

it('debe actualizar usuario', () => {
  service.actualizar(sharedData.id, { nombre: 'Nuevo' });
  expect(sharedData.nombre).toBe('Nuevo');
});
```

✅ **BIEN** (tests independientes):
```javascript
it('debe crear usuario', () => {
  const usuario = service.crearUsuario();
  expect(usuario).toBeDefined();
});

it('debe actualizar usuario', () => {
  const usuario = service.crearUsuario();
  const actualizado = service.actualizar(usuario.id, { nombre: 'Nuevo' });
  expect(actualizado.nombre).toBe('Nuevo');
});
```

---

## 🎭 Mocking

### Mock de Supabase Client

**Archivo:** `src/test/mocks/supabase.js`

```javascript
import { vi } from 'vitest';

export const createMockSupabaseClient = () => {
  const mockFrom = vi.fn();

  return {
    from: mockFrom,
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } })
    }
  };
};
```

**Uso en tests:**
```javascript
import { vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));
```

### Mock de Zustand Store

```javascript
import { vi } from 'vitest';

vi.mock('../stores/useArbolRecetasStore', () => ({
  useArbolRecetasStore: vi.fn(() => ({
    conectores: [],
    cargando: false,
    cargarArbol: vi.fn()
  }))
}));
```

### Mock de Componentes React

```javascript
vi.mock('../components/MiComponente', () => ({
  default: () => <div data-testid="mock-componente">Mock</div>
}));
```

---

## 📊 Coverage

### Generar Reporte

```bash
npm run test:coverage
```

### Ver Reporte HTML

```bash
# Se genera en coverage/index.html
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

### Interpretar Coverage

```
File                    | % Stmts | % Branch | % Funcs | % Lines |
------------------------|---------|----------|---------|---------|
BaseArbolService.js     |   85.71 |    75.00 |   88.88 |   85.71 |
useArbolRecetasStore.js |   92.30 |    83.33 |   95.00 |   92.30 |
------------------------|---------|----------|---------|---------|
All files               |   89.00 |    79.16 |   91.94 |   89.00 |
```

**Objetivos:**
- **>70%** Statement Coverage: Suficiente para producción
- **>80%** Branch Coverage: Muy bueno
- **>90%** Function Coverage: Excelente

**No obsesionarse con 100%:**
- Error handlers de casos extremos
- Código legacy que no se puede testear fácilmente
- UI puramente visual sin lógica

---

## 🔍 Troubleshooting

### Error: "Cannot find module '../lib/supabase'"

**Solución:** Verificar que el mock está antes del import:

```javascript
vi.mock('../lib/supabase', () => ({ /* mock */ }));
import { MiServicio } from './MiServicio'; // ✅ Después del mock
```

### Error: "ReferenceError: window is not defined"

**Causa:** Test está corriendo en Node, no jsdom.

**Solución:** Verificar `vitest.config.js`:
```javascript
export default defineConfig({
  test: {
    environment: 'jsdom' // ✅ Debe estar presente
  }
});
```

### Tests Lentos

**Causas comunes:**
- Muchos imports de componentes grandes
- Operaciones async sin timeout
- Setup global pesado

**Soluciones:**
```javascript
// Timeout más corto para operaciones async
it('debe cargar datos', { timeout: 1000 }, async () => { });

// Skip tests temporalmente
it.skip('test lento', () => { });

// Run solo un test
it.only('solo este test', () => { });
```

### Error: "Exceeded timeout"

**Solución:** Aumentar timeout:
```javascript
it('operación lenta', { timeout: 10000 }, async () => {
  await operacionLenta();
});
```

O en configuración global:
```javascript
// vitest.config.js
export default defineConfig({
  test: {
    testTimeout: 10000
  }
});
```

---

## 📝 Ejemplos de Tests

### Test de Servicio (CRUD)

```javascript
describe('BaseArbolService', () => {
  it('debe crear nuevo registro', async () => {
    const datos = { codigo: '3.999', nombre: 'Test' };
    const { data, error } = await service.crear(datos);

    expect(error).toBeNull();
    expect(data).toHaveProperty('id');
    expect(data.codigo).toBe('3.999');
  });
});
```

### Test de Zustand Store

```javascript
describe('useArbolRecetasStore', () => {
  it('debe actualizar estado con abrirModal', () => {
    const store = useArbolRecetasStore.getState();
    const receta = { id: '123', nombre: 'Test' };

    store.abrirModal('ver', receta);

    const newState = useArbolRecetasStore.getState();
    expect(newState.modalAbierto).toBe(true);
    expect(newState.recetaSeleccionada).toEqual(receta);
  });
});
```

### Test de Componente React

```javascript
import { render, screen } from '@testing-library/react';
import MiComponente from './MiComponente';

describe('MiComponente', () => {
  it('debe renderizar título', () => {
    render(<MiComponente titulo="Hola" />);

    expect(screen.getByText('Hola')).toBeInTheDocument();
  });
});
```

---

## 🎓 Recursos Adicionales

### Documentación Oficial
- [Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)

### Guías Recomendadas
- [Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)

### Videos
- [Vitest Crash Course](https://www.youtube.com/watch?v=FJRuG85tXV0)
- [React Testing Library Tutorial](https://www.youtube.com/watch?v=8vfQ6SWBZ-U)

---

## ✅ Checklist para Nuevos Tests

Antes de hacer commit de tests nuevos:

- [ ] Tests son independientes (no comparten estado)
- [ ] Nombres descriptivos (`debe X cuando Y`)
- [ ] Usan Arrange-Act-Assert pattern
- [ ] No testean implementación (testean comportamiento)
- [ ] Todos los tests pasan (`npm run test`)
- [ ] No hay console.errors inesperados
- [ ] Coverage no baja significativamente
- [ ] Tests son rápidos (<1s cada uno)

---

## 🤝 Contribuir

### Agregar Tests Nuevos

1. Crear archivo en `__tests__/` junto al código
2. Seguir naming conventions
3. Ejecutar `npm run test -- --watch`
4. Escribir tests que fallen primero (TDD)
5. Implementar código hasta que pasen
6. Refactorizar manteniendo tests verdes

### Actualizar Tests Existentes

1. Entender por qué el test falla
2. Decidir: ¿código o test está mal?
3. Actualizar según corresponda
4. Verificar que otros tests no se rompan

---

**¿Preguntas?** Consultar con el equipo en Slack #engineering

_Última actualización: 2026-02-06_
