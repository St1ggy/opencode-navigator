#!/usr/bin/env node
import { appendFileSync } from 'node:fs'

const args = process.argv.slice(2)

if (args.includes('--help')) process.stdout.write('--type\n')
else if (args.includes('--version')) process.stdout.write('gh synthetic fixture\n')
else if (args[0] === 'auth') process.exitCode = 0
else if (args.includes('--body-file')) {
  let body = ''

  for await (const chunk of process.stdin) body += chunk.toString()

  appendFileSync('/tmp/navigator-synthetic-gh.jsonl', `${JSON.stringify({ args, body })}\n`)
  process.stdout.write('https://github.com/St1ggy/opencode-navigator/issues/123\n')
} else process.exitCode = 1
