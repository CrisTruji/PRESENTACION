/**
 * Script para Actualizar Imports Automáticamente
 * Convierte imports relativos a imports absolutos con alias
 *
 * Uso: node scripts/update-imports.js
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
// PATRONES DE REEMPLAZO
// ========================================

const replacements = [
  // Shared API
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/lib\/supabase['"]/g,
    replacement: "from '@/shared/api'",
    description: 'supabase.js → @/shared/api',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/lib\/supabase['"]/g,
    replacement: "from '@/shared/api'",
    description: 'supabase.js → @/shared/api (2 niveles)',
  },
  {
    pattern: /from ['"]\.\.\/lib\/supabase['"]/g,
    replacement: "from '@/shared/api'",
    description: 'supabase.js → @/shared/api (1 nivel)',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/lib\/queryClient['"]/g,
    replacement: "from '@/shared/api'",
    description: 'queryClient.js → @/shared/api',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/lib\/queryClient['"]/g,
    replacement: "from '@/shared/api'",
    description: 'queryClient.js → @/shared/api (2 niveles)',
  },

  // Feature: Inventory
  {
    pattern: /from ['"]\.\.\/\.\.\/components\/stock\/StockManager['"]/g,
    replacement: "from '@/features/inventory'",
    description: 'StockManager → @/features/inventory',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/components\/stock\/StockManager['"]/g,
    replacement: "from '@/features/inventory'",
    description: 'StockManager → @/features/inventory (3 niveles)',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/components\/stock\/StockManagerVirtualized['"]/g,
    replacement: "from '@/features/inventory'",
    description: 'StockManagerVirtualized → @/features/inventory',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/hooks\/useStock['"]/g,
    replacement: "from '@/features/inventory'",
    description: 'useStock → @/features/inventory',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/hooks\/useStock['"]/g,
    replacement: "from '@/features/inventory'",
    description: 'useStock → @/features/inventory (3 niveles)',
  },
  {
    pattern: /from ['"]\.\.\/services\/stockService['"]/g,
    replacement: "from '../services/stockService'",
    description: 'stockService (interno a feature)',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/services\/stockService['"]/g,
    replacement: "from '@/features/inventory'",
    description: 'stockService → @/features/inventory',
  },

  // Feature: Audit
  {
    pattern: /from ['"]\.\.\/\.\.\/components\/auditoria\/AuditoriaViewer['"]/g,
    replacement: "from '@/features/audit'",
    description: 'AuditoriaViewer → @/features/audit',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/components\/auditoria\/AuditoriaViewer['"]/g,
    replacement: "from '@/features/audit'",
    description: 'AuditoriaViewer → @/features/audit (3 niveles)',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/components\/auditoria\/AuditoriaViewerVirtualized['"]/g,
    replacement: "from '@/features/audit'",
    description: 'AuditoriaViewerVirtualized → @/features/audit',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/hooks\/useAuditoria['"]/g,
    replacement: "from '@/features/audit'",
    description: 'useAuditoria → @/features/audit',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/hooks\/useAuditoria['"]/g,
    replacement: "from '@/features/audit'",
    description: 'useAuditoria → @/features/audit (3 niveles)',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/services\/auditoriaService['"]/g,
    replacement: "from '@/features/audit'",
    description: 'auditoriaService → @/features/audit',
  },

  // Feature: Recipes
  {
    pattern: /from ['"]\.\.\/\.\.\/hooks\/useCostosAutomaticos['"]/g,
    replacement: "from '@/features/recipes'",
    description: 'useCostosAutomaticos → @/features/recipes',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/hooks\/useCostosAutomaticos['"]/g,
    replacement: "from '@/features/recipes'",
    description: 'useCostosAutomaticos → @/features/recipes (3 niveles)',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/services\/costosAutomaticosService['"]/g,
    replacement: "from '@/features/recipes'",
    description: 'costosAutomaticosService → @/features/recipes',
  },

  // Feature: Products
  {
    pattern: /from ['"]\.\.\/\.\.\/stores\/useArbolRecetasStore['"]/g,
    replacement: "from '@/features/products'",
    description: 'useArbolRecetasStore → @/features/products',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/stores\/useArbolRecetasStore['"]/g,
    replacement: "from '@/features/products'",
    description: 'useArbolRecetasStore → @/features/products (3 niveles)',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/services\/arbolRecetasService['"]/g,
    replacement: "from '@/features/products'",
    description: 'arbolRecetasService → @/features/products',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/services\/BaseArbolService['"]/g,
    replacement: "from '@/features/products'",
    description: 'BaseArbolService → @/features/products',
  },

  // Feature: Presentations
  {
    pattern: /from ['"]\.\.\/\.\.\/components\/presentaciones\/PresentacionesManager['"]/g,
    replacement: "from '@/features/presentations'",
    description: 'PresentacionesManager → @/features/presentations',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/components\/presentaciones\/PresentacionesManagerVirtualized['"]/g,
    replacement: "from '@/features/presentations'",
    description: 'PresentacionesManagerVirtualized → @/features/presentations',
  },

  // Shared UI
  {
    pattern: /from ['"]\.\.\/\.\.\/components\/common\/VirtualizedTable['"]/g,
    replacement: "from '@/shared/ui/VirtualizedTable'",
    description: 'VirtualizedTable → @/shared/ui/VirtualizedTable',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/components\/common\/VirtualizedTable['"]/g,
    replacement: "from '@/shared/ui/VirtualizedTable'",
    description: 'VirtualizedTable → @/shared/ui/VirtualizedTable (3 niveles)',
  },
  {
    pattern: /from ['"]\.\.\/common\/VirtualizedTable['"]/g,
    replacement: "from '@/shared/ui/VirtualizedTable'",
    description: 'VirtualizedTable → @/shared/ui/VirtualizedTable (interno)',
  },

  // Imports dentro de features (relativos a absolutos)
  {
    pattern: /from ['"]\.\.\/hooks\/useStock['"]/g,
    replacement: "from '../hooks/useStock'",
    description: 'useStock (interno a inventory)',
  },
  {
    pattern: /from ['"]\.\.\/services\/stockService['"]/g,
    replacement: "from '../services/stockService'",
    description: 'stockService (interno a inventory)',
  },
  {
    pattern: /from ['"]\.\.\/hooks\/useAuditoria['"]/g,
    replacement: "from '../hooks/useAuditoria'",
    description: 'useAuditoria (interno a audit)',
  },
  {
    pattern: /from ['"]\.\.\/services\/auditoriaService['"]/g,
    replacement: "from '../services/auditoriaService'",
    description: 'auditoriaService (interno a audit)',
  },
];

// ========================================
// FUNCIONES
// ========================================

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);

    if (fs.statSync(filePath).isDirectory()) {
      // Ignorar node_modules y .git
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
      }
    } else {
      // Solo archivos .js, .jsx, .ts, .tsx
      if (/\.(js|jsx|ts|tsx)$/.test(file)) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

function updateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let changes = [];

  replacements.forEach(({ pattern, replacement, description }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
      changes.push(description);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return changes;
  }

  return null;
}

// ========================================
// MAIN
// ========================================

function main() {
  log('\n🔄 Actualizando imports a alias absolutos...\n', 'blue');

  const srcPath = path.join(ROOT, 'src');
  const files = getAllFiles(srcPath);

  log(`📁 Encontrados ${files.length} archivos para procesar\n`, 'cyan');

  let totalModified = 0;
  let totalChanges = 0;

  files.forEach((filePath) => {
    const changes = updateImports(filePath);

    if (changes) {
      totalModified++;
      totalChanges += changes.length;

      const relativePath = path.relative(ROOT, filePath);
      log(`✅ ${relativePath}`, 'green');
      changes.forEach((change) => {
        log(`   - ${change}`, 'yellow');
      });
    }
  });

  log(`\n📊 Resumen:`, 'blue');
  log(`   Archivos procesados: ${files.length}`, 'cyan');
  log(`   Archivos modificados: ${totalModified}`, 'green');
  log(`   Cambios realizados: ${totalChanges}`, 'green');

  if (totalModified === 0) {
    log('\n✨ No se encontraron imports para actualizar', 'yellow');
  } else {
    log('\n✅ ¡Imports actualizados exitosamente!', 'green');
    log('\n📋 Próximos pasos:', 'blue');
    log('   1. Ejecutar tests: npm test', 'yellow');
    log('   2. Verificar app: npm run dev', 'yellow');
    log('   3. Si todo funciona, commit: git add . && git commit -m "refactor: update imports to absolute paths"', 'yellow');
  }
}

main();
