import solid from '@st1ggy/linter-config/solid-ox'
import { defineConfig } from 'oxlint'

export default defineConfig({
  extends: [solid],
  // Root-only options are not inherited from the shared preset.
  options: { typeAware: true },
  ignorePatterns: ['dist/**', 'node_modules/**', 'vibe/**'],
  settings: { 'import-x/resolver': { typescript: { project: './tsconfig.lint.json', bun: true }, node: true } },
  overrides: [
    {
      files: ['**/*.{ts,tsx,js,mjs}'],
      rules: {
        // Keep serialized host names and public controller APIs unchanged.
        'eslint-js/camelcase': ['error', { properties: 'never' }],
        'unicorn-js/consistent-boolean-name': 'off',
        // Promise identity, microtask ordering and short-circuit order are deliberate.
        'unicorn-js/prefer-await': 'off',
        'unicorn-js/prefer-simple-condition-first': 'off',
        'unicorn-js/no-computed-property-existence-check': 'off',
        // Equality branches narrow TypeScript unions; includes() does not.
        'unicorn-js/prefer-includes-over-repeated-comparisons': 'off',
        // Sorting local copies is intentional; persisted keys have stable ordering.
        'unicorn/no-array-sort': 'off',
        'unicorn-js/require-array-sort-compare': 'off',
        'typescript/require-array-sort-compare': 'off',
        'sonarjs/no-alphabetical-sort': 'off',
        // Keep the ES2022 library surface used by the plugin build.
        'unicorn-js/prefer-iterator-to-array': 'off',
        // OpenTUI exposes mutable renderables and terminal styles rather than CSS.
        'solid/style-prop': 'off',
        'sonarjs/prefer-read-only-props': 'off',
        // No-op callbacks consume failures already published in controller state.
        'eslint/no-empty-function': ['error', { allow: ['arrowFunctions'] }],
        'eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
        'unicorn/import-style': ['error', { styles: { path: { named: true }, 'node:path': { named: true } } }],
        // Native argument checking cannot distinguish required undefined parameters.
        // Use the original compatible JS rule to retain type-safe call signatures.
        'unicorn/no-useless-undefined': 'off',
        'unicorn-js/no-useless-undefined': ['error', { checkArguments: true, checkArrowFunctionBody: true }],
        // Preserve extension resolution for built .js bundles and explicit JSON imports.
        'import/extensions': 'off',
        'import-x-js/extensions': ['error', 'never', { js: 'never', json: 'ignorePackages' }],
        // Oxfmt owns JSX whitespace; Solid's formatting additions conflict with it.
        'stylistic-js/jsx-curly-spacing': 'off',
        'stylistic-js/jsx-curly-newline': 'off',
        'sonarjs/cognitive-complexity': ['error', 30],
      },
    },
    {
      files: ['src/{features,pages,shared}/**/*.{ts,tsx}', 'src/entities/subagent/model/controller.ts'],
      // Solid ownership/render callbacks add an extra function boundary to compact flows.
      rules: { 'sonarjs/no-nested-functions': ['error', { threshold: 5 }] },
    },
    {
      files: ['src/features/sidebar-shortcuts/model/sidebar-shortcut-mode.ts'],
      // Host mode.push returns a disposal callback; it is not Array.push.
      rules: { 'unicorn-js/no-return-array-push': 'off' },
    },
    {
      files: ['src/app/opencode-v2/todo-server.ts', 'test/navigator-todo.test.ts'],
      // The session-task API's replace method mutates tasks, not a string replacement pattern.
      rules: { 'unicorn-js/no-unsafe-string-replacement': 'off' },
    },
    {
      files: ['src/{components,dialogs,features,pages,shared}/**/*.tsx', 'src/entities/*/ui/**/*.tsx'],
      rules: {
        // Compact terminal presentation branches stay close to their JSX.
        'sonarjs/no-nested-conditional': 'off',
        'unicorn/no-nested-ternary': 'off',
        'unicorn/max-nested-calls': ['error', { max: 5 }],
        'sonarjs/no-nested-template-literals': 'off',
      },
    },
    {
      files: ['src/pages/session-sidebar/**/*.tsx'],
      // Older hosts omit capabilities required by the latest SDK; false differs from undefined.
      rules: { 'unicorn-js/no-unnecessary-boolean-comparison': 'off' },
    },
    {
      files: [
        'src/controllers/**/*.ts',
        'src/entities/*/model/controller.ts',
        'src/entities/preferences/model/store.ts',
        'src/features/*/model/**/*.{ts,tsx}',
        'src/preferences-store.ts',
      ],
      // Controller-private helpers remain next to the lifetime they serve.
      rules: { 'unicorn-js/consistent-function-scoping': 'off' },
    },
    {
      files: [
        'src/{components,dialogs,pages,shared,entities,features,controllers}/**/*.{ts,tsx}',
        'src/sidebar-interaction.ts',
      ],
      // Host IDs are stable per mount; renderer/keymap callbacks read signals imperatively.
      rules: { 'solid/reactivity': 'off' },
    },
    {
      files: ['test/**/*.{ts,tsx}'],
      rules: {
        // Tests sample signals, use partial SDK mocks, and replace globals deliberately.
        'solid/reactivity': 'off',
        'eslint/no-empty-function': 'off',
        'typescript/no-explicit-any': 'off',
        'unicorn-js/consistent-function-scoping': 'off',
        'unicorn-js/no-return-array-push': 'off',
        'unicorn-js/no-global-object-property-assignment': 'off',
        'unicorn/no-await-expression-member': 'off',
        'unicorn-js/prefer-promise-with-resolvers': 'off',
        'unicorn/max-nested-calls': ['error', { max: 5 }],
        // Temporary-directory literals are fixtures; filesystem tests use mkdtemp.
        'sonarjs/publicly-writable-directories': 'off',
        'import-x-js/extensions': ['error', 'never', { js: 'always', json: 'ignorePackages' }],
      },
    },
    {
      files: ['build.ts', 'scripts/**/*.{ts,mjs}'],
      rules: { 'eslint/no-console': 'off', 'unicorn/no-process-exit': 'off' },
    },
    {
      files: ['test/local-snapshot-update.test.ts'],
      // Node's standalone ESM updater requires explicit .mjs extensions.
      rules: { 'import-x-js/extensions': 'off' },
    },
    {
      files: ['server.js', 'rpc.js'],
      // Public entrypoints import dist files that exist only after the build.
      rules: { 'import-x-js/extensions': 'off', 'import-x-js/no-unresolved': 'off' },
    },
    {
      files: ['screenshots/harness/*.mjs'],
      rules: {
        // Synthetic container scenes use /tmp and a container-only bundle path.
        'import-x-js/extensions': 'off',
        'import-x-js/no-unresolved': 'off',
        'sonarjs/no-nested-conditional': 'off',
        'sonarjs/publicly-writable-directories': 'off',
        'unicorn-js/consistent-function-scoping': 'off',
        'unicorn-js/prefer-else-if': 'off',
        'unicorn/no-nested-ternary': 'off',
      },
    },
  ],
})
