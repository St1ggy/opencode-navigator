import solid from '@st1ggy/linter-config/eslint-solid'
import prettier from 'eslint-config-prettier/flat'

export default [
  ...solid,
  // The Solid preset adds JSX formatting rules after Prettier's compatibility config.
  prettier,
  {
    languageOptions: { parserOptions: { project: ['./tsconfig.eslint.json'] } },
    settings: { 'import-x/resolver': { typescript: { project: './tsconfig.eslint.json', bun: true }, node: true } },
    rules: {
      // Serialized OpenCode options and existing public controller APIs retain their names.
      camelcase: ['error', { properties: 'never' }],
      'unicorn/consistent-boolean-name': 'off',
      // Promise identity, microtask ordering and short-circuit order are deliberate here.
      'unicorn/prefer-await': 'off',
      'unicorn/prefer-simple-condition-first': 'off',
      'unicorn/no-computed-property-existence-check': 'off',
      // Equality branches also narrow TypeScript unions; includes() does not.
      'unicorn/prefer-includes-over-repeated-comparisons': 'off',
      // Sorting local copies is intentional; persisted keys use locale-independent ordering.
      'unicorn/no-array-sort': 'off',
      // Keep the ES2022 library surface used by the plugin build.
      'unicorn/prefer-iterator-to-array': 'off',
      'unicorn/require-array-sort-compare': 'off',
      'sonarjs/no-alphabetical-sort': 'off',
      // OpenTUI has mutable renderables and terminal styles, rather than CSS props.
      'solid/style-prop': 'off',
      'sonarjs/prefer-read-only-props': 'off',
      // No-op callbacks consume failures already published in controller state.
      '@typescript-eslint/no-empty-function': ['error', { allow: ['arrowFunctions'] }],
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
      'unicorn/import-style': ['error', { styles: { path: { named: true } } }],
      'sonarjs/cognitive-complexity': ['error', 30],
    },
  },
  {
    files: ['src/components/**/*.tsx', 'src/dialogs/**/*.tsx'],
    rules: {
      // Compact terminal presentation branches stay close to their JSX.
      'sonarjs/no-nested-conditional': 'off',
      'unicorn/no-nested-ternary': 'off',
      'unicorn/max-nested-calls': ['error', { max: 5 }],
      'sonarjs/no-nested-template-literals': 'off',
    },
  },
  {
    files: ['src/components/sections.tsx'],
    rules: {
      // Legacy hosts/facades can omit capabilities typed as required by the current SDK.
      // Keep false distinct from undefined; the type-based autofix loses that distinction.
      'unicorn/no-unnecessary-boolean-comparison': 'off',
    },
  },
  {
    files: ['src/controllers/**/*.ts', 'src/preferences-store.ts'],
    rules: {
      // Controller-private helpers remain next to the lifetime they serve.
      'unicorn/consistent-function-scoping': 'off',
    },
  },
  {
    files: ['src/components/**/*.tsx', 'src/dialogs/**/*.tsx', 'src/controllers/**/*.ts', 'src/sidebar-interaction.ts'],
    rules: {
      // Host APIs/IDs are stable per mount. Keymap, renderer and request callbacks read
      // signals imperatively; the analyzer does not model these ownership boundaries.
      'solid/reactivity': 'off',
    },
  },
  {
    files: ['test/**/*.{ts,tsx}'],
    rules: {
      // Tests intentionally sample signals, provide partial SDK mocks, and replace globals.
      'solid/reactivity': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/no-return-array-push': 'off',
      'unicorn/no-global-object-property-assignment': 'off',
      'unicorn/no-await-expression-member': 'off',
      'unicorn/prefer-promise-with-resolvers': 'off',
      'unicorn/max-nested-calls': ['error', { max: 5 }],
      // Temp-directory literals are fixtures; filesystem tests use mkdtemp.
      'sonarjs/publicly-writable-directories': 'off',
      'import-x/extensions': ['error', 'never', { js: 'always', json: 'ignorePackages' }],
    },
  },
  {
    files: ['build.ts', 'scripts/**/*.ts'],
    rules: { 'no-console': 'off', 'unicorn/no-process-exit': 'off' },
  },
]
