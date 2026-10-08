import { openai } from '@ai-sdk/openai'
import { streamText, convertToModelMessages } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/lib/supabase/config'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    console.log('Received messages at /api/chat:', JSON.stringify(messages, null, 2))

    const supabase = await createClient()

    // Verificar que el usuario esté autenticado
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      console.log('Unauthorized access attempt to /api/chat')
      return new Response('Unauthorized', { status: 401 })
    }

    const { url } = getSupabaseConfig()
    // IMPORTANTE: Creamos un cliente con Service Role Key para las herramientas
    const toolSupabase = createSupabaseClient(
      url,
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5d3B6ZmJvc3NnamVtdnNwbmxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDgyNjk1MiwiZXhwIjoyMTAwNDAyOTUyfQ.rXc5t-zZIGeyt_-UL5zqBnvK1TSa60Q-pYPz3bKmIGE'
    )

    const modelMessages = await convertToModelMessages(messages)
    console.log('Converted model messages:', JSON.stringify(modelMessages, null, 2))
    // Ejecutamos el streaming de AI
    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages: modelMessages,
      system: `Eres un asistente experto para la constructora Bitacor.AI.
Tienes acceso directo a la base de datos mediante tus herramientas (tools).
SIEMPRE debes ejecutar las herramientas (tools) correspondientes antes de responder al usuario si la consulta involucra datos de base de datos.
NUNCA digas que no tienes acceso a la información sin haber ejecutado primero las herramientas disponibles.
Si el usuario pide crear un área, ejecuta de inmediato 'createProjectArea'.
REGLA CRÍTICA 1: Una vez ejecutada cualquier herramienta, SIEMPRE debes escribir una respuesta final en texto confirmando el resultado o explicando lo que hiciste.
REGLA CRÍTICA 2: Si una herramienta devuelve un error (ej. "no se encontró el proyecto"), NO intentes ejecutar la herramienta nuevamente. Responde al usuario de forma clara y concisa explicando el problema.

SOPORTE Y MANUAL DE USUARIO:
También actúas como agente de soporte y ayuda técnica sobre cómo usar la aplicación Bitacor.AI 2.0. Si el usuario te pregunta cómo realizar alguna tarea (como registrar gastos, subir bitácoras, controlar materiales, configurar el logo de su empresa, etc.), explícale detalladamente los pasos a seguir de acuerdo con las siguientes pautas:
1. Obras y Frentes: Se configuran en el listado del panel y se dividen en áreas/frentes de trabajo.
2. Bitácoras: Se llenan dentro del área/frente de trabajo, requieren fecha, clima, personal activo, notas (con soporte de voz e IA), fotos de la obra y firma digital en el pad.
3. Materiales: Pestaña 'Materiales' dentro del proyecto. Permite registrar entradas, salidas e inventario de insumos.
4. Gastos: Sección 'Gastos' del menú lateral. Requiere monto, concepto, categoría y subir foto clara del comprobante (ticket/factura).
5. Solicitudes Especiales: Sección 'Solicitudes' del menú lateral. Para requerir herramientas, personal o recursos extraordinarios.
6. Perfil y Empresa: Pestaña 'Mi Perfil y Empresa'. Permite cambiar el nombre completo, el nombre de la constructora y subir el logotipo que personalizará la cabecera del sistema.
Si el usuario te pide una guía, manual o ayuda general de uso, explícale el funcionamiento y proporciona obligatoriamente este enlace: [Manual de Usuario](/dashboard/manual) para que pueda consultarlo interactivamente.`,
      temperature: 0.5,
      tools: {
        getProjectsList: {
          description: 'Obtiene la lista de todos los proyectos activos en la constructora',
          inputSchema: z.object({}),
          execute: async () => {
            const { data } = await toolSupabase
              .from('projects')
              .select('id, name, location, client_name, status')
              .eq('created_by', session.user.id)
            return data || []
          },
        },
        getProjectFinancials: {
          description: 'Obtiene el resumen financiero (presupuesto, gastos, ingresos) de un proyecto dado su nombre.',
          inputSchema: z.object({
            projectName: z.string().describe('El nombre del proyecto a buscar (ej: "Torre Alta")')
          }),
          execute: async ({ projectName }: { projectName: string }) => {
            // Buscar el ID del proyecto
            const { data: project } = await toolSupabase
              .from('projects')
              .select('id, name, base_budget')
              .ilike('name', `%${projectName}%`)
              .single()

            if (!project) return { error: `No se encontró el proyecto ${projectName}` }

            const { data: expenses } = await toolSupabase.from('expenses').select('amount').eq('project_id', project.id)
            const { data: incomes } = await toolSupabase.from('incomes').select('amount').eq('project_id', project.id)

            const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0
            const totalIncomes = incomes?.reduce((sum, i) => sum + i.amount, 0) || 0
            
            return {
              proyecto: project.name,
              presupuesto_base: project.base_budget,
              gastos_totales: totalExpenses,
              ingresos_totales: totalIncomes,
              saldo_disponible: project.base_budget + totalIncomes - totalExpenses
            }
          },
        },
        getRecentBitacoras: {
          description: 'Obtiene los últimos reportes diarios (bitácoras) de un proyecto.',
          inputSchema: z.object({
            projectName: z.string().describe('El nombre del proyecto')
          }),
          execute: async ({ projectName }: { projectName: string }) => {
            const { data: project } = await toolSupabase
              .from('projects')
              .select('id, name')
              .ilike('name', `%${projectName}%`)
              .single()

            if (!project) return { error: `No se encontró el proyecto ${projectName}` }

            const { data: areas } = await toolSupabase.from('project_areas').select('id').eq('project_id', project.id)
            if (!areas || areas.length === 0) return { error: 'No hay áreas registradas' }

            const areaIds = areas.map(a => a.id)

            const { data: bitacoras } = await toolSupabase
              .from('daily_reports')
              .select('report_date, weather, progress_notes, workers_count, project_areas(name)')
              .in('area_id', areaIds)
              .order('report_date', { ascending: false })
              .limit(5)

            return bitacoras || []
          }
        },
        createProjectArea: {
          description: 'Crea una nueva área o frente de trabajo en un proyecto específico. Útil cuando el usuario te pide crear un área, recámara, nivel, etc.',
          inputSchema: z.object({
            projectName: z.string().describe('El nombre del proyecto donde se creará el área'),
            areaName: z.string().describe('El nombre del área a crear (ej: "Recámara 1", "Planta Baja", etc.)')
          }),
          execute: async (args: { projectName: string; areaName: string }) => {
            console.log('--- INTENTANDO CREAR ÁREA ---');
            console.log('RAW ARGS FROM AI:', JSON.stringify(args, null, 2));
            const projectName = args?.projectName;
            const areaName = args?.areaName;
            console.log('Extracted Project Name:', projectName);
            console.log('Extracted Area Name:', areaName);
            try {
              if (!projectName || !areaName) {
                return { error: 'No se recibieron el nombre del proyecto o del área correctamente.' };
              }

              // Limpiar y normalizar el nombre
              const normalizedName = projectName.trim().toLowerCase();

              // Obtener TODOS los proyectos primero para no lidiar con problemas de ILIKE
              const { data: allProjects, error: dbError } = await toolSupabase.from('projects').select('id, name')
              
              console.log('Proyectos en DB:', allProjects);

              if (dbError) {
                console.error('Error DB:', dbError);
                return { error: `Error de base de datos: ${dbError.message}` };
              }

              if (!allProjects || allProjects.length === 0) {
                return { error: 'No hay proyectos registrados en la base de datos a los que tengas acceso.' }
              }
              
              // Búsqueda más flexible
              let project = allProjects.find(p => {
                const pName = p.name.toLowerCase();
                // Verificar si coinciden total o parcialmente
                return pName === normalizedName || 
                       pName.includes(normalizedName) || 
                       normalizedName.includes(pName) ||
                       pName.replace(/\s+/g, '') === normalizedName.replace(/\s+/g, '');
              });
              
              if (!project) {
                const projectNames = allProjects.map(p => `"${p.name}"`).join(', ');
                console.log('Proyecto no encontrado. Disponibles:', projectNames);
                return { 
                  error: `No se encontró un proyecto llamado "${projectName}". Proyectos disponibles: ${projectNames}. Pide al usuario que confirme el nombre.` 
                }
              }

              console.log('Proyecto encontrado:', project.name, 'ID:', project.id);

              const { data, error } = await toolSupabase
                .from('project_areas')
                .insert({
                  project_id: project.id,
                  name: areaName
                })
                .select()
                .single()

              if (error) {
                console.error('Error al insertar área:', error);
                return { error: `Error al crear el área: ${error.message}` }
              }
              
              console.log('Área creada exitosamente:', data);
              
              return { 
                success: true, 
                message: `El área "${areaName}" fue creada exitosamente en el proyecto "${project.name}"`, 
                area: data 
              }
            } catch (err: any) {
              return { error: `Excepción al crear área: ${err.message || err}` }
            }
          }
        },
        deleteProjectArea: {
          description: 'Elimina un área o frente de trabajo existente de un proyecto.',
          inputSchema: z.object({
            projectName: z.string().describe('El nombre del proyecto'),
            areaName: z.string().describe('El nombre del área a eliminar')
          }),
          execute: async (args: { projectName: string; areaName: string }) => {
            const projectName = args?.projectName;
            const areaName = args?.areaName;
            try {
              if (!projectName || !areaName) {
                return { error: 'No se recibieron el nombre del proyecto o del área a eliminar.' };
              }

              const { data: allProjects } = await toolSupabase.from('projects').select('id, name')
              if (!allProjects) return { error: 'No se encontraron proyectos.' }

              const normalizedName = projectName.trim().toLowerCase();
              const project = allProjects.find(p => p.name.toLowerCase().includes(normalizedName) || normalizedName.includes(p.name.toLowerCase()));
              if (!project) return { error: `No se encontró el proyecto "${projectName}"` };

              // Buscar área
              const { data: areas } = await toolSupabase.from('project_areas').select('id, name').eq('project_id', project.id);
              if (!areas) return { error: 'No hay áreas registradas en este proyecto.' };

              const targetArea = areas.find(a => a.name.toLowerCase().includes(areaName.trim().toLowerCase()));
              if (!targetArea) return { error: `No se encontró el área "${areaName}" en el proyecto ${project.name}` };

              const { error: delError } = await toolSupabase.from('project_areas').delete().eq('id', targetArea.id);
              if (delError) return { error: `Error al eliminar área: ${delError.message}` };

              return {
                success: true,
                message: `El área "${targetArea.name}" fue eliminada exitosamente del proyecto "${project.name}".`
              };
            } catch (err: any) {
              return { error: `Excepción al eliminar área: ${err.message}` };
            }
          }
        }
      }
    })

    return result.toUIMessageStreamResponse()
  } catch (err: any) {
    console.error('Error in /api/chat route:', err)
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

