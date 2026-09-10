import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NewInviteModal } from '@/components/new-invite-modal'
import { EditMemberModal } from '@/components/edit-member-modal'
import { DeleteInviteButton } from '@/components/delete-invite-button'
import { Users, UserCheck, HardHat, ShieldCheck, Ticket, Copy, CheckCircle2, ClipboardList } from 'lucide-react'

export default async function EquipoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Obtener lista de miembros del equipo de este administrador
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, full_name, role, company_name, created_at, invited_by')
    .or(`id.eq.${user?.id},invited_by.eq.${user?.id}`)
    .order('created_at', { ascending: false })

  // 2. Obtener códigos de invitación generados por este administrador
  const { data: invites } = await supabase
    .from('company_invites')
    .select('*')
    .eq('created_by', user?.id)
    .order('created_at', { ascending: false })

  // 3. Obtener proyectos para poder asignarlos
  const { data: adminProjects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('created_by', user?.id)

  // 4. Obtener asignaciones actuales de los miembros del equipo
  const { data: allProjectMembers } = await supabase
    .from('project_members')
    .select('user_id, project_id')


  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-4 sm:px-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="h-8 w-8 text-blue-600" />
            Gestión de Equipo de Trabajo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Invita a tus residentes y cuadrillas con accesos limitados para que no vean finanzas ni datos administrativos.
          </p>
        </div>

        {/* Modal de Generación de Invitación */}
        <NewInviteModal />
      </div>

      {/* Resumen de Miembros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Miembros
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-slate-900">
              {teamMembers?.length || 0} usuarios
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Residentes de Obra
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600">
              {teamMembers?.filter(m => m.role === 'residente').length || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Subcontratistas / Cuadrillas
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {teamMembers?.filter(m => m.role === 'subcontratista').length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lista de Miembros del Equipo (2 columnas) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            Integrantes del Equipo Registrados
          </h2>

          {teamMembers?.length === 0 ? (
            <Card className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-500">
              No hay miembros registrados aún. Genera un enlace de invitación arriba.
            </Card>
          ) : (
            <div className="space-y-3">
              {teamMembers?.map((member) => (
                <Card key={member.id} className="p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      member.role === 'admin'
                        ? 'bg-amber-100 text-amber-800'
                        : member.role === 'residente'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {member.full_name?.charAt(0) || 'U'}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {member.full_name || 'Sin nombre'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {member.company_name || 'Constructora'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold capitalize ${
                      member.role === 'admin' || member.role === 'director'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : member.role === 'residente'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : member.role === 'administracion'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : member.role === 'subcontratista'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {member.role === 'admin' || member.role === 'director' ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" /> Director (Admin)
                        </>
                      ) : member.role === 'residente' ? (
                        <>
                          <HardHat className="w-3.5 h-3.5" /> Residente de Obra
                        </>
                      ) : member.role === 'administracion' ? (
                        <>
                          <Users className="w-3.5 h-3.5" /> Administración
                        </>
                      ) : member.role === 'subcontratista' ? (
                        <>
                          <Ticket className="w-3.5 h-3.5" /> Contratista / Subcontratista
                        </>
                      ) : (
                        <>
                          <ClipboardList className="w-3.5 h-3.5" /> Operador / Auxiliar
                        </>
                      )}
                    </span>

                    <EditMemberModal 
                      member={member} 
                      adminProjects={adminProjects || []} 
                      assignedProjectIds={allProjectMembers?.filter(pm => pm.user_id === member.id).map(pm => pm.project_id) || []}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Columna Derecha: Códigos de Invitación Activos */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Ticket className="h-5 w-5 text-amber-600" />
            Invitaciones Creadas
          </h2>

          {invites?.length === 0 ? (
            <Card className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
              Aún no has generado códigos de invitación.
            </Card>
          ) : (
            <div className="space-y-3">
              {invites?.map((inv) => (
                <Card key={inv.id} className="p-4 border border-slate-200 shadow-sm rounded-xl bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-blue-600 text-base tracking-widest bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                      {inv.code}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase text-slate-500">
                        {inv.used_count || 0} uso(s)
                      </span>
                      <DeleteInviteButton inviteId={inv.id} inviteCode={inv.code} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                    <span>Rol: <strong className="capitalize">{inv.role}</strong></span>
                    <span className="text-slate-400">{new Date(inv.created_at).toLocaleDateString('es-MX')}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
