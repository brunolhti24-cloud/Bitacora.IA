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

    const { imageBase64 } = await req.json()

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'La imagen del ticket es requerida' }), { status: 400 })
    }

    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        concept: z.string().describe('Descripción o concepto principal de la compra (ej. Compra de cemento, Diésel camioneta, etc.)'),
        amount: z.number().describe('Monto total monetario final del ticket'),
        category: z.enum(['Materiales', 'Mano de Obra', 'Herramientas', 'Combustible', 'Varios']).describe('La categoría más adecuada para este gasto'),
        date: z.string().describe('Fecha del ticket en formato YYYY-MM-DD. Si no es visible, usa la fecha de hoy.')
      }),
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: 'Extrae la información de este ticket/factura/nota de compra de obra. Identifica el concepto principal, el monto total pagado, la fecha y la categoría correspondiente.' 
            },
            { 
              type: 'image', 
              image: imageBase64 
            }
          ]
        }
      ]
    })

    return new Response(JSON.stringify({ ticketData: object }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error al escanear ticket con IA' }), { status: 500 })
  }
}
