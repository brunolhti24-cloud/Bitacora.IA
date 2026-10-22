'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { updateTeamMember, updateMemberProjects } from '@/app/dashboard/actions'
import { Pencil, Loader2, UserCheck, Building2 } from 'lucide-react'

export function EditMemberModal({
  member,
  adminProjects,
  assignedProjectIds
}: {
  member: {
    id: string
    full_name: string | null
    role: string | null
    company_name?: string | null
  }
  adminProjects?: { id: string; name: string }[]
  assignedProjectIds?: string[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState(member.full_name || '')
  const [role, setRole] = useState(member.role || 'residente')
  const [selectedProjects, setSelectedProjects] = useState<string[]>(assignedProjectIds || [])

  const handleToggleProject = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!fullName.trim()) {
      alert('El nombre completo es obligatorio.')
      return
    }

    setLoading(true)
    try {
      const res = await updateTeamMember(member.id, fullName, role)
      if (res?.success) {
        // Guardar las asignaciones de proyectos
        await updateMemberProjects(member.id, selectedProjects)
        setOpen(false)
      } else if (res?.error) {
        alert(res.error)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-plano/80 transition-colors hover:bg-muted hover:text-plano">
        <Pencil className="h-4 w-4" aria-hidden /> Editar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-plano">
            <UserCheck className="w-5 h-5 text-obra" /> Editar integrante del equipo
          </DialogTitle>
          <DialogDescription>
            Modifica el nombre completo o el rol asignado dentro de tu empresa constructora.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">
              Nombre completo *
            </Label>
            <Input
              id="full_name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. Ing. Carlos Mendoza"
              className="h-11 rounded-md bg-muted/40"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">
              Rol del trabajador *
            </Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-11 w-full rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-semibold focus:bg-white focus:border-obra focus:outline-none"
            >
              <option value="director">Director / Administrador (Acceso Total)</option>
              <option value="residente">Residente de Obra (Gestión + Aceptación Bitácoras)</option>
              <option value="administracion">Administración (Tickets y Solicitudes)</option>
              <option value="subcontratista">Contratista / Subcontratista (Bitácoras, Tareas, Tickets)</option>
              <option value="operador">Operador (Crear Bitácoras y Ver Tareas)</option>
            </select>
          </div>

          {adminProjects && adminProjects.length > 0 && role !== 'admin' && role !== 'director' && (
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Obras asignadas
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecciona las obras a las que este trabajador tendrá acceso.
              </p>
              
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                {adminProjects.map(project => (
                  <label 
                    key={project.id} 
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      selectedProjects.includes(project.id) 
                        ? 'border-obra bg-accent/50' 
                        : 'border-border bg-white hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => handleToggleProject(project.id)}
                      className="w-4 h-4 text-obra rounded border-junta focus:ring-obra"
                    />
                    <span className="text-sm font-semibold text-plano/80">{project.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-md">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-obra hover:bg-obra-strong text-white font-bold rounded-md px-6">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
