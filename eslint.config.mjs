import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import-x';

export default [
  eslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import-x/resolver': {
        node: true,
      },
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": "warn",
      "import/no-unresolved": [2, { "caseSensitive": false }]
    }
  }
];
