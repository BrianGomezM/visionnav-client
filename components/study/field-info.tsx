'use client'

import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { HelpText } from '@/lib/study-help'

/** Ícono (i) con el contexto de un campo del instrumento (vista del investigador). */
export function FieldInfo({ help }: { help: HelpText }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Qué es: ${help.titulo}`}
          className="inline-flex align-middle ml-1 rounded-full p-0.5 text-[#4B45A8] hover:bg-[#EEEDFE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B45A8]"
        >
          <Info className="w-4 h-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 text-sm space-y-2">
        <p className="font-medium text-foreground">{help.titulo}</p>
        <p>{help.texto}</p>
        {help.pregunta && (
          <p className="rounded bg-[#EEEDFE] px-2 py-1 text-[#2E2A6B]">
            <span className="font-medium">Pregunta: </span>«{help.pregunta}»
          </p>
        )}
        {help.registro && <p className="text-muted-foreground">{help.registro}</p>}
      </PopoverContent>
    </Popover>
  )
}
