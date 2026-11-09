'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(prevState: any, formData: FormData) {
  try {
    const supabase = await createClient()

    const data = {
      email: (formData.get('email') as string || '').trim().toLowerCase(),
      password: formData.get('password') as string,
    }

    if (!data.email || !data.password) {
      return { error: 'El correo y la contraseña son requeridos.' }
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword(data)

    if (error) {
      return { error: error.message || 'Credenciales inválidas.' }
    }

    if (authData?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle()

      revalidatePath('/', 'layout')
      if (profile?.role === 'subcontratista') {
        redirect('/dashboard/mis-tareas')
      } else {
        redirect('/dashboard')
      }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
      throw err
    }
    console.error('Login action error:', err)
    return { error: err?.message || 'Error al iniciar sesión' }
  }
}

// validateInviteCode: Valida el código de invitación y devuelve el rol y la empresa.
// Con la migración de seguridad, las invitaciones solo se leen con lookup_invite.
export async function validateInviteCode(code: string) {
  const supabase = await createClient()
  const clean = code.trim().toUpperCase()

  const { data: rows, error } = await supabase.rpc('lookup_invite', { p_code: clean })
  let invite = Array.isArray(rows) ? rows[0] : null
  if (error) {
    // Sin la migración todavía: lectura directa de la tabla
    const { data } = await supabase.from('company_invites').select('role, company_name').eq('code', clean).maybeSingle()
    invite = data
  }

  if (!invite) {
    return { error: 'El código de invitación no es válido.' }
  }

  return { role: invite.role as string, company_name: invite.company_name as string | undefined }
}

// incrementInviteUsage: Incrementa el contador de usos de un código

// upsertProfile: Crea o actualiza el perfil del usuario
// Completa el perfil después de crear la cuenta. El rol y el equipo se deciden aquí,
// en el servidor: el navegador solo envía el nombre y el código de invitación.
export async function completeSignup(fullName: string, inviteCode?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No hay sesión activa.' }

  const code = (inviteCode || '').trim().toUpperCase()

  // La base decide el rol y el equipo (migración 20261109). Nadie puede cambiarlos desde el navegador.
  const { data: rpcRole, error: rpcError } = await supabase.rpc('complete_signup', { p_full_name: fullName, p_code: code || null })
  if (!rpcError) return { success: true, role: rpcRole as string }
  if (!isMissingFunction(rpcError)) return { error: rpcError.message }

  // Sin la migración todavía: misma lógica desde el servidor
  const { data: existing } = await supabase
    .from('profiles')
    .select('role, invited_by, company_name')
    .eq('id', user.id)
    .maybeSingle()

  const payload: Record<string, unknown> = { id: user.id, full_name: fullName.trim() }
  let consumedInvite: { id: string; used_count: number | null } | null = null

  if (code) {
    const { data: invite } = await supabase
      .from('company_invites')
      .select('id, role, company_name, created_by, used_count')
      .eq('code', code)
      .maybeSingle()
    if (!invite) return { error: 'El código de invitación no es válido.' }

    // Solo se une a un equipo quien aún no pertenece a otro (o ya es de este mismo)
    if (!existing?.invited_by || existing.invited_by === invite.created_by) {
      payload.role = invite.role === 'admin' ? 'residente' : invite.role
      payload.invited_by = invite.created_by
      payload.company_name = invite.company_name || null
      if (!existing?.invited_by) consumedInvite = invite
    }
  } else if (!existing) {
    // Cuenta nueva sin invitación: director de su propia constructora
    payload.role = 'admin'
  }
  // Un perfil existente sin código conserva su rol

  const { error } = await supabase.from('profiles').upsert(payload)
  if (error) return { error: error.message }

  if (consumedInvite) {
    await supabase
      .from('company_invites')
      .update({ used_count: (consumedInvite.used_count || 0) + 1 })
      .eq('id', consumedInvite.id)
  }

  return { success: true, role: (payload.role as string) || existing?.role || 'admin' }
}

// La función aún no existe en la base (falta aplicar la migración)
function isMissingFunction(error: { code?: string; message?: string }) {
  return error.code === 'PGRST202' || error.code === '42883' || /could not find the function/i.test(error.message || '')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
