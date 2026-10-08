'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createProject(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Solo los administradores pueden crear proyectos' }

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
  if (profile?.role !== 'admin') return { error: 'Solo los administradores pueden editar proyectos' }

  const id = formData.get('id') as string
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
  
  await supabase.from('projects').delete().eq('id', id)
  revalidatePath('/dashboard')
}

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/lib/supabase/config'

export async function createAdminClient() {
  const { url } = getSupabaseConfig()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5d3B6ZmJvc3NnamVtdnNwbmxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDgyNjk1MiwiZXhwIjoyMTAwNDAyOTUyfQ.rXc5t-zZIGeyt_-UL5zqBnvK1TSa60Q-pYPz3bKmIGE'
  return createSupabaseAdmin(url, key)
}

export async function createTask(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const project_id = formData.get('project_id') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const assigned_to = formData.get('assigned_to') as string || null

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
    .insert([{ project_id, title, description, assigned_to, status: 'Pendiente' }])

  if (error) return { error: error.message }

  revalidatePath('/dashboard/projects/' + project_id)
  revalidatePath('/dashboard/mis-tareas')
  return { success: true }
}

export async function updateTaskStatus(taskId: string, status: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/projects/' + projectId)
}

export async function deleteTask(taskId: string, projectId?: string) {
  const supabase = await createClient()
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
  if (profile?.role !== 'admin') {
    return { error: 'Solo el director o administrador puede crear enlaces de invitación para su equipo.' }
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
  const category = formData.get('category') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const quantity = parseInt(formData.get('quantity') as string) || 1
  const unit = (formData.get('unit') as string) || 'pzas'
  const urgency = (formData.get('urgency') as string) || 'normal'

  if (!project_id || !title || !category) {
    return { error: 'Proyecto, categoría y título son obligatorios' }
  }

  const { error } = await supabase
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
        status: 'pendiente'
      }
    ])

  if (error) return { error: error.message }

  revalidatePath('/dashboard/projects/' + project_id)
  return { success: true }
}

export async function updateSpecialRequestStatus(requestId: string, status: 'aprobada' | 'rechazada' | 'pendiente', director_comment?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return { error: 'Solo el director / administrador puede aprobar o rechazar solicitudes.' }
  }

  const { error } = await supabase
    .from('special_requests')
    .update({ 
      status, 
      director_comment: director_comment || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (error) return { error: error.message }

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

  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const currentRole = adminProfile?.role || ''
  if (currentRole !== 'admin' && currentRole !== 'director' && memberId !== user.id) {
    return { error: 'Solo el Director o Administrador puede editar la información del equipo.' }
  }

  const adminClient = await createAdminClient()
  if (adminClient) {
    const { error } = await adminClient
      .from('profiles')
      .update({ full_name: fullName, role })
      .eq('id', memberId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, role })
      .eq('id', memberId)
    if (error) return { error: error.message }
  }

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

  // Solo admin puede modificar
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'director') {
    return { error: 'Solo el administrador puede asignar proyectos.' }
  }

  // Eliminar asignaciones actuales
  const adminClient = await createAdminClient()
  const client = adminClient || supabase

  const { error: deleteError } = await client
    .from('project_members')
    .delete()
    .eq('user_id', memberId)

  if (deleteError) return { error: deleteError.message }

  // Insertar nuevas asignaciones si hay
  if (projectIds.length > 0) {
    const insertData = projectIds.map(projectId => ({
      user_id: memberId,
      project_id: projectId,
      role: 'resident' // Default role in project_members
    }))

    const { error: insertError } = await client
      .from('project_members')
      .insert(insertData)

    if (insertError) return { error: insertError.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/equipo')
  return { success: true }
}

export async function getProjectMembers(projectId: string) {
  const supabase = await createClient()

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
