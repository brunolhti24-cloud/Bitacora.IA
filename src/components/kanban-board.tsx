'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent } from '@/components/ui/card'
import { updateTaskStatus, deleteTask } from '@/app/dashboard/actions'
import { NewTaskModal } from './new-task-modal'
import { Trash2 } from 'lucide-react'

type Task = {
  id: string
  title: string
  description: string
  status: 'Pendiente' | 'En Proceso' | 'Terminada'
  assigned_to?: { id: string; full_name: string; role: string } | null
}

const COLUMNS: { id: Task['status']; title: string }[] = [
  { id: 'Pendiente', title: 'Por Hacer' },
  { id: 'En Proceso', title: 'En Progreso' },
  { id: 'Terminada', title: 'Completado' },
]

export function KanbanBoard({ 
  initialTasks, 
  projectId, 
  hideNewTask = false,
  projectMembers = []
}: { 
  initialTasks: any[], 
  projectId?: string, 
  hideNewTask?: boolean,
  projectMembers?: any[]
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  // Sincronizar cuando vengan nuevas tareas del servidor (ej. al crear una nueva)
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId as Task['status']
    
    // Update local state immediately for snappy UI
    setTasks(prev => prev.map(task => 
      task.id === draggableId ? { ...task, status: newStatus } : task
    ))

    // Update backend
    try {
      await updateTaskStatus(draggableId, newStatus, projectId || '')
    } catch (error) {
      console.error('Error updating task:', error)
      setTasks(initialTasks) 
    }
  }

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    if (!confirm('¿Estás seguro de eliminar esta tarea permanentemente?')) return

    // Actualización optimista inmediata
    setTasks(prev => prev.filter(t => t.id !== taskId))

    try {
      await deleteTask(taskId, projectId)
    } catch (error) {
      console.error('Error deleting task:', error)
      setTasks(initialTasks)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Tablero de Tareas</h2>
        {!hideNewTask && projectId && <NewTaskModal projectId={projectId} projectMembers={projectMembers} />}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map(column => {
            const columnTasks = tasks.filter(t => t.status === column.id)
            return (
              <div key={column.id} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80">
                <h3 className="font-bold mb-4 text-slate-800 dark:text-slate-200 flex justify-between items-center text-sm">
                  <span>{column.title}</span>
                  <span className="bg-blue-100 text-blue-700 font-extrabold px-2.5 py-0.5 rounded-full text-xs">
                    {columnTasks.length}
                  </span>
                </h3>
                
                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="min-h-[200px] space-y-3"
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <Card className="cursor-grab active:cursor-grabbing hover:border-blue-500 hover:shadow-md transition-all rounded-xl border border-slate-200 bg-white group relative">
                                <CardContent className="p-4">
                                  {/* Encabezado Tarea con Botón de Eliminar */}
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-bold text-slate-900 text-sm leading-tight flex-1">
                                      {task.title}
                                    </p>

                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteTask(e, task.id)}
                                      title="Eliminar tarea"
                                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors shrink-0"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {task.description && (
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}

                                  {task.assigned_to && (
                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                                          {task.assigned_to.full_name?.charAt(0) || '@'}
                                        </div>
                                        <span className="text-xs font-medium text-slate-600">
                                          {task.assigned_to.full_name || 'Trabajador'}
                                        </span>
                                      </div>

                                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                                        {task.assigned_to.role || 'Rol'}
                                      </span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
