import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
    }

    const { projectId } = await req.json()
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'ID de proyecto requerido' }), { status: 400 })
    }

    // 1. Obtener detalles del proyecto
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (!project) {
      return new Response(JSON.stringify({ error: 'Proyecto no encontrado' }), { status: 404 })
    }

    // 2. Obtener gastos recientes
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, description, concept, category, expense_date')
      .eq('project_id', projectId)
      .order('expense_date', { ascending: false })
      .limit(10)

    // 3. Obtener bitácoras recientes
    const { data: areas } = await supabase.from('project_areas').select('id, name').eq('project_id', projectId)
    const areaIds = (areas || []).map(a => a.id)

    let dailyReports: any[] = []
    if (areaIds.length > 0) {
      const { data: reports } = await supabase
        .from('daily_reports')
        .select('report_date, progress_notes')
        .in('area_id', areaIds)
        .order('report_date', { ascending: false })
        .limit(5)
      dailyReports = reports || []
    }

    // 4. Obtener solicitudes especiales pendientes
    const { data: requests } = await supabase
      .from('special_requests')
      .select('title, category, urgency, status')
      .eq('project_id', projectId)

    const totalExpenses = (expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    const pendingRequests = (requests || []).filter(r => r.status === 'pendiente')

    // 5. Generar diagnóstico con IA
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        statusSummary: z.string().describe('Un párrafo sintético del estado general de la obra'),
        keyHighlights: z.array(z.string()).describe('Lista de 3 logros o avances clave recientes'),
        riskAlerts: z.array(z.string()).describe('Lista de 2 a 3 alertas de riesgo, retrasos o pendientes de aprobación'),
        recommendations: z.array(z.string()).describe('2 recomendaciones estratégicas para la semana')
      }),
      messages: [
        {
          role: 'user',
          content: `Genera un Diagnóstico y Resumen Ejecutivo de Inteligencia para el Director de Obra con estos datos:
Proyecto: ${project.name}
Ubicación: ${project.location || 'N/A'}
Presupuesto Base: $${project.base_budget || 0}
Avance Físico Actual: ${project.physical_progress || 0}%
Gastos Totales Registrados: $${totalExpenses}
Solicitudes Pendientes: ${pendingRequests.length} solicitudes por aprobar
Últimas bitácoras: ${JSON.stringify(dailyReports.slice(0, 3))}
Últimos gastos: ${JSON.stringify((expenses || []).slice(0, 3))}`
        }
      ]
    })

    return new Response(JSON.stringify({ summary: object }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al generar resumen IA' }), { status: 500 })
  }
}
