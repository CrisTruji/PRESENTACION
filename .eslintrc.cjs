module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: '18.2'
    }
  },
  plugins: ['react-refresh', 'react'],
  rules: {
    // React
    'react/prop-types': 'off', // TypeScript o validación manual
    'react/react-in-jsx-scope': 'off', // No necesario en React 17+
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true }
    ],

    // Variables
    'no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }
    ],

    // Console
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

    // Imports
    'no-duplicate-imports': 'error',

    // General
    'prefer-const': 'warn',
    'no-var': 'error',
    'eqeqeq': ['warn', 'smart'],
    'no-debugger': 'warn'
  }
};
