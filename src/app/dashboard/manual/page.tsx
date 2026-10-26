'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BookOpen, Folder, FileText, Package, Wallet, ClipboardList, Users, User, Sparkles, 
  Search, ShieldAlert, ArrowRight, HelpCircle, Download, CheckCircle2 
} from 'lucide-react'
import { useState } from 'react'

export default function ManualPage() {
  const [activeSection, setActiveSection] = useState('introduccion')
  const [searchQuery, setSearchQuery] = useState('')

  const sections = [
    {
      id: 'introduccion',
      title: 'Bienvenido',
      icon: BookOpen,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      gradient: 'from-blue-600 to-indigo-600',
      description: 'Introducción a la plataforma Bitacor.AI 2.0 y sus flujos principales.'
    },
    {
      id: 'obras',
      title: '1. Obras y Frentes',
      icon: Folder,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      gradient: 'from-indigo-600 to-violet-600',
      description: 'Creación de proyectos de construcción y división por áreas de trabajo.'
    },
    {
      id: 'bitacoras',
      title: '2. Registro de Bitácoras',
      icon: FileText,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      gradient: 'from-emerald-600 to-teal-600',
      description: 'Llenado del reporte diario de actividades, clima, personal y firmas digitales.'
    },
    {
      id: 'materiales',
      title: '3. Control de Materiales',
      icon: Package,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      gradient: 'from-amber-600 to-orange-600',
      description: 'Administración de inventarios, registro de movimientos y control de insumos.'
    },
    {
      id: 'gastos',
      title: '4. Finanzas y Gastos',
      icon: Wallet,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      gradient: 'from-rose-600 to-pink-600',
      description: 'Control de presupuestos, subida de tickets de gastos y comprobantes.'
    },
    {
      id: 'solicitudes',
      title: '5. Solicitudes Especiales',
      icon: ClipboardList,
      color: 'text-sky-600 bg-sky-50 border-sky-100',
      gradient: 'from-sky-600 to-cyan-600',
      description: 'Requerimientos extraordinarios de materiales, equipo o presupuesto.'
    },
    {
      id: 'roles',
      title: '6. Equipo y Roles',
      icon: Users,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
      gradient: 'from-purple-600 to-fuchsia-600',
      description: 'Jerarquías de acceso para Directores, Residentes, Administradores y Contratistas.'
    },
    {
      id: 'perfil',
      title: '7. Perfil y Personalización',
      icon: User,
      color: 'text-teal-600 bg-teal-50 border-teal-100',
      gradient: 'from-teal-600 to-emerald-600',
      description: 'Cambio de logotipos de empresa y datos generales del perfil.'
    },
    {
      id: 'ia',
      title: '8. Copiloto de IA',
      icon: Sparkles,
      color: 'text-pink-600 bg-pink-50 border-pink-100',
      gradient: 'from-pink-600 to-rose-600',
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
      {/* Tech Header Banner */}
      <div className="relative rounded-3xl bg-white p-6 md:p-10 text-[#031033] overflow-hidden border border-slate-200 shadow-sm">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-50 rounded-full blur-3xl -z-10" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-emerald-50 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-[#144CC9]/10 text-[#144CC9] border border-[#144CC9]/20 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#144CC9]" /> Centro de Ayuda Bitacor.AI
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Manual de Usuario Interactivo
            </h1>
            <p className="text-sm text-slate-500 max-w-xl font-medium">
              Aprende a dominar todas las herramientas tecnológicas de Bitacor.AI 2.0. Utiliza el menú interactivo para navegar entre las secciones.
            </p>
          </div>
          
          <button 
            onClick={handleDownload}
            className="self-start md:self-auto px-5 py-3 rounded-2xl bg-[#031033] hover:bg-[#031033]/90 text-white font-extrabold text-sm transition-all flex items-center gap-2 shrink-0 shadow-lg"
          >
            <Download className="w-4 h-4 text-[#A7EC80]" /> Descargar Manual (.pdf)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-4 lg:col-span-1">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar tema..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-full border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#144CC9] shadow-sm"
            />
          </div>

          {/* Sidebar Menu */}
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-3 pb-2 lg:pb-0 scrollbar-none">
            {filteredSections.map((sec) => {
              const Icon = sec.icon
              const isActive = activeSection === sec.id
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-full text-xs font-black transition-all shrink-0 lg:shrink-0 text-left border ${
                    isActive 
                      ? 'bg-[#144CC9] text-white border-[#144CC9] shadow-md shadow-[#144CC9]/20' 
                      : 'bg-white text-slate-700 hover:text-[#144CC9] hover:bg-black/5 border-slate-200 shadow-sm'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{sec.title}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Viewer */}
        <div className="lg:col-span-3">
          <Card className="border border-slate-200 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <CardContent className="p-6 md:p-10">
              
              {/* Sección: Introducción */}
              {activeSection === 'introduccion' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
                      👋
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Bienvenido a Bitacor.AI 2.0</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Flujos Principales del Sistema</p>
                    </div>
                  </div>
                  
                  <p className="text-base text-slate-600 leading-relaxed font-medium">
                    Bitacor.AI 2.0 es un centro de comando digital diseñado especialmente para constructoras. Su objetivo principal es conectar a los directores, administradores y residentes de obra para llevar un control exacto de avance físico, inventario de materiales y finanzas.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2 pt-4">
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Residentes de Obra
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Registran bitácoras con firmas y fotos, notifican entradas y salidas de materiales e ingresan gastos de caja chica.
                      </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Directores (Admin)
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Monitorean presupuestos globales, aprueban solicitudes especiales, auditan gastos y coordinan el equipo de trabajo.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold">Paso 1 de 9</span>
                    <button 
                      onClick={() => setActiveSection('obras')}
                      className="px-5 py-2.5 rounded-full bg-[#144CC9] hover:bg-[#144CC9]/90 text-white font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      Siguiente Tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: Obras */}
              {activeSection === 'obras' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-xl font-bold">
                      🏗️
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Obras y Frentes de Trabajo</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Organización y Administración del Territorio</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                    <p>
                      El núcleo de Bitacor.AI son las **Obras (Proyectos)**. Todo registro contable, de materiales y de bitácoras está ligado obligatoriamente a una obra específica.
                    </p>
                    
                    <div className="space-y-2 border-l-2 border-blue-500 pl-4 py-1 bg-blue-50/30 rounded-r-xl pr-3">
                      <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Creación de Proyectos</h4>
                      <p className="text-xs text-slate-500">
                        Como Director de Obra, puedes añadir nuevos proyectos haciendo clic en <span className="font-bold text-slate-800">"+ Nueva Obra"</span> en el Dashboard. Debes capturar los datos principales como presupuesto base asignado, cliente y ubicación geográfica.
                      </p>
                    </div>

                    <div className="space-y-2 border-l-2 border-indigo-500 pl-4 py-1 bg-indigo-50/30 rounded-r-xl pr-3">
                      <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Frentes de Trabajo (Áreas)</h4>
                      <p className="text-xs text-slate-500">
                        Las obras se subdividen en áreas específicas (ej. "Recámara 1", "Cocina", "Fachada"). Esto permite clasificar el inventario y las bitácoras diarias por sectores concretos. Puedes agregarlas libremente escribiendo el nombre en la pestaña **Áreas** del panel de la obra.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold">Paso 2 de 9</span>
                    <button 
                      onClick={() => setActiveSection('bitacoras')}
                      className="px-5 py-2.5 rounded-full bg-[#144CC9] hover:bg-[#144CC9]/90 text-white font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      Siguiente Tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: Bitácoras */}
              {activeSection === 'bitacoras' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl font-bold">
                      📝
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Registro de Bitácoras Diarias</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Documentación técnica diaria</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                    <p>
                      El registro diario de bitácoras te permite documentar formalmente las actividades en obra. Cada reporte se asocia a un área específica y requiere los siguientes datos:
                    </p>

                    <ul className="space-y-3 bg-slate-50 border border-slate-100 p-5 rounded-2xl text-xs">
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-blue-600">📅 Fecha del reporte:</span>
                        <span>Se selecciona el día laborado (por defecto la fecha actual).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-blue-600">🌤️ Clima de la jornada:</span>
                        <span>Identifica si el clima afectó el rendimiento (Soleado, Lluvioso, etc.).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-blue-600">👷 Personal activo:</span>
                        <span>Número de obreros que asistieron ese día.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-blue-600">✏️ Notas y Avances:</span>
                        <span>
                          Descripción del trabajo realizado. Cuenta con herramientas de **Dictado por Voz** y **Mejora con IA** para estructurar profesionalmente las notas.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-blue-600">📸 Evidencia fotográfica:</span>
                        <span>Sube fotos directo desde la cámara de tu celular o archivos locales.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-blue-600">✍️ Firma digital:</span>
                        <span>Validación legal del reporte dibujando tu firma en el recuadro digital.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold">Paso 3 de 9</span>
                    <button 
                      onClick={() => setActiveSection('materiales')}
                      className="px-5 py-2.5 rounded-full bg-[#144CC9] hover:bg-[#144CC9]/90 text-white font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      Siguiente Tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: Materiales */}
              {activeSection === 'materiales' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-xl font-bold">
                      📦
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Control de Materiales</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Administración de insumos e inventario</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                    <p>
                      Evita pérdidas y desabasto registrando todos los materiales de tus proyectos en la pestaña **Materiales**:
                    </p>

                    <div className="grid gap-4 sm:grid-cols-3 pt-2">
                      <div className="p-4 rounded-xl border border-slate-200 text-center space-y-1">
                        <span className="text-xl block">📝</span>
                        <h4 className="font-extrabold text-xs text-slate-900">Catálogo</h4>
                        <p className="text-[10px] text-slate-500">Registra tus materiales especificando unidad (m3, bultos, toneladas).</p>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200 text-center space-y-1">
                        <span className="text-xl block">📥</span>
                        <h4 className="font-extrabold text-xs text-slate-900">Entrada (+)</h4>
                        <p className="text-[10px] text-slate-500">Suma stock cuando llegue un proveedor.</p>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200 text-center space-y-1">
                        <span className="text-xl block">📤</span>
                        <h4 className="font-extrabold text-xs text-slate-900">Salida (-)</h4>
                        <p className="text-[10px] text-slate-500">Resta stock cuando el material se aplique en obra.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold">Paso 4 de 9</span>
                    <button 
                      onClick={() => setActiveSection('gastos')}
                      className="px-5 py-2.5 rounded-full bg-[#144CC9] hover:bg-[#144CC9]/90 text-white font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      Siguiente Tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: Gastos */}
              {activeSection === 'gastos' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 text-xl font-bold">
                      💳
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Tickets de Gastos y Finanzas</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Control de egresos y facturación</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                    <p>
                      Cualquier compra de emergencia, renta de herramienta o pago de flete debe registrarse en la sección **Gastos**:
                    </p>

                    <div className="space-y-2 border-l-2 border-rose-500 pl-4 py-1 bg-rose-50/30 rounded-r-xl pr-3">
                      <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Registro Obligatorio</h4>
                      <p className="text-xs text-slate-500">
                        Cada gasto requiere ingresar el monto, descripción del concepto, fecha y la categoría correspondiente.
                      </p>
                    </div>

                    <div className="space-y-2 border-l-2 border-emerald-500 pl-4 py-1 bg-emerald-50/30 rounded-r-xl pr-3">
                      <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Comprobante del Gasto</h4>
                      <p className="text-xs text-slate-500">
                        Es indispensable subir una fotografía legible del ticket o la factura. Esto agiliza la auditoría del equipo de administración y valida los desembolsos de caja chica.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold">Paso 5 de 9</span>
                    <button 
                      onClick={() => setActiveSection('solicitudes')}
                      className="px-5 py-2.5 rounded-full bg-[#144CC9] hover:bg-[#144CC9]/90 text-white font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      Siguiente Tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: Solicitudes */}
              {activeSection === 'solicitudes' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 text-xl font-bold">
                      📢
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Solicitudes Especiales</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Gestión de recursos y herramientas</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                    <p>
                      Si necesitas un material no presupuestado, rentar equipo pesado o ampliar el presupuesto de un frente de trabajo:
                    </p>

                    <ol className="space-y-3 bg-slate-50 border border-slate-100 p-5 rounded-2xl text-xs list-decimal pl-8">
                      <li>Ve a la sección **Solicitudes Especiales** en el menú de navegación lateral.</li>
                      <li>Haz clic en `+ Nueva Solicitud`.</li>
                      <li>Elige la obra, describe detalladamente la necesidad e ingresa el costo estimado o cantidad.</li>
                      <li>El sistema notificará a los Directores de Obra. Verás el estado cambiar de *Pendiente* a *Aprobada* o *Rechazada* al instante.</li>
                    </ol>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold">Paso 6 de 9</span>
                    <button 
                      onClick={() => setActiveSection('roles')}
                      className="px-5 py-2.5 rounded-full bg-[#144CC9] hover:bg-[#144CC9]/90 text-white font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      Siguiente Tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: Roles */}
              {activeSection === 'roles' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 text-xl font-bold">
                      👥
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Equipo de Trabajo y Roles</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Permisos de acceso y jerarquías</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                    <p>
                      Bitacor.AI cuenta con roles estructurados para proteger la información financiera y optimizar el flujo de trabajo:
                    </p>

                    <div className="space-y-3">
                      <div className="p-4 rounded-xl border border-slate-150 flex items-start gap-3">
                        <span className="text-lg bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg font-bold">Dir</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900">Director de Obra (Admin)</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Control financiero, creación de obras, edición de perfiles de empresa e incorporación de personal.</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-150 flex items-start gap-3">
                        <span className="text-lg bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg font-bold">Res</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900">Residente de Obra</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Llenado de bitácoras diarias, inventario de materiales y generación de solicitudes de compras.</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-150 flex items-start gap-3">
                        <span className="text-lg bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg font-bold">Adm</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900">Administración</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Auditoría contable, revisión de comprobantes de pago y conciliación de gastos del proyecto.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold">Paso 7 de 9</span>
                    <button 
                      onClick={() => setActiveSection('perfil')}
                      className="px-5 py-2.5 rounded-full bg-[#144CC9] hover:bg-[#144CC9]/90 text-white font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      Siguiente Tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: Perfil */}
              {activeSection === 'perfil' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 text-xl font-bold">
                      🎨
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Configuración de Perfil y Empresa</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Personalización del Command Center</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                    <p>
                      Haz tuya la aplicación personalizando la imagen corporativa para tus clientes y equipo:
                    </p>

                    <ol className="space-y-3 bg-slate-50 border border-slate-100 p-5 rounded-2xl text-xs list-decimal pl-8">
                      <li>Ve a la pestaña **Mi Perfil y Empresa** en el menú.</li>
                      <li>Ingresa tu nombre completo y el nombre de tu constructora.</li>
                      <li>Sube un archivo de imagen transparente con el **Logotipo de tu empresa**.</li>
                      <li>
                        Al hacer clic en guardar, el logotipo corporativo se aplicará automáticamente en el encabezado de toda la plataforma, reemplazando al logo por defecto de Bitacor.AI.
                      </li>
                    </ol>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold">Paso 8 de 9</span>
                    <button 
                      onClick={() => setActiveSection('ia')}
                      className="px-5 py-2.5 rounded-full bg-[#144CC9] hover:bg-[#144CC9]/90 text-white font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      Siguiente Tema <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Sección: IA */}
              {activeSection === 'ia' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 text-xl font-bold">
                      ✨
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Copiloto de IA y Asistente</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Automatización por chat interactivo</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
                    <p>
                      El asistente de IA flotante en la esquina inferior derecha te permite controlar la base de datos de manera automatizada:
                    </p>

                    <ul className="space-y-3 bg-slate-50 border border-slate-100 p-5 rounded-2xl text-xs">
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-pink-600">🗣️ Dictado por voz:</span>
                        <span>Usa el micrófono en los campos de texto para dictar tus avances sin escribir manualmente.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-pink-600">🪄 Mejora con IA:</span>
                        <span>Convierte tus notas rápidas en bitácoras perfectamente redactadas y estructuradas con un clic.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-pink-600">💬 Consultas inteligentes:</span>
                        <span>Pregúntale al chat flotante sobre saldos, bitácoras o inventario de materiales directamente en lenguaje natural.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold">Paso 9 de 9</span>
                    <button 
                      onClick={() => setActiveSection('introduccion')}
                      className="px-5 py-2.5 rounded-full bg-[#144CC9] hover:bg-[#144CC9]/90 text-white font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
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

