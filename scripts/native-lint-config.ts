import type { defineConfig } from 'oxlint'

type Config = Parameters<typeof defineConfig>[0]

// These SonarJS checks have direct native equivalents. Existing native options win.
export const NATIVE_SONAR_RULES: Readonly<Record<string, string>> = {
  'sonarjs/block-scoped-var': 'eslint/block-scoped-var',
  'sonarjs/no-delete-var': 'eslint/no-delete-var',
  'sonarjs/no-fallthrough': 'eslint/no-fallthrough',
  'sonarjs/no-labels': 'eslint/no-labels',
  'sonarjs/no-unused-vars': 'eslint/no-unused-vars',
  'sonarjs/no-useless-catch': 'eslint/no-useless-catch',
}

function nativeRules(rules: Config['rules'] = {}) {
  const result = { ...rules }

  for (const [name, value] of Object.entries(rules)) {
    const target = name.startsWith('typescript-js/')
      ? name.replace('typescript-js/', 'typescript/')
      : NATIVE_SONAR_RULES[name]

    if (!name.startsWith('sonarjs/') && !name.startsWith('typescript-js/')) continue

    delete result[name]

    if (target && !(target in result)) result[target] = value
  }

  return result
}

// The user approved dropping the uncovered SonarJS checks to remove TS6 entirely.
// Keep the published preset and all JS plugins that do not require its compiler API.
export function nativeLintConfig(config: Config): Config {
  return {
    ...config,
    ...(config.extends && { extends: config.extends.map((extended) => nativeLintConfig(extended)) }),
    ...(config.jsPlugins && {
      jsPlugins: config.jsPlugins.filter((plugin) => {
        const name = typeof plugin === 'string' ? plugin : plugin.name

        return name !== 'sonarjs' && name !== 'typescript-js'
      }),
    }),
    rules: nativeRules(config.rules),
    ...(config.overrides && {
      overrides: config.overrides.map((override) => ({ ...nativeLintConfig(override), files: override.files })),
    }),
  }
}
