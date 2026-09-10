import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NewMaterialModal } from '@/components/new-material-modal'
import { MaterialMovementModal } from '@/components/material-movement-modal'
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
          <h2 className="text-xl font-black text-[#031033] flex items-center gap-2">
            <Boxes className="w-6 h-6 text-[#144CC9]" />
            Control de Materiales e Insumos de Obra
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Administra las entradas de almacén, consumos diarios y alertas de reabastecimiento en obra.
          </p>
        </div>
        <NewMaterialModal projectId={projectId} />
      </div>

      {/* Tarjetas Resumen de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6">
        <Card className="p-5 border border-[#031033] shadow-sm rounded-3xl bg-white flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between">
            <span className="text-xl font-black leading-tight text-[#031033]">
              Total<br/>Insumos
            </span>
            <div className="w-4 h-4 rounded-full bg-[#031033] shrink-0 mt-1 mr-1"></div>
          </div>
          <p className="text-2xl font-black text-[#031033] mt-4">{totalItems}</p>
        </Card>

        <Card className="p-5 border border-[#A7EC80] shadow-sm rounded-3xl bg-white flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between">
            <span className="text-xl font-black leading-tight text-[#031033]">
              Stock<br/>Normal
            </span>
            <div className="w-4 h-4 rounded-full bg-[#A7EC80] shrink-0 mt-1 mr-1"></div>
          </div>
          <p className="text-2xl font-black text-[#031033] mt-4">{normalStockCount}</p>
        </Card>

        <Card className="p-5 border border-[#FDE047] shadow-sm rounded-3xl bg-white flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between">
            <span className="text-xl font-black leading-tight text-[#031033]">
              Stock<br/>Bajo
            </span>
            <div className="w-4 h-4 rounded-full bg-[#FDE047] shrink-0 mt-1 mr-1"></div>
          </div>
          <p className="text-2xl font-black text-[#031033] mt-4">{lowStockCount}</p>
        </Card>

        <Card className="p-5 border border-[#EF4444] shadow-sm rounded-3xl bg-white flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between">
            <span className="text-xl font-black leading-tight text-[#031033]">
              Agotados
            </span>
            <div className="w-4 h-4 rounded-full bg-[#EF4444] shrink-0 mt-1 mr-1"></div>
          </div>
          <p className="text-2xl font-black text-[#031033] mt-4">{outOfStockCount}</p>
        </Card>
      </div>

      {/* Listado / Tabla de Materiales */}
      <div className="mt-6">
        {materials.length === 0 ? (
          <Card className="py-16 px-10 text-center bg-white border border-slate-200 shadow-sm rounded-[2.5rem] space-y-4">
            <Boxes className="w-12 h-12 text-[#144CC9] mx-auto" strokeWidth={2} />
            <div>
              <h3 className="font-black text-2xl text-[#031033]">No hay materiales registrados en esta obra</h3>
              <p className="text-sm text-slate-500 mt-2">
                Haz clic en registrar material/insumo para agregarlos a esta sección.
              </p>
            </div>
          </Card>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">Material / Insumo</th>
                    <th className="px-4 py-3.5">Categoría</th>
                    <th className="px-4 py-3.5 text-center">Entradas</th>
                    <th className="px-4 py-3.5 text-center">Consumo (Salidas)</th>
                    <th className="px-4 py-3.5 text-center">Stock Disponible</th>
                    <th className="px-4 py-3.5 text-center">Estado</th>
                    <th className="px-4 py-3.5 text-right">Movimientos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {materials.map((item) => {
                    const stock = Number(item.total_received) - Number(item.total_used)
                    const isLow = stock > 0 && stock <= Number(item.min_stock)
                    const isOut = stock <= 0

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                          {item.notes && (
                            <div className="text-xs text-slate-500 truncate max-w-xs">{item.notes}</div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.category}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center font-bold text-slate-700">
                          <span className="inline-flex items-center gap-0.5 text-emerald-700">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            {item.total_received} {item.unit}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center font-bold text-slate-700">
                          <span className="inline-flex items-center gap-0.5 text-amber-700">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            {item.total_used} {item.unit}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center font-extrabold text-base">
                          <span className={isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'}>
                            {stock} <span className="text-xs font-semibold text-slate-500">{item.unit}</span>
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-100 text-red-800 border border-red-200">
                              <XCircle className="w-3.5 h-3.5" /> Agotado
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-3.5 h-3.5" /> Alerta Reabastecer
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <PackageCheck className="w-3.5 h-3.5" /> En Stock
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
                            />
                            <MaterialMovementModal
                              materialId={item.id}
                              materialName={item.name}
                              unit={item.unit}
                              type="salida"
                              projectId={projectId}
                            />
                            <form action={async () => {
                              'use server'
                              await deleteMaterial(item.id, projectId)
                            }}>
                              <button
                                type="submit"
                                title="Eliminar Insumo"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
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
