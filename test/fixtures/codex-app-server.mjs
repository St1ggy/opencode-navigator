function readLines() {
  let buffer = ''

  return (chunk) => {
    buffer += chunk.toString()
    let end

    while ((end = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, end)

      buffer = buffer.slice(end + 1)
      const request = JSON.parse(line)

      if (request.id === undefined) continue

      if (request.method === 'initialize') {
        process.stdout.write(`${JSON.stringify({ id: request.id, result: {} })}\n`)
        continue
      }

      if (request.method === 'test/hang') continue

      if (request.method === 'test/unknown') {
        process.stdout.write(
          `${JSON.stringify({ id: request.id, error: { code: -32_601, message: 'unsupported' } })}\n`,
        )
        continue
      }

      if (request.method === 'test/partial') {
        const response = JSON.stringify({ id: request.id, result: { value: 'partial' } })

        process.stdout.write(response.slice(0, 12))
        setTimeout(() => process.stdout.write(`${response.slice(12)}\n`), 5)
        continue
      }

      if (request.method === 'test/delayed') {
        setTimeout(
          () => process.stdout.write(`${JSON.stringify({ id: request.id, result: { value: 'delayed' } })}\n`),
          20,
        )
        continue
      }

      process.stdout.write('unrelated notification\n')
      process.stdout.write(`${JSON.stringify({ id: request.id, result: request.params })}\n`)
    }
  }
}

process.stdin.on('data', readLines())
