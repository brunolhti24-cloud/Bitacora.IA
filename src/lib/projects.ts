import type { SupabaseClient } from '@supabase/supabase-js'
import { isDirectorRole } from '@/lib/roles'

/**
 * Obras que ve el usuario en el tablero: las de su constructora (el director que
 * lo invitó, o él mismo si es el director). Quien no pertenece a ningún equipo ve
 * solo las obras a las que lo asignaron (las filtra la base con sus reglas).
 * Antes se tomaba "el primer admin" de toda la base, que podía ser de otra empresa.
 */
export async function getVisibleProjectsQuery(
  supabase: SupabaseClient,
  userId: string,
  profile: { role?: string | null; invited_by?: string | null } | null
) {
  let query = supabase.from('projects').select('*')

  if (profile?.invited_by) query = query.eq('created_by', profile.invited_by)
  else if (isDirectorRole(profile?.role)) query = query.eq('created_by', userId)

  return query.order('created_at', { ascending: false })
}
