'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createDailyReport(projectId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', success: false }

  const areaId = formData.get('area_id') as string
  const report_date = formData.get('report_date') as string
  const weather = (formData.get('weather') as string) || 'Soleado'
  const workers_count = parseInt(formData.get('workers_count') as string) || 0
  const progress_notes = formData.get('progress_notes') as string
  const special_request = (formData.get('special_request') as string || '').trim() || null
  const physical_progress = parseFloat(formData.get('physical_progress') as string)
  const signature_url = formData.get('signature_url') as string || null

  if (!areaId) {
    return { error: 'El área o frente de trabajo es obligatorio', success: false }
  }

  if (!report_date || !progress_notes) {
    return { error: 'La fecha y las notas de avance son obligatorias', success: false }
  }

  // 1. Crear el reporte
  const { data: report, error: reportError } = await supabase
    .from('daily_reports')
    .insert([
      {
        project_id: projectId,
        area_id: areaId,
        created_by: user.id,
        report_date,
        weather,
        workers_count,
        progress_notes,
        special_request,
        signature_url,
        status: 'pendiente'
      }
    ])
    .select()
    .single()

  if (reportError) return { error: reportError.message, success: false }

  // 2. Fotos de evidencia: el navegador ya las subió a Storage; aquí solo se
  // registran, aceptando únicamente URLs del bucket de fotos de esta obra
  const { data: { publicUrl: photosBase } } = supabase.storage.from('report_photos').getPublicUrl(`${projectId}/`)
  const photoUrls = (formData.getAll('photo_urls') as string[])
    .filter((url) => typeof url === 'string' && url.startsWith(photosBase))
    .slice(0, 8)

  if (photoUrls.length > 0) {
    const { error: photosError } = await supabase
      .from('report_photos')
      .insert(photoUrls.map((photo_url) => ({ daily_report_id: report.id, photo_url })))
    if (photosError) console.error('No se registraron las fotos de la bitácora:', photosError.message)
  }

  // 3. Actualizar el avance físico del proyecto si se proporcionó uno válido
  if (!isNaN(physical_progress) && physical_progress >= 0 && physical_progress <= 100) {
    await supabase.from('projects').update({ physical_progress }).eq('id', projectId)
  }

  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard')
  redirect(`/dashboard/projects/${projectId}/areas/${report.area_id}`)
}

export async function createArea(projectId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const name = formData.get('name') as string
  if (!name) return { error: 'El nombre es obligatorio' }

  const { error } = await supabase
    .from('project_areas')
    .insert([{ project_id: projectId, name, created_by: user.id }])

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/projects/${projectId}`)
}

export async function createExpense(projectId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', success: false }

  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const category = formData.get('category') as string
  const expense_date = formData.get('expense_date') as string
  const receipt = formData.get('receipt') as File | null

  if (!amount || amount <= 0 || !description || !category || !expense_date) {
    return { error: 'Faltan campos obligatorios o el monto es inválido', success: false }
  }

  let receipt_url = null
  if (receipt && receipt.size > 0) {
    const fileExt = receipt.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, receipt)
    
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName)
      receipt_url = publicUrl
    }
  }

  const concept = (formData.get('description') as string) || (formData.get('concept') as string)

  const { error } = await supabase.from('expenses').insert([{
    project_id: projectId,
    recorded_by: user.id,
    amount,
    concept: concept,
    description: concept,
    category,
    expense_date,
    receipt_url
  }])

  if (error) return { error: error.message, success: false }

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { error: null, success: true }
}

export async function updateProjectProgress(projectId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const physical_progress = parseFloat(formData.get('physical_progress') as string)
  if (isNaN(physical_progress) || physical_progress < 0 || physical_progress > 100) {
    return { error: 'El porcentaje de avance debe ser un número entre 0 y 100.' }
  }

  const { error } = await supabase
    .from('projects')
    .update({ physical_progress })
    .eq('id', projectId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard')
  return { success: true }
}


export async function createIncome(projectId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Verificar que sea admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Solo administradores pueden registrar ingresos' }

  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const income_date = formData.get('income_date') as string

  if (!amount || amount <= 0 || !description || !income_date) {
    return { error: 'Faltan campos obligatorios o el monto es inválido' }
  }

  const { error } = await supabase.from('incomes').insert([{
    project_id: projectId,
    recorded_by: user.id,
    amount,
    description,
    income_date
  }])

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/projects/${projectId}`)
  redirect(`/dashboard/projects/${projectId}`)
}

