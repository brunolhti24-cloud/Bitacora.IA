import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
    }

    const { draftNotes, areaName, projectName } = await req.json()

    if (!draftNotes || typeof draftNotes !== 'string') {
      return new Response(JSON.stringify({ error: 'El borrador de notas es obligatorio' }), { status: 400 })
    }

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: `Eres un Ingeniero Residente y Perito de Obra experto en redacción de bitácoras de construcción. 
Tu tarea es tomar las notas rápidas, borrador o viñetas del usuario y transformarlas en un reporte oficial de bitácora diario técnico, formal, bien estructurado y en español.

Instrucciones de formato:
1. Divide el reporte en secciones claras (ej. ACTIVIDADES REALIZADAS, MATERIALES E INSUMOS, OBSERVACIONES DE CAMPO).
2. Mantén un lenguaje técnico pero claro y profesional.
3. Corrige ortografía y gramática.
4. NO agregues texto introductorio ni explicaciones fuera del reporte. Devuelve ÚNICAMENTE el texto formateado final del reporte.`,
      prompt: `Proyecto: ${projectName || 'Obra'}\nÁrea: ${areaName || 'General'}\n\nNotas borrador del residente:\n"${draftNotes}"`
    })

    return new Response(JSON.stringify({ enhancedNotes: text }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al procesar con IA' }), { status: 500 })
  }
}
