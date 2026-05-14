export function isAdminRole(role: string | undefined | null): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}
