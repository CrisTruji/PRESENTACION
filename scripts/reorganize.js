/**
 * Script de Reorganización Automática
 * Migra la estructura actual a Feature-Sliced Design
 *
 * Uso: node scripts/reorganize.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Directorio raíz del proyecto
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// ========================================
// FASE 1: CREAR ESTRUCTURA NUEVA
// ========================================

function crearEstructura() {
  log('\n📁 Fase 1: Creando estructura de carpetas...', 'blue');

  const carpetas = [
    // App
    'src/app',
    'src/app/providers',
    'src/app/router',
    'src/app/styles',

    // Features
    'src/features',
    'src/features/auth/components',
    'src/features/auth/hooks',
    'src/features/auth/services',
    'src/features/auth/store',

    'src/features/inventory/components',
    'src/features/inventory/hooks',
    'src/features/inventory/services',
    'src/features/inventory/__tests__',

    'src/features/recipes/components',
    'src/features/recipes/hooks',
    'src/features/recipes/services',
    'src/features/recipes/store',
    'src/features/recipes/__tests__',

    'src/features/products/components',
    'src/features/products/hooks',
    'src/features/products/services',
    'src/features/products/store',
    'src/features/products/__tests__',

    'src/features/presentations/components',
    'src/features/presentations/__tests__',

    'src/features/audit/components',
    'src/features/audit/hooks',
    'src/features/audit/services',
    'src/features/audit/__tests__',

    'src/features/purchases/components',
    'src/features/dishes/components',

    // Pages
    'src/pages',
    'src/pages/admin',
    'src/pages/chef',
    'src/pages/planta',
    'src/pages/compras',
    'src/pages/almacen',
    'src/pages/public',

    // Widgets
    'src/widgets',
    'src/widgets/Navbar',
    'src/widgets/Sidebar',
    'src/widgets/Dashboard',

    // Shared
    'src/shared',
    'src/shared/ui/Button',
    'src/shared/ui/Input',
    'src/shared/ui/Modal',
    'src/shared/ui/Table',
    'src/shared/ui/VirtualizedTable',
    'src/shared/ui/Badge',
    'src/shared/ui/Card',
    'src/shared/hooks',
    'src/shared/utils',
    'src/shared/api',
    'src/shared/types',

    // Tests
    'tests/unit/services',
    'tests/unit/hooks',
    'tests/unit/utils',
    'tests/integration/features',
  ];

  let creadas = 0;
  let existentes = 0;

  carpetas.forEach((carpeta) => {
    const rutaCompleta = path.join(ROOT, carpeta);
    if (!fs.existsSync(rutaCompleta)) {
      fs.mkdirSync(rutaCompleta, { recursive: true });
      log(`  ✅ Creada: ${carpeta}`, 'green');
      creadas++;
    } else {
      existentes++;
    }
  });

  log(`\n📊 Resumen: ${creadas} carpetas creadas, ${existentes} ya existían`, 'yellow');
}

// ========================================
// FASE 2: MOVER ARCHIVOS SHARED
// ========================================

function moverShared() {
  log('\n📦 Fase 2: Moviendo archivos shared...', 'blue');

  const movimientos = [
    // API
    {
      origen: 'src/lib/supabase.js',
      destino: 'src/shared/api/supabase.js',
    },
    {
      origen: 'src/lib/queryClient.js',
      destino: 'src/shared/api/queryClient.js',
    },

    // UI Components
    {
      origen: 'src/components/common/VirtualizedTable.jsx',
      destino: 'src/shared/ui/VirtualizedTable/VirtualizedTable.jsx',
    },
  ];

  movimientos.forEach(({ origen, destino }) => {
    moverArchivo(origen, destino);
  });
}

// ========================================
// FASE 3: MOVER FEATURES
// ========================================

function moverFeatures() {
  log('\n🎯 Fase 3: Moviendo features...', 'blue');

  // Feature: Inventory (Stock)
  log('\n  📦 Moviendo feature: inventory', 'yellow');
  const inventoryMovs = [
    {
      origen: 'src/components/stock/StockManager.jsx',
      destino: 'src/features/inventory/components/StockManager.jsx',
    },
    {
      origen: 'src/components/stock/StockManagerVirtualized.jsx',
      destino: 'src/features/inventory/components/StockManagerVirtualized.jsx',
    },
    {
      origen: 'src/hooks/useStock.js',
      destino: 'src/features/inventory/hooks/useStock.js',
    },
    {
      origen: 'src/services/stockService.js',
      destino: 'src/features/inventory/services/stockService.js',
    },
    {
      origen: 'tests/components/StockManagerVirtualized.test.jsx',
      destino: 'src/features/inventory/__tests__/StockManagerVirtualized.test.jsx',
    },
    {
      origen: 'tests/hooks/useStock.test.jsx',
      destino: 'src/features/inventory/__tests__/useStock.test.jsx',
    },
    {
      origen: 'tests/stockService.test.js',
      destino: 'src/features/inventory/__tests__/stockService.test.js',
    },
  ];
  inventoryMovs.forEach(({ origen, destino }) => moverArchivo(origen, destino));

  // Feature: Audit
  log('\n  📋 Moviendo feature: audit', 'yellow');
  const auditMovs = [
    {
      origen: 'src/components/auditoria/AuditoriaViewer.jsx',
      destino: 'src/features/audit/components/AuditoriaViewer.jsx',
    },
    {
      origen: 'src/components/auditoria/AuditoriaViewerVirtualized.jsx',
      destino: 'src/features/audit/components/AuditoriaViewerVirtualized.jsx',
    },
    {
      origen: 'src/hooks/useAuditoria.js',
      destino: 'src/features/audit/hooks/useAuditoria.js',
    },
    {
      origen: 'src/services/auditoriaService.js',
      destino: 'src/features/audit/services/auditoriaService.js',
    },
    {
      origen: 'tests/components/AuditoriaViewerVirtualized.test.jsx',
      destino: 'src/features/audit/__tests__/AuditoriaViewerVirtualized.test.jsx',
    },
    {
      origen: 'tests/hooks/useAuditoria.test.jsx',
      destino: 'src/features/audit/__tests__/useAuditoria.test.jsx',
    },
    {
      origen: 'tests/auditoriaService.test.js',
      destino: 'src/features/audit/__tests__/auditoriaService.test.js',
    },
  ];
  auditMovs.forEach(({ origen, destino }) => moverArchivo(origen, destino));

  // Feature: Recipes
  log('\n  🍳 Moviendo feature: recipes', 'yellow');
  const recipesMovs = [
    {
      origen: 'src/components/recetas',
      destino: 'src/features/recipes/components',
      esDirectorio: true,
    },
    {
      origen: 'src/hooks/useCostosAutomaticos.js',
      destino: 'src/features/recipes/hooks/useCostosAutomaticos.js',
    },
    {
      origen: 'src/services/costosAutomaticosService.js',
      destino: 'src/features/recipes/services/costosAutomaticosService.js',
    },
    {
      origen: 'tests/hooks/useCostosAutomaticos.test.jsx',
      destino: 'src/features/recipes/__tests__/useCostosAutomaticos.test.jsx',
    },
    {
      origen: 'tests/costosAutomaticosService.test.js',
      destino: 'src/features/recipes/__tests__/costosAutomaticosService.test.js',
    },
  ];
  recipesMovs.forEach(({ origen, destino, esDirectorio }) =>
    esDirectorio ? moverDirectorio(origen, destino) : moverArchivo(origen, destino)
  );

  // Feature: Products (Árbol)
  log('\n  🌳 Moviendo feature: products', 'yellow');
  const productsMovs = [
    {
      origen: 'src/components/arbol',
      destino: 'src/features/products/components',
      esDirectorio: true,
    },
    {
      origen: 'src/services/arbolRecetasService.js',
      destino: 'src/features/products/services/arbolRecetasService.js',
    },
    {
      origen: 'src/services/BaseArbolService.js',
      destino: 'src/features/products/services/BaseArbolService.js',
    },
    {
      origen: 'src/stores/useArbolRecetasStore.js',
      destino: 'src/features/products/store/useArbolRecetasStore.js',
    },
  ];
  productsMovs.forEach(({ origen, destino, esDirectorio }) =>
    esDirectorio ? moverDirectorio(origen, destino) : moverArchivo(origen, destino)
  );

  // Feature: Presentations
  log('\n  📦 Moviendo feature: presentations', 'yellow');
  const presentationsMovs = [
    {
      origen: 'src/components/presentaciones/PresentacionesManager.jsx',
      destino: 'src/features/presentations/components/PresentacionesManager.jsx',
    },
    {
      origen: 'src/components/presentaciones/PresentacionesManagerVirtualized.jsx',
      destino: 'src/features/presentations/components/PresentacionesManagerVirtualized.jsx',
    },
  ];
  presentationsMovs.forEach(({ origen, destino }) => moverArchivo(origen, destino));
}

// ========================================
// FASE 4: CREAR PUBLIC APIs
// ========================================

function crearPublicAPIs() {
  log('\n📝 Fase 4: Creando Public APIs (index.js)...', 'blue');

  const apis = [
    {
      ruta: 'src/features/inventory/index.js',
      contenido: `// Public API - Inventory Feature
export { StockManager } from './components/StockManager';
export { StockManagerVirtualized } from './components/StockManagerVirtualized';
export { useStock, useStockBajo, useStockConAlertas, useActualizarStock } from './hooks/useStock';
`,
    },
    {
      ruta: 'src/features/audit/index.js',
      contenido: `// Public API - Audit Feature
export { AuditoriaViewer } from './components/AuditoriaViewer';
export { AuditoriaViewerVirtualized } from './components/AuditoriaViewerVirtualized';
export { useAuditoriaLegible, useBuscarAuditoria } from './hooks/useAuditoria';
`,
    },
    {
      ruta: 'src/features/recipes/index.js',
      contenido: `// Public API - Recipes Feature
export { useCostosAutomaticos, useRecalcularTodasRecetas } from './hooks/useCostosAutomaticos';
`,
    },
    {
      ruta: 'src/features/products/index.js',
      contenido: `// Public API - Products Feature
export { useArbolRecetasStore } from './store/useArbolRecetasStore';
`,
    },
    {
      ruta: 'src/features/presentations/index.js',
      contenido: `// Public API - Presentations Feature
export { PresentacionesManager } from './components/PresentacionesManager';
export { PresentacionesManagerVirtualized } from './components/PresentacionesManagerVirtualized';
`,
    },
    {
      ruta: 'src/shared/ui/index.js',
      contenido: `// Public API - Shared UI Components
export { VirtualizedTable, useTableColumns } from './VirtualizedTable/VirtualizedTable';
`,
    },
    {
      ruta: 'src/shared/api/index.js',
      contenido: `// Public API - Shared API
export { supabase } from './supabase';
export { queryClient } from './queryClient';
`,
    },
  ];

  apis.forEach(({ ruta, contenido }) => {
    const rutaCompleta = path.join(ROOT, ruta);
    fs.writeFileSync(rutaCompleta, contenido, 'utf8');
    log(`  ✅ Creado: ${ruta}`, 'green');
  });
}

// ========================================
// UTILIDADES
// ========================================

function moverArchivo(origen, destino) {
  const origenCompleto = path.join(ROOT, origen);
  const destinoCompleto = path.join(ROOT, destino);

  if (!fs.existsSync(origenCompleto)) {
    log(`    ⚠️  No existe: ${origen}`, 'yellow');
    return;
  }

  // Crear directorio destino si no existe
  const dirDestino = path.dirname(destinoCompleto);
  if (!fs.existsSync(dirDestino)) {
    fs.mkdirSync(dirDestino, { recursive: true });
  }

  // Copiar archivo
  fs.copyFileSync(origenCompleto, destinoCompleto);
  log(`    ✅ ${origen} → ${destino}`, 'green');
}

function moverDirectorio(origen, destino) {
  const origenCompleto = path.join(ROOT, origen);
  const destinoCompleto = path.join(ROOT, destino);

  if (!fs.existsSync(origenCompleto)) {
    log(`    ⚠️  No existe: ${origen}`, 'yellow');
    return;
  }

  // Crear directorio destino
  if (!fs.existsSync(destinoCompleto)) {
    fs.mkdirSync(destinoCompleto, { recursive: true });
  }

  // Copiar recursivamente
  copiarDirectorioRecursivo(origenCompleto, destinoCompleto);
  log(`    ✅ ${origen} → ${destino}`, 'green');
}

function copiarDirectorioRecursivo(origen, destino) {
  const archivos = fs.readdirSync(origen);

  archivos.forEach((archivo) => {
    const rutaOrigen = path.join(origen, archivo);
    const rutaDestino = path.join(destino, archivo);

    if (fs.statSync(rutaOrigen).isDirectory()) {
      if (!fs.existsSync(rutaDestino)) {
        fs.mkdirSync(rutaDestino, { recursive: true });
      }
      copiarDirectorioRecursivo(rutaOrigen, rutaDestino);
    } else {
      fs.copyFileSync(rutaOrigen, rutaDestino);
    }
  });
}

// ========================================
// MAIN
// ========================================

function main() {
  log('\n🚀 Iniciando Reorganización de Arquitectura\n', 'blue');
  log('⚠️  IMPORTANTE: Asegúrate de tener un backup del proyecto', 'red');
  log('⚠️  Este script COPIA archivos (no elimina los originales)\n', 'yellow');

  try {
    crearEstructura();
    moverShared();
    moverFeatures();
    crearPublicAPIs();

    log('\n✅ ¡Reorganización completada exitosamente!', 'green');
    log('\n📋 Próximos pasos:', 'blue');
    log('  1. Actualizar imports en archivos movidos', 'yellow');
    log('  2. Actualizar vite.config.js con alias', 'yellow');
    log('  3. Ejecutar tests: npm test', 'yellow');
    log('  4. Si todo funciona, eliminar carpetas antiguas', 'yellow');
    log('  5. Commit: git add . && git commit -m "refactor: reorganize to feature-sliced design"', 'yellow');
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
main();