export async function acceptDailyReport(reportId: string, projectId: string, areaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role || ''
  if (role !== 'residente' && role !== 'admin' && role !== 'director') {
    return { error: 'Solo el Residente de Obra o Director puede aceptar bitácoras.' }
  }

  const { error } = await supabase
    .from('daily_reports')
    .update({
      status: 'aceptada',
      accepted_by: user.id,
      accepted_at: new Date().toISOString()
    })
    .eq('id', reportId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/projects/${projectId}/areas/${areaId}`)
  return { success: true }
}

export async function signDailyReport(reportId: string, projectId: string, areaId: string, signatureUrl: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role || ''
  if (role !== 'admin' && role !== 'director') {
    return { error: 'Solo el Director de Obra puede firmar y aprobar oficialmente las bitácoras.' }
  }

  const { error } = await supabase
    .from('daily_reports')
    .update({
      status: 'firmada',
      director_signature_url: signatureUrl,
      signed_by: user.id,
      signed_at: new Date().toISOString()
    })
    .eq('id', reportId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/projects/${projectId}/areas/${areaId}`)
  return { success: true }
}

export async function updateArea(areaId: string, name: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  if (!name.trim()) {
    return { error: 'El nombre del área no puede estar vacío' }
  }

  const { error } = await supabase
    .from('project_areas')
    .update({ name: name.trim() })
    .eq('id', areaId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/projects/${projectId}/areas/${areaId}`)
  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}

export async function createMaterial(projectId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const name = (formData.get('name') as string || '').trim()
  const category = (formData.get('category') as string || 'Materiales').trim()
  const unit = (formData.get('unit') as string || 'piezas').trim()
  const total_received = parseFloat(formData.get('total_received') as string) || 0
  const min_stock = parseFloat(formData.get('min_stock') as string) || 5
  const notes = (formData.get('notes') as string || '').trim()

  if (!name) return { error: 'El nombre del material es obligatorio' }

  const { data: created, error } = await supabase
    .from('materials')
    .insert([
      {
        project_id: projectId,
        name,
        category,
        unit,
        total_received,
        total_used: 0,
        min_stock,
        notes: notes || null,
        recorded_by: user.id
      }
    ])
    .select('id')
    .single()

  if (error) return { error: error.message }

  // La existencia inicial queda como primer movimiento del historial
  if (created && total_received > 0) {
    const { error: movError } = await supabase.from('material_movements').insert([{
      material_id: created.id,
      project_id: projectId,
      type: 'entrada',
      quantity: total_received,
      reason: 'Existencia inicial',
      notes: notes || null,
      balance_after: total_received,
      recorded_by: user.id,
    }])
    if (movError) console.error('No se registró el movimiento inicial:', movError.message)
  }

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}

export type MovementDetails = {
  areaId?: string | null
  receivedBy?: string | null
  reason?: string | null
  notes?: string | null
}

export async function recordMaterialMovement(
  materialId: string,
  type: 'entrada' | 'salida',
  quantity: number,
  projectId: string,
  details: MovementDetails = {}
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  if (!quantity || quantity <= 0) return { error: 'La cantidad debe ser mayor a 0' }
  if (type === 'salida' && (!details.receivedBy?.trim() || !details.reason?.trim())) {
    return { error: 'Para una salida indica quién recibe el material y el motivo.' }
  }

  // Existencias y registro del movimiento en una sola transacción (función en la base de datos)
  const { data, error } = await supabase.rpc('record_material_movement', {
    p_material_id: materialId,
    p_type: type,
    p_quantity: quantity,
    p_area_id: details.areaId || null,
    p_received_by: details.receivedBy || null,
    p_reason: details.reason || null,
    p_notes: details.notes || null,
  })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true, balance: Number(data?.balance_after ?? 0) }
}

export async function deleteMaterial(materialId: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', materialId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}
