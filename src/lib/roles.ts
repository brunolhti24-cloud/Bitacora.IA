// Nombres de rol que ve la gente (en la base se guardan como claves cortas)
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Director de obra',
  director: 'Director de obra',
  residente: 'Residente de obra',
  administracion: 'Administración',
  subcontratista: 'Contratista',
  operador: 'Operador',
}

export function roleLabel(role?: string | null): string {
  return (role && ROLE_LABELS[role]) || ''
}

/** Director de obra: la base guarda a algunos como 'admin' y a otros como 'director'. */
export function isDirectorRole(role?: string | null): boolean {
  return role === 'admin' || role === 'director'
}
