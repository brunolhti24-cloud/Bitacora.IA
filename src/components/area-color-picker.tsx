'use client'

import { Check } from 'lucide-react'
import { AREA_COLORS } from '@/lib/area-colors'

/** Selector de color para un área. `value` vacío = color automático según el nombre. */
export function AreaColorPicker({ value, onChange, name = 'area-color' }: { value: string; onChange: (value: string) => void; name?: string }) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-wider text-slate-700">Color de la tarjeta</legend>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold ${value === '' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
          <input type="radio" name={name} value="" checked={value === ''} onChange={() => onChange('')} className="sr-only" />
          Automático
        </label>
        {AREA_COLORS.map((c) => (
          <label
            key={c.key}
            title={c.label}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full ring-offset-2 ${value === c.key ? 'ring-2 ring-slate-900' : ''}`}
            style={{ backgroundColor: c.hex }}
          >
            <input type="radio" name={name} value={c.key} checked={value === c.key} onChange={() => onChange(c.key)} className="sr-only" />
            <span className="sr-only">{c.label}</span>
            {value === c.key && <Check className="h-4 w-4 text-white" aria-hidden />}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
