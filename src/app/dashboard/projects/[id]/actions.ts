'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isDirectorRole } from '@/lib/roles'
import { getProjectAccess, projectIdOf, closedProjectError } from '@/lib/permissions'
import { signatureStage } from '@/lib/signatures'
import { AREA_COLORS, isAreaColor } from '@/lib/area-colors'

export async function createDailyReport(projectId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', success: false }

  // Acceso a la obra y rol (también protege contra llamadas directas a la acción)
  const access = await getProjectAccess(supabase, projectId, ['director', 'residente', 'subcontratista', 'operador'])
  if (!access.ok) return { error: access.error, success: false }
  const closed = closedProjectError(access)
  if (closed) return { error: closed, success: false }
  if ((await projectIdOf(supabase, 'project_areas', formData.get('area_id') as string)) !== projectId) return { error: 'El registro no pertenece a esta obra.', success: false }

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
  // Solo el director y el residente reportan el avance físico (igual que en el botón de la obra)
  const canReportProgress = access.isDirector || access.role === 'residente'
  if (canReportProgress && !isNaN(physical_progress) && physical_progress >= 0 && physical_progress <= 100) {
    await saveReportedProgress(supabase, projectId, physical_progress, user.id)
  }

  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard')
  redirect(`/dashboard/projects/${projectId}/areas/${report.area_id}`)
}

export async function createArea(projectId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Acceso a la obra y rol (también protege contra llamadas directas a la acción)
  const access = await getProjectAccess(supabase, projectId, ['director'])
  if (!access.ok) return { error: access.error }
  const closed = closedProjectError(access)
  if (closed) return { error: closed }

  const name = formData.get('name') as string
  if (!name) return { error: 'El nombre es obligatorio' }

  const colorRaw = formData.get('color')
  let color: string | null = isAreaColor(colorRaw) ? colorRaw : null
  if (!color) {
    // "Automático": el primer color de la paleta que aún no usa otra área de la obra
    const { data: siblings } = await supabase.from('project_areas').select('color').eq('project_id', projectId)
    if (siblings) {
      const used = new Set(siblings.map((a) => a.color).filter(Boolean))
      color = AREA_COLORS.find((c) => !used.has(c.key))?.key ?? AREA_COLORS[siblings.length % AREA_COLORS.length].key
    }
  }
  const row = { project_id: projectId, name, created_by: user.id }
  let { error } = await supabase.from('project_areas').insert([color ? { ...row, color } : row])
  // Sin la migración de colores todavía: se crea el área con color automático
  if (error?.message.includes('color')) ({ error } = await supabase.from('project_areas').insert([row]))

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/projects/${projectId}`)
}

export async function createExpense(projectId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', success: false }

  // Acceso a la obra y rol (también protege contra llamadas directas a la acción)
  const access = await getProjectAccess(supabase, projectId)
  if (!access.ok) return { error: access.error, success: false }
  const closed = closedProjectError(access)
  if (closed) return { error: closed, success: false }

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
    
    if (uploadError) return { error: `No se pudo subir el comprobante: ${uploadError.message}`, success: false }

    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName)
    receipt_url = publicUrl
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

// Avance físico capturado a mano: se guarda quién lo reportó y cuándo.
// Si aún no se aplica la migración del cronograma, se guarda solo el porcentaje.
async function saveReportedProgress(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string, physical_progress: number, userId: string) {
  const { error } = await supabase
    .from('projects')
    .update({ physical_progress, progress_updated_by: userId, progress_updated_at: new Date().toISOString() })
    .eq('id', projectId)
  if (!error || !error.message.includes('progress_updated')) return error
  return (await supabase.from('projects').update({ physical_progress }).eq('id', projectId)).error
}

export async function updateProjectProgress(projectId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Acceso a la obra y rol (también protege contra llamadas directas a la acción)
  const access = await getProjectAccess(supabase, projectId, ['director', 'residente'])
  if (!access.ok) return { error: access.error }
  const closed = closedProjectError(access)
  if (closed) return { error: closed }

  const physical_progress = parseFloat(formData.get('physical_progress') as string)
  if (isNaN(physical_progress) || physical_progress < 0 || physical_progress > 100) {
    return { error: 'El porcentaje de avance debe ser un número entre 0 y 100.' }
  }

  const error = await saveReportedProgress(supabase, projectId, physical_progress, user.id)
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard')
  return { success: true }
}


export async function createIncome(projectId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Acceso a la obra y rol (también protege contra llamadas directas a la acción)
  const access = await getProjectAccess(supabase, projectId, ['director'])
  if (!access.ok) return { error: access.error }
  const closed = closedProjectError(access)
  if (closed) return { error: closed }

  // Verificar que sea admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isDirectorRole(profile?.role)) return { error: 'Solo el director de obra puede registrar ingresos' }

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

  // Acceso a la obra y rol (también protege contra llamadas directas a la acción)
  const access = await getProjectAccess(supabase, projectId, ['director', 'residente'])
  if (!access.ok) return { error: access.error }
  if ((await projectIdOf(supabase, 'daily_reports', reportId)) !== projectId) return { error: 'El registro no pertenece a esta obra.' }

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

  // Acceso a la obra y rol (también protege contra llamadas directas a la acción)
  const access = await getProjectAccess(supabase, projectId, ['director'])
  if (!access.ok) return { error: access.error }
  if ((await projectIdOf(supabase, 'daily_reports', reportId)) !== projectId) return { error: 'El registro no pertenece a esta obra.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role || ''
  if (role !== 'admin' && role !== 'director') {
    return { error: 'Solo el Director de Obra puede dar el visto bueno a las bitácoras.' }
  }

  // Orden de firmas: primero el responsable, después el visto bueno del director
  const { data: current } = await supabase.from('daily_reports').select('status, signature_url').eq('id', reportId).maybeSingle()
  const stage = signatureStage(current || {})
  if (stage === 'completa') return { error: 'Esta bitácora ya tiene las firmas completas.' }
  if (stage === 'responsable') return { error: 'Falta la firma del responsable antes del visto bueno del director.' }

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

export async function updateArea(areaId: string, name: string, projectId: string, color?: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Acceso a la obra y rol (también protege contra llamadas directas a la acción)
  const access = await getProjectAccess(supabase, projectId, ['director'])
  if (!access.ok) return { error: access.error }
  if ((await projectIdOf(supabase, 'project_areas', areaId)) !== projectId) return { error: 'El registro no pertenece a esta obra.' }

  if (!name.trim()) {
    return { error: 'El nombre del área no puede estar vacío' }
  }

  // color: undefined = no cambiar; null o '' = automático
  const patch: { name: string; color?: string | null } = { name: name.trim() }
  if (color !== undefined) patch.color = isAreaColor(color) ? color : null
  let { error } = await supabase.from('project_areas').update(patch).eq('id', areaId)
  if (error?.message.includes('color')) {
    if (patch.color) return { error: 'Falta aplicar la migración de colores (20261110_archivo_y_colores.sql).' }
    ;({ error } = await supabase.from('project_areas').update({ name: patch.name }).eq('id', areaId))
  }

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/projects/${projectId}/areas/${areaId}`)
  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}

