import { summarizeFinance } from '@/lib/finance'
import { isDirectorRole } from '@/lib/roles'
import { openai } from '@ai-sdk/openai'
import { streamText, convertToModelMessages } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

type Project = { id: string; name: string; base_budget?: number | null; location?: string | null; client_name?: string | null }
type ToolFailure = { ok: false; error: string }

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

const HELP = `SOPORTE Y MANUAL DE USUARIO:
También actúas como agente de soporte sobre cómo usar Bitacor.AI. Si el usuario pregunta cómo realizar una tarea, explícale los pasos:
1. Obras y Frentes: se configuran en el listado del panel y se dividen en áreas/frentes de trabajo.
2. Bitácoras: se llenan dentro del área/frente; requieren fecha, notas (con voz e IA), fotos del área y firma digital.
3. Materiales: pestaña 'Materiales' de la obra. Entradas, salidas (con destino, quién recibe y motivo) e historial.
4. Gastos: pestaña 'Finanzas' de la obra. Monto, concepto, categoría y foto del comprobante.
5. Solicitudes: pestaña 'Solicitudes' de la obra, con fecha en que se necesita y seguimiento.
6. Perfil y Empresa: 'Mi Perfil y Empresa'. Nombre, constructora y logotipo para los PDF.
Si pide una guía o manual, da este enlace: [Manual de Usuario](/dashboard/manual).`

