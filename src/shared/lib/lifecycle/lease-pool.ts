export function createLeasePool<T>(create: (key: string) => { value: T; dispose(): void }) {
  const entries = new Map<string, { value: T; dispose(): void; leases: Set<symbol> }>()
  let closed = false

  return {
    acquire(key: string) {
      if (closed) throw new Error('Resource pool is disposed')

      let entry = entries.get(key)

      if (!entry) {
        const resource = create(key)

        if (closed) {
          resource.dispose()
          throw new Error('Resource pool is disposed')
        }

        entry = { ...resource, leases: new Set() }
        entries.set(key, entry)
      }

      const lease = Symbol(key)
      const current = entry

      current.leases.add(lease)

      return {
        value: current.value,
        release() {
          if (entries.get(key) !== current || !current.leases.delete(lease) || current.leases.size > 0) return

          entries.delete(key)
          current.dispose()
        },
      }
    },
    invalidate(key: string) {
      const entry = entries.get(key)

      if (!entry) return

      entries.delete(key)
      entry.dispose()
    },
    dispose() {
      if (closed) return

      closed = true
      const resources = [...entries.values()]
      const errors: unknown[] = []

      entries.clear()
      for (const entry of resources) {
        try {
          entry.dispose()
        } catch (error) {
          errors.push(error)
        }
      }

      if (errors.length > 0) throw new AggregateError(errors, 'Resource cleanup failed')
    },
  }
}
