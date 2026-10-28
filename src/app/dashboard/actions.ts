'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isDirectorRole } from '@/lib/roles'
import { getProjectAccess, projectIdOf } from '@/lib/permissions'

export async function createProject(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isDirectorRole(profile?.role)) return { error: 'Solo el director de obra puede crear proyectos' }

  const name = formData.get('name') as string
  const client_name = formData.get('client_name') as string
  const location = formData.get('location') as string
  const base_budget = parseFloat((formData.get('base_budget') as string || '').replace(/,/g, '')) || 0
  const start_date = formData.get('start_date') as string || null
  const image = formData.get('image') as File | null

  if (!name) return { error: 'El nombre del proyecto es requerido' }

  let image_url = null
  if (image && image.size > 0) {
    const fileExt = image.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project_images')
      .upload(fileName, image)
    
    if (uploadError) return { error: `Error subiendo imagen: ${uploadError.message}` }
    
    const { data: { publicUrl } } = supabase.storage.from('project_images').getPublicUrl(fileName)
    image_url = publicUrl
  }

  const { error } = await supabase
    .from('projects')
    .insert([
      { name, client_name, location, base_budget, start_date, image_url, created_by: user.id }
    ])

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function updateProject(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isDirectorRole(profile?.role)) return { error: 'Solo el director de obra puede editar proyectos' }

  const id = formData.get('id') as string
  const access = await getProjectAccess(supabase, id, ['director'])
  if (!access.ok) return { error: access.error }
  const name = formData.get('name') as string
  const client_name = formData.get('client_name') as string
  const location = formData.get('location') as string
  const base_budget = parseFloat((formData.get('base_budget') as string || '').replace(/,/g, '')) || 0
  const start_date = formData.get('start_date') as string || null
  const image = formData.get('image') as File | null

  if (!name || !id) return { error: 'El nombre y el ID son requeridos' }

  let updateData: any = { name, client_name, location, base_budget, start_date }

  if (image && image.size > 0) {
    const fileExt = image.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from('project_images')
      .upload(fileName, image)
    
    if (uploadError) return { error: `Error subiendo imagen: ${uploadError.message}` }
    
    const { data: { publicUrl } } = supabase.storage.from('project_images').getPublicUrl(fileName)
    updateData.image_url = publicUrl
  }

  const { error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function deleteProject(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string

  if (!id) return

  // Solo el director de la obra puede eliminarla
  const access = await getProjectAccess(supabase, id, ['director'])
  if (!access.ok) return

  await supabase.from('projects').delete().eq('id', id)
  revalidatePath('/dashboard')
}

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/lib/supabase/config'

// Cliente con llave de servicio (salta RLS). Solo para operaciones que ya se
// autorizaron en el servidor. No se exporta: los archivos 'use server' exponen
// sus exports como acciones invocables desde el navegador.
function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  const { url } = getSupabaseConfig()
  return createSupabaseAdmin(url, key)
}

// Roles que el director puede asignar a su equipo (nunca 'admin')
const ASSIGNABLE_ROLES = ['director', 'residente', 'administracion', 'subcontratista', 'operador']

