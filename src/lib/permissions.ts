import type { SupabaseClient } from '@supabase/supabase-js'
import { isDirectorRole } from '@/lib/roles'

// Permisos por obra, verificados en el servidor. Ocultar un botón no protege nada:
// cada acción vuelve a comprobar quién la llama y sobre qué obra actúa.

export type ProjectAccess =
  | { ok: true; userId: string; role: string; isDirector: boolean; projectId: string; status: ProjectStatus }
  | { ok: false; error: string }

/**
 * ¿El usuario puede trabajar en esta obra?
 * - El director que la creó.
 * - Su equipo (usuarios invitados por ese director).
 * - Usuarios asignados a la obra (project_members).
 * Con `roles`, además exige uno de esos roles ('director' cubre admin y director).
 */
export async function getProjectAccess(
  supabase: SupabaseClient,
  projectId: string | null | undefined,
  roles?: string[]
): Promise<ProjectAccess> {
  if (!projectId) return { ok: false, error: 'Falta la obra.' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autorizado' }

  const [{ data: profile }, withStatus] = await Promise.all([
    supabase.from('profiles').select('role, invited_by').eq('id', user.id).maybeSingle(),
    supabase.from('projects').select('id, created_by, status').eq('id', projectId).maybeSingle(),
  ])
  // Sin la migración del archivo no existe `status`: la obra se considera activa
  const project: { id: string; created_by: string | null; status?: string | null } | null = withStatus.error
    ? (await supabase.from('projects').select('id, created_by').eq('id', projectId).maybeSingle()).data
    : withStatus.data
  if (!project) return { ok: false, error: 'Obra no encontrada.' }

  const role = profile?.role || ''
  let allowed = project.created_by === user.id || (!!profile?.invited_by && project.created_by === profile.invited_by)
  if (!allowed) {
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()
    allowed = !!membership
  }
  if (!allowed) return { ok: false, error: 'No tienes acceso a esta obra.' }

  const isDirector = isDirectorRole(role)
  if (roles && !roles.some((r) => (r === 'director' ? isDirector : r === role))) {
    return { ok: false, error: 'Tu rol no puede realizar esta acción.' }
  }

  return { ok: true, userId: user.id, role, isDirector, projectId, status: projectStatus(project.status) }
}

export type ProjectStatus = 'activa' | 'terminada' | 'archivada'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  activa: 'Obra activa',
  terminada: 'Obra terminada',
  archivada: 'Obra archivada',
}

export function projectStatus(value: string | null | undefined): ProjectStatus {
  return value === 'terminada' || value === 'archivada' ? value : 'activa'
}

/** Mensaje de error si la obra está cerrada (no se registran cambios en obras terminadas o archivadas). */
export function closedProjectError(access: { status: ProjectStatus }): string | null {
  if (access.status === 'activa') return null
  return `La obra está ${access.status}. Reactívala desde Archivo para registrar cambios.`
}

/** Obra a la que pertenece un registro (bitácora, material, área, tarea, solicitud). */
export async function projectIdOf(
  supabase: SupabaseClient,
  table: 'daily_reports' | 'materials' | 'project_areas' | 'tasks' | 'special_requests',
  id: string
): Promise<string | null> {
  const { data } = await supabase.from(table).select('project_id').eq('id', id).maybeSingle()
  return (data?.project_id as string | undefined) || null
}