export async function createMaterial(projectId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Acceso a la obra y rol (también protege contra llamadas directas a la acción)
  const access = await getProjectAccess(supabase, projectId, ['director', 'residente'])
  if (!access.ok) return { error: access.error }
  const closed = closedProjectError(access)
  if (closed) return { error: closed }

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

  // Acceso a la obra y rol (también protege contra llamadas directas a la acción)
  const access = await getProjectAccess(supabase, projectId)
  if (!access.ok) return { error: access.error }
  const closed = closedProjectError(access)
  if (closed) return { error: closed }
  if ((await projectIdOf(supabase, 'materials', materialId)) !== projectId) return { error: 'El registro no pertenece a esta obra.' }

  if (!quantity || quantity <= 0) return { error: 'La cantidad debe ser mayor a 0' }
  if (type === 'salida' && (!details.receivedBy?.trim() || !details.reason?.trim())) {
    return { error: 'Para una salida indica quién recibe el material y el motivo.' }
  }

  // Regla de inventario: una salida no puede superar la existencia. La función de la
  // base de datos lo vuelve a validar con bloqueo de fila (salidas simultáneas).
  if (type === 'salida') {
    const { data: mat, error: matError } = await supabase
      .from('materials')
      .select('total_received, total_used, unit')
      .eq('id', materialId)
      .single()
    if (matError || !mat) return { error: 'Material no encontrado' }
    const stock = (Number(mat.total_received) || 0) - (Number(mat.total_used) || 0)
    if (quantity > stock) {
      return { error: `No hay suficiente existencia: quedan ${stock} ${mat.unit || ''} y se intentan sacar ${quantity}.` }
    }
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

  // Acceso a la obra y rol (también protege contra llamadas directas a la acción)
  const access = await getProjectAccess(supabase, projectId, ['director', 'residente'])
  if (!access.ok) return { error: access.error }
  if ((await projectIdOf(supabase, 'materials', materialId)) !== projectId) return { error: 'El registro no pertenece a esta obra.' }

  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', materialId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}

/** Archiva o restaura una bitácora. No se borra: sale del historial del área y queda en Archivo. */
export async function archiveDailyReport(reportId: string, projectId: string, archived: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const access = await getProjectAccess(supabase, projectId, ['director'])
  if (!access.ok) return { error: access.error }
  if ((await projectIdOf(supabase, 'daily_reports', reportId)) !== projectId) return { error: 'El registro no pertenece a esta obra.' }

  const { data: updated, error } = await supabase
    .from('daily_reports')
    .update({ archived_at: archived ? new Date().toISOString() : null, archived_by: archived ? user.id : null })
    .eq('id', reportId)
    .select('id, area_id')
  if (error) {
    if (error.message.includes('archived')) return { error: 'Falta aplicar la migración del archivo (20261110_archivo_y_colores.sql).' }
    return { error: error.message }
  }
  if (!updated?.length) return { error: 'No se pudo archivar la bitácora.' }

  revalidatePath(`/dashboard/projects/${projectId}/areas/${updated[0].area_id}`)
  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard/archivo')
  revalidatePath('/dashboard')
  return { success: true }
}