export async function createTask(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const project_id = formData.get('project_id') as string
  const access = await getProjectAccess(supabase, project_id, ['director', 'residente', 'subcontratista'])
  if (!access.ok) return { error: access.error }
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const assigned_to = formData.get('assigned_to') as string || null
  const due_date = (formData.get('due_date') as string) || null
  const area_id = (formData.get('area_id') as string) || null
  const priorityRaw = (formData.get('priority') as string) || 'normal'
  const priority = ['baja', 'normal', 'alta', 'urgente'].includes(priorityRaw) ? priorityRaw : 'normal'

  // Enviar correo de notificacion con Resend si el usuario tiene email en profile
  if (assigned_to) {
    const { data: assignedUser } = await supabase.from('profiles').select('email, full_name').eq('id', assigned_to).single()
    const { data: project } = await supabase.from('projects').select('name').eq('id', project_id).single()

    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && assignedUser?.email) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`
          },
          body: JSON.stringify({
            from: 'Bitacor.AI <onboarding@resend.dev>',
            to: [assignedUser.email],
            subject: `Nueva tarea asignada: ${title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px; color: white; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px;">Bitacor.AI</h1>
                  <p style="margin: 5px 0 0; opacity: 0.8; font-size: 14px;">Sistema de Gestion de Obra</p>
                </div>
                <div style="padding: 30px 20px;">
                  <h2 style="color: #1a1a2e; margin-top: 0;">Hola ${assignedUser.full_name || ''}, se te ha asignado una nueva tarea</h2>
                  <div style="background: #f8f9fa; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                    <p style="margin: 0 0 8px; font-weight: bold; color: #1e293b; font-size: 18px;">${title}</p>
                    ${description ? `<p style="margin: 0; color: #64748b;">${description}</p>` : ''}
                  </div>
                  <p style="color: #64748b;"><strong>Proyecto:</strong> ${project?.name || 'Sin nombre'}</p>
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="http://localhost:3000/login" style="background: #3b82f6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                      Ver mis tareas
                    </a>
                  </div>
                </div>
              </div>
            `
          })
        })
      } catch (emailErr) {
        console.error('Error enviando correo:', emailErr)
      }
    }
  }

  const { error } = await supabase
    .from('tasks')
    .insert([{ project_id, title, description, assigned_to, status: 'Pendiente', due_date, area_id, priority }])

  if (error) return { error: error.message }

  revalidatePath('/dashboard/projects/' + project_id)
  revalidatePath('/dashboard/mis-tareas')
  return { success: true }
}

export async function updateTaskStatus(taskId: string, status: string, projectId: string) {
  const supabase = await createClient()
  const access = await getProjectAccess(supabase, await projectIdOf(supabase, 'tasks', taskId))
  if (!access.ok) throw new Error(access.error)
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/projects/' + projectId)
}

export async function setTaskBlocked(taskId: string, blocked: boolean, reason: string | null, projectId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }
  const access = await getProjectAccess(supabase, await projectIdOf(supabase, 'tasks', taskId))
  if (!access.ok) return { error: access.error }
  if (blocked && !reason?.trim()) return { error: 'Indica qué está bloqueando la tarea.' }

  const { error } = await supabase
    .from('tasks')
    .update({ is_blocked: blocked, blocked_reason: blocked ? reason!.trim() : null, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) return { error: error.message }
  if (projectId) revalidatePath('/dashboard/projects/' + projectId)
  revalidatePath('/dashboard/mis-tareas')
  return { success: true }
}

export async function deleteTask(taskId: string, projectId?: string) {
  const supabase = await createClient()
  const access = await getProjectAccess(supabase, await projectIdOf(supabase, 'tasks', taskId), ['director', 'residente', 'subcontratista'])
  if (!access.ok) throw new Error(access.error)
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw new Error(error.message)
  if (projectId) {
    revalidatePath('/dashboard/projects/' + projectId)
  }
  revalidatePath('/dashboard/mis-tareas')
}

export async function createCompanyInvite(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: profile } = await supabase.from('profiles').select('company_name, role').eq('id', user.id).single()
  if (!isDirectorRole(profile?.role)) {
    return { error: 'Solo el director de obra puede crear enlaces de invitación para su equipo.' }
  }

  const role = (formData.get('role') as string) || 'residente'
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const code = `BOGO-${randomSuffix}`

  const { error } = await supabase
    .from('company_invites')
    .insert([
      {
        created_by: user.id,
        code,
        role,
        company_name: profile?.company_name || null,
        used_count: 0
      }
    ])

  if (error) return { error: error.message }

  revalidatePath('/dashboard/equipo')
  return { success: true, code, role }
}

export async function createSpecialRequest(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const project_id = formData.get('project_id') as string
  const access = await getProjectAccess(supabase, project_id)
  if (!access.ok) return { error: access.error }
  const category = formData.get('category') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const quantity = parseInt(formData.get('quantity') as string) || 1
  const unit = (formData.get('unit') as string) || 'pzas'
  const urgency = (formData.get('urgency') as string) || 'normal'
  const needed_by = (formData.get('needed_by') as string) || null

  if (!project_id || !title || !category) {
    return { error: 'Proyecto, categoría y título son obligatorios' }
  }

  const { data: created, error } = await supabase
    .from('special_requests')
    .insert([
      {
        project_id,
        requested_by: user.id,
        category,
        title,
        description,
        quantity,
        unit,
        urgency,
        needed_by,
        status: 'pendiente'
      }
    ])
    .select('id')
    .single()

  if (error) return { error: error.message }
  if (created) await logRequestEvent(supabase, created.id, project_id, 'solicitada', user.id, null)

  revalidatePath('/dashboard/projects/' + project_id)
  return { success: true }
}

type RequestStage = 'solicitada' | 'aprobada' | 'rechazada' | 'comprada' | 'entregada' | 'recibida'

async function logRequestEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requestId: string,
  projectId: string,
  stage: RequestStage,
  actor: string,
  note: string | null
) {
  const { error } = await supabase
    .from('special_request_events')
    .insert([{ request_id: requestId, project_id: projectId, stage, actor, note: note?.trim() || null }])
  if (error) console.error('No se registró el evento de la solicitud:', error.message)
}

export async function updateSpecialRequestStatus(requestId: string, status: 'aprobada' | 'rechazada' | 'pendiente', director_comment?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }
  const access = await getProjectAccess(supabase, await projectIdOf(supabase, 'special_requests', requestId), ['director'])
  if (!access.ok) return { error: access.error }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'director') {
    return { error: 'Solo el director puede aprobar o rechazar solicitudes.' }
  }

  const { data: updated, error } = await supabase
    .from('special_requests')
    .update({
      status,
      stage: status === 'aprobada' ? 'aprobada' : null,
      director_comment: director_comment || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select('project_id')
    .single()

  if (error) return { error: error.message }

  if (updated && status !== 'pendiente') {
    await logRequestEvent(supabase, requestId, updated.project_id, status, user.id, director_comment || null)
    revalidatePath('/dashboard/projects/' + updated.project_id)
  }
  return { success: true }
}

// Seguimiento después de aprobar: compra, entrega en obra y recepción
const NEXT_STAGE: Record<string, 'comprada' | 'entregada' | 'recibida'> = {
  aprobada: 'comprada',
  comprada: 'entregada',
  entregada: 'recibida',
}
const STAGE_ROLES: Record<'comprada' | 'entregada' | 'recibida', string[]> = {
  comprada: ['admin', 'director', 'administracion'],
  entregada: ['admin', 'director', 'administracion', 'residente'],
  recibida: ['admin', 'director', 'residente'],
}

export async function advanceSpecialRequest(requestId: string, stage: 'comprada' | 'entregada' | 'recibida', note?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }
  const access = await getProjectAccess(supabase, await projectIdOf(supabase, 'special_requests', requestId))
  if (!access.ok) return { error: access.error }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!STAGE_ROLES[stage].includes(profile?.role || '')) {
    return { error: 'Tu rol no puede registrar esta etapa.' }
  }

  const { data: req } = await supabase.from('special_requests').select('project_id, status, stage').eq('id', requestId).single()
  if (!req) return { error: 'Solicitud no encontrada' }
  if (req.status !== 'aprobada' || NEXT_STAGE[req.stage || 'aprobada'] !== stage) {
    return { error: 'La solicitud no está en la etapa anterior a esta. Actualiza la página.' }
  }

  const { error } = await supabase
    .from('special_requests')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) return { error: error.message }

  await logRequestEvent(supabase, requestId, req.project_id, stage, user.id, note || null)
  revalidatePath('/dashboard/projects/' + req.project_id)
  return { success: true }
}

export async function updateProfile(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', success: false }

  const full_name = formData.get('full_name') as string
  const company_name = formData.get('company_name') as string
  const logoFile = formData.get('company_logo') as File | null

  if (!full_name) {
    return { error: 'El nombre completo es obligatorio', success: false }
  }

  let company_logo_url: string | undefined = undefined

  if (logoFile && logoFile.size > 0) {
    const fileExt = logoFile.name.split('.').pop()
    const fileName = `logo_${user.id}_${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('company_logos')
      .upload(fileName, logoFile, { upsert: true })

    if (uploadError) {
      return { error: `Error al subir el logo: ${uploadError.message}`, success: false }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('company_logos')
      .getPublicUrl(fileName)

    company_logo_url = publicUrl
  }

  const updateData: any = { full_name, company_name }
  if (company_logo_url) {
    updateData.company_logo_url = company_logo_url
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (error) return { error: error.message, success: false }

  revalidatePath('/dashboard', 'layout')
  return { error: null, success: true }
}

export async function updateTeamMember(memberId: string, fullName: string, role: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }
  if (!fullName?.trim()) return { error: 'El nombre es obligatorio.' }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  // Cualquier usuario puede corregir su propio nombre, pero no cambiarse el rol
  if (memberId === user.id) {
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', user.id)
    if (error) return { error: error.message }
    revalidatePath('/dashboard', 'layout')
    return { success: true }
  }

  if (!isDirectorRole(me?.role)) {
    return { error: 'Solo el director de obra puede editar la información del equipo.' }
  }
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return { error: 'Rol no válido.' }
  }

  // Solo miembros que el director invitó a su equipo
  const { data: member } = await supabase.from('profiles').select('id, invited_by').eq('id', memberId).maybeSingle()
  if (!member || member.invited_by !== user.id) {
    return { error: 'Ese usuario no pertenece a tu equipo.' }
  }

  const client = createAdminClient() || supabase
  const { error } = await client.from('profiles').update({ full_name: fullName.trim(), role }).eq('id', memberId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/equipo')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function getAdminProjects() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  return projects || []
}

export async function getMemberProjects(memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: member } = await supabase.from('profiles').select('invited_by').eq('id', memberId).maybeSingle()
  if (member?.invited_by !== user.id) return []
  const { data: projectMembers } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', memberId)

  return projectMembers?.map(pm => pm.project_id) || []
}

export async function updateMemberProjects(memberId: string, projectIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isDirectorRole(profile?.role)) {
    return { error: 'Solo el director de obra puede asignar obras.' }
  }

  // Solo a miembros de su equipo y solo en obras que él creó
  const { data: member } = await supabase.from('profiles').select('id, invited_by').eq('id', memberId).maybeSingle()
  if (!member || member.invited_by !== user.id) {
    return { error: 'Ese usuario no pertenece a tu equipo.' }
  }
  const { data: ownProjects } = await supabase.from('projects').select('id').eq('created_by', user.id)
  const ownIds = new Set((ownProjects || []).map((p) => p.id))
  if (projectIds.some((id) => !ownIds.has(id))) {
    return { error: 'Solo puedes asignar obras que tú administras.' }
  }

  const client = createAdminClient() || supabase

  // Se reemplazan las asignaciones del miembro solo dentro de las obras del director
  if (ownIds.size > 0) {
    const { error: deleteError } = await client
      .from('project_members')
      .delete()
      .eq('user_id', memberId)
      .in('project_id', Array.from(ownIds))
    if (deleteError) return { error: deleteError.message }
  }

  if (projectIds.length > 0) {
    const { error: insertError } = await client
      .from('project_members')
      .insert(projectIds.map((projectId) => ({ user_id: memberId, project_id: projectId, role: 'resident' })))
    if (insertError) return { error: insertError.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/equipo')
  return { success: true }
}

export async function getProjectMembers(projectId: string) {
  const supabase = await createClient()
  const access = await getProjectAccess(supabase, projectId)
  if (!access.ok) return []

  // Buscar todos los miembros asignados a este proyecto
  const { data: projectMembers } = await supabase
    .from('project_members')
    .select(`
      user_id,
      profiles (
        id,
        full_name,
        role
      )
    `)
    .eq('project_id', projectId)

  // Obtener al administrador del proyecto (creador)
  const { data: project } = await supabase
    .from('projects')
    .select('created_by')
    .eq('id', projectId)
    .single()

  let adminProfile = null
  if (project?.created_by) {
    const { data: admin } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', project.created_by)
      .single()
    adminProfile = admin
  }

  const members = projectMembers?.map((pm: any) => pm.profiles).filter(Boolean) || []
  
  // Agregar al admin a la lista de opciones si no esta
  if (adminProfile && !members.find(m => m.id === adminProfile.id)) {
    members.unshift(adminProfile)
  }

  return members
}
