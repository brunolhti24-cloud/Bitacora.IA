'use client'

import { Card, CardContent } from '@/components/ui/card'
import { 
  BookOpen, Folder, FileText, Package, Wallet, ClipboardList, Users, User, Sparkles, 
  Search, ArrowRight, Download, CheckCircle2, ArrowDownLeft, ArrowUpRight, type LucideIcon
} from 'lucide-react'
import { useState } from 'react'

const SECTION_ICONS: Record<string, LucideIcon> = {
  introduccion: BookOpen, obras: Folder, bitacoras: FileText, materiales: Package, gastos: Wallet,
  solicitudes: ClipboardList, roles: Users, perfil: User, ia: Sparkles,
}

function SectionIcon({ id }: { id: string }) {
  const Icon = SECTION_ICONS[id] || BookOpen
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent text-obra">
      <Icon className="h-6 w-6" aria-hidden />
    </div>
  )
}

export default function ManualPage() {
  const [activeSection, setActiveSection] = useState('introduccion')
  const [searchQuery, setSearchQuery] = useState('')

  const sections = [
    {
      id: 'introduccion',
      title: 'Bienvenido',
      icon: BookOpen,
      description: 'Introducción a la plataforma Bitacor.AI 2.0 y sus flujos principales.'
    },
    {
      id: 'obras',
      title: '1. Obras y frentes',
      icon: Folder,
      description: 'Creación de proyectos de construcción y división por áreas de trabajo.'
    },
    {
      id: 'bitacoras',
      title: '2. Registro de bitácoras',
      icon: FileText,
      description: 'Llenado del reporte diario de actividades, clima, personal y firmas digitales.'
    },
    {
      id: 'materiales',
      title: '3. Control de materiales',
      icon: Package,
      description: 'Administración de inventarios, registro de movimientos y control de insumos.'
    },
    {
      id: 'gastos',
      title: '4. Finanzas y gastos',
      icon: Wallet,
      description: 'Control de presupuestos, subida de tickets de gastos y comprobantes.'
    },
    {
      id: 'solicitudes',
      title: '5. Solicitudes especiales',
      icon: ClipboardList,
      description: 'Requerimientos extraordinarios de materiales, equipo o presupuesto.'
    },
    {
      id: 'roles',
      title: '6. Equipo y roles',
      icon: Users,
      description: 'Jerarquías de acceso para Directores, Residentes, Administradores y Contratistas.'
    },
    {
      id: 'perfil',
      title: '7. Perfil y personalización',
      icon: User,
      description: 'Cambio de logotipos de empresa y datos generales del perfil.'
    },
    {
      id: 'ia',
      title: '8. Asistente de IA',
      icon: Sparkles,
      description: 'Consultas en lenguaje natural, dictado por voz y comandos a la base de datos.'
    }
  ]

  const filteredSections = sections.filter(sec => 
    sec.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    sec.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDownload = () => {
    // Descarga del archivo PDF original
    const link = document.createElement('a')
    link.href = '/manual_usuario.pdf'
    link.download = 'manual_usuario_Bitacor.AI_2.0.pdf'
    link.click()
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-plano sm:text-4xl">Manual de usuario</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Cómo usar cada parte de Bitacor.AI, paso a paso. Elige un tema o búscalo.
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-md border border-border bg-white px-4 text-sm font-semibold text-plano transition-colors hover:bg-muted md:self-auto"
        >
          <Download className="h-4 w-4 text-obra" aria-hidden /> Descargar PDF
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-4 lg:col-span-1">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar tema…" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar tema del manual"
              className="h-11 w-full rounded-md border border-input bg-white pl-9 pr-3 text-base focus-visible:border-obra md:text-sm"
            />
          </div>

          {/* Sidebar Menu */}
          <div className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {filteredSections.map((sec) => {
              const Icon = sec.icon
              const isActive = activeSection === sec.id
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative flex min-h-11 shrink-0 items-center gap-3 rounded-md px-3 text-left text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-white text-plano shadow-[0_1px_0_var(--junta)] lg:before:absolute lg:before:inset-y-2 lg:before:left-0 lg:before:w-[3px] lg:before:rounded-full lg:before:bg-obra'
                      : 'text-plano/75 hover:bg-white/60 hover:text-plano'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-obra' : 'text-plano/55'}`} aria-hidden />
                  <span className="truncate">{sec.title}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Viewer */}
        <div className="lg:col-span-3">
          <Card className="rounded-lg bg-white">
            <CardContent className="p-6 md:p-10">
              
              {/* Sección: Introducción */}
              {activeSection === 'introduccion' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <SectionIcon id="introduccion" />
                    <div>
                      <h2 className="text-2xl font-extrabold text-plano">Bienvenido a Bitacor.AI</h2>
                      <p className="text-sm text-muted-foreground">Flujos principales del sistema</p>
                    </div>
                  </div>
                  
                  <p className="text-base text-muted-foreground leading-relaxed font-medium">
                    Bitacor.AI 2.0 es un centro de comando digital diseñado especialmente para constructoras. Su objetivo principal es conectar a los directores, administradores y residentes de obra para llevar un control exacto de avance físico, inventario de materiales y finanzas.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2 pt-4">
                    <div className="p-5 rounded-lg bg-muted/50 border border-border space-y-2">
                      <h3 className="font-extrabold text-sm text-plano flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-ok" /> Residentes de obra
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                        Registran bitácoras con firmas y fotos, notifican entradas y salidas de materiales e ingresan gastos de caja chica.
                      </p>
                    </div>
                    <div className="p-5 rounded-lg bg-muted/50 border border-border space-y-2">
                      <h3 className="font-extrabold text-sm text-plano flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-ok" /> Directores (admin)
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                        Monitorean presupuestos globales, aprueban solicitudes especiales, auditan gastos y coordinan el equipo de trabajo.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Paso 1 de 9</span>
                    <button 
                      onClick={() => setActiveSection('obras')}
                      className="inline-flex h-11 items-center gap-1.5 rounded-md bg-obra px-4 text-sm font-semibold text-white transition-colors hover:bg-obra-strong"
                    >
                      Siguiente tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: Obras */}
              {activeSection === 'obras' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <SectionIcon id="obras" />
                    <div>
                      <h2 className="text-2xl font-extrabold text-plano">Obras y frentes de trabajo</h2>
                      <p className="text-sm text-muted-foreground">Organización y administración del territorio</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-muted-foreground font-medium text-sm leading-relaxed">
                    <p>
                      El núcleo de Bitacor.AI son las <strong className="font-semibold text-plano">Obras (Proyectos)</strong>. Todo registro contable, de materiales y de bitácoras está ligado obligatoriamente a una obra específica.
                    </p>
                    
                    <div className="space-y-2 border-l-2 border-obra pl-4 py-1 bg-accent/30 rounded-r-md pr-3">
                      <h4 className="font-extrabold text-xs text-plano">Creación de proyectos</h4>
                      <p className="text-xs text-muted-foreground">
                        Como Director de Obra, puedes añadir nuevos proyectos haciendo clic en <span className="font-bold text-plano">"+ Nueva Obra"</span> en el Dashboard. Debes capturar los datos principales como presupuesto base asignado, cliente y ubicación geográfica.
                      </p>
                    </div>

                    <div className="space-y-2 border-l-2 border-obra pl-4 py-1 bg-accent/30 rounded-r-md pr-3">
                      <h4 className="font-extrabold text-xs text-plano">Frentes de trabajo (áreas)</h4>
                      <p className="text-xs text-muted-foreground">
                        Las obras se subdividen en áreas específicas (ej. "Recámara 1", "Cocina", "Fachada"). Esto permite clasificar el inventario y las bitácoras diarias por sectores concretos. Puedes agregarlas libremente escribiendo el nombre en la pestaña <strong className="font-semibold text-plano">Áreas</strong> del panel de la obra.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Paso 2 de 9</span>
                    <button 
                      onClick={() => setActiveSection('bitacoras')}
                      className="inline-flex h-11 items-center gap-1.5 rounded-md bg-obra px-4 text-sm font-semibold text-white transition-colors hover:bg-obra-strong"
                    >
                      Siguiente tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: Bitácoras */}
              {activeSection === 'bitacoras' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <SectionIcon id="bitacoras" />
                    <div>
                      <h2 className="text-2xl font-extrabold text-plano">Registro de bitácoras diarias</h2>
                      <p className="text-sm text-muted-foreground">Documentación técnica diaria</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-muted-foreground font-medium text-sm leading-relaxed">
                    <p>
                      El registro diario de bitácoras te permite documentar formalmente las actividades en obra. Cada reporte se asocia a un área específica y requiere los siguientes datos:
                    </p>

                    <ul className="space-y-3 bg-muted/50 border border-border p-5 rounded-lg text-xs">
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-obra">Fecha del reporte:</span>
                        <span>Se selecciona el día laborado (por defecto la fecha actual).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-obra">Clima de la jornada:</span>
                        <span>Identifica si el clima afectó el rendimiento (Soleado, Lluvioso, etc.).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-obra">Personal activo:</span>
                        <span>Número de obreros que asistieron ese día.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-obra">Notas y Avances:</span>
                        <span>
                          Descripción del trabajo realizado. Cuenta con herramientas de <strong className="font-semibold text-plano">Dictado por Voz</strong> y <strong className="font-semibold text-plano">Mejora con IA</strong> para estructurar profesionalmente las notas.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-obra">Evidencia fotográfica:</span>
                        <span>Sube fotos directo desde la cámara de tu celular o archivos locales.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-obra">Firma digital:</span>
                        <span>Validación legal del reporte dibujando tu firma en el recuadro digital.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-6 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Paso 3 de 9</span>
                    <button 
                      onClick={() => setActiveSection('materiales')}
                      className="inline-flex h-11 items-center gap-1.5 rounded-md bg-obra px-4 text-sm font-semibold text-white transition-colors hover:bg-obra-strong"
                    >
                      Siguiente tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: Materiales */}
              {activeSection === 'materiales' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <SectionIcon id="materiales" />
                    <div>
                      <h2 className="text-2xl font-extrabold text-plano">Control de materiales</h2>
                      <p className="text-sm text-muted-foreground">Administración de insumos e inventario</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-muted-foreground font-medium text-sm leading-relaxed">
                    <p>
                      Evita pérdidas y desabasto registrando todos los materiales de tus proyectos en la pestaña <strong className="font-semibold text-plano">Materiales</strong>:
                    </p>

                    <div className="grid gap-4 sm:grid-cols-3 pt-2">
                      <div className="p-4 rounded-md border border-border space-y-1.5">
                        <ClipboardList className="h-5 w-5 text-obra" aria-hidden />
                        <h4 className="font-extrabold text-xs text-plano">Catálogo</h4>
                        <p className="text-xs text-muted-foreground">Registra tus materiales especificando unidad (m3, bultos, toneladas).</p>
                      </div>
                      <div className="p-4 rounded-md border border-border space-y-1.5">
                        <ArrowDownLeft className="h-5 w-5 text-ok" aria-hidden />
                        <h4 className="font-extrabold text-xs text-plano">Entrada (+)</h4>
                        <p className="text-xs text-muted-foreground">Suma stock cuando llegue un proveedor.</p>
                      </div>
                      <div className="p-4 rounded-md border border-border space-y-1.5">
                        <ArrowUpRight className="h-5 w-5 text-senal" aria-hidden />
                        <h4 className="font-extrabold text-xs text-plano">Salida (-)</h4>
                        <p className="text-xs text-muted-foreground">Resta stock cuando el material se aplique en obra.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Paso 4 de 9</span>
                    <button 
                      onClick={() => setActiveSection('gastos')}
                      className="inline-flex h-11 items-center gap-1.5 rounded-md bg-obra px-4 text-sm font-semibold text-white transition-colors hover:bg-obra-strong"
                    >
                      Siguiente tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: Gastos */}
              {activeSection === 'gastos' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <SectionIcon id="gastos" />
                    <div>
                      <h2 className="text-2xl font-extrabold text-plano">Tickets de gastos y finanzas</h2>
                      <p className="text-sm text-muted-foreground">Control de egresos y facturación</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-muted-foreground font-medium text-sm leading-relaxed">
                    <p>
                      Cualquier compra de emergencia, renta de herramienta o pago de flete debe registrarse en la sección <strong className="font-semibold text-plano">Gastos</strong>:
                    </p>

                    <div className="space-y-2 border-l-2 border-destructive pl-4 py-1 bg-destructive/5 rounded-r-md pr-3">
                      <h4 className="font-extrabold text-xs text-plano">Registro obligatorio</h4>
                      <p className="text-xs text-muted-foreground">
                        Cada gasto requiere ingresar el monto, descripción del concepto, fecha y la categoría correspondiente.
                      </p>
                    </div>

                    <div className="space-y-2 border-l-2 border-ok pl-4 py-1 bg-ok-soft rounded-r-md pr-3">
                      <h4 className="font-extrabold text-xs text-plano">Comprobante del gasto</h4>
                      <p className="text-xs text-muted-foreground">
                        Es indispensable subir una fotografía legible del ticket o la factura. Esto agiliza la auditoría del equipo de administración y valida los desembolsos de caja chica.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Paso 5 de 9</span>
                    <button 
                      onClick={() => setActiveSection('solicitudes')}
                      className="inline-flex h-11 items-center gap-1.5 rounded-md bg-obra px-4 text-sm font-semibold text-white transition-colors hover:bg-obra-strong"
                    >
                      Siguiente tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: Solicitudes */}
              {activeSection === 'solicitudes' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <SectionIcon id="solicitudes" />
                    <div>
                      <h2 className="text-2xl font-extrabold text-plano">Solicitudes especiales</h2>
                      <p className="text-sm text-muted-foreground">Gestión de recursos y herramientas</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-muted-foreground font-medium text-sm leading-relaxed">
                    <p>
                      Si necesitas un material no presupuestado, rentar equipo pesado o ampliar el presupuesto de un frente de trabajo:
                    </p>

                    <ol className="space-y-3 bg-muted/50 border border-border p-5 rounded-lg text-xs list-decimal pl-8">
                      <li>Ve a la sección <strong className="font-semibold text-plano">Solicitudes Especiales</strong> en el menú de navegación lateral.</li>
                      <li>Haz clic en `+ Nueva Solicitud`.</li>
                      <li>Elige la obra, describe detalladamente la necesidad e ingresa el costo estimado o cantidad.</li>
                      <li>El sistema notificará a los Directores de Obra. Verás el estado cambiar de *Pendiente* a *Aprobada* o *Rechazada* al instante.</li>
                    </ol>
                  </div>

                  <div className="pt-6 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Paso 6 de 9</span>
                    <button 
                      onClick={() => setActiveSection('roles')}
                      className="inline-flex h-11 items-center gap-1.5 rounded-md bg-obra px-4 text-sm font-semibold text-white transition-colors hover:bg-obra-strong"
                    >
                      Siguiente tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: Roles */}
              {activeSection === 'roles' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <SectionIcon id="roles" />
                    <div>
                      <h2 className="text-2xl font-extrabold text-plano">Equipo de trabajo y roles</h2>
                      <p className="text-sm text-muted-foreground">Permisos de acceso y jerarquías</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-muted-foreground font-medium text-sm leading-relaxed">
                    <p>
                      Bitacor.AI cuenta con roles estructurados para proteger la información financiera y optimizar el flujo de trabajo:
                    </p>

                    <div className="space-y-3">
                      <div className="p-4 rounded-md border border-border flex items-start gap-3">
                        <span className="text-lg bg-accent text-obra px-2.5 py-1 rounded-lg font-bold">Dir</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-plano">Director de obra (admin)</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Control financiero, creación de obras, edición de perfiles de empresa e incorporación de personal.</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-md border border-border flex items-start gap-3">
                        <span className="text-lg bg-ok-soft text-ok px-2.5 py-1 rounded-lg font-bold">Res</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-plano">Residente de obra</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Llenado de bitácoras diarias, inventario de materiales y generación de solicitudes de compras.</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-md border border-border flex items-start gap-3">
                        <span className="text-lg bg-senal-soft text-senal px-2.5 py-1 rounded-lg font-bold">Adm</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-plano">Administración</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Auditoría contable, revisión de comprobantes de pago y conciliación de gastos del proyecto.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Paso 7 de 9</span>
                    <button 
                      onClick={() => setActiveSection('perfil')}
                      className="inline-flex h-11 items-center gap-1.5 rounded-md bg-obra px-4 text-sm font-semibold text-white transition-colors hover:bg-obra-strong"
                    >
                      Siguiente tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: Perfil */}
              {activeSection === 'perfil' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <SectionIcon id="perfil" />
                    <div>
                      <h2 className="text-2xl font-extrabold text-plano">Configuración de perfil y empresa</h2>
                      <p className="text-sm text-muted-foreground">Personalización del command center</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-muted-foreground font-medium text-sm leading-relaxed">
                    <p>
                      Haz tuya la aplicación personalizando la imagen corporativa para tus clientes y equipo:
                    </p>

                    <ol className="space-y-3 bg-muted/50 border border-border p-5 rounded-lg text-xs list-decimal pl-8">
                      <li>Ve a la pestaña <strong className="font-semibold text-plano">Mi Perfil y Empresa</strong> en el menú.</li>
                      <li>Ingresa tu nombre completo y el nombre de tu constructora.</li>
                      <li>Sube un archivo de imagen transparente con el <strong className="font-semibold text-plano">Logotipo de tu empresa</strong>.</li>
                      <li>
                        Al hacer clic en guardar, el logotipo corporativo se aplicará automáticamente en el encabezado de toda la plataforma, reemplazando al logo por defecto de Bitacor.AI.
                      </li>
                    </ol>
                  </div>

                  <div className="pt-6 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Paso 8 de 9</span>
                    <button 
                      onClick={() => setActiveSection('ia')}
                      className="inline-flex h-11 items-center gap-1.5 rounded-md bg-obra px-4 text-sm font-semibold text-white transition-colors hover:bg-obra-strong"
                    >
                      Siguiente tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: IA */}
              {activeSection === 'ia' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <SectionIcon id="ia" />
                    <div>
                      <h2 className="text-2xl font-extrabold text-plano">Copiloto de IA y asistente</h2>
                      <p className="text-sm text-muted-foreground">Automatización por chat interactivo</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-muted-foreground font-medium text-sm leading-relaxed">
                    <p>
                      El asistente de IA flotante en la esquina inferior derecha te permite controlar la base de datos de manera automatizada:
                    </p>

                    <ul className="space-y-3 bg-muted/50 border border-border p-5 rounded-lg text-xs">
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-obra">Dictado por voz:</span>
                        <span>Usa el micrófono en los campos de texto para dictar tus avances sin escribir manualmente.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-obra">Mejora con IA:</span>
                        <span>Convierte tus notas rápidas en bitácoras perfectamente redactadas y estructuradas con un clic.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-obra">Consultas inteligentes:</span>
                        <span>Pregúntale al chat flotante sobre saldos, bitácoras o inventario de materiales directamente en lenguaje natural.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-6 border-t border-border flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Paso 9 de 9</span>
                    <button 
                      onClick={() => setActiveSection('introduccion')}
                      className="inline-flex h-11 items-center gap-1.5 rounded-md bg-obra px-4 text-sm font-semibold text-white transition-colors hover:bg-obra-strong"
                    >
                      Volver al Inicio <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

