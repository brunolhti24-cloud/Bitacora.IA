import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Obras que ve el usuario en el tablero: las suyas si es el director principal,
 * o las del director que lo invitó.
 */
export async function getVisibleProjectsQuery(
  supabase: SupabaseClient,
  userId: string,
  profile: { role?: string | null; invited_by?: string | null } | null
) {
  let query = supabase.from('projects').select('*')

  if (profile?.role === 'admin') {
    query = query.eq('created_by', userId)
  } else if (profile?.invited_by) {
    query = query.eq('created_by', profile.invited_by)
  } else {
    const { data: mainAdmin } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).maybeSingle()
    if (mainAdmin) query = query.eq('created_by', mainAdmin.id)
  }

  return query.order('created_at', { ascending: false })
}
