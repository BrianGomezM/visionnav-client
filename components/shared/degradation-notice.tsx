'use client'

import { AlertTriangle } from 'lucide-react'
import { degradationLabel } from '@/lib/api-errors'

/** Avisa de las partes que el backend declaró degradadas (cabecera X-Degradacion). */
export function DegradationNotice({ codes, requestId }: { codes?: string[]; requestId?: string | null }) {
  if (!codes || codes.length === 0) return null
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-[#BA7517] bg-[#FAEEDA]" role="status">
      <AlertTriangle className="w-5 h-5 text-[#BA7517] shrink-0 mt-0.5" aria-hidden="true" />
      <div className="text-sm text-[#7A4A0E] space-y-1">
        {codes.map((c) => (
          <p key={c}>{degradationLabel(c)}</p>
        ))}
        {requestId && <p className="text-xs opacity-80">ID de solicitud: {requestId}</p>}
      </div>
    </div>
  )
}
