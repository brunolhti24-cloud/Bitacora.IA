'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  if (authData.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    revalidatePath('/', 'layout')
    if (profile?.role === 'subcontratista') {
      redirect('/dashboard/mis-tareas')
    } else {
      redirect('/dashboard')
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// validateInviteCode: Valida el código de invitación y devuelve el rol y empresa
export async function validateInviteCode(code: string) {
  const supabase = await createClient()

  const { data: invite } = await supabase
    .from('company_invites')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .single()

  if (!invite) {
    return { error: 'El código de invitación no es válido.' }
  }

  return { 
    role: invite.role, 
    company_name: invite.company_name, 
    invite_id: invite.id, 
    used_count: invite.used_count,
    created_by: invite.created_by 
  }
}

// incrementInviteUsage: Incrementa el contador de usos de un código
export async function incrementInviteUsage(inviteId: string, currentCount: number) {
  const supabase = await createClient()
  await supabase
    .from('company_invites')
    .update({ used_count: currentCount + 1 })
    .eq('id', inviteId)
}

// upsertProfile: Crea o actualiza el perfil del usuario
export async function upsertProfile(userId: string, fullName: string, role: string, companyName?: string, invitedBy?: string) {
  const supabase = await createClient()
  const payload: any = {
    id: userId,
    full_name: fullName,
    role,
    company_name: companyName || null
  }
  if (invitedBy) {
    payload.invited_by = invitedBy
  }

  const { error } = await supabase.from('profiles').upsert(payload)
  if (error && error.message.includes('invited_by')) {
    delete payload.invited_by
    await supabase.from('profiles').upsert(payload)
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
