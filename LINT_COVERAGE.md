# TypeScript 7 Lint Coverage

Project type checking uses stable TypeScript 7. The lockfile resolves every
TypeScript dependency, including the shared preset's dependency tree, to that
version. There is no TypeScript 6 compatibility installation.

Oxlint uses `@st1ggy/linter-config/solid-ox` with type-aware analysis. Oxfmt uses
`@st1ggy/linter-config/oxfmt-common`. `scripts/native-lint-config.ts` adapts the
published preset without editing installed packages. The user explicitly approved
the uncovered SonarJS checks below after reviewing the TS7 incompatibility.

## Preserved Checks

- Native ESLint, TypeScript, import and Unicorn rules remain enabled.
- The compatible Solid, ESLint-core, import-x, stylistic and Unicorn JS plugins
  remain enabled. There is no blanket removal of JS plugins.
- `typescript-js/array-type` and `typescript-js/prefer-as-const` use their native
  `typescript/` equivalents. The legacy typescript-eslint plugin is not loaded.
- Six SonarJS checks use native ESLint equivalents: `block-scoped-var`,
  `no-delete-var`, `no-fallthrough`, `no-labels`, `no-unused-vars` and
  `no-useless-catch`. Existing native options take precedence.
- Oxfmt still checks formatting separately. This migration does not configure
  Stylelint for the CSS-free TUI project.

## Approved Coverage Loss

The published preset configures 161 SonarJS rule names. Six have the direct
native mappings above. The following 155 preset checks are not loaded after
removing the TS6-dependent SonarJS plugin. Some overlap with other retained rules,
but that is not claimed as complete semantic equivalence. The list includes
checks for frameworks and services this project does not use; it describes the
preset, not 155 distinct bugs or applicable findings in Navigator.

In particular, native cyclomatic complexity is not a replacement for SonarJS
cognitive complexity. Identical-function detection, several security/regex
checks and SonarJS-specific test heuristics lose their dedicated coverage.

