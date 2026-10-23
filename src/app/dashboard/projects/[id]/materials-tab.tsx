import { createClient } from '@/lib/supabase/server'
import { NewMaterialModal } from '@/components/new-material-modal'
import { MaterialMovementModal } from '@/components/material-movement-modal'
import { MaterialHistoryModal } from '@/components/material-history-modal'
import { deleteMaterial } from './actions'
import { Boxes, PackageCheck, AlertTriangle, XCircle, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

export async function MaterialsTab({ projectId }: { projectId: string }) {
  const supabase = await createClient()

  const { data: rawMaterials } = await supabase
    .from('materials')
    .select('*')
    .eq('project_id', projectId)
    .order('name', { ascending: true })

  const materials = rawMaterials || []

  const { data: areas } = await supabase
    .from('project_areas')
    .select('id, name')
    .eq('project_id', projectId)
    .order('name', { ascending: true })

  // Calcular métricas
  const totalItems = materials.length
  let normalStockCount = 0
  let lowStockCount = 0
  let outOfStockCount = 0

  materials.forEach((m) => {
    const stock = Number(m.total_received) - Number(m.total_used)
    if (stock <= 0) {
      outOfStockCount++
    } else if (stock <= Number(m.min_stock)) {
      lowStockCount++
    } else {
      normalStockCount++
    }
  })

  return (
    <div className="space-y-6">
      {/* Encabezado y Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-plano">Materiales e insumos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Entradas al almacén, consumos y lo que hay que reabastecer.
          </p>
        </div>
        <NewMaterialModal projectId={projectId} />
      </div>

      {/* Resumen de inventario: el color acompaña al texto, nunca lo sustituye */}
      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
        {[
          { label: 'Insumos', value: totalItems, dot: 'bg-plano' },
          { label: 'Con existencia', value: normalStockCount, dot: 'bg-ok' },
          { label: 'Por reabastecer', value: lowStockCount, dot: 'bg-senal' },
          { label: 'Agotados', value: outOfStockCount, dot: 'bg-destructive' },
        ].map((m) => (
          <div key={m.label} className="bg-card p-4">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} aria-hidden />
              {m.label}
            </dt>
            <dd className="mt-1 text-3xl font-bold text-plano">{m.value}</dd>
          </div>
        ))}
      </dl>

      {/* Listado / Tabla de Materiales */}
      <div className="mt-6">
        {materials.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border-2 border-dashed border-junta bg-card p-8">
            <Boxes className="h-10 w-10 text-obra" aria-hidden />
            <div>
              <h3 className="text-lg font-bold text-plano">Todavía no hay materiales</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Registra el primer material para llevar sus entradas y consumos.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-border/80 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3">Material</th>
                    <th scope="col" className="px-4 py-3">Categoría</th>
                    <th scope="col" className="px-4 py-3 text-right">Entradas</th>
                    <th scope="col" className="px-4 py-3 text-right">Salidas</th>
                    <th scope="col" className="px-4 py-3 text-right">Existencia</th>
                    <th scope="col" className="px-4 py-3">Estado</th>
                    <th scope="col" className="px-4 py-3 text-right"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {materials.map((item) => {
                    const stock = Number(item.total_received) - Number(item.total_used)
                    const isLow = stock > 0 && stock <= Number(item.min_stock)
                    const isOut = stock <= 0

                    return (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-bold text-plano text-sm">{item.name}</div>
                          {item.notes && (
                            <div className="text-xs text-muted-foreground truncate max-w-xs">{item.notes}</div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-muted text-plano/80 border border-border">
                            {item.category}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-0.5 text-ok">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            {item.total_received} {item.unit}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-0.5 text-senal">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            {item.total_used} {item.unit}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right whitespace-nowrap font-bold text-base">
                          <span className={isOut ? 'text-destructive' : isLow ? 'text-senal' : 'text-plano'}>
                            {stock} <span className="text-xs font-semibold text-muted-foreground">{item.unit}</span>
                          </span>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/5 text-destructive border border-destructive/30">
                              <XCircle className="w-3.5 h-3.5" aria-hidden /> Agotado
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-senal-soft text-senal border border-senal/30">
                              <AlertTriangle className="w-3.5 h-3.5" aria-hidden /> Reabastecer
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-ok-soft text-ok border border-ok/30">
                              <PackageCheck className="w-3.5 h-3.5" aria-hidden /> Con existencia
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <MaterialMovementModal
                              materialId={item.id}
                              materialName={item.name}
                              unit={item.unit}
                              type="entrada"
                              projectId={projectId}
                              stock={stock}
                              areas={areas || []}
                            />
                            <MaterialMovementModal
                              materialId={item.id}
                              materialName={item.name}
                              unit={item.unit}
                              type="salida"
                              projectId={projectId}
                              stock={stock}
                              areas={areas || []}
                            />
                            <MaterialHistoryModal materialId={item.id} materialName={item.name} unit={item.unit} />
                            <form action={async () => {
                              'use server'
                              await deleteMaterial(item.id, projectId)
                            }}>
                              <button
                                type="submit"
                                title="Eliminar material"
                                aria-label={`Eliminar ${item.name}`}
                                className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden />
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
