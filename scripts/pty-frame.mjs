import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

// Inspect synthetic PTY output, including updates that omit unchanged cells.
export function ptyFrame(source, width = 120, height = 40) {
  const empty = () => Array.from({ length: height }, () => Array.from({ length: width }, () => ' '))
  let grid = empty()
  let x = 0
  let y = 0
  const write = (text) => {
    for (const character of text) {
      if (y >= 0 && y < height && x >= 0 && x < width) grid[y][x] = character

      x += Bun.stringWidth(character)
    }
  }
  const control = (code, values) => {
    const count = values[0] || 1

    switch (code === 'f' ? 'H' : code) {
      case 'H': {
        y = (values[0] || 1) - 1
        x = (values[1] || 1) - 1

        break
      }

      case 'G': {
        x = count - 1

        break
      }

      case 'A': {
        y -= count

        break
      }

      case 'B': {
        y += count

        break
      }

      case 'C': {
        x += count

        break
      }

      case 'D': {
        x -= count

        break
      }

      case 'J': {
        if (values[0] === 2) grid = empty()

        break
      }

      case 'K': {
        if (y >= 0 && y < height)
          for (let column = values[0] === 2 ? 0 : x; column < width; column++) grid[y][column] = ' '

        break
      }
    }
  }

  for (let index = 0; index < source.length;) {
    if (source[index] === '\u{1B}') {
      const rest = source.slice(index)
      const csi = /^\u{1B}\[([0-?]*)([ -/]*)([@-~])/u.exec(rest)

      if (csi) {
        const values = csi[1].replace(/^\?/u, '').split(';').map(Number)

        control(csi[3], values)
        index += csi[0].length

        continue
      }

      const osc = /^\u{1B}\]([\s\S]*?)(?:\u{7}|\u{1B}\\)/u.exec(rest)

      if (osc) {
        if (osc[1].startsWith('66;')) write(osc[1].split(';').slice(2).join(';'))

        index += osc[0].length

        continue
      }

      const dcs = /^\u{1B}P[\s\S]*?\u{1B}\\/u.exec(rest)

      index += dcs?.[0].length ?? 2

      continue
    }

    const character = String.fromCodePoint(source.codePointAt(index))

    index += character.length

    if (character === '\r') x = 0
    else if (character === '\n') y = Math.min(height - 1, y + 1)
    else if (character >= ' ') write(character)
  }

  return grid.map((line) => line.join('')).join('\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(ptyFrame(await readFile(process.argv[2], 'utf8')))
