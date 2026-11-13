import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'

const state = JSON.parse(readFileSync('state.json', 'utf8'))
const args = process.argv.slice(2)
const tool = process.argv[1].endsWith('git') ? 'git' : 'gh'
const route = args.find((arg) => arg.startsWith('repos/'))

appendFileSync('calls.jsonl', `${JSON.stringify({ tool, args })}\n`)

function reply(value) {
  if (typeof value === 'string') process.stdout.write(value)
  else process.stdout.write(JSON.stringify(value))
}

if (tool === 'git') {
  if (args[0] === 'rev-parse') reply(state.committed ? state.head : state.base)
  else if (args[0] === 'commit') state.committed = true
  else if (args[0] === 'diff' && args.includes('--cached') && state.scenario !== 'no-diff')
    reply('screenshots/scene.png\0')
} else if (args[0] === 'api') {
  if (route.endsWith('/git/ref/heads/main')) reply({ object: { sha: state.merged ? state.merge : state.base } })
  else if (route.includes('/actions/workflows/ci.yml/runs')) {
    reply({ workflow_runs: [{ id: 123, display_title: 'release-10-1-screenshots' }] })
  } else if (route.endsWith('/actions/runs/123')) {
    reply({
      id: 123,
      head_sha: state.scenario === 'wrong-ci-head' ? state.base : state.head,
      status: 'completed',
      conclusion: state.scenario === 'failed-ci' ? 'failure' : 'success',
      event: 'workflow_dispatch',
      path: '.github/workflows/ci.yml',
    })
  } else if (route.includes('/actions/runs/123/jobs')) {
    reply([{ jobs: state.contexts.map((name) => ({ name, status: 'completed', conclusion: 'success' })) }])
  } else if (route.endsWith('/pulls')) reply({ number: 1 })
  else if (route.endsWith('/pulls/1')) {
    reply({
      state: 'open',
      merged: false,
      merge_commit_sha: null,
      user: { login: state.scenario === 'foreign-author' ? 'other[bot]' : 'release[bot]', type: 'Bot' },
      head: {
        sha: state.scenario === 'changed-head' ? state.base : state.head,
        ref: 'automation/release-screenshots-10-1',
        repo: { full_name: state.repository },
      },
      base: { sha: state.base, ref: 'main', repo: { full_name: state.repository } },
    })
  } else if (route.includes('/pulls/1/files')) {
    reply([
      [
        {
          filename: state.scenario === 'source-change' ? 'src/source.ts' : 'screenshots/scene.png',
          status: 'modified',
        },
      ],
    ])
  } else if (route.includes('/check-runs')) {
    reply([
      {
        check_runs: state.contexts.map((name) => ({
          name,
          app: { id: 15_368 },
          status: 'completed',
          conclusion: 'success',
        })),
      },
    ])
  } else if (route.endsWith('/pulls/1/merge')) {
    state.merged = true
    reply({ merged: true, sha: state.merge })
  } else if (route.includes('/git/commits/')) reply({ parents: [{ sha: state.base }] })
  else throw new Error(`Unexpected API call: ${route}`)
}

writeFileSync('state.json', JSON.stringify(state))
