#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { copyFile, mkdir, rename, unlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parseArgs, promisify } from 'node:util'

const filename = 'OpenCodeNavigatorCorners.ttf'
const execute = promisify(execFile)
const { values } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    directory: { type: 'string' },
    source: { type: 'string' },
    uninstall: { type: 'boolean' },
  },
})

if (values.help) {
  console.log('Usage: opencode-navigator-font [--uninstall] [--directory PATH] [--source FONT.ttf]')
  console.log('Installs the Navigator corner font for the current user. Keep your main terminal font unchanged.')
} else {
  const directories = {
    darwin: join(homedir(), 'Library', 'Fonts'),
    linux: join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'fonts', 'opencode-navigator'),
    win32: process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Microsoft', 'Windows', 'Fonts'),
  }
  const directory = values.directory || directories[process.platform]

  if (!directory) throw new Error('Specify --directory with your user font directory on this platform.')

  const destination = resolve(directory, filename)
  const registry = String.raw`HKCU\Software\Microsoft\Windows NT\CurrentVersion\Fonts`
  const fontName = 'OpenCode Navigator Corners (TrueType)'

  if (values.uninstall) {
    await unlink(destination)

    if (process.platform === 'win32' && !values.directory) {
      await execute('reg.exe', ['delete', registry, '/v', fontName, '/f'])
    }

    console.log(`Removed ${destination}`)
  } else {
    const source = values.source
      ? resolve(values.source)
      : fileURLToPath(new URL(`../assets/${filename}`, import.meta.url))

    await mkdir(dirname(destination), { recursive: true })
    const temporary = `${destination}.${process.pid}.tmp`

    try {
      await copyFile(source, temporary)
      await rename(temporary, destination)
    } finally {
      await unlink(temporary).catch((error) => {
        if (error.code !== 'ENOENT') throw error
      })
    }

    if (process.platform === 'win32' && !values.directory) {
      await execute('reg.exe', ['add', registry, '/v', fontName, '/t', 'REG_SZ', '/d', destination, '/f'])
    }

    console.log(`Installed ${destination}`)
  }

  if (process.platform === 'linux' && !values.directory) {
    await execute('fc-cache', ['-f', directory])
  }

  console.log('Fully restart your terminal application, then restart OpenCode.')
}
