// @ts-check
// https://typescript-eslint.io/users/configs/

import eslint from '@eslint/js'
import pluginJs from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'
import jsdoc from 'eslint-plugin-jsdoc'
import tseslint from 'typescript-eslint'

export default defineConfig(
  globalIgnores([
    'dist/',
    'docs/',
    'test/'
  ]),
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        allowDefaultProject: [
          'eslint.config.mjs',
          'rollup.config.mjs'
        ],
        tsconfigRootDir: import.meta.dirname
      }
    },
    files: ['**/*.ts']
  },
  pluginJs.configs.recommended,
  eslint.configs.recommended,
  tseslint.configs.eslintRecommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  stylistic.configs.customize({ jsx: false }),
  {
    plugins: {
      jsdoc
    },
    extends: ['jsdoc/recommended-tsdoc-error'],
    rules: {
      'jsdoc/check-indentation': [
        'error',
        { allowIndentedSections: true }
      ],
      'jsdoc/check-tag-names': [
        'error',
        { definedTags: ['enum'] }
      ],
      'jsdoc/require-returns': [
        'error',
        {
          checkGetters: false,
          forceReturnsWithAsync: false,
          publicOnly: true
        }
      ]
    },
    ignores: [
      'bin/*.ts',
      'examples/*.ts'
    ]
  },
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
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: false }
      ],
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: { number: true } }
      ],
      '@typescript-eslint/restrict-template-expressions': 'off'
    }
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked]
  }
)
