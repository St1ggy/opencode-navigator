export function publishedHost(
  line: 'v1' | 'v2',
  request?: (url: string, options?: RequestInit) => Promise<Response>,
): Promise<{ version: string; integrity: string }>
