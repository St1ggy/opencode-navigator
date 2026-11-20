export function hostVersions(line: 'v1' | 'v2'): { minimum: string; latest: string }
export function hostVersion(line: 'v1' | 'v2', endpoint?: 'minimum' | 'latest'): string