export async function POST(req: Request) {
  try {
    const { messages, projectId: currentProjectId } = await req.json()

    // Las herramientas usan la sesión del usuario: aplican los mismos permisos (RLS) que la app.
    // Antes usaban una llave de servicio que saltaba los permisos y apuntaba a otro proyecto.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role, invited_by').eq('id', user.id).maybeSingle()
    const isDirector = isDirectorRole(profile?.role)

    // Obras de la empresa del usuario (misma regla que el dashboard)
    const owner = profile?.invited_by || user.id
    const { data: projectRows, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, base_budget, location, client_name')
      .eq('created_by', owner)
      .order('created_at', { ascending: false })
    const projects: Project[] = projectRows || []
    const currentProject = projects.find((p) => p.id === currentProjectId) || null

    // Busca la obra por nombre sin importar mayúsculas ni acentos; sin nombre, usa la obra abierta
    const resolveProject = (name?: string): { project: Project } | ToolFailure => {
      if (projectsError) return { ok: false, error: `No se pudieron leer las obras: ${projectsError.message}` }
      if (!name?.trim()) {
        if (currentProject) return { project: currentProject }
        return { ok: false, error: 'No se indicó la obra y no hay una obra abierta. Pregunta al usuario de qué obra se trata.' }
      }
      const wanted = normalize(name)
      const exact = projects.filter((p) => normalize(p.name) === wanted)
      const matches = exact.length
        ? exact
        : projects.filter((p) => normalize(p.name).includes(wanted) || wanted.includes(normalize(p.name)))
      if (matches.length === 1) return { project: matches[0] }
      if (matches.length > 1) {
        return { ok: false, error: `Varias obras coinciden con "${name}": ${matches.map((p) => `"${p.name}"`).join(', ')}. Pregunta cuál.` }
      }
      const available = projects.map((p) => `"${p.name}"`).join(', ') || 'ninguna'
      return { ok: false, error: `No encontré la obra "${name}" entre las obras del usuario. Obras disponibles: ${available}.` }
    }

    const context = currentProject
      ? `OBRA ABIERTA: el usuario está viendo la obra "${currentProject.name}". Si no menciona otra obra, se refiere a esta: deja projectName vacío.`
      : 'El usuario no tiene una obra abierta.'

    const modelMessages = await convertToModelMessages(messages)
    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages: modelMessages,
      system: `Eres el asistente de Bitacor.AI, plataforma de control de obra.
Usa SIEMPRE las herramientas antes de responder sobre datos de obras; nunca inventes datos.
Cada herramienta devuelve ok: true o ok: false.
- Si ok es false, explica el problema con sus palabras y NO digas que la acción se realizó. No reintentes la misma herramienta.
- Después de usar una herramienta, escribe siempre una respuesta final en texto.
${context}
Obras del usuario: ${projects.map((p) => p.name).join(', ') || 'ninguna'}.

${HELP}`,
      temperature: 0.3,
      tools: {
        getProjectsList: {
          description: 'Lista las obras del usuario.',
          inputSchema: z.object({}),
          execute: async () => {
            if (projectsError) return { ok: false, error: projectsError.message }
            return { ok: true, obras: projects.map((p) => ({ nombre: p.name, ubicacion: p.location, cliente: p.client_name })) }
          },
        },
        getProjectFinancials: {
          description:
            'Resumen financiero de una obra: presupuesto autorizado y por ejercer, ingresos recibidos, gastos pagados y saldo de caja. Nunca sumes el presupuesto al efectivo. Deja projectName vacío para la obra abierta.',
          inputSchema: z.object({
            projectName: z.string().optional().describe('Nombre de la obra. Vacío = obra abierta.'),
          }),
          execute: async ({ projectName }: { projectName?: string }) => {
            const found = resolveProject(projectName)
            if (!('project' in found)) return found
            const { project } = found

            const [expensesRes, incomesRes] = await Promise.all([
              supabase.from('expenses').select('amount').eq('project_id', project.id),
              supabase.from('incomes').select('amount').eq('project_id', project.id),
            ])
            if (expensesRes.error) return { ok: false, error: `No se pudieron leer los gastos: ${expensesRes.error.message}` }

            // Los ingresos solo los ve el director (igual que en pantalla)
            const incomesVisible = isDirector && !incomesRes.error
            const fin = summarizeFinance(project.base_budget, incomesVisible ? incomesRes.data : [], expensesRes.data)

            return {
              ok: true,
              obra: project.name,
              presupuesto_autorizado: fin.budget,
              gastos_pagados: fin.expenses,
              presupuesto_por_ejercer: fin.budgetRemaining,
              porcentaje_presupuesto_ejercido: fin.budgetUsedPct,
              ingresos_recibidos: incomesVisible ? fin.incomes : 'no disponible para este rol',
              saldo_de_caja: incomesVisible ? fin.cash : 'no disponible para este rol',
              nota: 'Saldo de caja = ingresos recibidos menos gastos pagados. El presupuesto por ejercer no es dinero disponible.',
            }
          },
        },
        getRecentBitacoras: {
          description: 'Últimas 5 bitácoras de una obra. Deja projectName vacío para la obra abierta.',
          inputSchema: z.object({
            projectName: z.string().optional().describe('Nombre de la obra. Vacío = obra abierta.'),
          }),
          execute: async ({ projectName }: { projectName?: string }) => {
            const found = resolveProject(projectName)
            if (!('project' in found)) return found
            const { data, error } = await supabase
              .from('daily_reports')
              .select('folio, report_date, status, progress_notes, project_areas(name)')
              .eq('project_id', found.project.id)
              .order('report_date', { ascending: false })
              .limit(5)
            if (error) return { ok: false, error: `No se pudieron leer las bitácoras: ${error.message}` }
            return { ok: true, obra: found.project.name, bitacoras: data || [] }
          },
        },
        createProjectArea: {
          description: 'Crea un área o frente de trabajo en una obra. Deja projectName vacío para la obra abierta.',
          inputSchema: z.object({
            projectName: z.string().optional().describe('Nombre de la obra. Vacío = obra abierta.'),
            areaName: z.string().describe('Nombre del área a crear (ej: "Recámara 1")'),
          }),
          execute: async ({ projectName, areaName }: { projectName?: string; areaName: string }) => {
            if (!isDirector) return { ok: false, error: 'Solo el director de obra puede crear áreas.' }
            if (!areaName?.trim()) return { ok: false, error: 'Falta el nombre del área.' }
            const found = resolveProject(projectName)
            if (!('project' in found)) return found
            const { error } = await supabase
              .from('project_areas')
              .insert({ project_id: found.project.id, name: areaName.trim(), created_by: user.id })
            if (error) return { ok: false, error: `No se pudo crear el área: ${error.message}` }
            return { ok: true, message: `Se creó el área "${areaName.trim()}" en la obra "${found.project.name}".` }
          },
        },
        deleteProjectArea: {
          description: 'Elimina un área de una obra. Deja projectName vacío para la obra abierta.',
          inputSchema: z.object({
            projectName: z.string().optional().describe('Nombre de la obra. Vacío = obra abierta.'),
            areaName: z.string().describe('Nombre del área a eliminar'),
          }),
          execute: async ({ projectName, areaName }: { projectName?: string; areaName: string }) => {
            if (!isDirector) return { ok: false, error: 'Solo el director de obra puede eliminar áreas.' }
            const found = resolveProject(projectName)
            if (!('project' in found)) return found
            const { data: areas, error } = await supabase.from('project_areas').select('id, name').eq('project_id', found.project.id)
            if (error) return { ok: false, error: `No se pudieron leer las áreas: ${error.message}` }
            const wanted = normalize(areaName || '')
            const target =
              (areas || []).find((a) => normalize(a.name) === wanted) || (areas || []).find((a) => normalize(a.name).includes(wanted))
            if (!target) return { ok: false, error: `No encontré el área "${areaName}" en "${found.project.name}".` }
            const { error: delError } = await supabase.from('project_areas').delete().eq('id', target.id)
            if (delError) return { ok: false, error: `No se pudo eliminar el área: ${delError.message}` }
            return { ok: true, message: `Se eliminó el área "${target.name}" de la obra "${found.project.name}".` }
          },
        },
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    console.error('Error in /api/chat route:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
