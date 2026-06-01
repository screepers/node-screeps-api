// @ts-check
// https://typescript-eslint.io/users/configs/

import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js'
import pluginJs from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    plugins: {
      '@stylistic': stylistic,
      '@typescript-eslint': tseslint.plugin
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    ignores: [
      'dist/**/*.ts',
      'dist/**',
      'test/**',
      '**/*.mjs',
      'eslint.config.mjs',
    ],
    files: ['**/*.{js,mjs,cjs,ts}'],
  },
  pluginJs.configs.recommended,
  eslint.configs.recommended,
  tseslint.configs.eslintRecommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  stylistic.configs.customize({ jsx: false }),
  {
    rules: {
      '@stylistic/brace-style': ['error', '1tbs'],
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/dot-location': ['error', 'property'],
      '@stylistic/semi': [
        'error',
        'never',
        { beforeStatementContinuationChars: 'always' }
      ],
      '@typescript-eslint/consistent-indexed-object-style': ['error', 'index-signature'],
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { 'ignorePrimitives': { 'number': true } }
      ],
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
)
