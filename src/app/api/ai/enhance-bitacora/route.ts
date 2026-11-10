import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { cleanNotes } from '@/lib/text'

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
      system: `Eres corrector de estilo de bitácoras de obra en México. Tu única tarea es MEJORAR LA REDACCIÓN de las notas que escribe el usuario.

Reglas:
1. Conserva exactamente la información del usuario: no agregues actividades, materiales, medidas, observaciones, verificaciones ni conclusiones que no estén en sus notas.
2. No repitas datos que ya aparecen en el encabezado de la bitácora: obra, área, fecha, folio, responsable, cargo o firma.
3. No uses plantillas ni marcadores como [Fecha], [Nombre], "a definir". No escribas títulos como "BITÁCORA DIARIA".
4. Texto plano: sin Markdown (sin **, #, ---). Si hay varias actividades, una por renglón empezando con "- ". Si es una sola idea, una o dos oraciones.
5. Corrige ortografía, gramática y puntuación; usa lenguaje técnico claro y profesional, en pasado.
6. Mantén una extensión parecida a la original: no la alargues.
7. Devuelve únicamente el texto mejorado, sin introducciones ni comentarios.`,
      // El nombre de la obra y del área solo dan contexto para elegir términos; no se repiten en el texto
      prompt: `Contexto (no lo repitas): obra "${projectName || 'sin nombre'}", área "${areaName || 'general'}".\n\nNotas del usuario:\n${draftNotes}`,
      temperature: 0.2,
    })

    return new Response(JSON.stringify({ enhancedNotes: cleanNotes(text) }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al procesar con IA' }), { status: 500 })
  }
}
