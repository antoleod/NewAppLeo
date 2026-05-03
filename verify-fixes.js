#!/usr/bin/env node

/**
 * Script de verificación: Confirma que los fixes están aplicados correctamente
 * Uso: node verify-fixes.js
 */

const fs = require('fs');
const path = require('path');

const checks = [];

function checkFile(filePath, searchPatterns, description) {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    checks.push({
      status: '❌',
      description: `${description} (ARCHIVO NO ENCONTRADO)`,
    });
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');

  if (Array.isArray(searchPatterns)) {
    const allFound = searchPatterns.every(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(content);
      }
      return content.includes(pattern);
    });

    checks.push({
      status: allFound ? '✅' : '❌',
      description: description,
    });
  }
}

console.log('\n🔍 VERIFICANDO FIXES...\n');

// Fix 1: Modal import
checkFile(
  'app/(app)/entry/[type].tsx',
  [/import.*Modal.*from\s['"]react-native['"];?/],
  'Fix 1: Modal import en entry/[type].tsx'
);

// Fix 2: Cancelled flag en Firestore listener
checkFile(
  'src/context/AppDataContext.tsx',
  [
    'let cancelled = false;',
    'if (cancelled) return;',
    'cancelled = true;',
    'if (unsubscribe) {',
  ],
  'Fix 2: Cancelled flag + cleanup en AppDataContext.tsx'
);

// Fix 3: setupListener function
checkFile(
  'src/context/AppDataContext.tsx',
  ['const setupListener = () => {'],
  'Fix 3: setupListener function setup'
);

// Resultado
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
checks.forEach(check => {
  console.log(`${check.status} ${check.description}`);
});
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const allPassed = checks.every(c => c.status === '✅');

if (allPassed) {
  console.log('🎉 TODOS LOS FIXES HAN SIDO APLICADOS CORRECTAMENTE\n');
  console.log('Próximos pasos:');
  console.log('1. npm run dev  (iniciar en modo desarrollo)');
  console.log('2. Abre la consola y busca "FIRESTORE" o "Modal"');
  console.log('3. Verifica que no haya errores\n');
  process.exit(0);
} else {
  console.log('⚠️  ALGUNOS FIXES NO SE HAN APLICADO CORRECTAMENTE\n');
  console.log('Revisa el archivo FIXES_APPLIED.md para más detalles\n');
  process.exit(1);
}
