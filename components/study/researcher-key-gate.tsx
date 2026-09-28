'use client'

import { useId, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setResearcherKey } from '@/lib/api-client'
import { inputClass, primaryButtonClass } from '@/components/study/form-controls'

/**
 * Se muestra cuando las rutas del investigador responden 401. La clave se
 * guarda solo en sessionStorage (lib/api-client.ts) y se envía como X-API-Key;
 * nunca se define en variables NEXT_PUBLIC_* ni se incluye en el bundle.
 */
export function ResearcherKeyGate() {
  const id = useId()
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState(false)
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="rounded-xl border border-[#B54708]/40 bg-[#FFFAEB] p-5 space-y-3 text-[#7A2E0E]"
    >
      <h3 id={`${id}-title`} className="font-medium flex items-center gap-2">
        <KeyRound className="w-4 h-4" aria-hidden="true" />
        Se requiere la clave del investigador
      </h3>
      <p className="text-sm">
        El servidor protege los datos de las sesiones. Introduzca la clave del investigador: se enviará como
        cabecera X-API-Key y solo se conserva en esta pestaña del navegador.
      </p>
      <form
        className="flex flex-wrap gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault()
          if (!value.trim()) return
          setResearcherKey(value)
          setValue('')
          setSaved(true)
        }}
      >
        <div className="flex-1 min-w-56">
          <label htmlFor={`${id}-key`} className="text-sm font-medium block mb-1">
            Clave del investigador
          </label>
          <input
            id={`${id}-key`}
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputClass}
          />
        </div>
        <Button type="submit" className={primaryButtonClass} disabled={!value.trim()}>
          Usar clave
        </Button>
      </form>
      <p role="status" className="text-xs">
        {saved ? 'Clave guardada para esta pestaña. Verificando con el servidor…' : ''}
      </p>
    </section>
  )
}