```text
sonarjs/assertions-in-test-cases
sonarjs/async-test-assertions
sonarjs/aws-apigateway-public-api
sonarjs/aws-ec2-rds-dms-public
sonarjs/aws-ec2-unencrypted-ebs-volume
sonarjs/aws-efs-unencrypted
sonarjs/aws-iam-all-privileges
sonarjs/aws-iam-privilege-escalation
sonarjs/aws-iam-public-access
sonarjs/aws-opensearchservice-domain
sonarjs/aws-rds-unencrypted-databases
sonarjs/aws-restricted-ip-admin-access
sonarjs/aws-s3-bucket-granted-access
sonarjs/aws-s3-bucket-insecure-http
sonarjs/aws-s3-bucket-public-access
sonarjs/aws-s3-bucket-versioning
sonarjs/aws-sagemaker-unencrypted-notebook
sonarjs/aws-sns-unencrypted-topics
sonarjs/aws-sqs-unencrypted-queue
sonarjs/call-argument-line
sonarjs/chai-determinate-assertion
sonarjs/class-name
sonarjs/code-eval
sonarjs/cognitive-complexity
sonarjs/comma-or-logical-or-case
sonarjs/constructor-for-side-effects
sonarjs/content-length
sonarjs/content-security-policy
sonarjs/cookie-no-httponly
sonarjs/cors
sonarjs/csrf
sonarjs/disabled-timeout
sonarjs/dynamically-constructed-templates
sonarjs/encryption-secure-mode
sonarjs/explicit-test-skip
sonarjs/file-permissions
sonarjs/file-uploads
sonarjs/fixme-tag
sonarjs/for-loop-increment-sign
sonarjs/function-inside-loop
sonarjs/future-reserved-words
sonarjs/generator-without-yield
sonarjs/hardcoded-secret-signatures
sonarjs/hashing
sonarjs/hooks-before-test-cases
sonarjs/inconsistent-function-call
sonarjs/insecure-cookie
sonarjs/insecure-jwt-token
sonarjs/inverted-assertion-arguments
sonarjs/label-position
sonarjs/link-with-target-blank
sonarjs/max-switch-cases
sonarjs/memoize-cache-key
sonarjs/misplaced-loop-counter
sonarjs/no-all-duplicated-branches
sonarjs/no-angular-bypass-sanitization
sonarjs/no-case-label-in-switch
sonarjs/no-clear-text-protocols
sonarjs/no-code-after-done
sonarjs/no-dead-store
sonarjs/no-debug-commands-in-ui-tests
sonarjs/no-default-utility-imports
sonarjs/no-duplicate-in-composite
sonarjs/no-duplicate-test-title
sonarjs/no-duplicated-branches
sonarjs/no-element-overwrite
sonarjs/no-empty-collection
sonarjs/no-empty-test-file
sonarjs/no-empty-test-title
sonarjs/no-equals-in-for-termination
sonarjs/no-exclusive-tests
sonarjs/no-extra-arguments
sonarjs/no-fixed-wait-in-tests
sonarjs/no-floating-point-equality
sonarjs/no-forced-browser-interaction
sonarjs/no-global-this
sonarjs/no-globals-shadowing
sonarjs/no-gratuitous-expressions
sonarjs/no-hardcoded-ip
sonarjs/no-hardcoded-passwords
sonarjs/no-hardcoded-secrets
sonarjs/no-hook-setter-in-body
sonarjs/no-identical-conditions
sonarjs/no-identical-expressions
sonarjs/no-identical-functions
sonarjs/no-ignored-exceptions
sonarjs/no-implicit-global
sonarjs/no-incomplete-assertions
sonarjs/no-internal-api-use
sonarjs/no-interpolation-in-inline-snapshots
sonarjs/no-invariant-returns
sonarjs/no-inverted-boolean-check
sonarjs/no-literal-call
sonarjs/no-mime-sniff
sonarjs/no-mixed-completion-style
sonarjs/no-nested-assignment
sonarjs/no-nested-conditional
sonarjs/no-nested-functions
sonarjs/no-nested-template-literals
sonarjs/no-os-command-from-path
sonarjs/no-parameter-reassignment
sonarjs/no-primitive-wrappers
sonarjs/no-redundant-assignments
sonarjs/no-redundant-boolean
sonarjs/no-redundant-jump
sonarjs/no-referrer-policy
sonarjs/no-same-argument-assert
sonarjs/no-same-line-conditional
sonarjs/no-session-cookies-on-static-assets
sonarjs/no-skipped-tests
sonarjs/no-table-as-layout
sonarjs/no-trivial-assertions
sonarjs/no-unenclosed-multiline-block
sonarjs/no-uniq-key
sonarjs/no-unthrown-error
sonarjs/no-unused-collection
sonarjs/no-use-of-empty-return-value
sonarjs/no-useless-increment
sonarjs/no-useless-react-setstate
sonarjs/no-weak-cipher
sonarjs/no-weak-keys
sonarjs/non-existent-operator
sonarjs/object-alt-content
sonarjs/parameterized-tests
sonarjs/prefer-default-last
sonarjs/prefer-native-lodash-alternative
sonarjs/prefer-promise-shorthand
sonarjs/prefer-single-boolean-return
sonarjs/prefer-specific-assertions
sonarjs/prefer-type-guard
sonarjs/prefer-while
sonarjs/production-debug
sonarjs/pseudo-random
sonarjs/public-static-readonly
sonarjs/publicly-writable-directories
sonarjs/redundant-type-aliases
sonarjs/review-blockchain-mnemonic
sonarjs/session-regeneration
sonarjs/stable-tests
sonarjs/stateful-regex
sonarjs/strict-transport-security
sonarjs/super-linear-regex
sonarjs/synchronous-suite-callback
sonarjs/table-header
sonarjs/table-header-reference
sonarjs/test-check-exception
sonarjs/todo-tag
sonarjs/unverified-certificate
sonarjs/unverified-hostname
sonarjs/updated-const-var
sonarjs/updated-loop-counter
sonarjs/use-type-alias
sonarjs/weak-ssl
sonarjs/x-powered-by
sonarjs/xml-parser-xxe
```

## Removing The Adapter

Replace the compatibility projection when the shared preset offers a TS7-only
stack with equivalent native rules or compatible public plugin APIs. Keep the
coverage inventory explicit when upgrading that preset; do not label a removed
check as preserved merely because a similarly named rule exists.
