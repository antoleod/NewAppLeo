// ESLint flat config (ESLint 9). Uses Expo's shared rules.
const expoConfig = require('eslint-config-expo/flat');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'dist/*',
      '_expo/*',
      '.expo/*',
      'node_modules/*',
      'public/*',
      'docs/*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      // React Native legitimately needs require() for platform-conditional
      // module resolution and runtime-only exports (e.g. firebase/auth RN).
      '@typescript-eslint/no-require-imports': 'off',
      // Allow intentionally-unused identifiers when prefixed with `_`.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
];
