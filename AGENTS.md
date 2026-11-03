<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Bitacor.AI — contexto del proyecto

App de control de obra para constructoras en México: obras, bitácoras diarias con
fotos y firmas, cronograma, materiales, finanzas, solicitudes y expediente en PDF.
Toda la interfaz y los textos van en español de México.

## Cómo se trabaja
- El dueño pidió trabajar **directo en `main`**, sin ramas ni pull requests.
  Haz `git pull origin main` antes de empezar: puede haber cambios de otras sesiones.
- Antes de subir: `npx tsc --noEmit`, `npx next build` y `npx eslint .`. El lint ya
  trae errores antiguos; no agregues nuevos.
- Despliegue: AWS Amplify (`amplify.yml`) publica cada push a `main`.
- El dueño no programa: explícale en español sencillo y con pasos concretos.

## Base de datos (Supabase)
- La base real es el proyecto **BogoArc** (`iywpzfbossgjemvspnll`). El proyecto
  "proyecto1" (`tikcvrkbjudbwimxcmsv`) **no** es la base de la app.
- No hay acceso a Supabase desde las sesiones en la nube: las migraciones las
  ejecuta el dueño en el SQL Editor de BogoArc. Dale el enlace de GitHub al archivo.
- Las migraciones de `supabase/migrations/` deben ser idempotentes (se pueden
  correr dos veces). Ya aplicadas en BogoArc: `20261022_trazabilidad`,
  `20261026_fotos_bitacora`, `20261028_ingresos_y_archivos`, `20261103_cronograma_y_avance`.
- `supabase/setup.sql` es el esquema original; las migraciones lo amplían
  (por ejemplo, `incomes` usa `description`/`income_date`, no `concept`/`date`).
- Si el código depende de una migración nueva, haz que funcione (o falle con un
  mensaje claro) mientras aún no se aplica.
- Variables de entorno (en Amplify): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, opcionales
  `SUPABASE_SERVICE_ROLE_KEY` y `RESEND_API_KEY`.
- **Nunca** escribas llaves en el código ni pidas al dueño que pegue llaves o
  contraseñas en el chat.

## Roles y permisos
- Roles en `profiles.role`: `admin` y `director` (ambos "Director de obra"),
  `residente`, `administracion`, `subcontratista` (contratista), `operador`.
  Usa `isDirectorRole()` de `src/lib/roles.ts`.
- El equipo se une con códigos de invitación; `profiles.invited_by` apunta al
  director. El rol lo asigna el servidor (`completeSignup` en `src/app/login/actions.ts`),
  nunca el navegador.
- Cada server action verifica obra y rol con `getProjectAccess()` de
  `src/lib/permissions.ts`. Ocultar un botón no basta: revisa también en el servidor.
- Solo el director ve ingresos y saldo de caja (en pantalla, en el PDF y en el asistente).

## Reglas del negocio
- Fechas: usa `src/lib/dates.ts` (`formatDateOnly`, `formatDateTime`, `todayInObra`,
  zona `America/Mexico_City`). Las columnas DATE no se pasan por `new Date()`.
- Dinero: `src/lib/finance.ts`. El presupuesto autorizado no es efectivo;
  saldo de caja = ingresos − gastos. Formato en pantalla: `−$2,550.00 MXN` (`formatMXN`).
- Firmas de bitácora (`src/lib/signatures.ts`): "Pendiente de firma del responsable"
  → "Pendiente de visto bueno del director" → "Firmas completas".
- El avance físico de la obra se captura a mano (con quién y cuándo); el avance
  de las actividades del cronograma no lo modifica.
- Materiales: no se permite sacar más de lo que hay (formulario, server action y
  la función `record_material_movement` en la base).
- No afirmes validez oficial o legal de reportes ni PDF.

## Diseño
- El cliente prefirió el diseño original: azul `#144CC9`, marino `#031033`, fondos
  blancos; verde `#A7EC80` solo como acento. Prioriza visualmente lo pendiente
  (solicitudes, actividades vencidas, bitácoras por firmar).
- PDF: `src/lib/pdf.ts` incrusta Plus Jakarta Sans (`public/fonts/`) y cae a
  Helvetica si no carga.
- Revisa en móvil (390 px de ancho) que no haya scroll horizontal.
