import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { NewInviteModal } from '@/components/new-invite-modal'
import { EditMemberModal } from '@/components/edit-member-modal'
import { DeleteInviteButton } from '@/components/delete-invite-button'
import { Users, HardHat, ShieldCheck, Ticket, ClipboardList } from 'lucide-react'

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
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-plano sm:text-4xl">Equipo de trabajo</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Invita a residentes y cuadrillas. Cada rol ve solo lo que le toca: los contratistas no ven finanzas.
          </p>
        </div>
        <NewInviteModal />
      </header>

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {[
          { label: 'Integrantes', value: teamMembers?.length || 0 },
          { label: 'Residentes', value: teamMembers?.filter(m => m.role === 'residente').length || 0 },
          { label: 'Contratistas', value: teamMembers?.filter(m => m.role === 'subcontratista').length || 0 },
        ].map((m) => (
          <div key={m.label} className="bg-card p-4">
            <dt className="text-sm text-muted-foreground">{m.label}</dt>
            <dd className="mt-1 text-3xl font-bold text-plano">{m.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lista de Miembros del Equipo (2 columnas) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-plano">Integrantes</h2>

          {teamMembers?.length === 0 ? (
            <Card className="p-8 text-center bg-muted/50 border border-dashed border-border rounded-lg text-muted-foreground">
              Todavía no hay integrantes. Crea una invitación y compártela con tu equipo.
            </Card>
          ) : (
            <div className="space-y-3">
              {teamMembers?.map((member) => (
                <Card key={member.id} className="p-4 border border-border rounded-lg bg-white ring-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-plano">
                      {member.full_name?.charAt(0) || 'U'}
                    </div>

                    <div>
                      <h3 className="font-bold text-plano text-sm">
                        {member.full_name || 'Sin nombre'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {member.company_name || 'Constructora'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                      member.role === 'admin' || member.role === 'director'
                        ? 'bg-senal-soft text-senal border border-senal/30'
                        : member.role === 'residente'
                        ? 'bg-accent text-obra-strong border border-obra/25'
                        : member.role === 'administracion'
                        ? 'bg-muted text-plano border border-border'
                        : member.role === 'subcontratista'
                        ? 'bg-ok-soft text-ok border border-ok/30'
                        : 'bg-muted text-plano/80 border border-border'
                    }`}>
                      {member.role === 'admin' || member.role === 'director' ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" aria-hidden /> Director de obra
                        </>
                      ) : member.role === 'residente' ? (
                        <>
                          <HardHat className="w-3.5 h-3.5" aria-hidden /> Residente de Obra
                        </>
                      ) : member.role === 'administracion' ? (
                        <>
                          <Users className="w-3.5 h-3.5" aria-hidden /> Administración
                        </>
                      ) : member.role === 'subcontratista' ? (
                        <>
                          <Ticket className="w-3.5 h-3.5" aria-hidden /> Contratista
                        </>
                      ) : (
                        <>
                          <ClipboardList className="w-3.5 h-3.5" aria-hidden /> Operador
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
          <h2 className="text-xl font-bold text-plano">Invitaciones</h2>

          {invites?.length === 0 ? (
            <Card className="p-6 text-center bg-muted/50 border border-dashed border-border rounded-lg text-muted-foreground text-xs">
              Todavía no has creado invitaciones.
            </Card>
          ) : (
            <div className="space-y-3">
              {invites?.map((inv) => (
                <Card key={inv.id} className="p-4 border border-border rounded-lg bg-white ring-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-plano text-base bg-muted px-2.5 py-0.5 rounded-md tracking-wider">
                      {inv.code}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {inv.used_count || 0} {(inv.used_count || 0) === 1 ? 'uso' : 'usos'}
                      </span>
                      <DeleteInviteButton inviteId={inv.id} inviteCode={inv.code} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                    <span>Rol: <strong className="capitalize">{inv.role}</strong></span>
                    <span className="text-muted-foreground">{new Date(inv.created_at).toLocaleDateString('es-MX')}</span>
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
