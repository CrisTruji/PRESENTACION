/**
 * Script de Limpieza - Eliminar Estructura Antigua
 * Elimina archivos y carpetas duplicadas de forma segura
 *
 * Uso: node scripts/cleanup-old-structure.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ========================================
// ARCHIVOS Y CARPETAS A ELIMINAR
// ========================================

const itemsToDelete = [
  // Componentes antiguos (ya movidos a features/)
  'src/components/stock',
  'src/components/auditoria',
  'src/components/presentaciones',
  'src/components/recetas',
  'src/components/arbol',
  'src/components/arbol_recetas',
  'src/components/arbol_platos',
  'src/components/common/VirtualizedTable.jsx',

  // Hooks antiguos (ya movidos a features/)
  'src/hooks/useStock.js',
  'src/hooks/useAuditoria.js',
  'src/hooks/useCostosAutomaticos.js',

  // Services antiguos (ya movidos a features/)
  'src/services/stockService.js',
  'src/services/auditoriaService.js',
  'src/services/costosAutomaticosService.js',
  'src/services/arbolRecetasService.js',
  'src/services/BaseArbolService.js',

  // Stores antiguos (ya movidos a features/)
  'src/stores/useArbolRecetasStore.js',

  // Lib antiguos (ya movidos a shared/)
  'src/lib/supabase.js',
  'src/lib/queryClient.js',

  // Tests duplicados en components (los de tests/ raíz están bien)
  'tests/components/StockManagerVirtualized.test.jsx',
  'tests/components/AuditoriaViewerVirtualized.test.jsx',
];

// ========================================
// FUNCIONES
// ========================================

function deleteItem(itemPath) {
  const fullPath = path.join(ROOT, itemPath);

  if (!fs.existsSync(fullPath)) {
    log(`  ⚠️  No existe: ${itemPath}`, 'yellow');
    return false;
  }

  try {
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      log(`  ✅ Eliminada carpeta: ${itemPath}`, 'green');
    } else {
      fs.unlinkSync(fullPath);
      log(`  ✅ Eliminado archivo: ${itemPath}`, 'green');
    }

    return true;
  } catch (error) {
    log(`  ❌ Error al eliminar ${itemPath}: ${error.message}`, 'red');
    return false;
  }
}

function cleanupEmptyDirs(dirPath) {
  if (!fs.existsSync(dirPath)) return;

  const items = fs.readdirSync(dirPath);

  // Limpiar subdirectorios primero (recursivo)
  items.forEach((item) => {
    const itemPath = path.join(dirPath, item);
    if (fs.statSync(itemPath).isDirectory()) {
      cleanupEmptyDirs(itemPath);
    }
  });

  // Si el directorio está vacío, eliminarlo
  const itemsAfter = fs.readdirSync(dirPath);
  if (itemsAfter.length === 0) {
    fs.rmdirSync(dirPath);
    const relativePath = path.relative(ROOT, dirPath);
    log(`  🗑️  Carpeta vacía eliminada: ${relativePath}`, 'cyan');
  }
}

// ========================================
// MAIN
// ========================================

function main() {
  log('\n🧹 Limpiando estructura antigua...\n', 'blue');

  let deleted = 0;
  let notFound = 0;
  let errors = 0;

  itemsToDelete.forEach((item) => {
    const result = deleteItem(item);
    if (result === true) {
      deleted++;
    } else if (result === false) {
      const fullPath = path.join(ROOT, item);
      if (!fs.existsSync(fullPath)) {
        notFound++;
      } else {
        errors++;
      }
    }
  });

  log('\n🧹 Limpiando carpetas vacías...', 'blue');

  // Limpiar carpetas vacías
  const dirsToClean = [
    'src/components',
    'src/hooks',
    'src/services',
    'src/stores',
    'src/lib',
    'tests/components',
  ];

  dirsToClean.forEach((dir) => {
    const fullPath = path.join(ROOT, dir);
    cleanupEmptyDirs(fullPath);
  });

  log('\n📊 Resumen:', 'blue');
  log(`   Items eliminados: ${deleted}`, 'green');
  log(`   No encontrados: ${notFound}`, 'yellow');
  log(`   Errores: ${errors}`, errors > 0 ? 'red' : 'green');

  log('\n✅ Limpieza completada!', 'green');
  log('\n📋 Estructura final:', 'blue');
  log('   src/', 'cyan');
  log('   ├── features/       ← Funcionalidades de negocio', 'cyan');
  log('   ├── pages/          ← Páginas por rol', 'cyan');
  log('   ├── widgets/        ← UI complejos', 'cyan');
  log('   ├── shared/         ← Código compartido', 'cyan');
  log('   └── screens/        ← Pantallas existentes (migrar después)', 'yellow');

  log('\n📋 Próximos pasos:', 'blue');
  log('   1. Verificar app: npm run dev', 'yellow');
  log('   2. Ejecutar tests: npm test', 'yellow');
  log('   3. Si todo funciona:', 'yellow');
  log('      git add .', 'green');
  log('      git commit -m "refactor: complete Feature-Sliced Design migration"', 'green');
}

main();
