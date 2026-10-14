// ESLint flat config untuk seluruh monorepo.
// Aturan dibuat ketat tetapi pragmatis: TypeScript strict sudah menangkap banyak hal,
// ESLint fokus pada kesalahan logika dan konsistensi.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'docs/**',
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, ...globals.es2022 },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // Skrip k6 berjalan di runtime k6 dengan global __ENV.
    files: ['load/**'],
    languageOptions: { globals: { __ENV: 'readonly' } },
  },
  {
    // Worker, mock, dan skrip memakai console sebagai log utama.
    files: [
      'services/alert-worker/**',
      'services/mock-upstream/**',
      'scripts/**',
      'e2e/**',
      'load/**',
    ],
    rules: { 'no-console': 'off' },
  },
  {
    // NestJS mengandalkan dekorator dengan class kosong sebagai modul.
    files: ['services/market-service/**', 'services/user-service/**'],
    rules: { '@typescript-eslint/no-extraneous-class': 'off' },
  },
  prettier,
);
