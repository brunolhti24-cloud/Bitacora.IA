# Bitacor.AI — sistema de diseño (MASTER)

Fuente de verdad para el diseño de la app. Generado con las skills `ui-ux-pro-max`
(dirección: minimalismo suizo / industrial, alto contraste) y `frontend-design`
(identidad propia basada en la obra, sin plantillas genéricas).

Usuarios: directores de obra, residentes, administración y contratistas, muchas
veces desde el celular en el sitio. Trabajo principal: entrar a una obra,
registrar la bitácora y firmarla.

## Color

Definidos en `src/app/globals.css` (`:root`) y expuestos como clases de Tailwind.

| Token | Hex | Clase | Uso |
|---|---|---|---|
| plano | `#031033` | `bg-plano` / `text-plano` | Header, superficies oscuras, texto fuerte |
| obra | `#144CC9` | `bg-obra` / `text-obra` | Acción principal, enlaces, estado activo |
| obra-strong | `#0F3BA0` | `hover:bg-obra-strong` | Hover de la acción principal |
| brote | `#A7EC80` | `text-brote` / `bg-brote` | Acento de marca, **solo sobre `plano`** (no tiene contraste sobre blanco) |
| concreto | `#F1F2F4` | `bg-background` | Fondo de trabajo |
| junta | `#D8DCE2` | `border-border` | Bordes |
| señal | `#C2410C` | `text-senal` / `bg-senal-soft` | Pendientes, por reabastecer, alertas, notificaciones sin leer |
| ok | `#23803A` | `text-ok` / `bg-ok-soft` | Completado, aprobado, firmado, con existencia |

Errores y acciones destructivas usan `destructive`. Los estados siempre llevan
texto o ícono además del color.

Para todo lo demás usar los tokens de shadcn (`bg-card`, `text-muted-foreground`,
`bg-accent`, `text-destructive`…). No usar hex sueltos ni degradados azul→índigo.

## Tipografía

- **Archivo** (variable, con eje de ancho) para todo. Cargada en `src/app/layout.tsx`.
- Títulos `h1–h3`: ancho 84% (rotulación de obra), `font-extrabold`, `text-wrap: balance`.
  Para números o titulares grandes se puede bajar a `[font-stretch:72%]`.
- Texto: 14–16px, ancho normal. Números con `tabular-nums` (global).
- **JetBrains Mono** solo para códigos (invitaciones, folios), no para etiquetas.

## Elemento distintivo: cinta métrica

El avance físico se muestra siempre con `<ProgressTape>` (`src/components/progress-tape.tsx`):
barra con marcas cada 10%, azul `obra`, verde al llegar a 100%. Sobre fondo `plano`
usar `className="cinta-plano"` (relleno `brote`). Es el único elemento "llamativo";
lo demás se mantiene sobrio.

Superficies oscuras pueden usar `.plano-grid` (cuadrícula de plano).

## Layout

- Alineación a la izquierda. Encabezado de página: `h1` + descripción corta, con
  métricas y acción principal a la derecha, separados por un `border-b`.
- Tarjetas: `rounded-lg border border-border bg-card`, sin sombras grandes, sin
  elevación al hover (solo cambia el borde).
- Navegación: `DashboardNav` (`src/components/dashboard-nav.tsx`) es la única lista
  de enlaces, compartida por el sidebar y el menú móvil. Marca la página actual
  con `aria-current="page"`.

## Reglas

- Etiquetas en tipo oración ("Correo electrónico"), nunca MAYÚSCULAS con tracking.
- Sin emojis como íconos; usar `lucide-react` con `aria-hidden`.
- Botones de solo ícono llevan `aria-label`. Área táctil mínima 44px (`min-h-11`, `h-10 w-10`+).
- Foco visible global (`:focus-visible`); no quitar `outline` sin reemplazo.
- Se respeta `prefers-reduced-motion` (global).
- Sin glassmorphism, `backdrop-blur` ni "eyebrows" tipo "Command Center".
- Textos: verbos claros ("Nueva obra", "Actualizar avance"); errores dicen qué
  pasó y qué hacer.

## Componentes base (`src/components/ui`)

Los primitivos ya traen el estilo del sistema; no sobrescribirlos en cada uso.

- `Button`: 40px por defecto (`sm` 36px, `lg` 44px), `rounded-md`, `font-semibold`.
- `Input` / `Textarea`: 44px, fondo blanco, `rounded-md`. Solo añadir `pl-10` si hay ícono.
- `Label`: `text-sm font-semibold text-plano`.
- `Card`: borde `border-border` (sin ring), `rounded-lg`.
- `Dialog`: título `text-xl font-bold` condensado, overlay `plano/50`, pie con `border-t`.
- `select` nativo: `flex h-11 w-full rounded-md border border-input bg-white px-3 text-base text-plano md:text-sm`.
- Pestañas: `TabsList variant="line"` con subrayado `obra` de 3px y scroll horizontal en celular.
  Ojo: base-ui marca la pestaña activa con `data-active`, no con `data-[state=active]`.

## Patrones

- Encabezado de página: `h1` + descripción + acción, con `border-b` (ver Obras, Equipo, Perfil, Manual).
- Métricas: tira `dl` con `gap-px` sobre `bg-border` (Materiales, Equipo), no tarjetas sueltas.
- Vacíos: `border-2 border-dashed border-junta`, título que invita a actuar y botón.
- Bitácoras: cada entrada muestra su número de nota (`Nota 014`), igual que una bitácora física.
